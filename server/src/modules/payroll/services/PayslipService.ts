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

    const payslipEmployeeId = (runEmployee as any).employeeId ?? (runEmployee as any).employee_id;
    const payslipRunId = (runEmployee as any).payrollRunId ?? (runEmployee as any).payroll_run_id;

    const payslip = await this.payslipRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      employee_id: payslipEmployeeId,
      payroll_run_id: payslipRunId,
      payslip_month: runMonth,
      payslip_number: payslipNumber,
      ctc: annualCtcForPayslip,
      basic_salary: earnings.find(e => (e as any).componentId === 1 || (e as any).component_id === 1)?.actualValue || earnings.find(e => (e as any).componentId === 1 || (e as any).component_id === 1)?.actual_value || Math.round(totalEarnings * 0.5),
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
   * "Automatic Generate" in Payslip Management:
   * 1. Reuses whatever Payroll Process already calculated for that employee/month (payroll_run_employees).
   * 2. If no processed run exists yet for this month, dynamically calculates the exact payroll
   *    breakdown from the employee's assigned salary structure & pay slab and creates the payslip.
   */
  async getOrGenerateFromProcessedRun(ctx: TenantContext, employeeId: number, month: string) {
    const monthStr = month.length >= 7 ? month.slice(0, 7) : month; // 'YYYY-MM'
    const db = getKnex();

    let runEmployee = await db('payroll_run_employees as pre')
      .join('payroll_runs as pr', 'pre.payroll_run_id', 'pr.id')
      .where('pre.employee_id', employeeId)
      .where('pre.organization_id', ctx.organizationId)
      .where('pre.status', 'processed')
      .whereRaw("DATE_FORMAT(pr.run_month, '%Y-%m') = ?", [monthStr])
      .orderBy('pre.id', 'desc')
      .select('pre.id as runEmployeeId', db.raw("DATE_FORMAT(pr.run_month, '%Y-%m-%d') as runMonthStr"))
      .first();

    const payslipNumber = `PS-${monthStr.replace('-', '')}-${employeeId}`;
    const runMonthStr = runEmployee?.runMonthStr || `${monthStr}-01`;
    const [psYear, psMon] = monthStr.split('-').map(Number);
    const totalDaysInMonth = new Date(psYear, psMon, 0).getDate();
    const monthStart = `${monthStr}-01`;
    const monthEnd = `${monthStr}-${String(totalDaysInMonth).padStart(2, '0')}`;

    if (!runEmployee) {
      // 1. Auto-calculate from assigned salary structure with effective date check
      let struct = await db('salary_structures as ss')
        .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
        .where('ss.employee_id', employeeId)
        .where('ss.effective_from', '<=', monthEnd)
        .where(function(this: any) {
          this.whereNull('ss.effective_to').orWhere('ss.effective_to', '>=', monthStart);
        })
        .whereNull('ss.deleted_at')
        .orderBy('ss.effective_from', 'desc')
        .orderBy('ss.id', 'desc')
        .select('ss.*', 'ps.name as slab_name')
        .first();

      if (!struct) {
        struct = await db('salary_structures as ss')
          .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
          .where('ss.employee_id', employeeId)
          .whereNull('ss.deleted_at')
          .orderBy('ss.id', 'desc')
          .select('ss.*', 'ps.name as slab_name')
          .first();
      }

      // Dynamic Attendance & LOP
      let presentDays = 0, halfDayCount = 0, absentDays = 0, weeklyOffDays = 0, holidayDays = 0, paidLeaveDays = 0;
      try {
        const attRecs = await db('attendance_records')
          .where('employee_id', employeeId)
          .whereBetween('check_in_date', [monthStart, monthEnd])
          .whereNull('deleted_at')
          .select('status');
        for (const rec of attRecs) {
          const s = (rec.status || '').toLowerCase();
          if (s === 'present' || s === 'work_from_home' || s === 'sick') presentDays++;
          else if (s === 'half_day') halfDayCount++;
          else if (s === 'absent') absentDays++;
          else if (s === 'weekly_off') weeklyOffDays++;
          else if (s === 'holiday') holidayDays++;
          else if (s === 'on_leave') paidLeaveDays++;
        }
      } catch { /* silent */ }

      let unpaidLeaveDays = 0;
      try {
        const unpaidResult = await db('leave_applications as la')
          .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
          .where('la.employee_id', employeeId)
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

      let paidDays = totalDaysInMonth;
      const hasAttRecords = (presentDays + halfDayCount + absentDays + weeklyOffDays + holidayDays + paidLeaveDays) > 0;
      if (hasAttRecords) {
        paidDays = Math.round(presentDays + (halfDayCount * 0.5) + weeklyOffDays + holidayDays + paidLeaveDays);
      } else {
        paidDays = Math.max(0, totalDaysInMonth - unpaidLeaveDays);
      }

      const ratio = totalDaysInMonth > 0 ? Math.min(1, Math.max(0, paidDays / totalDaysInMonth)) : 1;

      const grossMonthly = Number(struct?.gross_monthly || struct?.grossMonthly || 0);
      const basicMonthly = Number(struct?.basic_monthly || struct?.basicMonthly || (grossMonthly > 0 ? Math.round(grossMonthly * 0.5) : 0));
      const hraMonthly = Number(struct?.hra_monthly || struct?.hraMonthly || (basicMonthly > 0 ? Math.round(basicMonthly * 0.4) : 0));
      const stdAllowance = Math.max(0, grossMonthly - basicMonthly - hraMonthly);

      const grossEarned = Math.round(grossMonthly * ratio);
      const basicEarned = Math.round(basicMonthly * ratio);
      const hraEarned = Math.round(hraMonthly * ratio);
      const stdEarned = Math.max(0, grossEarned - basicEarned - hraEarned);

      const pfDeduction = Number(struct?.pf_deduction || struct?.pfDeduction || Math.min(1800, Math.round(basicMonthly * 0.12)));
      const esicDeduction = Number(struct?.esic_deduction || struct?.esicDeduction || (grossMonthly <= 21000 ? Math.ceil(grossMonthly * 0.0075) : 0));
      const ptDeduction = Number(struct?.pt_deduction || struct?.ptDeduction || (grossMonthly > 15000 ? 200 : 0));
      const tdsDeduction = Number(struct?.tds_deduction || struct?.tdsDeduction || 0);

      const pfEarned = Math.round(pfDeduction * ratio);
      const esicEarned = Math.round(esicDeduction * ratio);
      const ptEarned = ptDeduction;
      const tdsEarned = tdsDeduction;
      const totalDeductions = pfEarned + esicEarned + ptEarned + tdsEarned;
      const netSalary = Math.max(0, grossEarned - totalDeductions);
      const annualCtc = Number(struct?.annual_ctc || struct?.annualCtc || (grossMonthly + pfDeduction) * 12);

      const empRow = await db('employees').where('id', employeeId).first().catch(() => null);
      const firstOrg = await db('organizations').first().catch(() => null);
      const effectiveOrgId = (empRow?.organizationId ?? empRow?.organization_id) || (firstOrg?.id) || 12;

      const firstUser = await db('users').first().catch(() => null);
      const validUserId = (ctx.userId && ctx.userId > 0) ? ctx.userId : (firstUser?.id || 45);

      let run = await db('payroll_runs')
        .where('organization_id', effectiveOrgId)
        .whereRaw("DATE_FORMAT(run_month, '%Y-%m') = ?", [monthStr])
        .first();

      if (!run) {
        const cycle = await db('payroll_cycles').where('organization_id', effectiveOrgId).first().catch(() => null)
          || await db('payroll_cycles').first().catch(() => null);
        const [newRunId] = await db('payroll_runs').insert({
          uuid: uuidv4(),
          organization_id: effectiveOrgId,
          payroll_cycle_id: cycle?.id || 1,
          run_type: 'regular',
          run_month: runMonthStr,
          status: 'published',
          processed_employees: 1,
          total_employees: 1,
          error_count: 0,
          created_by: validUserId,
          updated_by: validUserId
        });
        run = await db('payroll_runs').where('id', newRunId).first();
      }

      const [runEmpId] = await db('payroll_run_employees').insert({
        uuid: uuidv4(),
        organization_id: effectiveOrgId,
        payroll_run_id: run.id,
        employee_id: employeeId,
        status: 'processed',
        total_earnings: grossEarned,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        created_by: validUserId,
        updated_by: validUserId,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Insert dynamic breakdown rows into payroll_earnings and payroll_deductions
      // Primary source: salary_structure.earnings_breakup / deductions_breakup (per-employee computed amounts)
      try {
        // Parse stored breakup
        const rawEBPS = struct?.earnings_breakup ?? struct?.earningsBreakup;
        const rawDBPS = struct?.deductions_breakup ?? struct?.deductionsBreakup;
        let psEarnings: any[] = [];
        let psDeductions: any[] = [];
        try {
          if (rawEBPS) psEarnings = typeof rawEBPS === 'string' ? JSON.parse(rawEBPS) : (Array.isArray(rawEBPS) ? rawEBPS : []);
          if (rawDBPS) psDeductions = typeof rawDBPS === 'string' ? JSON.parse(rawDBPS) : (Array.isArray(rawDBPS) ? rawDBPS : []);
        } catch {}

        if (psEarnings.length > 0) {
          for (const e of psEarnings) {
            const monthly = Number(e.amount || 0);
            const earned = Math.round(monthly * ratio);
            if (monthly === 0 && earned === 0) continue;
            await db('payroll_earnings').insert({
              uuid: uuidv4(),
              organization_id: effectiveOrgId,
              payroll_run_employee_id: runEmpId,
              component_id: e.componentId ?? e.component_id ?? null,
              calculated_value: monthly,
              actual_value: earned,
              formula_used: e.name || e.code,
              created_at: new Date()
            }).catch(() => {});
          }
        } else {
          // Fallback: Basic / HRA / Special
          const earningItems = [
            { name: 'Basic Salary', actual: basicMonthly, earned: basicEarned },
            { name: 'House Rent Allowance (HRA)', actual: hraMonthly, earned: hraEarned },
            ...(stdEarned > 0 ? [{ name: 'Special Allowance', actual: stdAllowance, earned: stdEarned }] : [])
          ];
          for (const it of earningItems) {
            await db('payroll_earnings').insert({
              uuid: uuidv4(),
              organization_id: effectiveOrgId,
              payroll_run_employee_id: runEmpId,
              calculated_value: it.actual,
              actual_value: it.earned,
              formula_used: it.name,
              created_at: new Date()
            }).catch(() => {});
          }
        }

        // Statutory deductions from stored breakup or re-computed per-employee
        let dynPf = pfEarned, dynEsic = esicEarned, dynPt = ptEarned, dynTds = tdsEarned;
        if (psDeductions.length > 0) {
          for (const d of psDeductions) {
            const code = (d.code || '').toUpperCase();
            const amt = Number(d.amount || 0);
            if (code === 'PF') dynPf = Math.round(amt * ratio);
            else if (code === 'ESIC' || code === 'ESI') dynEsic = Math.round(amt * ratio);
            else if (code === 'PT') dynPt = amt; // PT is fixed
            else if (code === 'TDS') dynTds = amt;
          }
        }

        const deductionItems = [
          ...(dynPf > 0 ? [{ name: 'Provident Fund (EPF)', val: dynPf }] : []),
          ...(dynEsic > 0 ? [{ name: 'ESIC Contribution', val: dynEsic }] : []),
          ...(dynPt > 0 ? [{ name: 'Professional Tax (PT)', val: dynPt }] : []),
          ...(dynTds > 0 ? [{ name: 'Tax Deducted at Source (TDS)', val: dynTds }] : []),
        ];
        for (const it of deductionItems) {
          await db('payroll_deductions').insert({
            uuid: uuidv4(),
            organization_id: effectiveOrgId,
            payroll_run_employee_id: runEmpId,
            component_name: it.name,
            calculated_value: it.val,
            actual_value: it.val,
            created_at: new Date()
          }).catch(() => {});
        }
      } catch { /* silent */ }

      const existing = await this.payslipRepo.getByNumber(ctx, payslipNumber);
      const payslip = existing || await this.payslipRepo.create({ ...ctx, organizationId: effectiveOrgId }, {
        uuid: uuidv4(),
        organization_id: effectiveOrgId,
        employee_id: employeeId,
        payroll_run_id: run.id,
        payslip_month: runMonthStr,
        payslip_number: payslipNumber,
        ctc: annualCtc,
        basic_salary: basicEarned,
        gross_salary: grossEarned,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        ytd_gross: grossEarned,
        ytd_tax: tdsEarned,
        ytd_net: netSalary,
        is_locked: false,
        digitally_signed: true,
        signature_timestamp: new Date().toISOString(),
        created_by: validUserId,
        updated_by: validUserId
      });

      return this.getPayslipDetails(ctx, payslip.id);
    }

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

    // Fallback: If no child breakdown rows exist, synthesize them from the employee's assigned salary structure
    if (earnings.length === 0 || deductions.length === 0) {
      const struct = await db('salary_structures')
        .where('employee_id', employeeIdVal)
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .first()
        .catch(() => null);

      const sStruct = withSnakeAliases(struct) || {};
      const gross = Number((payslip as any).grossSalary ?? (payslip as any).gross_salary ?? sStruct.gross_monthly ?? 0);
      const basic = Number((payslip as any).basicSalary ?? (payslip as any).basic_salary ?? sStruct.basic_monthly ?? (gross > 0 ? Math.round(gross * 0.5) : 0));
      const hra = Number(sStruct.hra_monthly || (basic > 0 ? Math.round(basic * 0.4) : 0));
      const std = Math.max(0, gross - (basic + hra));

      if (earnings.length === 0) {
        earnings = [
          { name: 'Basic Salary', formula_used: 'Basic Salary', actual_value: basic, actualValue: basic, group_name: 'Standard Earnings', group_for_payslip: 'Earnings', category: 'Earning' },
          { name: 'House Rent Allowance (HRA)', formula_used: 'House Rent Allowance (HRA)', actual_value: hra, actualValue: hra, group_name: 'Standard Earnings', group_for_payslip: 'Earnings', category: 'Earning' },
          ...(std > 0 ? [{ name: 'Special Allowance', formula_used: 'Special Allowance', actual_value: std, actualValue: std, group_name: 'Standard Earnings', group_for_payslip: 'Earnings', category: 'Earning' }] : [])
        ];
      }

      if (deductions.length === 0) {
        const totalDed = Number((payslip as any).totalDeductions ?? (payslip as any).total_deductions ?? sStruct.total_deductions ?? 0);
        const pf = Number(sStruct.pf_deduction || Math.min(1800, Math.round(basic * 0.12)));
        const esic = Number(sStruct.esic_deduction || (gross <= 21000 ? Math.ceil(gross * 0.0075) : 0));
        const pt = Number(sStruct.pt_deduction || (gross > 15000 ? 200 : 0));
        const tds = Number(sStruct.tds_deduction || Math.max(0, totalDed - (pf + esic + pt)));

        deductions = [
          ...(pf > 0 ? [{ name: 'Provident Fund (EPF)', component_name: 'Provident Fund (EPF)', actual_value: pf, actualValue: pf, group_name: 'Statutory Deductions', group_for_payslip: 'Deductions', category: 'Deduction' }] : []),
          ...(esic > 0 ? [{ name: 'ESIC Contribution', component_name: 'ESIC Contribution', actual_value: esic, actualValue: esic, group_name: 'Statutory Deductions', group_for_payslip: 'Deductions', category: 'Deduction' }] : []),
          ...(pt > 0 ? [{ name: 'Professional Tax (PT)', component_name: 'Professional Tax (PT)', actual_value: pt, actualValue: pt, group_name: 'Statutory Deductions', group_for_payslip: 'Deductions', category: 'Deduction' }] : []),
          ...(tds > 0 ? [{ name: 'Tax Deducted at Source (TDS)', component_name: 'Tax Deducted at Source (TDS)', actual_value: tds, actualValue: tds, group_name: 'Statutory Deductions', group_for_payslip: 'Deductions', category: 'Deduction' }] : [])
        ];
      }
    }
      let employee: any = null;
    let employeeCompanyId: number | null = null;
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
    const psMonthRaw = String((payslip as any).payslipMonth || (payslip as any).payslip_month || new Date().toISOString().slice(0, 7));
    const targetMonthStr = psMonthRaw.slice(0, 7);
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
          if (s === 'present' || s === 'work_from_home' || s === 'sick') presentDays++;
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
    const hasAttRecords = (presentDays + halfDayCount + absentDays + weeklyOffDays + holidayDays + paidLeaveDays) > 0;
    if (hasAttRecords) {
      paidDaysCalc = Math.round(presentDays + (halfDayCount * 0.5) + weeklyOffDays + holidayDays + paidLeaveDays);
      unpaidDaysCalc = Math.max(0, totalDaysInMonth - paidDaysCalc);
    } else {
      paidDaysCalc = Math.max(0, totalDaysInMonth - unpaidLeaveDays);
      unpaidDaysCalc = unpaidLeaveDays;
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
        matchedComp = await db('companies').where('id', Number(targetCid)).whereNull('deleted_at').first();
      }
      if (!matchedComp) {
        matchedComp = await db('companies').where('organization_id', ctx.organizationId).whereNull('deleted_at').first();
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


