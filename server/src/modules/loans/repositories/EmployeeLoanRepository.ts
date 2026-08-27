import { getKnex } from '../../../db/knex';
import type { TenantContext } from '../../../db/types';

export class EmployeeLoanRepository {
  private get db() {
    return getKnex();
  }

  async create(ctx: TenantContext, data: any) {
    const [id] = await this.db('employee_loans').insert({
      ...data,
      organization_id: ctx.organizationId,
    });
    return this.findById(ctx, id);
  }

  async findById(ctx: TenantContext, id: number) {
    return this.db('employee_loans')
      .where({ id, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .first();
  }

  async findByEmployee(ctx: TenantContext, employeeId: number) {
    return this.db('employee_loans')
      .where({ employee_id: employeeId, organization_id: ctx.organizationId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');
  }

  async findActiveLoans(ctx: TenantContext, employeeId?: number) {
    const query = this.db('employee_loans')
      .where({ status: 'active', organization_id: ctx.organizationId })
      .whereNull('deleted_at');

    if (employeeId) {
      query.where({ employee_id: employeeId });
    }

    return query;
  }

  async update(ctx: TenantContext, id: number, data: any) {
    await this.db('employee_loans')
      .where({ id, organization_id: ctx.organizationId })
      .update({
        ...data,
        updated_at: new Date(),
      });
    return this.findById(ctx, id);
  }
}
