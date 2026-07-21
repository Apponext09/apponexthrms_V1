import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AttendanceSummary {
  id: number;
  organization_id: number;
  employee_id: number;
  summary_month: string;
  present_days: number;
  absent_days: number;
  half_days: number;
  sick_days: number;
  work_from_home_days: number;
  late_arrivals: number;
  early_departures: number;
  overtime_hours: number;
  total_work_hours: number;
  avg_daily_hours: number;
  attendance_percentage: number;
  updated_at: string;
}

export class AttendanceSummaryRepository extends BaseRepository<AttendanceSummary> {
  constructor() {
    super('attendance_summaries');
  }

  async getByMonth(
    ctx: TenantContext,
    employeeId: number,
    month: string
  ): Promise<AttendanceSummary | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('summary_month', month)
      .first() as Promise<AttendanceSummary | null>;
  }

  async getEmployeeSummaries(ctx: TenantContext, employeeId: number): Promise<AttendanceSummary[]> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .orderBy('summary_month', 'desc')
      .limit(12);
  }

  async getDepartmentSummary(ctx: TenantContext, month: string): Promise<AttendanceSummary[]> {
    return this.query(ctx)
      .where('summary_month', month)
      .orderBy('organization_id', 'asc');
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
