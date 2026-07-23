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

  async getForEmployee(ctx: TenantContext, payrollRunEmployeeId: number): Promise<any[]> {
    return this.query(ctx)
      .join('salary_components', 'payroll_deductions.component_id', 'salary_components.id')
      .where({ 'payroll_deductions.payroll_run_employee_id': payrollRunEmployeeId })
      .select(
        'payroll_deductions.*',
        'salary_components.component_name',
        'salary_components.component_code'
      )
      .orderBy('payroll_deductions.created_at', 'asc');
  }

  async getTotalDeductions(ctx: TenantContext, payrollRunEmployeeId: number): Promise<number> {
    const result = await this.query(ctx)
      .where({ payroll_run_employee_id: payrollRunEmployeeId })
      .sum('actual_value as total')
      .first() as any;
    return Number(result?.total || 0);
  }
}

