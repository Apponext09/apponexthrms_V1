import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LeaveBalance {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  leave_type_id: number;
  financial_year_start: string;
  financial_year_end: string;
  opening_balance: number;
  credited_balance: number;
  consumed_balance: number;
  available_balance: number;
  carry_forward_balance: number;
  encashed_balance: number;
  expired_balance: number;
  pending_approval_balance: number;
  last_updated_at: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  carried_forward_negative_days?: number;
}

export class LeaveBalanceRepository extends BaseRepository<LeaveBalance> {
  constructor() {
    super('leave_balances');
    this.companyScoped = true;
  }

  /**
   * Get balance for employee and leave type
   */
  async getBalance(
    ctx: TenantContext,
    employeeId: number,
    leaveTypeId: number,
    fyStart: string
  ): Promise<LeaveBalance | null> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('leave_type_id', leaveTypeId)
      .where('financial_year_start', fyStart)
      .first() as Promise<LeaveBalance | null>;
  }

  /**
   * Get all balances for employee
   */
  async getBalancesForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get balance by leave type for financial year
   */
  async getByLeaveTypeAndYear(
    ctx: TenantContext,
    leaveTypeId: number,
    fyStart: string,
    options?: ListQueryOptions
  ) {
    return this.list(ctx, {
      ...options,
      filters: { leave_type_id: leaveTypeId, financial_year_start: fyStart },
    });
  }

  /**
   * Update available balance
   */
  async updateAvailableBalance(
    ctx: TenantContext,
    id: number,
    consumedDays: number,
    pendingDays: number
  ): Promise<LeaveBalance> {
    const balance = await this.getById(ctx, id);
    if (!balance) {
      throw new Error('Balance not found');
    }

    const newAvailable = balance.opening_balance + balance.credited_balance + balance.carry_forward_balance - balance.encashed_balance - consumedDays;

    return this.update(ctx, id, {
      consumed_balance: consumedDays,
      available_balance: newAvailable,
      pending_approval_balance: pendingDays,
      last_updated_at: new Date().toISOString(),
    } as any);
  }
}
