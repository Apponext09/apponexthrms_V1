import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class LoanRepaymentRepository {
  private get db() {
    return getKnex();
  }

  async create(ctx: TenantContext, data: any) {
    const [id] = await this.db('loan_repayments').insert({
      ...data,
      organization_id: ctx.organizationId,
    });
    return this.findById(ctx, id);
  }

  async findById(ctx: TenantContext, id: number) {
    return this.db('loan_repayments')
      .where({ id, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .first();
  }

  async findByLoan(ctx: TenantContext, loanId: number) {
    return this.db('loan_repayments')
      .where({ loan_id: loanId, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .orderBy('due_date', 'asc');
  }

  async findPendingRepayments(ctx: TenantContext, employeeId?: number) {
    const query = this.db('loan_repayments')
      .where({ status: 'pending', organization_id: ctx.organizationId })
      .whereNull('deleted_at');

    if (employeeId) {
      query.where({ employee_id: employeeId });
    }

    return query;
  }

  async update(ctx: TenantContext, id: number, data: any) {
    await this.db('loan_repayments')
      .where({ id, organization_id: ctx.organizationId })
      .update({
        ...data,
        updated_at: new Date(),
      });
    return this.findById(ctx, id);
  }
}
