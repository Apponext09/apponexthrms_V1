import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface TimesheetEntry {
  id: number;
  uuid: string;
  organization_id: number;
  timesheet_id: number;
  entry_date: string;
  project_id: number | null;
  task_name: string;
  task_description: string | null;
  hours_spent: number;
  is_billable: boolean;
  billable_rate: number | null;
  effort_category: string | null;
  entry_status: 'draft' | 'submitted';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TimesheetEntryRepository extends BaseRepository<TimesheetEntry> {
  constructor() {
    super('timesheet_entries');
  }

  async getByTimesheet(ctx: TenantContext, timesheetId: number): Promise<TimesheetEntry[]> {
    return this.query(ctx)
      .where('timesheet_id', timesheetId)
      .orderBy('entry_date', 'asc');
  }

  async getByDate(ctx: TenantContext, timesheetId: number, date: string): Promise<TimesheetEntry[]> {
    return this.query(ctx)
      .where('timesheet_id', timesheetId)
      .where('entry_date', date)
      .orderBy('created_at', 'desc');
  }

  async getTotalHours(ctx: TenantContext, timesheetId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('timesheet_id', timesheetId)
      .sum('hours_spent', { as: 'total' })
      .first();

    return (result as any)?.total || 0;
  }

  async getBillableHours(ctx: TenantContext, timesheetId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('timesheet_id', timesheetId)
      .where('is_billable', true)
      .sum('hours_spent', { as: 'total' })
      .first();

    return (result as any)?.total || 0;
  }

  protected getSearchableFields(): string[] {
    return ['task_name', 'task_description'];
  }
}
