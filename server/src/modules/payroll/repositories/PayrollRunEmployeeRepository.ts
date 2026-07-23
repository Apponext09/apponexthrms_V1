import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface PayrollRunEmployee {
  id: number;
  uuid: string;
  organization_id: number;
  payroll_run_id: number;
  employee_id: number;
  status: 'pending' | 'processed' | 'error';
  working_days: number | null;
  leave_days: number | null;
  paid_leave_days: number | null;
  unpaid_leave_days: number | null;
  overtime_hours: number | null;
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  tax_deducted: number;
  processing_notes: string | null;
  processed_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayrollRunEmployeeRepository extends BaseRepository<PayrollRunEmployee> {
  constructor() {
    super('payroll_run_employees');
  }

  async getForRun(ctx: TenantContext, payrollRunId: number, options?: ListQueryOptions): Promise<PayrollRunEmployee[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { payroll_run_id: payrollRunId }
    });
    return result.items;
  }

  async getForEmployee(ctx: TenantContext, payrollRunId: number, employeeId: number): Promise<PayrollRunEmployee | null> {
    return this.query(ctx)
      .where({ payroll_run_id: payrollRunId, employee_id: employeeId })
      .first();
  }

  async getByStatus(ctx: TenantContext, payrollRunId: number, status: string): Promise<PayrollRunEmployee[]> {
    const result = await this.list(ctx, {
      filters: { payroll_run_id: payrollRunId, status }
    });
    return result.items;
  }

  async updateProcessingStatus(ctx: TenantContext, id: number, status: string, notes?: string): Promise<PayrollRunEmployee> {
    const data: any = { status, processed_at: new Date().toISOString(), updated_by: ctx.userId };
    if (notes) data.processing_notes = notes;
    return this.update(ctx, id, data);
  }
}

