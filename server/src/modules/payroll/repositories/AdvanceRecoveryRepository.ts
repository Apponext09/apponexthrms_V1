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
    return this.db()
      .where({ organization_id: ctx.organizationId, advance_id: advanceId })
      .orderBy('recovery_month', 'asc');
  }

  async getMonthlyRecovery(ctx: TenantContext, advanceId: number): Promise<number> {
    const advance = await this.db()
      .select('advance_amount', 'recovery_months')
      .from('salary_advances')
      .where({ id: advanceId })
      .first();

    if (!advance) return 0;
    return Math.ceil(advance.advance_amount / advance.recovery_months);
  }
}

