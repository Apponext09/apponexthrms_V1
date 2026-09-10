import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface FullFinalSettlement {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  exit_date: string;
  notice_period_days: number;
  notice_period_recovery: number;
  leave_encashment_amount: number;
  gratuity_amount: number;
  bonus_settlement: number;
  asset_recovery_amount: number;
  other_deductions: number;
  total_settlement_amount: number;
  workflow_instance_id: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'processed';
  approved_by: number | null;
  approval_date: string | null;
  processed_date: string | null;
  settlement_notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class FullFinalSettlementRepository extends BaseRepository<FullFinalSettlement> {
  constructor() {
    super('full_final_settlements');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number): Promise<FullFinalSettlement | null> {
    return this.query(ctx)
      .where({ employee_id: employeeId })
      .orderBy('created_at', 'desc')
      .first();
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<FullFinalSettlement[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getPendingApprovals(ctx: TenantContext): Promise<FullFinalSettlement[]> {
    return this.getByStatus(ctx, 'submitted');
  }
}

