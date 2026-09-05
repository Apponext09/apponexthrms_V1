import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PayrollRun {
  id: number;
  payroll_run_id?: number;
  uuid: string;
  organization_id: number;
  payroll_cycle_id: number;
  run_type: 'regular' | 'off_cycle' | 'final_settlement' | 'arrears';
  run_month: string;
  status: 'draft' | 'processing' | 'calculated' | 'locked' | 'approved' | 'published' | 'completed';
  locked_by: number | null;
  locked_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  published_at: string | null;
  total_employees: number;
  processed_employees: number;
  error_count: number;
  processing_notes: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollRunRepository extends BaseRepository<PayrollRun> {
  constructor() {
    super('payroll_runs');
  }

  async getForCycle(ctx: TenantContext, cycleId: number, options?: ListQueryOptions): Promise<PayrollRun[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { payroll_cycle_id: cycleId },
      sortBy: 'run_month',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<PayrollRun[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { status },
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getLatest(ctx: TenantContext, cycleId?: number): Promise<PayrollRun | null> {
    const query = this.query(ctx);
    if (cycleId) query.where({ payroll_cycle_id: cycleId });
    return query.orderBy('run_month', 'desc').first();
  }

  async getPendingApprovals(ctx: TenantContext): Promise<PayrollRun[]> {
    return this.getByStatus(ctx, 'locked');
  }
}

