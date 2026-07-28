import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
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

  async generatePayroll(
    ctx: TenantContext,
    payrollCycleId: number,
    runType = 'regular',
    options?: {
      companyId?: number;
      locationId?: number;
      departmentId?: number;
      employeeIds?: number[];
    }
  ) {
    const cycle = await this.cycleRepo.getById(ctx, payrollCycleId);
    if (!cycle) throw new NotFoundError('Payroll cycle not found');

    if (cycle.status !== 'open') {
      throw new ValidationError('Payroll cycle is not open for processing');
    }

    const run = await this.runRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      payroll_cycle_id: payrollCycleId,
      run_type: runType as any,
      run_month: cycle.cycle_start_date,
      status: 'draft',
      total_employees: 0,
      processed_employees: 0,
      error_count: 0,
      created_by: ctx.userId,
      updated_by: ctx.userId
    });

    // Get active employees in organization filtered by location, department, or specific employeeIds
    const db = getKnex();
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)  // always use the authenticated org — never caller-supplied
      .where('status', 'active');

    if (options?.locationId) {
      empQuery = empQuery.where((q) => {
        q.where('work_location_id', options.locationId).orWhere('location_id', options.locationId);
      });
    }

    if (options?.departmentId) {
      empQuery = empQuery.where((q) => {
        q.where('department_id', options.departmentId).orWhere('current_department_id', options.departmentId);
      });
    }

    if (options?.employeeIds && Array.isArray(options.employeeIds) && options.employeeIds.length > 0) {
      empQuery = empQuery.whereIn('id', options.employeeIds);
    }

    const employees = await empQuery;

    for (const emp of employees) {
      await this.runEmployeeRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        payroll_run_id: run.id,
        employee_id: emp.id,
        status: 'pending',
        working_days: 30,
        leave_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        overtime_hours: 0,
        total_earnings: 0,
        total_deductions: 0,
        net_salary: 0,
        tax_deducted: 0,
        processing_notes: 'Initialized'
      } as any);
    }

    // Update run with employee count
    const updatedRun = await this.runRepo.update(ctx, run.id, {
      total_employees: employees.length,
      updated_by: ctx.userId
    });

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      afterState: { run: updatedRun }
    });

    return updatedRun;
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
        // Calculate salary components based on default values
        const totalEarnings = 50000;
        const totalDeductions = 5000;
        const netSalary = totalEarnings - totalDeductions;

        await this.runEmployeeRepo.update(ctx, empRun.id, {
          working_days: 30,
          total_earnings: totalEarnings,
          total_deductions: totalDeductions,
          net_salary: netSalary,
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

      // Send notifications to each employee
      await this.notificationService.sendNotification(ctx, {
        eventCode: 'payslip_generated',
        recipientId: emp.employee_id,
        variables: { payslipMonth: run.run_month }
      } as any);
    }

    return updated;
  }

  async getPayrollStatus(ctx: TenantContext, payrollRunId: number) {
    return this.runRepo.getById(ctx, payrollRunId);
  }

  async getPayrollRuns(ctx: TenantContext, cycleId?: number, limit = 20) {
    if (cycleId) {
      return this.runRepo.getForCycle(ctx, cycleId, { pageSize: limit });
    }
    const result = await this.runRepo.list(ctx, { pageSize: limit, sortBy: 'created_at', sortOrder: 'desc' });
    return result.items;
  }

  async getPendingApprovals(ctx: TenantContext) {
    return this.runRepo.getPendingApprovals(ctx);
  }

  async getPayrollStats(ctx: TenantContext) {
    const db = getKnex();

    // 1. Total active employees
    const empResult = await db('employees')
      .where('organization_id', ctx.organizationId)
      .where('status', 'active')
      .count('id as count')
      .first();
    const totalEmployees = Number(empResult?.count || 0);

    // 2. Latest published run
    const latestRun = await db('payroll_runs')
      .where('organization_id', ctx.organizationId)
      .where('status', 'published')
      .orderBy('run_month', 'desc')
      .first();

    let payrollCost = 0;
    let pfContribution = 0;
    let taxDeducted = 0;
    let esiContribution = 0;

    if (latestRun) {
      // Sum net salary of employees in that run
      const costResult = await db('payroll_run_employees')
        .where('payroll_run_id', latestRun.id)
        .sum('net_salary as total')
        .sum('tax_deducted as tax')
        .first();

      payrollCost = Number(costResult?.total || 0);
      taxDeducted = Number(costResult?.tax || 0);

      // Sum ESI and PF deductions from components in that run
      const deductionsResult = await db('payroll_deductions')
        .join('salary_components', 'payroll_deductions.component_id', 'salary_components.id')
        .where('payroll_deductions.organization_id', ctx.organizationId)
        .whereIn('payroll_deductions.payroll_run_employee_id', function() {
          this.select('id').from('payroll_run_employees').where('payroll_run_id', latestRun.id);
        })
        .select('salary_components.deduction_type', db.raw('SUM(payroll_deductions.actual_value) as total'))
        .groupBy('salary_components.deduction_type');

      for (const row of deductionsResult) {
        if (row.deduction_type === 'pf') {
          pfContribution = Number((row as any).total || 0);
        } else if (row.deduction_type === 'esi') {
          esiContribution = Number((row as any).total || 0);
        }
      }
    }

    return {
      totalEmployees,
      payrollCost,
      pfContribution,
      taxDeducted,
      esiContribution,
      totalDeductions: pfContribution + taxDeducted + esiContribution,
      complianceStatus: {
        pfFiled: true,
        esiFiled: true,
        taxCertificates: latestRun ? 'Generated' : 'Pending',
        attendanceSynced: true
      }
    };
  }

  async getBankTransferSheet(ctx: TenantContext, payrollRunId: number) {
    const db = getKnex();
    const rows = await db('payroll_run_employees')
      .join('employees', 'payroll_run_employees.employee_id', 'employees.id')
      .leftJoin('employee_compensation', 'employees.id', 'employee_compensation.employee_id')
      .where('payroll_run_employees.payroll_run_id', payrollRunId)
      .where('payroll_run_employees.organization_id', ctx.organizationId)
      .select(
        'employees.first_name',
        'employees.last_name',
        'employee_compensation.bank_name',
        'employee_compensation.account_number',
        'employee_compensation.ifsc_code',
        'payroll_run_employees.net_salary'
      );

    let csv = 'Employee Name,Bank Name,Account Number,IFSC Code,Net Salary\n';
    for (const r of rows) {
      const name = `"${r.first_name || ''} ${r.last_name || ''}"`;
      const bank = `"${r.bank_name || 'N/A'}"`;
      const account = `"${r.account_number || 'N/A'}"`;
      const ifsc = `"${r.ifsc_code || 'N/A'}"`;
      const salary = Number(r.net_salary || 0).toFixed(2);
      csv += `${name},${bank},${account},${ifsc},${salary}\n`;
    }
    return csv;
  }

  async getComplianceReport(ctx: TenantContext, payrollRunId: number) {
    const db = getKnex();
    const rows = await db('payroll_run_employees')
      .join('employees', 'payroll_run_employees.employee_id', 'employees.id')
      .leftJoin('employee_compensation', 'employees.id', 'employee_compensation.employee_id')
      .where('payroll_run_employees.payroll_run_id', payrollRunId)
      .where('payroll_run_employees.organization_id', ctx.organizationId)
      .select(
        'employees.first_name',
        'employees.last_name',
        'employee_compensation.uan_number',
        'employee_compensation.esic_number',
        'payroll_run_employees.basic_salary',
        'payroll_run_employees.gross_salary'
      );

    let csv = 'Employee Name,UAN,ESIC Number,Basic Salary,PF Employee (12%),Gross Salary,ESI Employee (0.75%)\n';
    for (const r of rows) {
      const name = `"${r.first_name || ''} ${r.last_name || ''}"`;
      const uan = `"${r.uan_number || 'N/A'}"`;
      const esic = `"${r.esic_number || 'N/A'}"`;
      const basic = Number(r.basic_salary || 0);
      const gross = Number(r.gross_salary || 0);
      const pf = (basic * 0.12).toFixed(2);
      const esi = (gross * 0.0075).toFixed(2);
      csv += `${name},${uan},${esic},${basic.toFixed(2)},${pf},${gross.toFixed(2)},${esi}\n`;
    }
    return csv;
  }

  async getCycles(ctx: TenantContext) {
    const db = getKnex();
    let cycles = await db('payroll_cycles')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('cycle_start_date', 'desc');

    if (!cycles || cycles.length === 0) {
      const defaultCycles = [
        {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          cycle_name: 'Monthly Payroll Cycle (Current Month)',
          cycle_code: 'PAY-MONTHLY-CURR',
          cycle_type: 'monthly',
          cycle_start_date: '2026-07-01',
          cycle_end_date: '2026-07-31',
          payroll_run_date: '2026-07-28',
          salary_credit_date: '2026-07-31',
          is_current_cycle: true,
          status: 'open',
          created_by: ctx.userId,
          updated_by: ctx.userId
        },
        {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          cycle_name: 'Bi-Weekly Payroll Cycle',
          cycle_code: 'PAY-BIWEEKLY',
          cycle_type: 'biweekly',
          cycle_start_date: '2026-07-15',
          cycle_end_date: '2026-07-30',
          payroll_run_date: '2026-07-28',
          salary_credit_date: '2026-07-31',
          is_current_cycle: false,
          status: 'open',
          created_by: ctx.userId,
          updated_by: ctx.userId
        }
      ];

      for (const c of defaultCycles) {
        try {
          await db('payroll_cycles').insert(c);
        } catch (e) {
          // ignore duplicate inserts if any
        }
      }

      cycles = await db('payroll_cycles')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .orderBy('cycle_start_date', 'desc');
    }

    return cycles;
  }

  async createCycle(ctx: TenantContext, data: any) {
    const db = getKnex();
    const cycle = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      cycle_name: data.cycle_name || 'Monthly Payroll Cycle',
      cycle_code: data.cycle_code || `CYCLE-${Date.now()}`,
      cycle_type: data.cycle_type || 'monthly',
      cycle_start_date: data.cycle_start_date || new Date().toISOString().split('T')[0],
      cycle_end_date: data.cycle_end_date || new Date().toISOString().split('T')[0],
      payroll_run_date: data.payroll_run_date || new Date().toISOString().split('T')[0],
      salary_credit_date: data.salary_credit_date || new Date().toISOString().split('T')[0],
      is_current_cycle: data.is_current_cycle ?? true,
      status: data.status || 'open',
      created_by: ctx.userId,
      updated_by: ctx.userId
    };

    const [id] = await db('payroll_cycles').insert(cycle);
    return { id, ...cycle };
  }
}



