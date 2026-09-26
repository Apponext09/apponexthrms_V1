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
import { calculateSessionMetrics } from '../utils/sessionCalculator';
import { localDateStr } from '../utils/access';
import type {
  EmployeeLiveLocation,
  EmployeeLocationHistory,
  EmployeeTrackingSession,
  LiveEmployeeSnapshot,
  LocationPingPayload,
} from '../types/livetracking.types';

/** Local-time MySQL DATETIME for an epoch-ms value — matches how recorded_at is stored */
export function toMysqlDatetime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** [start, end) DATETIME bounds of a YYYY-MM-DD day — lets the (org, employee, recorded_at) index serve the range */
function dayBounds(date: string): [string, string] {
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const end = new Date(y, m - 1, d + 1).getTime();
  return [toMysqlDatetime(start), toMysqlDatetime(end)];
}

/** Row shape for a batched breadcrumb insert */
export interface BreadcrumbRow {
  organization_id: number;
  employee_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  source: string;
  recorded_at: string;
}

/** Row shape for a batched live-snapshot upsert */
export interface LiveRow {
  organization_id: number;
  employee_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  address: string | null;
  last_ping_at: string;
}

// Optional history columns added by 20260926000001 — detected once so the module
// keeps working on databases where that migration has not been applied yet.
// (SHOW COLUMNS, not columnInfo(): getKnex()'s camelCasing mangles columnInfo.)
let historyColumnsPromise: Promise<Set<string>> | null = null;
function historyColumns(): Promise<Set<string>> {
  if (!historyColumnsPromise) {
    historyColumnsPromise = getKnex()
      .raw('SHOW COLUMNS FROM employee_location_history')
      .then(([rows]: any) => new Set<string>((rows as any[]).map((r) => String(r.Field ?? r.field))))
      .catch(() => {
        historyColumnsPromise = null;
        return new Set<string>();
      });
  }
  return historyColumnsPromise;
}

export class LivetrackingRepository {
  private db = getKnex();

  // -------------------------------------------------------
  // Batched writes used by the location ingest pipeline
  // -------------------------------------------------------
  async insertBreadcrumbs(rows: BreadcrumbRow[]): Promise<void> {
    if (rows.length === 0) return;
    const cols = await historyColumns();
    const hasHeading = cols.has('heading');
    const hasSource = cols.has('source');
    const data = rows.map(({ heading, source, ...rest }) => ({
      ...rest,
      ...(hasHeading ? { heading } : {}),
      ...(hasSource ? { source } : {}),
    }));
    await this.db('employee_location_history').insert(data);
  }

  async upsertLiveRows(rows: LiveRow[]): Promise<void> {
    if (rows.length === 0) return;
    const now = this._mysqlNow();
    const data = rows.map((r) => ({ ...r, location_status: 'ON', connection_status: 'ONLINE', updated_at: now }));
    await this.db('employee_live_locations')
      .insert(data)
      .onConflict(['organization_id', 'employee_id'])
      .merge([
        'latitude',
        'longitude',
        'accuracy',
        'speed',
        'heading',
        'address',
        'location_status',
        'connection_status',
        'last_ping_at',
        'updated_at',
      ]);
  }

  /** Store the road-snapped position next to a raw breadcrumb (no-op before the migration) */
  async setBreadcrumbSnap(
    organizationId: number,
    employeeId: number,
    recordedAt: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const cols = await historyColumns();
    if (!cols.has('snapped_latitude')) return;
    await this.db('employee_location_history')
      .where({ organization_id: organizationId, employee_id: employeeId, recorded_at: recordedAt })
      .update({ snapped_latitude: latitude, snapped_longitude: longitude });
  }

  /** Latest stored breadcrumb for a day — seeds the ingest state after a reconnect/restart */
  async getLastBreadcrumb(
    ctx: TenantContext,
    employeeId: number,
    date: string
  ): Promise<{ latitude: number; longitude: number; recordedAtMs: number } | null> {
    const [start, end] = dayBounds(date);
    const row = await this.db('employee_location_history')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('recorded_at', '>=', start)
      .where('recorded_at', '<', end)
      .orderBy('recorded_at', 'desc')
      .select('latitude', 'longitude', 'recorded_at')
      .first();
    if (!row) return null;
    const ts = new Date(row.recordedAt ?? row.recorded_at).getTime();
    return { latitude: Number(row.latitude), longitude: Number(row.longitude), recordedAtMs: ts };
  }

  /**
   * One day's breadcrumbs for many employees in a single query (dashboard seeding).
   * Returned per employee as compact [lat, lng, epochMs] tuples.
   */
  async getTrailsForEmployees(
    ctx: TenantContext,
    employeeIds: number[],
    date: string
  ): Promise<Map<number, Array<[number, number, number]>>> {
    const result = new Map<number, Array<[number, number, number]>>();
    if (employeeIds.length === 0) return result;
    const [start, end] = dayBounds(date);
    const rows = await this.db('employee_location_history')
      .where('organization_id', ctx.organizationId)
      .whereIn('employee_id', employeeIds)
      .where('recorded_at', '>=', start)
      .where('recorded_at', '<', end)
      .orderBy([{ column: 'employee_id' }, { column: 'recorded_at' }])
      .select('employee_id', 'latitude', 'longitude', 'recorded_at');

    for (const r of rows as any[]) {
      const empId = Number(r.employeeId ?? r.employee_id);
      let trail = result.get(empId);
      if (!trail) {
        trail = [];
        result.set(empId, trail);
      }
      trail.push([Number(r.latitude), Number(r.longitude), new Date(r.recordedAt ?? r.recorded_at).getTime()]);
    }
    return result;
  }

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
        address: payload.address ?? null,
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
        // A new position invalidates the previous address; keep one only when re-supplied
        address: payload.address ?? null,
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
  // Update location_status (ON/OFF) without changing coordinates.
  // Returns true only when the stored status actually changed.
  // -------------------------------------------------------
  async updateLocationStatus(
    ctx: TenantContext,
    employeeId: number,
    status: 'ON' | 'OFF'
  ): Promise<boolean> {
    const now = this._mysqlNow();
    const affected = await this.db('employee_live_locations')
      .where({ organization_id: ctx.organizationId, employee_id: employeeId })
      .whereNot('location_status', status)
      .update({ location_status: status, updated_at: now });
    return Number(affected) > 0;
  }

  // -------------------------------------------------------
  // Mark every row OFFLINE — run at server start, when no socket can be connected
  // -------------------------------------------------------
  async markAllOffline(): Promise<void> {
    await this.db('employee_live_locations')
      .where('connection_status', 'ONLINE')
      .update({ connection_status: 'OFFLINE', updated_at: this._mysqlNow() });
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
  // Get a single employee's own live snapshot (self-only view)
  // -------------------------------------------------------
  async getLiveLocationForEmployee(
    ctx: TenantContext,
    employeeId: number
  ): Promise<LiveEmployeeSnapshot[]> {
    return this._buildLiveQuery(ctx).where('e.id', employeeId);
  }

  // -------------------------------------------------------
  // Get live snapshots for a set of employees (manager + their reporting tree)
  // -------------------------------------------------------
  async getLiveLocationsForEmployees(
    ctx: TenantContext,
    employeeIds: number[]
  ): Promise<LiveEmployeeSnapshot[]> {
    if (employeeIds.length === 0) return [];
    return this._buildLiveQuery(ctx).whereIn('e.id', employeeIds);
  }

  // -------------------------------------------------------
  // Get historical location breadcrumbs for route playback
  // -------------------------------------------------------
  async getLocationHistory(
    ctx: TenantContext,
    employeeId: number,
    date: string // 'YYYY-MM-DD'
  ): Promise<any[]> {
    const [start, end] = dayBounds(date);
    const cols = await historyColumns();
    const extra = ['heading', 'snapped_latitude', 'snapped_longitude'].filter((c) => cols.has(c));
    const rows = await this.db('employee_location_history')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .where('recorded_at', '>=', start)
      .where('recorded_at', '<', end)
      .orderBy('recorded_at', 'asc')
      .select('latitude', 'longitude', 'speed', 'recorded_at', ...extra);

    const num = (v: any) => (v != null ? Number(v) : null);
    return rows.map((r: any) => {
      const recTime = r.recordedAt || r.recorded_at || new Date().toISOString();
      return {
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        speed: num(r.speed),
        heading: num(r.heading),
        // Road-snapped position when a routing engine produced one — the raw
        // latitude/longitude above is always the device's actual GPS fix.
        snapped_latitude: num(r.snappedLatitude ?? r.snapped_latitude),
        snapped_longitude: num(r.snappedLongitude ?? r.snapped_longitude),
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
      // ── Attendance: the employee's LATEST record from today/yesterday (yesterday
      //    covers night shifts). Joining the whole record by id keeps check-in,
      //    check-out and status consistent — taking MAX() of each column
      //    independently mixed yesterday's check-out with today's check-in, so
      //    anyone who checked out yesterday looked "checked out" all day today. ──
      .leftJoin(
        db('attendance_records')
          .where('organization_id', ctx.organizationId)
          .whereNull('deleted_at')
          .whereRaw('check_in_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)')
          .groupBy('employee_id')
          .select('employee_id', db.raw('MAX(id) as ar_id'))
          .as('ar_latest'),
        'ar_latest.employee_id',
        'e.id'
      )
      .leftJoin('attendance_records as ar', 'ar.id', 'ar_latest.ar_id')
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
        // Correlated lookup, not a join — an employee linked to 2+ users rows
        // used to appear twice on the dashboard.
        db.raw(
          "COALESCE(NULLIF(e.avatar_url, ''), (SELECT u.avatar_url FROM users u WHERE u.employee_id = e.id AND u.organization_id = e.organization_id AND u.avatar_url IS NOT NULL AND u.avatar_url <> '' LIMIT 1), '') as avatar_url"
        ),
        db.raw("COALESCE(d.name, '') as department"),
        'e.current_department_id as department_id',
        db.raw("COALESCE(desig.name, '') as designation"),
        db.raw("COALESCE(b.name, '') as branch"),
        'e.current_branch_id as branch_id',
        'e.reporting_manager_id',
        db.raw("TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager"),
        // ── Live location — NULL when there's no ping today. This used to fall
        //    back to a hard-coded Mumbai point, plotting every un-pinged employee
        //    there as if it were a real position. ──
        db.raw("CASE WHEN DATE(ll.last_ping_at) = CURDATE() THEN CAST(ll.latitude AS DOUBLE) ELSE NULL END as latitude"),
        db.raw("CASE WHEN DATE(ll.last_ping_at) = CURDATE() THEN CAST(ll.longitude AS DOUBLE) ELSE NULL END as longitude"),
        db.raw("COALESCE(ll.address, '') as address"),
        // No live row = never tracked → OFF / OFFLINE, not ON / ONLINE
        db.raw("COALESCE(ll.location_status, 'OFF') as location_status"),
        db.raw("COALESCE(ll.connection_status, 'OFFLINE') as connection_status"),
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
    // Only touch location_walk when the caller supplies it — merging NULL used
    // to wipe the stored walk whenever a caller recalculated metrics only.
    const walkPatch = metrics.locationWalk !== undefined ? { location_walk: metrics.locationWalk } : {};

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
        ...walkPatch,
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
        ...walkPatch,
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
    const today = localDateStr();
    const breadcrumbs = await this.getLocationHistory(ctx, employeeId, today);
    if (breadcrumbs && breadcrumbs.length > 0) {
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
