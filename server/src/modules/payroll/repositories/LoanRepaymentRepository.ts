import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface LoanRepayment {
  id: number;
  uuid: string;
  organization_id: number;
  loan_id: number;
  emi_number: number;
  emi_amount: number;
  interest_amount: number;
  principal_amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid';
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class LoanRepaymentRepository extends BaseRepository<LoanRepayment> {
  constructor() {
    super('loan_repayments');
  }

  async getForLoan(ctx: TenantContext, loanId: number, options?: ListQueryOptions): Promise<LoanRepayment[]> {
    return this.list(ctx, {
      ...options,
      filters: { loan_id: loanId },
      orderBy: [{ field: 'emi_number', direction: 'asc' }]
    });
  }

  async getPendingEMIs(ctx: TenantContext, loanId: number): Promise<LoanRepayment[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, loan_id: loanId, status: 'pending' })
      .whereNull('deleted_at')
      .orderBy('due_date', 'asc');
  }

  async getNextEMI(ctx: TenantContext, loanId: number): Promise<LoanRepayment | null> {
    return this.db()
      .where({ organization_id: ctx.organizationId, loan_id: loanId, status: 'pending' })
      .whereNull('deleted_at')
      .orderBy('emi_number', 'asc')
      .first();
  }
}

