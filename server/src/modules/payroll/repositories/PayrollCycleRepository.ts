import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PayrollCycle {
  id: number;
  uuid: string;
  organization_id: number;
  cycle_name: string;
  cycle_code: string;
  cycle_type: 'monthly' | 'biweekly' | 'weekly' | 'fortnightly';
  cycle_start_date: string;
  cycle_end_date: string;
  payroll_run_date: string;
  salary_credit_date: string;
  is_current_cycle: boolean;
  status: 'open' | 'locked' | 'closed';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollCycleRepository extends BaseRepository<PayrollCycle> {
  constructor() {
    super('payroll_cycles');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<PayrollCycle | null> {
    return this.query(ctx)
      .where({ cycle_code: code })
      .first();
  }

  async getCurrentCycle(ctx: TenantContext): Promise<PayrollCycle | null> {
    return this.query(ctx)
      .where({ is_current_cycle: true })
      .first();
  }

  async listActive(ctx: TenantContext, options?: ListQueryOptions): Promise<PayrollCycle[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { status: 'open' }
    });
    return result.items;
  }

  async setCurrentCycle(ctx: TenantContext, cycleId: number): Promise<void> {
    await this.query(ctx).update({ is_current_cycle: false } as any);
    await this.update(ctx, cycleId, { is_current_cycle: true } as any);
  }
}

