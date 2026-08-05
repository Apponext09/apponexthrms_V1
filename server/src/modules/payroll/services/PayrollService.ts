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
        const db = getKnex();
        // Dynamic lookup for assigned salary structure
        const struct = await db('employee_salary_structures as ess')
          .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
          .where({ 'ess.employee_id': empRun.employee_id, 'ess.is_current': true })
          .whereNull('ess.deleted_at')
          .select('ss.*')
          .first()
          .catch(() => null)
          || await db('salary_structures').where('employee_id', empRun.employee_id).whereNull('deleted_at').first().catch(() => null)
          || await db('salary_structures').whereNull('deleted_at').first().catch(() => null);

        const empRow = await db('employees').where('id', empRun.employee_id).first().catch(() => null);

        // 1. Fetch Attendance LOP (Loss of Pay) Days & Paid Days
        const monthDays = 30;
        let lopDays = 0;
        try {
          const leaveRecord = await db('leave_applications')
            .where('employee_id', empRun.employee_id)
            .whereIn('status', ['approved', 'processed'])
            .whereRaw('MONTH(application_start_date) = MONTH(CURRENT_DATE())')
            .sum('total_days as total_lop')
            .first();
          lopDays = Number(leaveRecord?.total_lop || 0);
        } catch {
          lopDays = 0;
        }

        const paidDays = Math.max(0, monthDays - lopDays);
        const lOPFactor = paidDays / monthDays;

        // 2. Earnings Components (Scaled by LOP)
        let baseGross = 0;
        let baseBasic = 0;
        let baseHra = 0;

        if (struct) {
          baseGross = Number(struct.gross_monthly || (struct.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0));
          baseBasic = Number(struct.basic_salary || Math.round(baseGross * 0.50));
          baseHra = Number(struct.hra_allowance || Math.round(baseBasic * 0.50));
        } else if (empRow) {
          baseGross = Number(empRow.gross_salary || (empRow.annual_ctc ? Math.round(Number(empRow.annual_ctc) / 12) : 0));
          baseBasic = Math.round(baseGross * 0.50);
          baseHra = Math.round(baseBasic * 0.50);
        }

        const baseSpecial = Math.max(0, baseGross - (baseBasic + baseHra));

        // Scale attendance-sensitive components
        const earnedBasic = Math.round(baseBasic * lOPFactor);
        const earnedHra = Math.round(baseHra * lOPFactor);
        const earnedSpecial = Math.round(baseSpecial * lOPFactor);
        const totalEarnings = earnedBasic + earnedHra + earnedSpecial;

        // 3. Statutory Deductions Calculation
        // A. PF: 12% of Earned Basic (Capped at 15,000 ceiling)
        const pfCeilingBase = Math.min(earnedBasic, 15000);
        const pfDeduction = Math.round(pfCeilingBase * 0.12);

        // B. ESIC: 0.75% of Gross if Gross <= 21,000
        const esiDeduction = (totalEarnings > 0 && totalEarnings <= 21000) ? Math.ceil(totalEarnings * 0.0075) : 0;

        // C. PT (Professional Tax): Standard state slab
        const ptDeduction = (totalEarnings > 15000) ? 200 : 0;

        // D. TDS (Income Tax)
        const tdsDeduction = Number(struct?.tds_deduction || (totalEarnings > 60000 ? Math.round(totalEarnings * 0.05) : 0));

        const totalDeductions = pfDeduction + esiDeduction + ptDeduction + tdsDeduction;
        const netSalary = Math.max(0, totalEarnings - totalDeductions);

        await this.runEmployeeRepo.update(ctx, empRun.id, {
          working_days: paidDays,
          unpaid_leave_days: lopDays,
          paid_leave_days: paidDays,
          total_earnings: totalEarnings,
          total_deductions: totalDeductions,
          tax_deducted: tdsDeduction,
          net_salary: netSalary,
          status: 'processed',
          processing_notes: `Processed: ${paidDays} Paid Days (${lopDays} LOP Days). PF: ₹${pfDeduction}, ESI: ₹${esiDeduction}, PT: ₹${ptDeduction}, TDS: ₹${tdsDeduction}`,
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
    const db = getKnex();
    const employees = await this.runEmployeeRepo.getForRun(ctx, payrollRunId);
    for (const emp of employees) {
      const struct = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where({ 'ess.employee_id': emp.employee_id, 'ess.is_current': true })
        .whereNull('ess.deleted_at')
        .select('ss.*')
        .first()
        .catch(() => null)
        || await db('salary_structures').where('employee_id', emp.employee_id).whereNull('deleted_at').first().catch(() => null);

      const payslipNumber = `PS-${run.run_month.replace(/-/g, '')}-${emp.employee_id}`;
      const ctcVal = struct ? Number(struct.annual_ctc || 0) : 0;
      const basicVal = struct ? Number(struct.basic_monthly || 0) : Math.round(emp.total_earnings * 0.5);

      await this.payslipRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: emp.employee_id,
        payroll_run_id: payrollRunId,
        payslip_month: run.run_month,
        payslip_number: payslipNumber,
        ctc: ctcVal,
        basic_salary: basicVal,
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
    const db = getKnex();
    const employees = await this.runEmployeeRepo.getForRun(ctx, payrollRunId);
    for (const emp of employees) {
      const struct = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where({ 'ess.employee_id': emp.employee_id, 'ess.is_current': true })
        .whereNull('ess.deleted_at')
        .select('ss.*')
        .first()
        .catch(() => null)
        || await db('salary_structures').where('employee_id', emp.employee_id).whereNull('deleted_at').first().catch(() => null);

      const payslipNumber = `PS-${run.run_month.replace(/-/g, '')}-${emp.employee_id}`;
      const ctcVal = struct ? Number(struct.annual_ctc || 0) : 0;
      const basicVal = struct ? Number(struct.basic_monthly || 0) : Math.round(emp.total_earnings * 0.5);

      await this.payslipRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: emp.employee_id,
        payroll_run_id: payrollRunId,
        payslip_month: run.run_month,
        payslip_number: payslipNumber,
        ctc: ctcVal,
        basic_salary: basicVal,
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
    const cycles = await db('payroll_cycles')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('id', 'desc');

    return cycles.map((c: any) => ({
      ...c,
      name: c.cycle_name || c.name || 'Monthly Salaried Regular',
      isDailyWages: Boolean(c.is_daily_wages),
      dailyWagesIncludePaidHolidays: Boolean(c.daily_wages_include_paid_holidays),
      dailyWagesIncludeWeekOff: Boolean(c.daily_wages_include_week_off),
      startDate: c.start_date || 1,
      cutoffDay: c.cutoff_day || 25,
      monthOffset: c.month_offset || 'Current',
      disbursementDate: c.disbursement_date || 1,
      capAmount: c.cap_amount || 1000000,
      toleranceEnabled: Boolean(c.tolerance_enabled),
      toleranceMinutes: c.tolerance_minutes || 15,
      isActive: c.status !== 'closed'
    }));
  }

  async createCycle(ctx: TenantContext, data: any) {
    const db = getKnex();
    let userId = ctx.userId;
    if (!userId) {
      const user = await db('users').where('organization_id', ctx.organizationId).first('id');
      userId = user?.id || null;
    }

    const cycle: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      cycle_name: data.cycle_name || data.name || 'Monthly Payroll Cycle',
      cycle_code: data.cycle_code || `CYCLE-${Date.now()}`,
      cycle_type: data.cycle_type || (data.frequency ? data.frequency.toLowerCase().replace('-', '_') : 'monthly'),
      cycle_start_date: data.cycle_start_date || new Date().toISOString().split('T')[0],
      cycle_end_date: data.cycle_end_date || new Date().toISOString().split('T')[0],
      payroll_run_date: data.payroll_run_date || new Date().toISOString().split('T')[0],
      salary_credit_date: data.salary_credit_date || new Date().toISOString().split('T')[0],
      is_daily_wages: data.is_daily_wages ?? data.isDailyWages ?? false,
      daily_wages_include_paid_holidays: data.daily_wages_include_paid_holidays ?? data.dailyWagesIncludePaidHolidays ?? false,
      daily_wages_include_week_off: data.daily_wages_include_week_off ?? data.dailyWagesIncludeWeekOff ?? false,
      frequency: data.frequency || 'Monthly',
      start_date: data.start_date || data.startDate || 1,
      cutoff_day: data.cutoff_day || data.cutoffDay || 25,
      month_offset: data.month_offset || data.monthOffset || 'Current',
      disbursement_date: data.disbursement_date || data.disbursementDate || 1,
      cap_amount: data.cap_amount || data.capAmount || 1000000,
      tolerance_enabled: data.tolerance_enabled ?? data.toleranceEnabled ?? false,
      tolerance_minutes: data.tolerance_minutes || data.toleranceMinutes || 15,
      is_current_cycle: data.is_current_cycle ?? true,
      status: data.is_active === false ? 'closed' : (data.status || 'open')
    };

    if (userId) {
      cycle.created_by = userId;
      cycle.updated_by = userId;
    }

    const [id] = await db('payroll_cycles').insert(cycle);
    return { id, ...cycle };
  }
}
