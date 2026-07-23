import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface PayrollEarning {
  id: number;
  uuid: string;
  organization_id: number;
  payroll_run_employee_id: number;
  component_id: number;
  calculated_value: number;
  actual_value: number;
  formula_used: string | null;
  created_at: string;
}

export class PayrollEarningsRepository extends BaseRepository<PayrollEarning> {
  constructor() {
    super('payroll_earnings');
  }

  async getForEmployee(ctx: TenantContext, payrollRunEmployeeId: number): Promise<any[]> {
    return this.query(ctx)
      .join('salary_components', 'payroll_earnings.component_id', 'salary_components.id')
      .where({ 'payroll_earnings.payroll_run_employee_id': payrollRunEmployeeId })
      .select(
        'payroll_earnings.*',
        'salary_components.component_name',
        'salary_components.component_code'
      )
      .orderBy('payroll_earnings.created_at', 'asc');
  }

  async getTotalEarnings(ctx: TenantContext, payrollRunEmployeeId: number): Promise<number> {
    const result = await this.query(ctx)
      .where({ payroll_run_employee_id: payrollRunEmployeeId })
      .sum('actual_value as total')
      .first() as any;
    return Number(result?.total || 0);
  }
}

