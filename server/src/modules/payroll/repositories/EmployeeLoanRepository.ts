import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeLoan {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  loan_type: 'personal' | 'vehicle' | 'home' | 'education';
  loan_amount: number;
  loan_date: string;
  tenure_months: number;
  interest_rate: number | null;
  emi: number;
  total_amount_with_interest: number;
  repaid_amount: number;
  outstanding_amount: number;
  status: 'active' | 'closed' | 'defaulted';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class EmployeeLoanRepository extends BaseRepository<EmployeeLoan> {
  constructor() {
    super('employee_loans');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions): Promise<EmployeeLoan[]> {
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId }
    });
  }

  async getActiveLoans(ctx: TenantContext, employeeId: number): Promise<EmployeeLoan[]> {
    return this.list(ctx, {
      filters: { employee_id: employeeId, status: 'active' }
    });
  }

  async getActiveLoansForPayroll(ctx: TenantContext): Promise<EmployeeLoan[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, status: 'active' })
      .whereNull('deleted_at');
  }
}

