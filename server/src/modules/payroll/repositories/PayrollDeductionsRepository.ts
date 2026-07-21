import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface PayrollDeduction {
  id: number;
  uuid: string;
  organization_id: number;
  payroll_run_employee_id: number;
  component_id: number;
  calculated_value: number;
  actual_value: number;
  created_at: string;
}

export class PayrollDeductionsRepository extends BaseRepository<PayrollDeduction> {
  constructor() {
    super('payroll_deductions');
  }

  async getForEmployee(ctx: TenantContext, payrollRunEmployeeId: number): Promise<PayrollDeduction[]> {
    return this.db()
      .where({ organization_id: ctx.organizationId, payroll_run_employee_id: payrollRunEmployeeId })
      .orderBy('created_at', 'asc');
  }

  async getTotalDeductions(ctx: TenantContext, payrollRunEmployeeId: number): Promise<number> {
    const result = await this.db()
      .where({ organization_id: ctx.organizationId, payroll_run_employee_id: payrollRunEmployeeId })
      .sum('actual_value as total')
      .first();
    return result?.total || 0;
  }
}

