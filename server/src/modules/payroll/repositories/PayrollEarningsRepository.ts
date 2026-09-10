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
      .leftJoin('payroll_components as pc', 'payroll_earnings.component_id', 'pc.id')
      .leftJoin('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
      .where({ 'payroll_earnings.payroll_run_employee_id': payrollRunEmployeeId })
      .select(
        'payroll_earnings.*',
        this.db.raw('COALESCE(payroll_earnings.component_name, pc.name, payroll_earnings.formula_used) as component_name'),
        'pcg.name as group_name',
        'pcg.category as category',
        'pcg.group_for_payslip as group_for_payslip'
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

