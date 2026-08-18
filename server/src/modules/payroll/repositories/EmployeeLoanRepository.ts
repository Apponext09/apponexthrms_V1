import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface EmployeeLoan {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  loan_type_id: string | null;
  loan_type: string;
  loan_amount: number;
  loan_date: string;
  tenure_months: number;
  interest_rate: number | null;
  emi: number;
  total_amount_with_interest: number;
  repaid_amount: number;
  outstanding_amount: number;
  status: 'active' | 'closed' | 'defaulted' | 'pending' | 'pending_approval' | 'rejected';
  approved_by: number | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  rejection_reason: string | null;
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
    const result = await this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId }
    });
    return result.items;
  }

  async getActiveLoans(ctx: TenantContext, employeeId: number): Promise<EmployeeLoan[]> {
    const result = await this.list(ctx, {
      filters: { employee_id: employeeId, status: 'active' }
    });
    return result.items;
  }

  async getActiveLoansForPayroll(ctx: TenantContext): Promise<EmployeeLoan[]> {
    return this.query(ctx)
      .where({ status: 'active' });
  }
}

