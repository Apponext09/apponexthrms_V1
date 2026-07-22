import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface SalaryComponent {
  id: number;
  uuid: string;
  organization_id: number;
  component_code: string;
  component_name: string;
  component_type: 'earnings' | 'deductions';
  earnings_type?: 'basic' | 'hra' | 'allowance' | 'bonus' | 'variable' | 'overtime' | 'lta' | null;
  deduction_type?: 'pf' | 'esi' | 'pt' | 'tds' | 'lwf' | 'loan' | 'advance' | 'other' | null;
  is_taxable: boolean;
  is_recurring: boolean;
  is_monthly: boolean;
  percentage_of_basic: number | null;
  calculation_method: 'fixed' | 'percentage' | 'formula' | 'formula_based';
  calculation_formula: string | null;
  min_limit: number | null;
  max_limit: number | null;
  sort_order: number;
  status: 'active' | 'inactive';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class SalaryComponentRepository extends BaseRepository<SalaryComponent> {
  constructor() {
    super('salary_components');
  }

  async getByCode(ctx: TenantContext, code: string): Promise<SalaryComponent | null> {
    return this.query(ctx)
      .where({ component_code: code })
      .first();
  }

  async listByType(ctx: TenantContext, type: 'earnings' | 'deductions', options?: ListQueryOptions): Promise<SalaryComponent[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { component_type: type }
    });
    return result.items;
  }

  async listActive(ctx: TenantContext, options?: ListQueryOptions): Promise<SalaryComponent[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { status: 'active' }
    });
    return result.items;
  }

  async getByEarningsType(ctx: TenantContext, earningsType: string): Promise<SalaryComponent | null> {
    return this.query(ctx)
      .where({ earnings_type: earningsType as any, status: 'active' })
      .first();
  }
}

