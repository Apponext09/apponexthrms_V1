import { v4 as uuidv4 } from 'uuid';
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
      ytd_gross: 0, // Should be calculated
      ytd_tax: 0,
      ytd_net: 0,
      is_locked: false,
      digitally_signed: false,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, 'payslips', payslip.id, 'create', { payslip });

    return payslip;
  }

  async sendPayslipToEmployee(ctx: TenantContext, payslipId: number) {
    const payslip = await this.payslipRepo.getById(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    // Mark as sent
    await this.payslipRepo.markAsSent(ctx, payslipId);

    // Send notification
    await this.notificationService.send(ctx, {
      type: 'payslip_generated',
      recipient_type: 'employee',
      recipient_id: payslip.employee_id.toString(),
      title: 'Your Payslip is Ready',
      message: `Payslip for ${payslip.payslip_month} is now available`,
      action_url: `/payroll/payslips/${payslipId}`
    });

    await this.auditService.log(ctx, 'payslips', payslipId, 'send', { sent_to: payslip.employee_id });

    return payslip;
  }

  async getPayslip(ctx: TenantContext, payslipId: number) {
    return this.payslipRepo.getById(ctx, payslipId);
  }

  async getEmployeePayslips(ctx: TenantContext, employeeId: number, limit = 12) {
    return this.payslipRepo.getForEmployee(ctx, employeeId, { limit });
  }

  async lockPayslip(ctx: TenantContext, payslipId: number) {
    return this.payslipRepo.markAsLocked(ctx, payslipId);
  }

  async getPayslipDetails(ctx: TenantContext, payslipId: number) {
    const payslip = await this.getPayslip(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    const runEmployee = await this.runEmployeeRepo.db()
      .where({ id: payslip.payroll_run_id })
      .first();

    const earnings = await this.earningsRepo.getForEmployee(ctx, runEmployee.id);
    const deductions = await this.deductionsRepo.getForEmployee(ctx, runEmployee.id);

    return {
      payslip,
      earnings,
      deductions
    };
  }
}


