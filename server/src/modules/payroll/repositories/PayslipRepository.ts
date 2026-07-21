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
    return this.list(ctx, {
      ...options,
      filters: { employee_id: employeeId },
      orderBy: [{ field: 'payslip_month', direction: 'desc' }]
    });
  }

  async getByNumber(ctx: TenantContext, number: string): Promise<Payslip | null> {
    return this.db()
      .where({ organization_id: ctx.organizationId, payslip_number: number })
      .whereNull('deleted_at')
      .first();
  }

  async getForPayrollRun(ctx: TenantContext, payrollRunId: number): Promise<Payslip[]> {
    return this.list(ctx, {
      filters: { payroll_run_id: payrollRunId }
    });
  }

  async markAsSent(ctx: TenantContext, payslipId: number): Promise<Payslip> {
    const [record] = await this.db()
      .where({ id: payslipId })
      .update({ sent_to_employee_at: new Date().toISOString() })
      .returning('*');
    return record;
  }

  async markAsLocked(ctx: TenantContext, payslipId: number): Promise<Payslip> {
    const [record] = await this.db()
      .where({ id: payslipId })
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .returning('*');
    return record;
  }
}

