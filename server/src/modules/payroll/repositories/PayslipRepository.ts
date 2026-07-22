import { BaseRepository } from '../../../db/BaseRepository';
import type { TenantContext, ListQueryOptions } from '../../../db/types';

export interface Payslip {
  id: number;
  uuid: string;
  organization_id: number;
  employee_id: number;
  payroll_run_id: number;
  payslip_month: string;
  payslip_number: string;
  ctc: number;
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  ytd_gross: number;
  ytd_tax: number;
  ytd_net: number;
  payslip_pdf_url: string | null;
  payslip_html: string | null;
  is_locked: boolean;
  locked_at: string | null;
  digitally_signed: boolean;
  signature_timestamp: string | null;
  sent_to_employee_at: string | null;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class PayslipRepository extends BaseRepository<Payslip> {
  constructor() {
    super('payslips');
  }

  async getForEmployee(ctx: TenantContext, employeeId: number, options?: ListQueryOptions): Promise<Payslip[]> {
    const result = await this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      sortBy: 'payslip_month',
      sortOrder: 'desc'
    });
    return result.items;
  }

  async getByNumber(ctx: TenantContext, number: string): Promise<Payslip | null> {
    return this.query(ctx)
      .where({ payslip_number: number })
      .first();
  }

  async getForPayrollRun(ctx: TenantContext, payrollRunId: number): Promise<Payslip[]> {
    const result = await this.list(ctx, {
      filters: { payroll_run_id: payrollRunId }
    });
    return result.items;
  }

  async markAsSent(ctx: TenantContext, payslipId: number): Promise<Payslip> {
    return this.update(ctx, payslipId, { sent_to_employee_at: new Date().toISOString() } as any);
  }

  async markAsLocked(ctx: TenantContext, payslipId: number): Promise<Payslip> {
    return this.update(ctx, payslipId, { is_locked: true, locked_at: new Date().toISOString() } as any);
  }
}

