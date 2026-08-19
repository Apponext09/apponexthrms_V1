import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { PayslipRepository } from '../repositories/PayslipRepository';
import { PayrollRunEmployeeRepository } from '../repositories/PayrollRunEmployeeRepository';
import { PayrollEarningsRepository } from '../repositories/PayrollEarningsRepository';
import { PayrollDeductionsRepository } from '../repositories/PayrollDeductionsRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class PayslipService {
  private payslipRepo: PayslipRepository;
  private runEmployeeRepo: PayrollRunEmployeeRepository;
  private earningsRepo: PayrollEarningsRepository;
  private deductionsRepo: PayrollDeductionsRepository;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.payslipRepo = new PayslipRepository();
    this.runEmployeeRepo = new PayrollRunEmployeeRepository();
    this.earningsRepo = new PayrollEarningsRepository();
    this.deductionsRepo = new PayrollDeductionsRepository();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
  }

  async generatePayslip(ctx: TenantContext, payrollRunEmployeeId: number, runMonth: string, payslipNumber: string) {
    const runEmployee = await this.runEmployeeRepo.getById(ctx, payrollRunEmployeeId);
    if (!runEmployee) throw new NotFoundError('Payroll run employee not found');

    const earnings = await this.earningsRepo.getForEmployee(ctx, payrollRunEmployeeId);
    const deductions = await this.deductionsRepo.getForEmployee(ctx, payrollRunEmployeeId);

    const totalEarnings = runEmployee.total_earnings || 0;
    const totalDeductions = runEmployee.total_deductions || 0;
    const netSalary = totalEarnings - totalDeductions;

    // 🔧 FIX: Compute real YTD values by summing previous payslips in the same financial year.
    // Financial year = April to March (India standard).
    const db = getKnex();
    const monthDate = new Date(runMonth);
    const currentMonth = monthDate.getMonth() + 1; // 1-12
    const currentYear = monthDate.getFullYear();
    // FY start: April 1 of current or previous calendar year
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fyStart = `${fyStartYear}-04-01`;

    const ytdData: any = await db('payslips')
      .where('employee_id', runEmployee.employee_id)
      .where('payslip_month', '>=', fyStart)
      .where('payslip_month', '<', `${runMonth.slice(0, 7)}-01`)
      .whereNull('deleted_at')
      .select(
        db.raw('COALESCE(SUM(gross_salary), 0) as ytd_gross'),
        db.raw('COALESCE(SUM(total_deductions), 0) as ytd_deductions'),
        db.raw('COALESCE(SUM(net_salary), 0) as ytd_net'),
        db.raw('COALESCE(SUM(ytd_tax), 0) as ytd_tax_sum')
      )
      .first()
      .catch(() => ({ ytd_gross: 0, ytd_deductions: 0, ytd_net: 0, ytd_tax_sum: 0 }));

    const ytdGross = Number(ytdData?.ytd_gross || 0) + totalEarnings;
    const ytdNet = Number(ytdData?.ytd_net || 0) + netSalary;
    // TDS is typically in deductions — approximate YTD tax from deductions if not tracked separately
    const ytdTax = Number(ytdData?.ytd_tax_sum || 0);

    // Compute CTC from the employee's assigned salary structure
    let annualCtcForPayslip = 0;
    try {
      const structRow = await db('employee_salary_structures as ess')
        .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where('ess.employee_id', runEmployee.employee_id)
        .where('ess.is_current', 1)
        .whereNull('ess.deleted_at')
        .select('ss.annual_ctc', 'ss.gross_monthly')
        .first()
        .catch(() => null);
      if (structRow) {
        annualCtcForPayslip = Number(structRow.annual_ctc || 0) || (Number(structRow.gross_monthly || 0) * 12);
      }
      if (!annualCtcForPayslip) {
        // Fallback: 12× gross from run
        annualCtcForPayslip = totalEarnings * 12;
      }
    } catch { annualCtcForPayslip = totalEarnings * 12; }

    const payslip = await this.payslipRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: runEmployee.employee_id,
      payroll_run_id: runEmployee.payroll_run_id,
      payslip_month: runMonth,
      payslip_number: payslipNumber,
      ctc: annualCtcForPayslip,
      basic_salary: earnings.find(e => e.component_id === 1)?.actual_value || 0,
      gross_salary: totalEarnings,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      ytd_gross: ytdGross,
      ytd_tax: ytdTax,
      ytd_net: ytdNet,
      is_locked: false,
      digitally_signed: false,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });


    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PAYSLIP',
      entityId: payslip.id,
      afterState: { payslip }
    });

    return payslip;
  }

  /**
   * "Automatic Generate" in Payslip Management should never invent its own
   * numbers — it must reuse whatever Payroll Process already calculated for
   * that employee/month (payroll_run_employees), the same source publishPayroll
   * uses. If no processed run exists yet, that's a real gap the caller needs
   * to know about, not something to paper over with a fresh estimate.
   */
  async getOrGenerateFromProcessedRun(ctx: TenantContext, employeeId: number, month: string) {
    const monthStr = month.length >= 7 ? month.slice(0, 7) : month; // 'YYYY-MM'
    const db = getKnex();

    // Select run_month pre-formatted as a string in SQL — reading the DATE
    // column into a JS Date and re-serializing it shifts it by a day (the
    // driver applies a local-timezone conversion that toISOString() then
    // bakes in), which would save the payslip under the wrong month.
    const runEmployee = await db('payroll_run_employees as pre')
      .join('payroll_runs as pr', 'pre.payroll_run_id', 'pr.id')
      .where('pre.employee_id', employeeId)
      .where('pre.organization_id', ctx.organizationId)
      .where('pre.status', 'processed')
      .whereRaw("DATE_FORMAT(pr.run_month, '%Y-%m') = ?", [monthStr])
      .orderBy('pre.id', 'desc')
      .select('pre.id as runEmployeeId', db.raw("DATE_FORMAT(pr.run_month, '%Y-%m-%d') as runMonthStr"))
      .first();

    if (!runEmployee) {
      throw new NotFoundError(
        'No processed payroll found for this employee in this month. Run Payroll Process for this cycle first, then generate the payslip.'
      );
    }

    const runMonthStr = runEmployee.runMonthStr;
    const payslipNumber = `PS-${monthStr.replace('-', '')}-${employeeId}`;

    const existing = await this.payslipRepo.getByNumber(ctx, payslipNumber);
    const payslip = existing || await this.generatePayslip(ctx, runEmployee.runEmployeeId, runMonthStr, payslipNumber);

    return this.getPayslipDetails(ctx, payslip.id);
  }

  async sendPayslipToEmployee(ctx: TenantContext, payslipId: number) {
    const payslip = await this.payslipRepo.getById(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    // Mark as sent
    await this.payslipRepo.markAsSent(ctx, payslipId);

    // Send notification
    // payslipRepo.getById() returns camelCase — reading employee_id/payslip_month
    // (snake_case) here was always undefined.
    const payslipAny = payslip as any;
    const payslipEmployeeId = payslipAny.employeeId ?? payslipAny.employee_id;
    const payslipMonthVal = payslipAny.payslipMonth ?? payslipAny.payslip_month;
    await this.notificationService.sendNotification(ctx, {
      eventCode: 'payslip_generated',
      recipientId: payslipEmployeeId,
      variables: { payslipId: String(payslipId), payslipMonth: payslipMonthVal }
    } as any);

    await this.auditService.log(ctx, {
      action: 'SEND',
      entityType: 'PAYSLIP',
      entityId: payslipId,
      afterState: { sent_to: payslipEmployeeId }
    });

    return payslip;
  }

  async getPayslip(ctx: TenantContext, payslipId: number) {
    return this.payslipRepo.getById(ctx, payslipId);
  }

  async getEmployeePayslips(ctx: TenantContext, employeeId: number, limit = 12) {
    return this.payslipRepo.getForEmployee(ctx, employeeId, { pageSize: limit });
  }

  async lockPayslip(ctx: TenantContext, payslipId: number) {
    return this.payslipRepo.markAsLocked(ctx, payslipId);
  }

  async getPayslipDetails(ctx: TenantContext, payslipId: number) {
    const payslip = await this.getPayslip(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    const payrollRunId = (payslip as any).payrollRunId ?? (payslip as any).payroll_run_id;
    const employeeIdVal = (payslip as any).employeeId ?? (payslip as any).employee_id;
    const runEmployee = await this.runEmployeeRepo.getForEmployee(ctx, payrollRunId, employeeIdVal);
    if (!runEmployee) throw new NotFoundError('Payroll run employee details not found');

    const earnings = await this.earningsRepo.getForEmployee(ctx, runEmployee.id);
    const deductions = await this.deductionsRepo.getForEmployee(ctx, runEmployee.id);

    return {
      payslip,
      earnings,
      deductions
    };
  }

  async createDirectPayslip(ctx: TenantContext, data: {
    employeeId: number;
    payslipNumber: string;
    month: string;
    basicSalary: number;
    grossSalary: number;
    totalDeductions: number;
    netSalary: number;
  }) {
    const existing = await this.payslipRepo.getByNumber(ctx, data.payslipNumber);
    if (existing) {
      return this.payslipRepo.update(ctx, existing.id, {
        basic_salary: data.basicSalary,
        gross_salary: data.grossSalary,
        total_deductions: data.totalDeductions,
        net_salary: data.netSalary,
        updated_by: ctx.userId
      } as any);
    }

    const db = getKnex();
    const latestRun = await db('payroll_runs').where('organization_id', ctx.organizationId).orderBy('id', 'desc').first().catch(() => null);
    const validRunId = latestRun?.id || null;

    const psMonth = data.month ? (data.month.length === 7 ? `${data.month}-01` : data.month) : new Date().toISOString().slice(0, 10);

    // 🔧 FIX: Compute YTD from historical payslips in same financial year (April-March)
    const monthDate = new Date(psMonth);
    const currentMonth = monthDate.getMonth() + 1;
    const currentYear = monthDate.getFullYear();
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fyStart = `${fyStartYear}-04-01`;

    const ytdData: any = await db('payslips')
      .where('employee_id', data.employeeId)
      .where('payslip_month', '>=', fyStart)
      .where('payslip_month', '<', `${psMonth.slice(0, 7)}-01`)
      .whereNull('deleted_at')
      .select(
        db.raw('COALESCE(SUM(gross_salary), 0) as ytd_gross'),
        db.raw('COALESCE(SUM(net_salary), 0) as ytd_net')
      )
      .first()
      .catch(() => ({ ytd_gross: 0, ytd_net: 0 }));

    const ytdGross = Number(ytdData?.ytd_gross || 0) + data.grossSalary;
    const ytdNet = Number(ytdData?.ytd_net || 0) + data.netSalary;

    return this.payslipRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: Number(data.employeeId),
      payroll_run_id: validRunId,
      payslip_month: psMonth,
      payslip_number: data.payslipNumber,
      ctc: data.grossSalary * 12,
      basic_salary: data.basicSalary,
      gross_salary: data.grossSalary,
      total_deductions: data.totalDeductions,
      net_salary: data.netSalary,
      ytd_gross: ytdGross,
      ytd_tax: 0,
      ytd_net: ytdNet,
      is_locked: false,
      digitally_signed: false,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });
  }
}


