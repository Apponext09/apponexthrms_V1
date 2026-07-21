import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface TaxDeclaration {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  financial_year: string;
  pan_number: string | null;
  declaration_date: string;
  status: 'pending' | 'declared' | 'finalized';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TaxDeclarationRepository extends BaseRepository<TaxDeclaration> {
  constructor() {
    super('tax_declarations');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions): Promise<TaxDeclaration[]> {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      orderBy: [{ field: 'financial_year', direction: 'desc' }]
    });
  }

  async getForFinancialYear(ctx: TenantContext, employeeId: number, fy: string): Promise<TaxDeclaration | null> {
    return this.db()
      .where({ organization_id: ctx.organizationId, employee_id: employeeId, financial_year: fy })
      .whereNull('deleted_at')
      .first();
  }

  async getByStatus(ctx: TenantContext, status: string, options?: ListQueryOptions): Promise<TaxDeclaration[]> {
    return this.list(ctx, {
      ...options,
      filters: { status }
    });
  }
}

