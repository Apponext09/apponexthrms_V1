import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface AdvanceRecovery {
  id: number;
  uuid: string;
  organization_id: number;
  advance_id: number;
  recovery_month: string;
  recovery_amount: number;
  payroll_run_id: number | null;
  created_at: string;
}

export class AdvanceRecoveryRepository extends BaseRepository<AdvanceRecovery> {
  constructor() {
    super('advance_recoveries');
  }

  async getForAdvance(ctx: TenantContext, advanceId: number): Promise<AdvanceRecovery[]> {
    return this.query(ctx)
      .where('advance_id', advanceId)
      .orderBy('recovery_month', 'asc');
  }

  async getMonthlyRecovery(ctx: TenantContext, advanceId: number): Promise<number> {
    const advance = await this.db('salary_advances')
      .select('advance_amount', 'recovery_months')
      .where({ id: advanceId, organization_id: ctx.organizationId })
      .first();

    if (!advance || !advance.recovery_months) return 0;
    return Math.ceil(Number(advance.advance_amount) / Number(advance.recovery_months));
  }
}

