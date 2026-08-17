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
    // component_id references payroll_components (not the empty, dead
    // salary_components table) and is nullable — some line items (e.g.
    // Special Allowance) have no exact catalog match, so this must be a
    // left join or those rows vanish entirely.
    return this.query(ctx)
      .leftJoin('payroll_components', 'payroll_earnings.component_id', 'payroll_components.id')
      .where({ 'payroll_earnings.payroll_run_employee_id': payrollRunEmployeeId })
      .select(
        'payroll_earnings.*',
        'payroll_components.name as component_name'
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

