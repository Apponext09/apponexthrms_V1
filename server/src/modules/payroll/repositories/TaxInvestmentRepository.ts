import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface TaxInvestment {
  id: number;
  uuid: string;
  organization_id: number;
  tax_declaration_id: number;
  investment_type: '80c' | '80d' | '80tta' | 'other';
  investment_amount: number;
  investment_proof_url: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TaxInvestmentRepository extends BaseRepository<TaxInvestment> {
  constructor() {
    super('tax_investments');
  }

  async getForDeclaration(ctx: TenantContext, declarationId: number): Promise<TaxInvestment[]> {
    return this.query(ctx)
      .where({ tax_declaration_id: declarationId })
      .orderBy('created_at', 'asc');
  }

  async getTotalInvestments(ctx: TenantContext, declarationId: number): Promise<number> {
    const result = await this.query(ctx)
      .where({ tax_declaration_id: declarationId })
      .sum('investment_amount as total')
      .first() as any;
    return Number(result?.total || 0);
  }
}

