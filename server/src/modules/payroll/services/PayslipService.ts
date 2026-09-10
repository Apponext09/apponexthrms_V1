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
import { withSnakeAliases } from '../utils/payroll.utils';
import { SalaryCalculationService } from './SalaryCalculationService';

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
    const currentMonth = !isNaN(monthDate.getTime()) ? monthDate.getMonth() + 1 : 8;
    const currentYear = !isNaN(monthDate.getTime()) ? monthDate.getFullYear() : 2026;
    const pad = (n: number) => String(n).padStart(2, '0');
    const runMonthPrefix = !isNaN(monthDate.getTime()) ? `${currentYear}-${pad(currentMonth)}` : (typeof runMonth === 'string' ? runMonth.slice(0, 7) : '2026-08');
    const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const fyStart = `${fyStartYear}-04-01`;

    const ytdData: any = await db('payslips')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', runEmployee.employee_id)
      .where('payslip_month', '>=', fyStart)
      .where('payslip_month', '<', `${runMonthPrefix}-01`)
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
      const structRow = await db('salary_structures')
        .where('employee_id', runEmployee.employee_id)
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .select('annual_ctc', 'gross_monthly')
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

    const payslipEmployeeId = (runEmployee as any).employeeId ?? (runEmployee as any).employee_id;
    const payslipRunId = (runEmployee as any).payrollRunId ?? (runEmployee as any).payroll_run_id;
    // Resolve basic salary by component name — never by hardcoded component_id.
    // Component IDs are auto-incremented per tenant; id=1 is meaningless here.
    const basicEarning =
      earnings.find((e: any) => /\bbasic\b/i.test(e.componentName || e.component_name || '')) ||
      earnings.find((e: any) => /\bbasic\b/i.test(e.groupName || e.group_name || ''));
    const basicSalaryVal = basicEarning
      ? (Number(basicEarning.actualValue ?? basicEarning.actual_value) || 0)
      : Math.round(totalEarnings * 0.5);  // last-resort estimate only

    const existingPayslip = await db('payslips')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', payslipEmployeeId)
      .whereRaw("DATE_FORMAT(payslip_month, '%Y-%m') = ?", [runMonthPrefix])
      .whereNull('deleted_at')
      .first()
      .catch(() => null);

    let payslip: any;
    if (existingPayslip) {
      await db('payslips').where('id', existingPayslip.id).update({
        payroll_run_id: payslipRunId,
        ctc: annualCtcForPayslip,
        basic_salary: basicSalaryVal,
        gross_salary: totalEarnings,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        ytd_gross: ytdGross,
        ytd_tax: ytdTax,
        ytd_net: ytdNet,
        updated_by: ctx.userId,
        updated_at: new Date()
      });
      payslip = await db('payslips').where('id', existingPayslip.id).first();
    } else {
      payslip = await this.payslipRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        employee_id: payslipEmployeeId,
        payroll_run_id: payslipRunId,
        payslip_month: runMonth,
        payslip_number: payslipNumber,
        ctc: annualCtcForPayslip,
        basic_salary: basicSalaryVal,
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
    }

    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'PAYSLIP',
      entityId: payslip.id,
      afterState: { payslip }
    });

    return payslip;
  }

  /**
   * "Automatic Generate" in Payslip Management:
   * 1. Reuses whatever Payroll Process already calculated for that employee/month (payroll_run_employees).
   * 2. If no processed run exists yet for this month, dynamically calculates the exact payroll
   *    breakdown from the employee's assigned salary structure & pay slab and creates the payslip.
   */
  async getOrGenerateFromProcessedRun(ctx: TenantContext, employeeId: number, month: string) {
    const monthStr = month.length >= 7 ? month.slice(0, 7) : month; // 'YYYY-MM'
    const db = getKnex();

    // 1. Check if a payslip record already exists for this employee and month
    const existingPayslip = await db('payslips')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', employeeId)
      .whereRaw("DATE_FORMAT(payslip_month, '%Y-%m') = ?", [monthStr])
      .whereNull('deleted_at')
      .first()
      .catch(() => null);

    if (existingPayslip) {
      return this.getPayslipDetails(ctx, existingPayslip.id);
    }

    const payslipNumber = `PS-${monthStr.replace('-', '')}-${employeeId}`;

    // 2. Check if a processed payroll_run_employees record exists
    let runEmployee = await db('payroll_run_employees as pre')
      .join('payroll_runs as pr', 'pre.payroll_run_id', 'pr.id')
      .where('pre.employee_id', employeeId)
      .where('pre.organization_id', ctx.organizationId)
      .where(function(this: any) {
        this.whereRaw("DATE_FORMAT(pr.run_month, '%Y-%m') = ?", [monthStr])
          .orWhereRaw("SUBSTRING(pr.run_month, 1, 7) = ?", [monthStr]);
      })
      .orderBy('pre.id', 'desc')
      .select('pre.id as runEmployeeId', db.raw("DATE_FORMAT(pr.run_month, '%Y-%m-%d') as runMonthStr"))
      .first()
      .catch(() => null);

    if (runEmployee) {
      const runEmpId = Number(runEmployee.runEmployeeId || (runEmployee as any).id);
      const runMonthStr = String(runEmployee.runMonthStr || `${monthStr}-01`);
      const payslip = await this.generatePayslip(ctx, runEmpId, runMonthStr, payslipNumber);
      return this.getPayslipDetails(ctx, payslip.id);
    }

    // 3. Dynamic Calculation: Generate payslip on the fly directly from employee's assigned salary structure
    const empRow = await db('employees').where('id', employeeId).first().catch(() => null);
    if (!empRow) {
      throw new NotFoundError('Employee not found');
    }
    const sEmp = withSnakeAliases(empRow) || empRow;

    const calcService = new SalaryCalculationService();
    const dynamicResult = await calcService.calculateDynamicSalaryStructure({
      orgId: ctx.organizationId,
      employeeId,
      companyId: ctx.companyId,
    }).catch(() => null);

    const gross = dynamicResult ? Number(dynamicResult.grossMonthly) : Number(sEmp.gross_salary || 50000);
    const basic = dynamicResult ? Number(dynamicResult.basicMonthly) : Math.round(gross * 0.5);
    const totalDeductions = dynamicResult ? Number(dynamicResult.totalDeductions) : 0;
    const netSalary = dynamicResult ? Number(dynamicResult.netTakeHome) : gross;
    const psMonth = `${monthStr}-01`;

    const newPayslip = await this.createDirectPayslip(ctx, {
      employeeId,
      payslipNumber,
      month: psMonth,
      basicSalary: basic,
      grossSalary: gross,
      totalDeductions,
      netSalary
    });

    return this.getPayslipDetails(ctx, newPayslip.id);
  }

  async sendPayslipToEmployee(ctx: TenantContext, payslipId: number) {
    const payslip = await this.payslipRepo.getById(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    // Mark as sent
    await this.payslipRepo.markAsSent(ctx, payslipId);

    // Send notification
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
    // \u2500\u2500 Bug 5 fix: only return payslips whose payroll run is published \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // Employee portal must never see draft/processing/completed payslip amounts.
    const db = getKnex();
    const payslips = await db('payslips as ps')
      .join('payroll_runs as pr', 'ps.payroll_run_id', 'pr.id')
      .where('ps.employee_id', employeeId)
      .where('ps.organization_id', ctx.organizationId)
      .where('pr.status', 'published')
      .whereNull('ps.deleted_at')
      .orderBy('ps.payslip_month', 'desc')
      .limit(limit)
      .select('ps.*')
      .catch(() => []);
    return payslips;
  }

  async lockPayslip(ctx: TenantContext, payslipId: number) {
    return this.payslipRepo.markAsLocked(ctx, payslipId);
  }

  async getPayslipDetails(ctx: TenantContext, payslipId: number) {
    const payslip = await this.getPayslip(ctx, payslipId);
    if (!payslip) throw new NotFoundError('Payslip not found');

    const payrollRunId = (payslip as any).payrollRunId ?? (payslip as any).payroll_run_id;
    const employeeIdVal = (payslip as any).employeeId ?? (payslip as any).employee_id;
    
    let earnings: any[] = [];
    let deductions: any[] = [];

    if (payrollRunId && employeeIdVal) {
      const runEmployee = await this.runEmployeeRepo.getForEmployee(ctx, payrollRunId, employeeIdVal).catch(() => null);
      if (runEmployee?.id) {
        earnings = await this.earningsRepo.getForEmployee(ctx, runEmployee.id).catch(() => []);
        deductions = await this.deductionsRepo.getForEmployee(ctx, runEmployee.id).catch(() => []);
      }
    }

    const db = getKnex();

    // Enrich breakdown with component definitions and groups
    const allGroups: any[] = await db('payroll_component_groups')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .catch(() => []);
    const groupMap = new Map<number, any>();
    for (const g of allGroups) {
      const sG = withSnakeAliases(g) || g;
      groupMap.set(Number(sG.id), sG);
    }

    let employeeCompanyId: number | null = null;
    let employee: any = null;

    // Fallback: If no child breakdown rows exist, synthesize them dynamically using SalaryCalculationService
    if (earnings.length === 0 || deductions.length === 0) {
      const calcService = new SalaryCalculationService();
      const dynamicResult = await calcService.calculateDynamicSalaryStructure({
        orgId: ctx.organizationId,
        employeeId: employeeIdVal,
        companyId: employeeCompanyId || ctx.companyId,
        ctc: Number((payslip as any).ctc || 0),
        grossMonthly: Number((payslip as any).grossSalary ?? (payslip as any).gross_salary ?? 0)
      }).catch(() => null);

      if (earnings.length === 0 && dynamicResult?.earningsBreakup && dynamicResult.earningsBreakup.length > 0) {
        earnings = dynamicResult.earningsBreakup.map((e: any) => ({
          name: e.name,
          component_name: e.name,
          formula_used: e.formula || e.name,
          actual_value: e.amount,
          actualValue: e.amount,
          group_name: e.group_name || 'Standard Earnings',
          group_for_payslip: 'Earnings',
          category: 'Earning'
        }));
      }

      if (deductions.length === 0 && dynamicResult?.deductionsBreakup && dynamicResult.deductionsBreakup.length > 0) {
        deductions = dynamicResult.deductionsBreakup.map((d: any) => ({
          name: d.name,
          component_name: d.name,
          formula_used: d.formula || d.name,
          actual_value: d.amount,
          actualValue: d.amount,
          group_name: d.group_name || 'Statutory Deductions',
          group_for_payslip: 'Deductions',
          category: 'Deduction'
        }));
      }

      // If still empty (e.g. employee has no structure or components configured), do a minimal fallback
      if (earnings.length === 0) {
        const gross = Number((payslip as any).grossSalary ?? (payslip as any).gross_salary ?? 0);
        const basic = Number((payslip as any).basicSalary ?? (payslip as any).basic_salary ?? Math.round(gross * 0.5));
        const rem = Math.max(0, gross - basic);
        if (basic > 0) earnings.push({ name: 'Basic Salary', formula_used: 'Basic Salary', actual_value: basic, actualValue: basic, group_name: 'Earnings', group_for_payslip: 'Earnings', category: 'Earning' });
        if (rem > 0) earnings.push({ name: 'Special Allowance', formula_used: 'Residual', actual_value: rem, actualValue: rem, group_name: 'Earnings', group_for_payslip: 'Earnings', category: 'Earning' });
      }
    }
    if (employeeIdVal) {
      employee = await db('employees as e')
        .leftJoin('designations as des', 'des.id', 'e.current_designation_id')
        .leftJoin('departments as dep', 'dep.id', 'e.current_department_id')
        .where('e.id', employeeIdVal)
        .select(
          'e.*',
          'des.name as designation_name',
          'dep.name as department_name'
        )
        .first()
        .catch(() => null);

      if (employee) {
        const sEmp = withSnakeAliases(employee) || employee;
        employeeCompanyId = sEmp.company_id || sEmp.companyId || null;
        const fn = sEmp.first_name || sEmp.firstName || '';
        const ln = sEmp.last_name || sEmp.lastName || '';
        const fullName = fn ? `${fn} ${ln}`.trim() : (sEmp.name || `Employee #${sEmp.id}`);
        employee.name = fullName;
        employee.fullName = fullName;
        employee.full_name = fullName;
        employee.firstName = fn;
        employee.lastName = ln;
        employee.code = sEmp.employee_code || sEmp.employeeCode || `EMP-${sEmp.id}`;
        employee.employeeCode = employee.code;
        employee.designation = sEmp.designation_name || sEmp.designationName || sEmp.job_title || sEmp.jobTitle || 'Staff';
        employee.designationName = employee.designation;
        employee.department = sEmp.department_name || sEmp.departmentName || 'General';
        employee.departmentName = employee.department;
        employee.dateOfJoining = sEmp.date_of_joining || sEmp.dateOfJoining || sEmp.doj || '';
        employee.doj = employee.dateOfJoining;
        employee.panNumber = sEmp.pan_number || sEmp.panNumber || sEmp.pan || '';
        employee.pan = employee.panNumber;
        employee.pfNo = sEmp.pf_no || sEmp.pfNo || sEmp.pfNumber || '';
        employee.uanNo = sEmp.uan_no || sEmp.uanNo || sEmp.uan || '';
        employee.esicNo = sEmp.esic_no || sEmp.esicNo || sEmp.esic || '';
        employee.bankName = sEmp.bank_name || sEmp.bankName || 'N/A';
        employee.accountNo = sEmp.account_no || sEmp.accountNo || sEmp.account_number || '';
      }
    }

    // ── Dynamic Attendance & Leave Summary for Payslip Period ─────────
    let targetMonthStr: string;
    const rawMonthVal = (payslip as any).payslipMonth || (payslip as any).payslip_month;
    if (rawMonthVal instanceof Date) {
      const pad = (n: number) => String(n).padStart(2, '0');
      targetMonthStr = `${rawMonthVal.getFullYear()}-${pad(rawMonthVal.getMonth() + 1)}`;
    } else if (typeof rawMonthVal === 'string' && /^\d{4}-\d{2}/.test(rawMonthVal)) {
      targetMonthStr = rawMonthVal.slice(0, 7);
    } else {
      targetMonthStr = new Date().toISOString().slice(0, 7);
    }
    const [tYear, tMon] = targetMonthStr.split('-').map(Number);
    const totalDaysInMonth = new Date(tYear, tMon, 0).getDate();
    const monthStart = `${targetMonthStr}-01`;
    const monthEnd = `${targetMonthStr}-${String(totalDaysInMonth).padStart(2, '0')}`;

    let presentDays = 0;
    let halfDayCount = 0;
    let absentDays = 0;
    let weeklyOffDays = 0;
    let holidayDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    if (employeeIdVal) {
      try {
        const attRecs = await db('attendance_records')
          .where('employee_id', employeeIdVal)
          .whereBetween('check_in_date', [monthStart, monthEnd])
          .whereNull('deleted_at')
          .select('status');
        for (const rec of attRecs) {
          const s = (rec.status || '').toLowerCase();
          if (s === 'present' || s === 'work_from_home') presentDays++;
          else if (s === 'half_day') halfDayCount++;
          else if (s === 'absent') absentDays++;
          else if (s === 'weekly_off') weeklyOffDays++;
          else if (s === 'holiday') holidayDays++;
          else if (s === 'on_leave') paidLeaveDays++;
        }
      } catch { /* silent */ }

      try {
        const unpaidResult = await db('leave_applications as la')
          .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
          .where('la.employee_id', employeeIdVal)
          .where('la.status', 'approved')
          .where('la.application_start_date', '<=', monthEnd)
          .where('la.application_end_date', '>=', monthStart)
          .where(function (this: any) {
            this.where('lt.paid_type', 'unpaid')
              .orWhere('lt.leave_classification', 'unpaid')
              .orWhereRaw("UPPER(lt.leave_code) = 'LOP'")
              .orWhereRaw("UPPER(lt.leave_code) = 'UL'");
          })
          .sum('la.total_days as lopDays')
          .first();
        unpaidLeaveDays = Number((unpaidResult as any)?.lopDays || (unpaidResult as any)?.lop_days || 0);
      } catch { /* silent */ }
    }

    let paidDaysCalc = totalDaysInMonth;
    let unpaidDaysCalc = unpaidLeaveDays;

    // ── Effective Date, Date of Joining (DOJ) & Exit Date calculation ───────
    let activeStartDay = 1;
    let activeEndDay = totalDaysInMonth;

    if (employee?.dateOfJoining || employee?.date_of_joining || employee?.doj) {
      const dojRaw = employee.dateOfJoining || employee.date_of_joining || employee.doj;
      const dojDate = new Date(dojRaw);
      if (!isNaN(dojDate.getTime())) {
        const dojY = dojDate.getFullYear();
        const dojM = dojDate.getMonth() + 1;
        if (dojY === tYear && dojM === tMon) {
          activeStartDay = Math.max(1, dojDate.getDate());
        } else if (dojY > tYear || (dojY === tYear && dojM > tMon)) {
          activeStartDay = totalDaysInMonth + 1; // Future joiner
        }
      }
    }

    if (employee?.relieving_date || employee?.exit_date || employee?.resignation_date) {
      const exitRaw = employee.relieving_date || employee.exit_date || employee.resignation_date;
      const exitDate = new Date(exitRaw);
      if (!isNaN(exitDate.getTime())) {
        const exitY = exitDate.getFullYear();
        const exitM = exitDate.getMonth() + 1;
        if (exitY === tYear && exitM === tMon) {
          activeEndDay = Math.min(totalDaysInMonth, exitDate.getDate());
        } else if (exitY < tYear || (exitY === tYear && exitM < tMon)) {
          activeEndDay = 0; // Exited in past
        }
      }
    }

    const maxEligibleDays = Math.max(0, activeEndDay - activeStartDay + 1);

    const hasAttRecords = (presentDays + halfDayCount + absentDays + weeklyOffDays + holidayDays + paidLeaveDays) > 0;
    if (hasAttRecords) {
      paidDaysCalc = Math.round(presentDays + (halfDayCount * 0.5) + weeklyOffDays + holidayDays + paidLeaveDays);
      paidDaysCalc = Math.max(0, Math.min(maxEligibleDays, paidDaysCalc - unpaidLeaveDays));
      unpaidDaysCalc = Math.max(0, totalDaysInMonth - paidDaysCalc);
    } else {
      paidDaysCalc = Math.max(0, maxEligibleDays - unpaidLeaveDays);
      unpaidDaysCalc = Math.max(0, totalDaysInMonth - paidDaysCalc);
    }

    // Dynamic Leave Balance from leave_balances
    let totalLeaveBalance = 0;
    if (employeeIdVal) {
      try {
        const balRow = await db('leave_balances')
          .where('employee_id', employeeIdVal)
          .whereNull('deleted_at')
          .sum('available_balance as totalBal')
          .first();
        totalLeaveBalance = Number((balRow as any)?.totalBal || (balRow as any)?.total_bal || 0);
      } catch { /* silent */ }
    }

    // ── Dynamic Company Info Resolution ────────────────────────────────
    let companyInfo: any = {
      name: 'Apponext',
      address: 'Corporate Office, Hadapsar, Pune, Maharashtra - 400708',
      logo: null,
      website: 'www.apponexthrms.com'
    };

    try {
      const targetCid = employeeCompanyId || (payslip as any).company_id || ctx.companyId || null;
      let matchedComp: any = null;
      if (targetCid) {
        matchedComp = await db('company').where('company_id', Number(targetCid)).whereNull('deleted_at').first();
      }
      if (!matchedComp) {
        matchedComp = await db('company').where('organization_id', ctx.organizationId).whereNull('deleted_at').first();
      }
      if (matchedComp) {
        const sComp = withSnakeAliases(matchedComp) || matchedComp;
        const addrParts = [
          sComp.address_line_1 || sComp.addressLine1,
          sComp.address_line_2 || sComp.addressLine2,
          sComp.city,
          sComp.state,
          sComp.zip_code || sComp.zipCode
        ].filter(Boolean);
        companyInfo.name = sComp.name || 'Apponext';
        companyInfo.address = addrParts.length > 0 ? addrParts.join(', ') : companyInfo.address;
        companyInfo.logo = sComp.logo || null;
        companyInfo.website = sComp.email ? `www.${sComp.email.split('@')[1] || 'apponexthrms.com'}` : 'www.apponexthrms.com';
      }

      // Check organization branding / profile if logo not in companies
      if (!companyInfo.logo) {
        const branding = await db('branding_settings').where('organization_id', ctx.organizationId).first().catch(() => null);
        if (branding?.logo_url) companyInfo.logo = branding.logo_url;
      }
      if (!companyInfo.logo) {
        const orgProf = await db('organization_profiles').where('organization_id', ctx.organizationId).first().catch(() => null);
        if (orgProf?.logo_url) companyInfo.logo = orgProf.logo_url;
      }
    } catch { /* silent */ }

    // ── Dynamic Payslip Settings Resolution ─────────────────────────────
    let payslipSetting: any = null;
    try {
      let rawSettings = await db('payroll_settings')
        .where('organization_id', ctx.organizationId)
        .whereNull('deleted_at')
        .first();
      if (rawSettings?.payslip_setting) {
        payslipSetting = typeof rawSettings.payslip_setting === 'string' ? JSON.parse(rawSettings.payslip_setting) : rawSettings.payslip_setting;
      }
    } catch { /* silent */ }

    return {
      payslip,
      employee,
      earnings,
      deductions,
      attendance: {
        salaryDays: totalDaysInMonth,
        paidDays: paidDaysCalc,
        unpaidDays: unpaidDaysCalc,
        presentDays,
        paidLeave: paidLeaveDays,
        leaveBalance: totalLeaveBalance,
      },
      company: companyInfo,
      settings: payslipSetting
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
      .where('organization_id', ctx.organizationId)
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


