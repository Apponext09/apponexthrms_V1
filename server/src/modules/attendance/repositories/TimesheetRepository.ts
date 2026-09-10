import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Timesheet {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  timesheet_period_start: string;
  timesheet_period_end: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_by: number | null;
  submitted_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TimesheetRepository extends BaseRepository<Timesheet> {
  constructor() {
    super('timesheets');
  }

  async getByEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'timesheet_period_start',
      sortOrder: 'desc',
    });
  }

  async getByPeriod(
    ctx: TenantContext,
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<Timesheet | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('timesheet_period_start', startDate)
      .where('timesheet_period_end', endDate)
      .first() as Promise<Timesheet | null>;
  }

  async getPendingApprovals(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'submitted' },
      sortBy: 'submitted_at',
      sortOrder: 'asc',
    });
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  protected getSearchableFields(): string[] {
    return [];
  }
}
