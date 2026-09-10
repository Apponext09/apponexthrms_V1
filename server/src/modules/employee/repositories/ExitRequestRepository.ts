import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface ExitRequest {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  resignation_date: string;
  last_working_day: string;
  reason_for_leaving: string | null;
  notice_period_served: number | null;
  status: 'initiated' | 'approved' | 'rejected' | 'completed';
  workflow_instance_id: number | null;
  approved_by: number | null;
  approval_date: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ExitRequestRepository extends BaseRepository<ExitRequest> {
  constructor() {
    super('exit_requests');
  }

  /**
   * Get exit request by employee
   */
  async getByEmployee(ctx: TenantContext, employeeId: number): Promise<ExitRequest | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .orderBy('created_at', 'desc')
      .first() as Promise<ExitRequest | null>;
  }

  /**
   * Get pending exit requests
   */
  async getPending(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'initiated' },
    });
  }

  /**
   * Get exit requests by status
   */
  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status },
    });
  }

  /**
   * Get employees with active exit (notice period)
   */
  async getActiveExits(ctx: TenantContext) {
    return this.query(ctx)
      .where('status', 'approved')
      .where('last_working_day', '>=', new Date().toISOString())
      .select();
  }

  protected getSearchableFields(): string[] {
    return ['reason_for_leaving'];
  }
}
