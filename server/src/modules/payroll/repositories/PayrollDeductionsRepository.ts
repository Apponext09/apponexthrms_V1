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
    // component_id references payroll_components (not the empty, dead
    // salary_components table) and is nullable — rows carry their own
    // component_name text label as a fallback when there's no catalog match.
    return this.query(ctx)
      .leftJoin('payroll_components as pc', 'payroll_deductions.component_id', 'pc.id')
      .leftJoin('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
      .where({ 'payroll_deductions.payroll_run_employee_id': payrollRunEmployeeId })
      .select(
        'payroll_deductions.*',
        this.db.raw('COALESCE(payroll_deductions.component_name, pc.name) as component_name'),
        'pcg.name as group_name',
        'pcg.category as category',
        'pcg.group_for_payslip as group_for_payslip'
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

