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

    const payslip = await this.payslipRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: runEmployee.employee_id,
      payroll_run_id: runEmployee.payroll_run_id,
      payslip_month: runMonth,
      payslip_number: payslipNumber,
      ctc: 0, // Should be calculated from structure
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

  async sendPayslipToEmployee(ctx: TenantContext, payslipId: number) {
    const payslip = await this.payslipRepo.getById(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    // Mark as sent
    await this.payslipRepo.markAsSent(ctx, payslipId);

    // Send notification
    await this.notificationService.sendNotification(ctx, {
      eventCode: 'payslip_generated',
      recipientId: payslip.employee_id,
      variables: { payslipId: String(payslipId), payslipMonth: payslip.payslip_month }
    } as any);

    await this.auditService.log(ctx, {
      action: 'SEND',
      entityType: 'PAYSLIP',
      entityId: payslipId,
      afterState: { sent_to: payslip.employee_id }
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

    const runEmployee = await this.runEmployeeRepo.getForEmployee(ctx, payslip.payroll_run_id, payslip.employee_id);
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


