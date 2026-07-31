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
  ): Promise<Pick<EmployeeLocationHistory, 'latitude' | 'longitude' | 'recorded_at' | 'speed'>[]> {
    return this.db('employee_location_history')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .whereRaw('DATE(recorded_at) = ?', [date])
      .orderBy('recorded_at', 'asc')
      .select('latitude', 'longitude', 'speed', 'recorded_at');
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
          .whereRaw('DATE(check_in_date) = CURDATE()')
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
      // ── Scope: this org only; exclude only truly exited/deleted employees ──
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
        // ── Live location fields — NULL-safe and numeric ──
        db.raw("CAST(ll.latitude AS DOUBLE) as latitude"),
        db.raw("CAST(ll.longitude AS DOUBLE) as longitude"),
        db.raw("COALESCE(ll.address, '') as address"),
        db.raw("COALESCE(ll.location_status, 'OFF') as location_status"),
        db.raw("COALESCE(ll.connection_status, 'OFFLINE') as connection_status"),
        'll.last_ping_at',
        // ── Attendance fields — NULL-safe ──
        db.raw("COALESCE(ar.status, 'absent') as attendance_status"),
        'ar.check_in_time',
        'ar.check_out_time'
      );
  }

  private _mysqlNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }
}
