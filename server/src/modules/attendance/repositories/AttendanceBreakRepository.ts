import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendanceBreak {
  id: number;
  uuid: string;
  organization_id: number;
  attendance_record_id: number;
  break_start_time: string;
  break_end_time: string | null;
  break_duration_minutes: number | null;
  /** Dynamic break type name from settings (e.g. 'Lunch Break', 'Tea Break') — null until stop */
  break_type: string | null;
  /** Reference to breaks.id in settings table */
  break_setting_id: number | null;
  status: 'active' | 'paused' | 'completed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AttendanceBreakRepository extends BaseRepository<AttendanceBreak> {
  constructor() {
    super('attendance_breaks');
  }

  async getByRecord(ctx: TenantContext, recordId: number): Promise<AttendanceBreak[]> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .orderBy('break_start_time', 'asc');
  }

  async getActiveBreak(ctx: TenantContext, recordId: number): Promise<AttendanceBreak | null> {
    return this.query(ctx)
      .where('attendance_record_id', recordId)
      .where('status', 'active')
      .first() as Promise<AttendanceBreak | null>;
  }

  async getTotalBreakDuration(ctx: TenantContext, recordId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('attendance_record_id', recordId)
      .where('status', 'completed')
      .sum('break_duration_minutes', { as: 'total' })
      .first();

    const total = Number((result as any)?.total);
    return isNaN(total) ? 0 : total;
  }

  /**
   * Get break log rows for reporting — employee-wise, date-wise, type-wise
   */
  async getBreakLogs(
    ctx: TenantContext,
    filters: {
      companyId?: number;
      locationId?: number;
      departmentId?: number;
      reportingManagerId?: number;
      employeeId?: number;
      startDate?: string;
      endDate?: string;
      breakTypeName?: string;
    }
  ): Promise<any[]> {
    const { db } = await import('../../../db/knex');
    let query = db('attendance_breaks as ab')
      .join('attendance_records as ar', 'ab.attendance_record_id', 'ar.id')
      .join('employees as e', 'ar.employee_id', 'e.id')
      .where('ab.organization_id', ctx.organizationId)
      .where('ab.status', 'completed')
      .whereNull('ab.deleted_at')
      .select(
        db.raw('DATE(ab.break_start_time) as date'),
        'e.id as employee_id',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code',
        'e.company_id',
        'e.current_location_id',
        'e.current_department_id',
        'e.reporting_manager_id',
        db.raw("COALESCE(ab.break_type, 'General Break') as break_type_name"),
        'ab.break_setting_id',
        'ab.break_start_time',
        'ab.break_end_time',
        'ab.break_duration_minutes',
        'ab.status'
      )
      .orderBy('date', 'desc')
      .orderBy('employee_name', 'asc')
      .orderBy('ab.break_start_time', 'asc');

    if (filters.companyId) {
      query = query.where((builder) => {
        builder.where('e.company_id', filters.companyId).orWhere('ar.company_id', filters.companyId);
      });
    }
    if (filters.locationId) {
      query = query.where((builder) => {
        builder
          .where('e.current_location_id', filters.locationId)
          .orWhere('ar.check_in_location_id', filters.locationId)
          .orWhere('ar.check_out_location_id', filters.locationId);
      });
    }
    if (filters.departmentId) {
      query = query.where('e.current_department_id', filters.departmentId);
    }
    if (filters.reportingManagerId) {
      query = query.where('e.reporting_manager_id', filters.reportingManagerId);
    }
    if (filters.employeeId) {
      query = query.where('ar.employee_id', filters.employeeId);
    }
    if (filters.startDate) {
      query = query.whereRaw('DATE(ab.break_start_time) >= ?', [filters.startDate]);
    }
    if (filters.endDate) {
      query = query.whereRaw('DATE(ab.break_start_time) <= ?', [filters.endDate]);
    }
    if (filters.breakTypeName) {
      query = query.where('ab.break_type', filters.breakTypeName);
    }

    return query;
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
