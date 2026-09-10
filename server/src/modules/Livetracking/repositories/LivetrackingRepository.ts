// ============================================================
// LivetrackingRepository
// server/src/modules/Livetracking/repositories/LivetrackingRepository.ts
//
// All columns verified against actual DB schema:
//   employees: id, organization_id, employee_code, first_name, last_name,
//              avatar_url, current_designation_id, current_department_id,
//              current_branch_id, reporting_manager_id
//   departments: id, name
//   designations: id, name
//   branches: id, name
//   attendance_records: employee_id, check_in_date, check_in_time, check_out_time, status
//   employee_live_locations: employee_id, organization_id, latitude, longitude,
//              address, location_status, connection_status, last_ping_at
// ============================================================
import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';
import type {
  EmployeeLiveLocation,
  EmployeeLocationHistory,
  EmployeeTrackingSession,
  LiveEmployeeSnapshot,
  LocationPingPayload,
} from '../types/livetracking.types';

export class LivetrackingRepository {
  private db = getKnex();

  // -------------------------------------------------------
  // UPSERT current live location snapshot for an employee
  // -------------------------------------------------------
  async upsertLiveLocation(
    ctx: TenantContext,
    employeeId: number,
    payload: LocationPingPayload
  ): Promise<void> {
    const now = this._mysqlNow();
    await this.db('employee_live_locations')
      .insert({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy ?? null,
        speed: payload.speed ?? null,
        heading: payload.heading ?? null,
        location_status: 'ON',
        connection_status: 'ONLINE',
        last_ping_at: now,
        updated_at: now,
      })
      .onConflict(['organization_id', 'employee_id'])
      .merge({
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy ?? null,
        speed: payload.speed ?? null,
        heading: payload.heading ?? null,
        location_status: 'ON',
        connection_status: 'ONLINE',
        last_ping_at: now,
        updated_at: now,
      });
  }

  // -------------------------------------------------------
  // Append a breadcrumb to location history
  // -------------------------------------------------------
  async addLocationBreadcrumb(
    ctx: TenantContext,
    employeeId: number,
    payload: LocationPingPayload
  ): Promise<void> {
    await this.db('employee_location_history').insert({
      organization_id: ctx.organizationId,
      employee_id: employeeId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy ?? null,
      speed: payload.speed ?? null,
      recorded_at: this._mysqlNow(),
    });
  }

  // -------------------------------------------------------
  // Update location_status (ON/OFF) without changing coordinates
  // -------------------------------------------------------
  async updateLocationStatus(
    ctx: TenantContext,
    employeeId: number,
    status: 'ON' | 'OFF'
  ): Promise<void> {
    const now = this._mysqlNow();
    await this.db('employee_live_locations')
      .where({ organization_id: ctx.organizationId, employee_id: employeeId })
      .update({ location_status: status, updated_at: now });
  }

  // -------------------------------------------------------
  // Mark employee ONLINE / OFFLINE (connection_status)
  // -------------------------------------------------------
  async updateConnectionStatus(
    ctx: TenantContext,
    employeeId: number,
    status: 'ONLINE' | 'OFFLINE'
  ): Promise<void> {
    const now = this._mysqlNow();
    await this.db('employee_live_locations')
      .where({ organization_id: ctx.organizationId, employee_id: employeeId })
      .update({ connection_status: status, updated_at: now });
  }

  // -------------------------------------------------------
  // Ensure a live_location row exists (upsert on employee login)
  // -------------------------------------------------------
  async ensureLiveRow(ctx: TenantContext, employeeId: number): Promise<void> {
    const now = this._mysqlNow();
    await this.db('employee_live_locations')
      .insert({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        location_status: 'OFF',
        connection_status: 'ONLINE',
        last_ping_at: now,
        updated_at: now,
      })
      .onConflict(['organization_id', 'employee_id'])
      .merge({ connection_status: 'ONLINE', updated_at: now });
  }

  // -------------------------------------------------------
  // Get all live snapshots for HR/Admin (full org)
  // -------------------------------------------------------
  async getLiveLocationsForOrg(ctx: TenantContext): Promise<LiveEmployeeSnapshot[]> {
    return this._buildLiveQuery(ctx);
  }

  // -------------------------------------------------------
  // Get live snapshots for a Manager/Team Lead's reporting team
  // (multi-tier: direct reports + their team members)
  // -------------------------------------------------------
  async getLiveLocationsForTeam(
    ctx: TenantContext,
    managerEmployeeId: number,
    managerDepartmentId: number | null
  ): Promise<LiveEmployeeSnapshot[]> {
    const query = this._buildLiveQuery(ctx);

    if (managerEmployeeId && managerEmployeeId > 0) {
      if (managerDepartmentId) {
        // Get all team lead IDs in the manager's department via the designations join
        const teamLeads = await this.db('employees as te')
          .leftJoin('designations as tdesig', 'tdesig.id', 'te.current_designation_id')
          .where('te.organization_id', ctx.organizationId)
          .where('te.current_department_id', managerDepartmentId)
          .whereRaw("LOWER(tdesig.name) IN ('team lead', 'team_lead')")
          .select('te.id');

        const teamLeadIds = teamLeads.map((tl: any) => tl.id);

        query.where((qb: any) => {
          qb.where('e.current_department_id', managerDepartmentId)
            .orWhere('e.reporting_manager_id', managerEmployeeId);
          if (teamLeadIds.length > 0) {
            qb.orWhereIn('e.reporting_manager_id', teamLeadIds);
          }
        });
      } else {
        query.where((qb: any) => {
          qb.where('e.reporting_manager_id', managerEmployeeId)
            .orWhere('e.id', managerEmployeeId);
        });
      }
    }

    return query;
  }

  // -------------------------------------------------------
  // Get historical location breadcrumbs for route playback
  // -------------------------------------------------------
  async getLocationHistory(
    ctx: TenantContext,
    employeeId: number,
    date: string // 'YYYY-MM-DD'
  ): Promise<any[]> {
    const rows = await this.db('employee_location_history')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .whereRaw('DATE(recorded_at) = ?', [date])
      .orderBy('recorded_at', 'asc')
      .select('latitude', 'longitude', 'speed', 'recorded_at');

    return rows.map((r: any) => {
      const recTime = r.recordedAt || r.recorded_at || new Date().toISOString();
      return {
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        speed: r.speed != null ? Number(r.speed) : null,
        recorded_at: recTime,
        recordedAt: recTime,
      };
    });
  }

  // -------------------------------------------------------
  // Core query builder — all columns verified against schema
  // -------------------------------------------------------
  private _buildLiveQuery(ctx: TenantContext) {
    const db = this.db;

    return db('employees as e')
      // ── Live location: LEFT JOIN so employees without location are still shown ──
      .leftJoin('employee_live_locations as ll', function () {
        this.on('ll.employee_id', '=', 'e.id')
            .andOn('ll.organization_id', '=', 'e.organization_id');
      })
      // ── Department name ──
      .leftJoin('departments as d', 'd.id', 'e.current_department_id')
      // ── Designation name ──
      .leftJoin('designations as desig', 'desig.id', 'e.current_designation_id')
      // ── Branch name (employees uses current_branch_id, NOT branch_id) ──
      .leftJoin('branches as b', 'b.id', 'e.current_branch_id')
      // ── Today's attendance: use a subquery to pick ONLY the single latest
      //    record per employee today — prevents duplicate rows when multiple
      //    attendance records exist for the same date (regularization, etc.) ──
      .leftJoin(
        db('attendance_records')
          .whereRaw('(DATE(check_in_date) >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) OR DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) OR DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 DAY))')
          .groupBy('employee_id')
          .select(
            'employee_id',
            db.raw('MAX(id) as ar_id'),
            db.raw('MAX(status) as status'),
            db.raw('MAX(check_in_time) as check_in_time'),
            db.raw('MAX(check_out_time) as check_out_time')
          )
          .as('ar'),
        'ar.employee_id',
        'e.id'
      )
      // ── Users table for avatar fallback ──
      .leftJoin('users as u', 'u.employee_id', 'e.id')
      // ── Reporting manager's name ──
      .leftJoin('employees as mgr', 'mgr.id', 'e.reporting_manager_id')
      // ── Scope: this org; include employees across all company branches for live tracking ──
      .where('e.organization_id', ctx.organizationId)
      .where((builder) => {
        builder.whereNotIn('e.status', ['exit', 'alumni', 'candidate']).orWhereNull('e.status');
      })
      .whereNull('e.deleted_at')
      .select(
        'e.id as employee_id',
        'e.employee_code',
        db.raw("TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))) as name"),
        db.raw("COALESCE(NULLIF(e.avatar_url, ''), NULLIF(u.avatar_url, ''), '') as avatar_url"),
        db.raw("COALESCE(d.name, '') as department"),
        'e.current_department_id as department_id',
        db.raw("COALESCE(desig.name, '') as designation"),
        db.raw("COALESCE(b.name, '') as branch"),
        'e.current_branch_id as branch_id',
        'e.reporting_manager_id',
        db.raw("TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager"),
        // ── Live location fields — fallback to default center (19.0760, 72.8777) if no GPS ping recorded ──
        db.raw("CAST(COALESCE(CASE WHEN DATE(ll.last_ping_at) = CURDATE() THEN ll.latitude ELSE NULL END, 19.0760) AS DOUBLE) as latitude"),
        db.raw("CAST(COALESCE(CASE WHEN DATE(ll.last_ping_at) = CURDATE() THEN ll.longitude ELSE NULL END, 72.8777) AS DOUBLE) as longitude"),
        db.raw("COALESCE(NULLIF(ll.address, ''), 'Checked-in Field Location') as address"),
        db.raw("COALESCE(ll.location_status, 'ON') as location_status"),
        db.raw("COALESCE(ll.connection_status, 'ONLINE') as connection_status"),
        'll.last_ping_at',
        // ── Attendance fields — NULL-safe ──
        db.raw("COALESCE(ar.status, 'absent') as attendance_status"),
        'ar.check_in_time',
        'ar.check_out_time'
      );
  }

  // -------------------------------------------------------
  // Upsert a daily tracking session (called after breadcrumb recalc)
  // -------------------------------------------------------
  async upsertTrackingSession(
    ctx: TenantContext,
    employeeId: number,
    date: string,
    metrics: {
      sessionStart: string | null;
      sessionEnd: string | null;
      totalWorkingMinutes: number;
      totalBreakMinutes: number;
      breakCount: number;
      totalDistanceKm: number;
      pingCount: number;
      locationWalk?: string | null;
    }
  ): Promise<void> {
    const now = this._mysqlNow();
    const startDt = this._toMysqlDatetime(metrics.sessionStart);
    const endDt = this._toMysqlDatetime(metrics.sessionEnd);
    const walkJson = metrics.locationWalk || null;

    await this.db('employee_tracking_sessions')
      .insert({
        organization_id: ctx.organizationId,
        employee_id: employeeId,
        session_date: date,
        session_start: startDt,
        session_end: endDt,
        total_working_minutes: metrics.totalWorkingMinutes,
        total_break_minutes: metrics.totalBreakMinutes,
        break_count: metrics.breakCount,
        total_distance_km: metrics.totalDistanceKm,
        ping_count: metrics.pingCount,
        location_walk: walkJson,
        created_at: now,
        updated_at: now,
      })
      .onConflict(['organization_id', 'employee_id', 'session_date'])
      .merge({
        session_start: startDt,
        session_end: endDt,
        total_working_minutes: metrics.totalWorkingMinutes,
        total_break_minutes: metrics.totalBreakMinutes,
        break_count: metrics.breakCount,
        total_distance_km: metrics.totalDistanceKm,
        ping_count: metrics.pingCount,
        location_walk: walkJson,
        updated_at: now,
      });
  }

  // -------------------------------------------------------
  // Explicitly Save / Pin an Employee's Location & Walk History
  // -------------------------------------------------------
  async saveEmployeeLocation(
    ctx: TenantContext,
    employeeId: number,
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<void> {
    const nowPayload: LocationPingPayload = {
      latitude,
      longitude,
      accuracy: 5,
      speed: 0,
      heading: 0,
      address,
    };

    // 1. Update live snapshot
    await this.upsertLiveLocation(ctx, employeeId, nowPayload);

    // 2. Add breadcrumb point to history
    await this.addLocationBreadcrumb(ctx, employeeId, nowPayload);

    // 3. Fetch all today's breadcrumbs and recalculate session & location_walk JSON
    const today = new Date().toISOString().slice(0, 10);
    const breadcrumbs = await this.getLocationHistory(ctx, employeeId, today);
    if (breadcrumbs && breadcrumbs.length > 0) {
      const { calculateSessionMetrics } = await import('../utils/sessionCalculator');
      const metrics = calculateSessionMetrics(breadcrumbs);
      await this.upsertTrackingSession(ctx, employeeId, today, {
        ...metrics,
        locationWalk: JSON.stringify(breadcrumbs),
      });
    }
  }

  // -------------------------------------------------------
  // Get all employee sessions for a specific date (HR/Admin)
  // -------------------------------------------------------
  async getSessionsForDate(
    ctx: TenantContext,
    date: string
  ): Promise<any[]> {
    const db = this.db;
    let query = db('employee_tracking_sessions as ts')
      .where('ts.organization_id', ctx.organizationId)
      .where('ts.session_date', date)
      .leftJoin('employees as e', 'e.id', 'ts.employee_id')
      .leftJoin('departments as d', 'd.id', 'e.current_department_id')
      .leftJoin('designations as desig', 'desig.id', 'e.current_designation_id');

    if (ctx.companyId) {
      query = query.where('e.company_id', ctx.companyId);
    }

    const rows = await query
      .select(
        'ts.*',
        db.raw("TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))) as employee_name"),
        'e.employee_code',
        db.raw("COALESCE(d.name, '') as department"),
        db.raw("COALESCE(desig.name, '') as designation")
      )
      .orderBy('ts.session_start', 'asc');

    return rows.map((r: any) => this._normalizeSessionRow(r, date));
  }

  // -------------------------------------------------------
  // Get sessions for a specific employee over a date range
  // -------------------------------------------------------
  async getEmployeeSessions(
    ctx: TenantContext,
    employeeId: number,
    fromDate: string,
    toDate: string
  ): Promise<any[]> {
    const db = this.db;
    const rows = await db('employee_tracking_sessions as ts')
      .where('ts.organization_id', ctx.organizationId)
      .where('ts.employee_id', employeeId)
      .whereBetween('ts.session_date', [fromDate, toDate])
      .leftJoin('employees as e', 'e.id', 'ts.employee_id')
      .leftJoin('departments as d', 'd.id', 'e.current_department_id')
      .leftJoin('designations as desig', 'desig.id', 'e.current_designation_id')
      .select(
        'ts.*',
        db.raw("TRIM(CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,''))) as employee_name"),
        'e.employee_code',
        db.raw("COALESCE(d.name, '') as department"),
        db.raw("COALESCE(desig.name, '') as designation")
      )
      .orderBy('ts.session_date', 'desc');

    return rows.map((r: any) => this._normalizeSessionRow(r, r.sessionDate || r.session_date));
  }

  private _normalizeSessionRow(r: any, defaultDate: string) {
    const empId = Number(r.employeeId ?? r.employee_id);
    const empName = (r.employeeName ?? r.employee_name ?? '').trim() || `Employee #${empId}`;
    const empCode = r.employeeCode ?? r.employee_code ?? '';
    const sessDate = r.sessionDate ?? r.session_date ?? defaultDate;
    const sessStart = r.sessionStart ?? r.session_start ?? null;
    const sessEnd = r.sessionEnd ?? r.session_end ?? null;
    const workMins = Number(r.totalWorkingMinutes ?? r.total_working_minutes ?? 0);
    const breakMins = Number(r.totalBreakMinutes ?? r.total_break_minutes ?? 0);
    const breakCnt = Number(r.breakCount ?? r.break_count ?? 0);
    const distKm = Number(r.totalDistanceKm ?? r.total_distance_km ?? 0);
    const pingCnt = Number(r.pingCount ?? r.ping_count ?? 0);
    const dept = r.department ?? '';
    const desig = r.designation ?? '';
    const walk = r.locationWalk ?? r.location_walk ?? null;

    return {
      id: r.id,
      organization_id: r.organizationId ?? r.organization_id,
      organizationId: r.organizationId ?? r.organization_id,
      employee_id: empId,
      employeeId: empId,
      session_date: sessDate,
      sessionDate: sessDate,
      session_start: sessStart,
      sessionStart: sessStart,
      session_end: sessEnd,
      sessionEnd: sessEnd,
      total_working_minutes: isNaN(workMins) ? 0 : workMins,
      totalWorkingMinutes: isNaN(workMins) ? 0 : workMins,
      total_break_minutes: isNaN(breakMins) ? 0 : breakMins,
      totalBreakMinutes: isNaN(breakMins) ? 0 : breakMins,
      break_count: isNaN(breakCnt) ? 0 : breakCnt,
      breakCount: isNaN(breakCnt) ? 0 : breakCnt,
      total_distance_km: isNaN(distKm) ? 0 : distKm,
      totalDistanceKm: isNaN(distKm) ? 0 : distKm,
      ping_count: isNaN(pingCnt) ? 0 : pingCnt,
      pingCount: isNaN(pingCnt) ? 0 : pingCnt,
      employee_name: empName,
      employeeName: empName,
      employee_code: empCode,
      employeeCode: empCode,
      department: dept,
      designation: desig,
      location_walk: walk,
      locationWalk: walk,
    };
  }

  private _mysqlNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  private _toMysqlDatetime(isoStr: string | null): string | null {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }
}
