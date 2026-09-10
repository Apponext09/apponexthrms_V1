import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeaveAccrual {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  leave_type_id: number;
  accrual_date: string;
  accrual_type: 'monthly' | 'quarterly' | 'yearly';
  accrued_days: number;
  policy_id: number;
  processed: boolean;
  notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LeaveAccrualRepository extends BaseRepository<LeaveAccrual> {
  constructor() {
    super('leave_accruals');
    this.companyScoped = true;
  }

  /**
   * Get accruals for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get unprocessed accruals
   */
  async getUnprocessed(ctx: TenantContext, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { processed: false },
    });
  }

  /**
   * Get accruals by type and date
   */
  async getByTypeAndDate(
    ctx: TenantContext,
    accrualType: string,
    fromDate: string,
    toDate: string,
    options?: ListQueryOptions
  ) {
    return this.list(ctx, {
      ...options,
      filters: { accrual_type: accrualType },
    });
  }

  /**
   * Mark accruals as processed
   */
  async markProcessed(ctx: TenantContext, ids: number[]): Promise<void> {
    await this.query(ctx)
      .whereIn('id', ids)
      .update({ processed: true, updated_at: new Date().toISOString() });
  }

  /**
   * Get total accrued for employee in period
   */
  async getTotalAccruedInPeriod(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    fromDate: string,
    toDate: string
  ): Promise<number> {
    const result = await this.query(ctx)
      .where('employee_id', employeeId)
      .where('leave_type_id', leaveTypeId)
      .where('accrual_date', '>=', fromDate)
      .where('accrual_date', '<=', toDate)
      .sum('accrued_days as total')
      .first() as any;
    return result?.total || 0;
  }
}
