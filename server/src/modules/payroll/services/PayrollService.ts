import { v4 as uuidv4 } from 'uuid';
import { PayrollRunRepository } from '../repositories/PayrollRunRepository';
import { PayrollRunEmployeeRepository } from '../repositories/PayrollRunEmployeeRepository';
import { PayrollEarningsRepository } from '../repositories/PayrollEarningsRepository';
import { PayrollDeductionsRepository } from '../repositories/PayrollDeductionsRepository';
import { PayrollCycleRepository } from '../repositories/PayrollCycleRepository';
import { PayslipRepository } from '../repositories/PayslipRepository';
import { EmployeeLoanRepository } from '../repositories/EmployeeLoanRepository';
import { NotificationService } from '../../notifications/services/notification.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import type { TenantContext } from '../../../db/types';

export class PayrollService {
  private runRepo: PayrollRunRepository;
  private runEmployeeRepo: PayrollRunEmployeeRepository;
  private earningsRepo: PayrollEarningsRepository;
  private deductionsRepo: PayrollDeductionsRepository;
  private cycleRepo: PayrollCycleRepository;
  private payslipRepo: PayslipRepository;
  private loanRepo: EmployeeLoanRepository;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    this.runRepo = new PayrollRunRepository();
    this.runEmployeeRepo = new PayrollRunEmployeeRepository();
    this.earningsRepo = new PayrollEarningsRepository();
    this.deductionsRepo = new PayrollDeductionsRepository();
    this.cycleRepo = new PayrollCycleRepository();
    this.payslipRepo = new PayslipRepository();
    this.loanRepo = new EmployeeLoanRepository();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
  }

  async generatePayroll(ctx: TenantContext, payrollCycleId: number, runType = 'regular') {
    const cycle = await this.cycleRepo.getById(ctx, payrollCycleId);
    if (!cycle) throw new NotFoundError('Payroll cycle not found');

    if (cycle.status !== 'open') {
      throw new ValidationError('Payroll cycle is not open for processing');
    }

    const run = await this.runRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      payroll_cycle_id: payrollCycleId,
      run_type: runType,
      run_month: cycle.cycle_start_date,
      status: 'draft',
      total_employees: 0,
      processed_employees: 0,
      error_count: 0,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    // TODO: Get all active employees and create payroll_run_employees records

    await this.auditService.log(ctx, 'payroll_runs', run.id, 'create', { run });

    return run;
  }

  async processPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status !== 'draft') {
      throw new ValidationError('Payroll run is not in draft status');
    }

    await this.runRepo.update(ctx, payrollRunId, {
      status: 'processing',
      updated_by: ctx.userId
    });

    // Get all pending employees
    const employees = await this.runEmployeeRepo.getByStatus(ctx, payrollRunId, 'pending');

    let processedCount = 0;
    let errorCount = 0;

    for (const empRun of employees) {
      try {
        // TODO: Calculate salary components based on attendance, leave, loan, etc.

        await this.runEmployeeRepo.update(ctx, empRun.id, {
          status: 'processed',
          processed_at: new Date().toISOString(),
          updated_by: ctx.userId
        });

        processedCount++;
      } catch (error) {
        errorCount++;
        await this.runEmployeeRepo.updateProcessingStatus(
          ctx,
          empRun.id,
          'error',
          (error as Error).message
        );
      }
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'locked',
      processed_employees: processedCount,
      error_count: errorCount,
      updated_by: ctx.userId
    });

    return updated;
  }

  async lockPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    return this.runRepo.update(ctx, payrollRunId, {
      status: 'locked',
      locked_by: ctx.userId,
      locked_at: new Date().toISOString(),
      updated_by: ctx.userId
    });
  }

  async unlockPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status === 'published' || run.status === 'completed') {
      throw new ValidationError('Cannot unlock published or completed payroll');
    }

    return this.runRepo.update(ctx, payrollRunId, {
      status: 'draft',
      locked_by: null,
      locked_at: null,
      updated_by: ctx.userId
    });
  }

  async approvePayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status !== 'locked') {
      throw new ValidationError('Payroll must be locked before approval');
    }

    return this.runRepo.update(ctx, payrollRunId, {
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
      updated_by: ctx.userId
    });
  }

  async publishPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status !== 'approved') {
      throw new ValidationError('Payroll must be approved before publishing');
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'published',
      published_at: new Date().toISOString(),
      updated_by: ctx.userId
    });

    // Generate payslips
    const employees = await this.runEmployeeRepo.getForRun(ctx, payrollRunId);
    for (const emp of employees) {
      const payslipNumber = `PS-${run.run_month.replace(/-/g, '')}-${emp.employee_id}`;
      await this.payslipRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: emp.employee_id,
        payroll_run_id: payrollRunId,
        payslip_month: run.run_month,
        payslip_number: payslipNumber,
        ctc: 0,
        basic_salary: 0,
        gross_salary: emp.total_earnings,
        total_deductions: emp.total_deductions,
        net_salary: emp.net_salary,
        is_locked: true,
        locked_at: new Date().toISOString(),
        created_by: ctx.userId,
        updated_by: ctx.userId
      });
    }

    // Send notifications
    await this.notificationService.send(ctx, {
      type: 'payroll_published',
      recipient_type: 'role',
      recipient_id: 'employee',
      title: 'Payslips Available',
      message: `Payslips for ${run.run_month} are now available`,
      action_url: `/payroll/payslips`
    });

    return updated;
  }

  async getPayrollStatus(ctx: TenantContext, payrollRunId: number) {
    return this.runRepo.getById(ctx, payrollRunId);
  }

  async getPayrollRuns(ctx: TenantContext, cycleId?: number, limit = 20) {
    if (cycleId) {
      return this.runRepo.getForCycle(ctx, cycleId, { limit });
    }
    return this.runRepo.list(ctx, { limit, orderBy: [{ field: 'created_at', direction: 'desc' }] });
  }

  async getPendingApprovals(ctx: TenantContext) {
    return this.runRepo.getPendingApprovals(ctx);
  }
}


