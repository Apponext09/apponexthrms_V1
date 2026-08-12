import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface CompOffBalance {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  comp_off_earned_date: string;
  comp_off_earned_hours: number;
  comp_off_expires_at: string | null;
  comp_off_used_date: string | null;
  comp_off_used_hours: number | null;
  status: 'available' | 'used' | 'expired';
  reason: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class CompOffBalanceRepository extends BaseRepository<CompOffBalance> {
  constructor() {
    super('comp_off_balances');
    this.companyScoped = true;
  }

  /**
   * Get balance for employee
   */
  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
    });
  }

  /**
   * Get available comp off for employee
   */
  async getAvailableForEmployee(ctx: TenantContext, employeeId: number): Promise<CompOffBalance[]> {
    return this.query(ctx)
      .where('employee_id', employeeId)
      .where('status', 'available')
      .orderBy('comp_off_earned_date', 'asc') as Promise<CompOffBalance[]>;
  }

  /**
   * Get expired comp off
   */
  async getExpired(ctx: TenantContext, beforeDate: string, options?: ListQueryOptions) {
    return this.list(ctx, {
      ...options,
      filters: { status: 'available' },
    });
  }

  /**
   * Get total available hours for employee
   */
  async getTotalAvailableHours(ctx: TenantContext, employeeId: number): Promise<number> {
    const result = await this.query(ctx)
      .where('employee_id', employeeId)
      .where('status', 'available')
      .sum('comp_off_earned_hours as total')
      .first() as any;
    return result?.total || 0;
  }
}
