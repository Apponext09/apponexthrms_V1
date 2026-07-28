import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext } from '../../../db/types';

export interface PayrollAdjustment {
  id: number;
  uuid: string;
  organization_id: number;
  payroll_run_employee_id: number;
  adjustment_type: 'bonus' | 'arrears' | 'deduction' | 'recovery' | 'other';
  adjustment_name: string;
  adjustment_amount: number;
  reference_document_url: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollAdjustmentsRepository extends BaseRepository<PayrollAdjustment> {
  constructor() {
    super('payroll_adjustments');
  }

  async getForEmployee(ctx: TenantContext, payrollRunEmployeeId: number): Promise<PayrollAdjustment[]> {
    return this.query(ctx)
      .where({ payroll_run_employee_id: payrollRunEmployeeId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc');
  }

  async getTotalAdjustments(ctx: TenantContext, payrollRunEmployeeId: number, type?: string): Promise<number> {
    let query = this.query(ctx)
      .where({ payroll_run_employee_id: payrollRunEmployeeId })
      .whereNull('deleted_at');

    if (type) query = query.where({ adjustment_type: type as any });

    const result = await query.sum('adjustment_amount as total').first();
    return Number((result as any)?.total || 0);
  }
}

