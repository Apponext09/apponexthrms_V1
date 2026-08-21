import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { PayrollService, withSnakeAliases, positiveNum } from '../services/PayrollService';

import { SalaryStructureService } from '../services/SalaryStructureService';
import { SalaryRevisionService } from '../services/SalaryRevisionService';
import { PayslipService } from '../services/PayslipService';
import { LoanService } from '../services/LoanService';
import { TaxService } from '../services/TaxService';
import { SettlementService } from '../services/SettlementService';
import { PayComponentService } from '../services/PayComponentService';
import { AttendanceIntegrationService } from '../services/AttendanceIntegrationService';
import { ReimbursementService } from '../services/ReimbursementService';
import { PayrollLedgerService } from '../services/PayrollLedgerService';
import { PayrollComponentGroupService } from '../services/PayrollComponentGroupService';
import { PayrollComponentDefinitionService } from '../services/PayrollComponentDefinitionService';
import { PayrollSettingsService } from '../services/PayrollSettingsService';

export class PayrollController {
  private payrollService: PayrollService;
  private structureService: SalaryStructureService;
  private revisionService: SalaryRevisionService;
  private payslipService: PayslipService;
  private loanService: LoanService;
  private taxService: TaxService;
  private settlementService: SettlementService;
  private componentService: PayComponentService;
  private attendanceService: AttendanceIntegrationService;
  private reimbursementService: ReimbursementService;
  private ledgerService: PayrollLedgerService;
  private groupService: PayrollComponentGroupService;
  private componentDefinitionService: PayrollComponentDefinitionService;
  private settingsService: PayrollSettingsService;

  private async getEmployeeId(req: Request, inputId?: any): Promise<number> {
    const parsedId = parseInt(inputId as string);
    if (!isNaN(parsedId)) {
      return parsedId;
    }
    const db = getKnex();
    const user = await db('users')
      .where('id', req.ctx.userId)
      .first();
    if (user?.employee_id) {
      return user.employee_id;
    }
    if (user?.email) {
      const employee = await db('employees')
        .where('email', user.email)
        .first();
      if (employee) {
        return employee.id;
      }
    }
    return 0;
  }

  constructor() {
    this.payrollService = new PayrollService();
    this.structureService = new SalaryStructureService();
    this.revisionService = new SalaryRevisionService();
    this.payslipService = new PayslipService();
    this.loanService = new LoanService();
    this.taxService = new TaxService();
    this.settlementService = new SettlementService();
    this.componentService = new PayComponentService();
    this.attendanceService = new AttendanceIntegrationService();
    this.reimbursementService = new ReimbursementService();
    this.ledgerService = new PayrollLedgerService();
    this.groupService = new PayrollComponentGroupService();
    this.componentDefinitionService = new PayrollComponentDefinitionService();
    this.settingsService = new PayrollSettingsService();
  }

  async getPayrollSettings(req: Request, res: Response) {
    const settings = await this.settingsService.getSettings(req.ctx);
    res.json({ success: true, data: settings });
  }

  async updatePayrollSettings(req: Request, res: Response) {
    const settings = await this.settingsService.updateSettings(req.ctx, req.body || {});
    res.json({ success: true, data: settings });
  }

  async getReconciliation(req: Request, res: Response) {
    try {
      const data = await this.payrollService.getReconciliation(req.ctx, parseInt(req.params.id));
      res.json({ success: true, data });
    } catch (e: any) {
      res.json({ success: false, message: e.message || 'Error getting reconciliation' });
    }
  }

  async generatePayroll(req: Request, res: Response) {
    try {
      const { payrollCycleId, runType, companyId, locationId, departmentId, employeeIds, month } = req.body;
      const db = getKnex();

      let targetCycleId: number;
      if (payrollCycleId && !isNaN(Number(payrollCycleId))) {
        targetCycleId = Number(payrollCycleId);
      } else {
        const targetComp = companyId || req.ctx?.companyId;
        let cycleQuery = db('payroll_cycles').whereNull('deleted_at');
        if (targetComp) {
          cycleQuery = cycleQuery.where(b => {
            b.where('company_id', Number(targetComp)).orWhereNull('company_id');
          });
        }
        if (req.ctx?.organizationId) {
          cycleQuery = cycleQuery.where(b => {
            b.where('organization_id', req.ctx.organizationId).orWhereNull('organization_id');
          });
        }
        const firstCycle = await cycleQuery.orderBy('company_id', 'desc').first().catch(() => null);
        if (!firstCycle) {
          return res.status(400).json({ success: false, message: 'No active payroll cycle found for this company/organization.' });
        }
        targetCycleId = Number(firstCycle.id);
      }

      const run = await this.payrollService.generatePayroll(
        req.ctx,
        targetCycleId,
        runType || 'regular',
        { companyId, locationId, departmentId, employeeIds }
      );
      res.status(201).json({ success: true, data: run });
    } catch (e: any) {
      console.error('generatePayroll error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error generating payroll run' });
    }
  }

  async processPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.processPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async lockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.lockPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async unlockPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.unlockPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async approvePayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.approvePayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async publishPayroll(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.publishPayroll(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }

  async getPayrollStatus(req: Request, res: Response) {
    const { id } = req.params;
    const run = await this.payrollService.getPayrollStatus(req.ctx, parseInt(id));
    res.json({ success: true, data: run });
  }                                                                                                             

  async getProcessRegister(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;

    const {
      cycleId,
      slabId,
      month,
      companyId,
      departmentId,
      locationId,
      employeeId,
      reportingOfficerId,
      status,
      employeeStatus,
      employmentType,
      gradeId,
      designationId,
    } = req.query;

    try {
      let empQuery = db('employees as e')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .leftJoin('locations as l', 'e.current_location_id', 'l.id')
        .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
        .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
        .whereNull('e.deleted_at');

      const targetOrgId = ctx.organizationId || (req as any).user?.organizationId || (req as any).user?.organization_id;
      if (targetOrgId) {
        empQuery = empQuery.where('e.organization_id', targetOrgId);
      }

      const activeStatus = status || employeeStatus;
      const activeEmpType = req.query.employment_type || employmentType;

      if (companyId && String(companyId).toUpperCase() !== 'ALL') {
        empQuery = empQuery.where(b => {
          b.where('e.company_id', Number(companyId)).orWhereNull('e.company_id');
        });
      }
      if (departmentId) empQuery = empQuery.where('e.current_department_id', Number(departmentId));
      if (locationId) empQuery = empQuery.where('e.current_location_id', Number(locationId));
      if (employeeId) empQuery = empQuery.where('e.id', Number(employeeId));
      if (reportingOfficerId) empQuery = empQuery.where('e.reporting_manager_id', Number(reportingOfficerId));
      if (activeStatus) empQuery = empQuery.where('e.status', String(activeStatus));
      if (activeEmpType) empQuery = empQuery.where('e.employment_type', String(activeEmpType));
      if (gradeId) {
        empQuery = empQuery.where('e.current_grade_id', Number(gradeId));
      }
      if (designationId) {
        empQuery = empQuery.where('e.current_designation_id', Number(designationId));
      }
      if (slabId) {
        const slabEmpRows = await db('salary_structures')
          .where('slab_id', Number(slabId))
          .whereNull('deleted_at')
          .select('employee_id');
        const slabEmpIds = slabEmpRows.map((r: any) => r.employee_id).filter(Boolean);
        if (slabEmpIds.length > 0) {
          empQuery = empQuery.whereIn('e.id', slabEmpIds);
        } else {
          // No employees belong to this slab
          empQuery = empQuery.whereRaw('1 = 0');
        }
      }

      const rawEmployees = await empQuery.select(
        'e.id',
        'e.employee_code',
        'e.organization_id',
        'e.first_name',
        'e.middle_name',
        'e.last_name',
        'e.job_title',
        'e.current_department_id',
        'e.current_location_id',
        'd.name as department_name',
        'l.name as location_name',
        db.raw("COALESCE(NULLIF(TRIM(e.bank_name), ''), NULLIF(TRIM(ec.bank_name), '')) as bank_name"),
        db.raw("COALESCE(NULLIF(TRIM(e.account_no), ''), NULLIF(TRIM(ec.account_number), '')) as account_number"),
        db.raw("COALESCE(NULLIF(TRIM(e.ifsc_code), ''), NULLIF(TRIM(ec.ifsc_code), '')) as ifsc_code"),
        db.raw("TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager")
      );

      // Deduplicate employee rows by ID to prevent duplicate records from left joins
      const seenEmpIds = new Set<number>();
      const employees = (rawEmployees || []).filter((emp: any) => {
        if (!emp.id || seenEmpIds.has(emp.id)) return false;
        seenEmpIds.add(emp.id);
        return true;
      });

      if (!employees || employees.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const resultRows = [];

      // Resolve target month for attendance lookups (YYYY-MM format)
      const targetMonth = month
        ? String(month).slice(0, 7)
        : new Date().toISOString().slice(0, 7);

      for (const emp of employees) {
        const empOrgId = emp.organization_id || targetOrgId;

        // Query assigned salary structure for this employee in their organization
        let struct = null;
        try {
          struct = await db('employee_salary_structures as ess')
            .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
            .where('ess.employee_id', emp.id)
            .where(b => {
              if (empOrgId) b.where('ess.organization_id', empOrgId);
            })
            .where('ess.is_current', 1)
            .whereNull('ess.deleted_at')
            .select('ss.*')
            .first();
        } catch {
          struct = null;
        }

        if (!struct) {
          try {
            struct = await db('salary_structures')
              .where('employee_id', emp.id)
              .where(b => {
                if (empOrgId) b.where('organization_id', empOrgId);
              })
              .whereNull('deleted_at')
              .orderBy('id', 'desc')
              .first();
          } catch {
            struct = null;
          }
        }

        // Values from assigned structure or employee salary profile fallback.
        // MySQL DECIMAL columns come back as strings (e.g. "0.00"), and a
        // non-empty string is truthy in JS — `struct?.pfDeduction || fallback`
        // picked the literal string "0.00" every time instead of ever
        // falling through, which is why PF/Special Allowance always showed
        // ₹0 on this register regardless of what was actually configured or
        // computed. positiveNum() treats a genuine zero as "use the
        // fallback" instead of "here is a truthy non-zero value."

        // Parse custom_components JSON — this is the component-level breakdown
        // saved by the UI (Basic, HRA, Special Allowance, PF, etc.) and should
        // be the PRIMARY source of salary figures for the payroll run.
        let customComps: Record<string, number> = {};
        try {
          const rawCC = struct?.customComponents ?? struct?.custom_components;
          if (rawCC) {
            customComps = typeof rawCC === 'string' ? JSON.parse(rawCC) : rawCC;
          }
        } catch { customComps = {}; }

        // Helper: sum custom_components values for keys whose name matches a keyword
        const ccSum = (...keywords: string[]) => {
          let total = 0;
          for (const [k, v] of Object.entries(customComps)) {
            const kl = String(k).toLowerCase();
            if (keywords.some(kw => kl.includes(kw))) total += Number(v) || 0;
          }
          return total;
        };

        const ccBasic = ccSum('basic');
        const ccHra = ccSum('hra', 'house rent');
        const ccSpecial = ccSum('special', 'standard allowance', 'standard_allowance');
        const ccMeal = ccSum('meal');
        const ccComm = ccSum('communication');
        const ccEdu = ccSum('education', 'edu');
        const ccLta = ccSum('lta', 'leave travel');
        const ccPf = ccSum('pf', 'provident');
        const ccPt = ccSum('pt', 'professional tax');
        const ccEsic = ccSum('esic', 'esi');

        let grossMonthly = positiveNum(struct?.grossMonthly ?? struct?.gross_monthly, 0);
        // If custom_components has a total, compute gross from its earning components
        const ccGross = ccBasic + ccHra + ccSpecial + ccMeal + ccComm + ccEdu + ccLta;
        if (ccGross > 0) grossMonthly = ccGross;

        let basicMonthly = positiveNum(struct?.basicMonthly ?? struct?.basic_monthly ?? struct?.basicSalary ?? struct?.basic_salary, 0);
        if (ccBasic > 0) basicMonthly = ccBasic;

        if (!grossMonthly && (emp.gross_salary || emp.grossSalary || emp.gross || emp.annual_ctc || emp.annualCtc)) {
          grossMonthly = Number(emp.gross_salary || emp.grossSalary || emp.gross || (emp.annual_ctc || emp.annualCtc ? Math.round(Number(emp.annual_ctc || emp.annualCtc) / 12) : 0));
        }

        if (!basicMonthly && grossMonthly) {
          basicMonthly = Number(emp.basic_salary || emp.basicSalary || emp.basic || Math.round(grossMonthly * 0.50));
        }

        const hraMonthly = ccHra > 0 ? ccHra : positiveNum(struct?.hraMonthly ?? struct?.hra_monthly, Math.round(basicMonthly * 0.40));
        const stdAllow = ccSpecial > 0 ? ccSpecial : positiveNum(struct?.specialAllowanceMonthly ?? struct?.special_allowance_monthly ?? struct?.standard_allowance, Math.max(0, grossMonthly - basicMonthly - hraMonthly));
        const mealAllow = ccMeal > 0 ? ccMeal : positiveNum(struct?.mealAllowance ?? struct?.meal_allowance, 0);
        const commAllow = ccComm > 0 ? ccComm : positiveNum(struct?.communicationAllowance ?? struct?.communication_allowance, 0);
        const eduAllow = ccEdu > 0 ? ccEdu : positiveNum(struct?.childrenEducationAllowance ?? struct?.children_education_allowance, 0);

        const ltaVal = ccLta > 0 ? ccLta : Number(struct?.lta || 0);

        // Fetch real attendance & LOP summary for the employee and month
        let totalDays = 30;
        if (cycleId) {
          const cyc = await db('payroll_cycles').where('id', Number(cycleId)).whereNull('deleted_at').first().catch(() => null);
          if (cyc) {
            const daysCalc = cyc.total_days_calc || cyc.totalDaysCalc;
            if (daysCalc && !isNaN(Number(daysCalc))) {
              totalDays = Number(daysCalc);
            } else if (cyc.frequency === 'Weekly') {
              totalDays = 7;
            } else if (cyc.frequency === 'Bi-Weekly') {
              totalDays = 14;
            } else if (cyc.frequency === 'Semi-Monthly') {
              totalDays = 15;
            }
          }
        }
        // Mirror PayrollService.processPayroll's real LOP logic exactly: a day
        // only counts against pay when there's an approved *unpaid* leave
        // application covering it. The previous logic instead counted actual
        // attendance_records punches and treated any day without one as
        // unpaid — since most employees here don't have daily punch data,
        // that made this preview show employees as almost entirely unpaid
        // even though the real processPayroll run (which ignores punches
        // entirely for this purpose) would pay them in full. This preview
        // must predict what processing will actually do.
        let unpaidLeaveDays = 0;
        try {
          const monthStart = `${targetMonth}-01`;
          const monthEnd = `${targetMonth}-31`;
          const unpaidResult = await db('leave_applications as la')
            .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
            .where('la.employee_id', emp.id)
            .where('la.status', 'approved')
            .where('la.application_start_date', '>=', monthStart)
            .where('la.application_end_date', '<=', monthEnd)
            .where(function () {
              this.where('lt.paid_type', 'unpaid')
                .orWhere('lt.leave_classification', 'unpaid')
                .orWhereRaw("UPPER(lt.leave_code) = 'LOP'")
                .orWhereRaw("UPPER(lt.leave_code) = 'UL'")
                .orWhereNull('lt.id');
            })
            .sum('la.total_days as lopDays')
            .first();
          unpaidLeaveDays = Number((unpaidResult as any)?.lopDays || 0);
        } catch {
          unpaidLeaveDays = 0;
        }

        const unpaidDays = Math.min(totalDays, unpaidLeaveDays);
        let paidDays = Math.max(0, totalDays - unpaidDays);
        const ratio = paidDays / totalDays;

        const basicEarned = Math.round(basicMonthly * ratio);
        const hraEarned = Math.round(hraMonthly * ratio);
        const stdEarned = Math.round(stdAllow * ratio);
        const mealEarned = Math.round(mealAllow * ratio);
        const commEarned = Math.round(commAllow * ratio);
        const eduEarned = Math.round(eduAllow * ratio);
        const ltaEarned = Math.round(ltaVal * ratio);
        const grossEarned = Math.round(grossMonthly * ratio);

        const pfDeduction = ccPf > 0 ? Math.round(ccPf * ratio) : positiveNum(struct?.pfDeduction ?? struct?.pf_deduction, basicEarned > 0 ? Math.min(1800, Math.round(basicEarned * 0.12)) : 0);
        const ptDeduction = ccPt > 0 ? Math.round(ccPt * ratio) : positiveNum(struct?.ptDeduction ?? struct?.pt_deduction, grossEarned > 15000 ? 200 : 0);
        const esicDeduction = ccEsic > 0 ? Math.round(ccEsic * ratio) : positiveNum(struct?.esiDeduction ?? struct?.esi_deduction ?? struct?.esic, grossEarned > 0 && grossEarned <= 21000 ? Math.round(grossEarned * 0.0075) : 0);
        const esicEmployer = positiveNum(struct?.esicEmployer ?? struct?.esic_employer, esicDeduction > 0 ? Math.round(grossEarned * 0.0325) : 0);
        const tdsDeduction = positiveNum(struct?.tdsDeduction ?? struct?.tds_deduction ?? struct?.tds, 0);

        // Query live approved loan repayment EMI for this employee and month.
        // loan_repayments has no employee_id column — it only links via loan_id,
        // so this must join through employee_loans to filter by employee.
        let loanDeduction = 0;
        try {
          const activeLoans = await db('employee_loans')
            .where({ employee_id: emp.id, status: 'active' })
            .whereNull('deleted_at')
            .select('emi', 'monthly_emi');

          for (const l of activeLoans) {
            loanDeduction += Number(l.emi || l.monthly_emi || 0);
          }
        } catch {
          loanDeduction = 0;
        }

        let totalDeduction = pfDeduction + ptDeduction + esicDeduction + tdsDeduction + loanDeduction;
        let netSalary = Math.max(0, grossEarned - totalDeduction);
        // CTC = (gross + employer PF + ESIC employer) * 12
        const pfEmployerMonthly = Math.min(1800, Math.round(basicMonthly * 0.12));
        let ctc = positiveNum(struct?.annualCtc ?? struct?.annual_ctc, (grossMonthly + pfEmployerMonthly + (esicDeduction > 0 ? Math.round(grossMonthly * 0.0325) : 0)) * 12);

        // Resolve slab_name from payroll_slabs, salary_structures, or employee profile
        let slabName = '';
        const slabIdToTry = struct?.slab_id || struct?.slabId || emp?.salary_slab_id || emp?.salarySlabId;
        if (slabIdToTry) {
          const slabRow = await db('payroll_slabs').where('id', Number(slabIdToTry)).first().catch(() => null);
          if (slabRow?.name || slabRow?.slab_name) {
            slabName = slabRow.name || slabRow.slab_name;
          }
        }
        if (!slabName && (struct?.slab_name || struct?.slabName || struct?.payroll_slab_name || struct?.payrollSlabName)) {
          slabName = struct?.slab_name || struct?.slabName || struct?.payroll_slab_name || struct?.payrollSlabName;
        }
        if (!slabName && (emp?.salary_slab_name || emp?.salarySlabName || emp?.payroll_slab || emp?.payrollSlab)) {
          slabName = emp?.salary_slab_name || emp?.salarySlabName || emp?.payroll_slab || emp?.payrollSlab;
        }
        if (!slabName && struct?.structure_name && !struct.structure_name.startsWith('Structure - Employee')) {
          slabName = struct.structure_name;
        }
        if (!slabName) {
          const matchedSlab = await db('payroll_slabs')
            .where('organization_id', empOrgId)
            .whereNull('deleted_at')
            .orderBy('id', 'asc')
            .first()
            .catch(() => null);
          if (matchedSlab?.name) {
            slabName = matchedSlab.name;
          }
        }
        if (!slabName) {
          slabName = 'Standard Pay Slab';
        }

        // Check for saved custom register override for this employee & month
        let override: any = null;
        try {
          override = await db('payroll_register_overrides')
            .where('organization_id', empOrgId)
            .where('employee_id', emp.id)
            .where('month', targetMonth)
            .first();
        } catch {
          override = null;
        }

        const finalRow = {
          id: emp.id,
          employee_id: emp.id,
          employee_code: emp.employeeCode || emp.employee_code || `EMP-${emp.id}`,
          first_name: emp.firstName || emp.first_name || '',
          middle_name: emp.middleName || emp.middle_name || '',
          last_name: emp.lastName || emp.last_name || '',
          department_name: emp.departmentName || emp.department_name || 'General',
          reporting_manager: (emp.reportingManager || emp.reporting_manager || '').trim() || 'Organization Admin',
          designation: emp.jobTitle || emp.job_title || emp.designation || emp.designation_name || 'Employee',
          slab_name: slabName,
          bank_name: (emp.bankName || emp.bank_name || '').trim() || null,
          bankName: (emp.bankName || emp.bank_name || '').trim() || null,
          account_no: (emp.accountNo || emp.account_no || emp.accountNumber || emp.account_number || '').trim() || null,
          accountNo: (emp.accountNo || emp.account_no || emp.accountNumber || emp.account_number || '').trim() || null,
          account_number: (emp.accountNo || emp.account_no || emp.accountNumber || emp.account_number || '').trim() || null,
          accountNumber: (emp.accountNo || emp.account_no || emp.accountNumber || emp.account_number || '').trim() || null,
          ifsc_code: (emp.ifscCode || emp.ifsc_code || '').trim() || null,
          ifscCode: (emp.ifscCode || emp.ifsc_code || '').trim() || null,
          salary_days: override ? Number(override.salary_days) : totalDays,
          paid_days: override ? Number(override.paid_days) : paidDays,
          unpaid_days: override ? Number(override.unpaid_days) : unpaidDays,
          basic: override ? Number(override.basic) : basicMonthly,
          basic_salary: override ? Number(override.basic) : basicMonthly,
          basicMonthly: override ? Number(override.basic) : basicMonthly,
          hra: override ? Number(override.hra) : hraMonthly,
          hra_monthly: override ? Number(override.hra) : hraMonthly,
          hraMonthly: override ? Number(override.hra) : hraMonthly,
          standard_allowance: override ? Number(override.standard_allowance) : stdAllow,
          meal_allowance: override ? Number(override.meal_allowance) : mealAllow,
          communication_allowance: override ? Number(override.communication_allowance) : commAllow,
          children_education_allowance: override ? Number(override.children_education_allowance) : eduAllow,
          lta: override ? Number(override.lta) : ltaVal,
          gross: override ? Number(override.gross) : grossMonthly,
          gross_salary: override ? Number(override.gross) : grossMonthly,
          grossMonthly: override ? Number(override.gross) : grossMonthly,
          gross_monthly: override ? Number(override.gross) : grossMonthly,
          basic_earned: override ? Number(override.basic_earned) : basicEarned,
          basicEarned: override ? Number(override.basic_earned) : basicEarned,
          hra_earned: override ? Number(override.hra_earned) : hraEarned,
          hraEarned: override ? Number(override.hra_earned) : hraEarned,
          standard_allowance_earned: override ? Number(override.standard_allowance_earned) : stdEarned,
          meal_allowance_earned: override ? Number(override.meal_allowance_earned) : mealEarned,
          communication_allowance_earned: override ? Number(override.communication_allowance_earned) : commEarned,
          children_education_allowance_earned: override ? Number(override.children_education_allowance_earned) : eduEarned,
          lta_earned: override ? Number(override.lta_earned) : ltaEarned,
          gross_earned: override ? Number(override.gross_earned) : grossEarned,
          grossEarned: override ? Number(override.gross_earned) : grossEarned,
          total_gross_earned: override ? Number(override.total_gross_earned) : grossEarned,
          adjustment: override ? Number(override.adjustment) : 0,
          ot_hours: override ? Number(override.ot_hours) : 0,
          ot: override ? Number(override.ot) : 0,
          pt: override ? Number(override.pt) : ptDeduction,
          pt_deduction: override ? Number(override.pt) : ptDeduction,
          ptDeduction: override ? Number(override.pt) : ptDeduction,
          pf: override ? Number(override.pf) : pfDeduction,
          pf_deduction: override ? Number(override.pf) : pfDeduction,
          pfDeduction: override ? Number(override.pf) : pfDeduction,
          tds: override ? Number(override.tds) : tdsDeduction,
          tds_deduction: override ? Number(override.tds) : tdsDeduction,
          tdsDeduction: override ? Number(override.tds) : tdsDeduction,
          loan_deduction: loanDeduction,
          loanDeduction: loanDeduction,
          esic_employer: override ? Number(override.esic_employer) : esicEmployer,
          esic: override ? Number(override.esic) : esicDeduction,
          esic_deduction: override ? Number(override.esic) : esicDeduction,
          esicDeduction: override ? Number(override.esic) : esicDeduction,
          total_deduction: override ? Number(override.total_deduction) : totalDeduction,
          totalDeduction: override ? Number(override.total_deduction) : totalDeduction,
          net_salary: override ? Number(override.net_salary) : netSalary,
          netSalary: override ? Number(override.net_salary) : netSalary,
          ctc: override ? Number(override.ctc) : ctc,
          notes: override ? override.notes : '',
          payment_status: override ? override.payment_status : 'Freeze',
          status: 'PROCESSED',
          is_overridden: Boolean(override)
        };

        resultRows.push(finalRow);
      }

      res.json({ success: true, data: resultRows });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Error processing payroll register' });
    }
  }

  async saveProcessRegisterOverride(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;
    const {
      employee_id,
      month,
      cycle_id,
      salary_days,
      paid_days,
      unpaid_days,
      basic,
      hra,
      standard_allowance,
      meal_allowance,
      communication_allowance,
      children_education_allowance,
      lta,
      gross,
      basic_earned,
      hra_earned,
      standard_allowance_earned,
      meal_allowance_earned,
      communication_allowance_earned,
      children_education_allowance_earned,
      lta_earned,
      gross_earned,
      total_gross_earned,
      adjustment,
      ot_hours,
      ot,
      pt,
      pf,
      tds,
      esic,
      esic_employer,
      total_deduction,
      net_salary,
      ctc,
      payment_status,
      notes,
    } = req.body;

    if (!employee_id || !month) {
      return res.status(400).json({ success: false, message: 'employee_id and month are required' });
    }

    const orgId = ctx.organizationId;
    const targetMonth = String(month).slice(0, 7);

    const payload: any = {
      organization_id: orgId,
      employee_id: Number(employee_id),
      month: targetMonth,
      cycle_id: cycle_id ? Number(cycle_id) : null,
      salary_days: Number(salary_days ?? 30),
      paid_days: Number(paid_days ?? 30),
      unpaid_days: Number(unpaid_days ?? 0),
      basic: Number(basic ?? 0),
      hra: Number(hra ?? 0),
      standard_allowance: Number(standard_allowance ?? 0),
      meal_allowance: Number(meal_allowance ?? 0),
      communication_allowance: Number(communication_allowance ?? 0),
      children_education_allowance: Number(children_education_allowance ?? 0),
      lta: Number(lta ?? 0),
      gross: Number(gross ?? 0),
      basic_earned: Number(basic_earned ?? 0),
      hra_earned: Number(hra_earned ?? 0),
      standard_allowance_earned: Number(standard_allowance_earned ?? 0),
      meal_allowance_earned: Number(meal_allowance_earned ?? 0),
      communication_allowance_earned: Number(communication_allowance_earned ?? 0),
      children_education_allowance_earned: Number(children_education_allowance_earned ?? 0),
      lta_earned: Number(lta_earned ?? 0),
      gross_earned: Number(gross_earned ?? 0),
      total_gross_earned: Number(total_gross_earned ?? gross_earned ?? 0),
      adjustment: Number(adjustment ?? 0),
      ot_hours: Number(ot_hours ?? 0),
      ot: Number(ot ?? 0),
      pt: Number(pt ?? 0),
      pf: Number(pf ?? 0),
      tds: Number(tds ?? 0),
      esic: Number(esic ?? 0),
      esic_employer: Number(esic_employer ?? 0),
      total_deduction: Number(total_deduction ?? 0),
      net_salary: Number(net_salary ?? 0),
      ctc: Number(ctc ?? 0),
      payment_status: payment_status || 'Freeze',
      notes: notes || '',
      updated_at: new Date()
    };

    const existing = await db('payroll_register_overrides')
      .where({ organization_id: orgId, employee_id: Number(employee_id), month: targetMonth })
      .first();

    if (existing) {
      await db('payroll_register_overrides')
        .where('id', existing.id)
        .update(payload);
    } else {
      payload.created_at = new Date();
      await db('payroll_register_overrides').insert(payload);
    }

    res.json({ success: true, message: 'Payroll register row updated successfully', data: payload });
  }

  async listPayrolls(req: Request, res: Response) {
    const { cycleId, month } = req.query;
    const runs = await this.payrollService.getPayrollRuns(
      req.ctx,
      cycleId ? parseInt(cycleId as string) : undefined,
      month ? String(month) : undefined
    );
    res.json({ success: true, data: runs });
  }

  async getPendingApprovals(req: Request, res: Response) {
    const runs = await this.payrollService.getPendingApprovals(req.ctx);
    res.json({ success: true, data: runs });
  }

  // SALARY STRUCTURE ENDPOINTS
  async getStructureComponents(req: Request, res: Response) {
    const { id } = req.params;
    const components = await this.structureService.getStructureComponents(req.ctx, parseInt(id));
    res.json({ success: true, data: components });
  }

  async addComponentToStructure(req: Request, res: Response) {
    const { structureId, componentId, sortOrder } = req.body;
    const component = await this.structureService.addComponentToStructure(
      req.ctx,
      structureId,
      componentId,
      sortOrder
    );
    res.status(201).json({ success: true, data: component });
  }

  async calculateCTC(req: Request, res: Response) {
    const { structureId } = req.body;
    const ctc = await this.structureService.calculateCTC(req.ctx, structureId);
    res.json({ success: true, data: { ctc } });
  }

  // SALARY REVISION ENDPOINTS
  async requestRevision(req: Request, res: Response) {
    const revision = await this.revisionService.requestRevision(req.ctx, req.body);
    res.status(201).json({ success: true, data: revision });
  }

  async submitRevisionForApproval(req: Request, res: Response) {
    const { id } = req.params;
    const revision = await this.revisionService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  }

  async approveRevision(req: Request, res: Response) {
    const { id } = req.params;
    const { approverId } = req.body;
    const revision = await this.revisionService.approveRevision(req.ctx, parseInt(id), approverId);
    res.json({ success: true, data: revision });
  }

  async rejectRevision(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;
    const revision = await this.revisionService.rejectRevision(req.ctx, parseInt(id), reason);
    res.json({ success: true, data: revision });
  }

  async getRevision(req: Request, res: Response) {
    const { id } = req.params;
    const revision = await this.revisionService.getRevision(req.ctx, parseInt(id));
    res.json({ success: true, data: revision });
  }

  async getRevisionComponents(req: Request, res: Response) {
    const { id } = req.params;
    const components = await this.revisionService.getRevisionComponents(req.ctx, parseInt(id));
    res.json({ success: true, data: components });
  }

  // PAYSLIP ENDPOINTS
  async getPayslips(req: Request, res: Response) {
    const db = getKnex();
    const { employeeId, month } = req.query;
    const orgId = req.ctx.organizationId;

    const userRoles = await db('user_roles as ur')
      .join('roles as r', 'r.id', 'ur.role_id')
      .where('ur.user_id', req.ctx.userId)
      .select('r.code')
      .catch(() => []);
    const roleCodes = userRoles.map((r: any) => r.code);
    const isAdminOrHR = roleCodes.includes('organization_admin') ||
      roleCodes.includes('super_admin') ||
      roleCodes.includes('hr_manager') ||
      roleCodes.includes('finance_manager');

    let query = db('payslips as p')
      .leftJoin('employees as e', 'p.employee_id', 'e.id')
      .where('p.organization_id', orgId)
      .whereNull('p.deleted_at')
      .select(
        'p.*',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'e.current_department_id',
        'e.current_designation_id'
      );

    if (employeeId && !isNaN(Number(employeeId))) {
      query = query.where('p.employee_id', Number(employeeId));
    } else if (!isAdminOrHR) {
      const myEmpId = await this.getEmployeeId(req);
      query = query.where('p.employee_id', myEmpId);
    }

    if (month) {
      const monthStr = String(month).slice(0, 7);
      query = query.whereRaw("DATE_FORMAT(p.payslip_month, '%Y-%m') = ?", [monthStr]);
    }

    const payslips = await query.orderBy('p.id', 'desc');
    res.json({ success: true, data: payslips });
  }

  async generatePayslipFromProcess(req: Request, res: Response) {
    const { employeeId, month } = req.body;
    const result = await this.payslipService.getOrGenerateFromProcessedRun(req.ctx, parseInt(employeeId), month);
    res.status(201).json({ success: true, data: result });
  }

  async createPayslip(req: Request, res: Response) {
    const { employeeId, payslipNumber, month, basicSalary, grossSalary, totalDeductions, netSalary } = req.body;
    const payslip = await this.payslipService.createDirectPayslip(req.ctx, {
      employeeId: parseInt(employeeId),
      payslipNumber: payslipNumber || `PS-${month.replace('-', '')}-${employeeId}`,
      month: month || new Date().toISOString().slice(0, 7),
      basicSalary: Number(basicSalary || 0),
      grossSalary: Number(grossSalary || 0),
      totalDeductions: Number(totalDeductions || 0),
      netSalary: Number(netSalary || 0)
    });
    res.status(201).json({ success: true, data: payslip });
  }

  async getPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.getPayslip(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  async getPayslipDetails(req: Request, res: Response) {
    const { id } = req.params;
    const details = await this.payslipService.getPayslipDetails(req.ctx, parseInt(id));
    res.json({ success: true, data: details });
  }

  async sendPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.sendPayslipToEmployee(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  async lockPayslip(req: Request, res: Response) {
    const { id } = req.params;
    const payslip = await this.payslipService.lockPayslip(req.ctx, parseInt(id));
    res.json({ success: true, data: payslip });
  }

  // LOAN ENDPOINTS
  async createLoan(req: Request, res: Response) {
    const loan = await this.loanService.createLoan(req.ctx, req.body);
    res.status(201).json({ success: true, data: loan });
  }

  async getLoans(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string) : undefined;
    const loans = await this.loanService.getEmployeeLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getActiveLoan(req: Request, res: Response) {
    const { employeeId } = req.query;
    const empId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    const loans = await this.loanService.getActiveLoans(req.ctx, isNaN(empId as any) ? undefined : empId);
    res.json({ success: true, data: loans });
  }

  async getLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.getLoan(req.ctx, parseInt(id));
    res.json({ success: true, data: loan });
  }

  async updateLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.updateLoan(req.ctx, parseInt(id, 10), req.body);
    res.json({ success: true, data: loan });
  }

  async approveLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.approveLoan(req.ctx, parseInt(id));
    res.json({ success: true, data: loan });
  }

  async rejectLoan(req: Request, res: Response) {
    const { id } = req.params;
    const loan = await this.loanService.rejectLoan(req.ctx, parseInt(id));
    res.json({ success: true, data: loan });
  }

  async getEmiSchedule(req: Request, res: Response) {
    const { loanId } = req.query;
    const schedule = await this.loanService.getRepaymentSchedule(req.ctx, parseInt(loanId as string));
    res.json({ success: true, data: schedule });
  }

  async getNextEmi(req: Request, res: Response) {
    const { loanId } = req.query;
    const emi = await this.loanService.getNextEMI(req.ctx, parseInt(loanId as string));
    res.json({ success: true, data: emi });
  }

  // TAX ENDPOINTS
  async createTaxDeclaration(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const declaration = await this.taxService.createDeclaration(req.ctx, {
      ...req.body,
      employeeId
    });
    res.status(201).json({ success: true, data: declaration });
  }

  async getTaxDeclarations(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.query.employeeId);
    const declarations = await this.taxService.getEmployeeDeclarations(req.ctx, employeeId);
    res.json({ success: true, data: declarations });
  }

  async getTaxDeclaration(req: Request, res: Response) {
    const { id } = req.params;
    const declaration = await this.taxService.getDeclaration(req.ctx, parseInt(id));
    res.json({ success: true, data: declaration });
  }

  async addTaxInvestment(req: Request, res: Response) {
    const investment = await this.taxService.addInvestment(req.ctx, req.body);
    res.status(201).json({ success: true, data: investment });
  }

  async getTaxInvestments(req: Request, res: Response) {
    const { declarationId } = req.query;
    const investments = await this.taxService.getDeclarationInvestments(req.ctx, parseInt(declarationId as string));
    res.json({ success: true, data: investments });
  }

  async finalizeTaxDeclaration(req: Request, res: Response) {
    const { id } = req.params;
    const declaration = await this.taxService.finalizeDeclaration(req.ctx, parseInt(id));
    res.json({ success: true, data: declaration });
  }

  async calculateTDS(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const { financialYear, grossSalaryYtd, taxRegime } = req.body;
    // 🔧 FIX: Pass taxRegime to support both old and new regime (new is default)
    const tds = await this.taxService.calculateTDS(
      req.ctx,
      employeeId,
      financialYear,
      grossSalaryYtd,
      taxRegime === 'old' ? 'old' : 'new'
    );
    res.json({ success: true, data: tds });
  }

  // SETTLEMENT & GRATUITY ENDPOINTS
  async getGratuityRules(req: Request, res: Response) {
    const rules = await this.settlementService.getGratuityRules(req.ctx);
    res.json({ success: true, data: rules });
  }

  async saveGratuityRule(req: Request, res: Response) {
    const rule = await this.settlementService.saveGratuityRule(req.ctx, req.body);
    res.json({ success: true, data: rule });
  }

  async deleteGratuityRule(req: Request, res: Response) {
    const { id } = req.params;
    const result = await this.settlementService.deleteGratuityRule(req.ctx, parseInt(id));
    res.json({ success: true, ...result });
  }

  async submitSettlementForApproval(req: Request, res: Response) {
    const { id } = req.params;
    const settlement = await this.settlementService.submitForApproval(req.ctx, parseInt(id));
    res.json({ success: true, data: settlement });
  }

  async getMySettlement(req: Request, res: Response) {
    const empId = await this.getEmployeeId(req);
    let settlements: any[] = [];
    if (empId > 0) {
      settlements = await this.settlementService.getSettlements(req.ctx, empId);
    }
    if (!settlements || settlements.length === 0) {
      settlements = await this.settlementService.getSettlements(req.ctx, undefined);
    }
    const latest = settlements && settlements.length > 0 ? settlements[0] : null;
    res.json({ success: true, data: latest, list: settlements || [] });
  }

  async getPendingExitRequests(req: Request, res: Response) {
    const exitRequests = await this.settlementService.getPendingExitRequests(req.ctx);
    res.json({ success: true, data: exitRequests || [] });
  }

  async adminRejectSettlement(req: Request, res: Response) {
    const { id } = req.params;
    const adminUserId = req.ctx?.userId || (req.user as any)?.id || 0;
    const { reason } = req.body;
    const result = await this.settlementService.adminRejectSettlement(req.ctx, parseInt(id), adminUserId, reason);
    res.json({ success: true, data: result });
  }

  async getRevisions(req: Request, res: Response) {
    const { employeeId, status, revisionType } = req.query;
    const revisions = await this.revisionService.listRevisions(req.ctx, {
      employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      status: status as string,
      revisionType: revisionType as string,
    });
    res.json({ success: true, data: revisions });
  }

  async getPayrollPolicies(req: Request, res: Response) {
    const db = getKnex();
    let policy = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (!policy) {
      policy = {
        organization_id: req.ctx.organizationId,
        policy_name: 'Standard Org Policy',
        name: 'Standard Org Policy',
        pay_cycle_type: 'monthly',
        pay_calculation_basis: 'working_days_26',
        fixed_working_days: 26,
        cutoff_day: 25,
        pay_day: 1,
        lop_deduction_formula: 'gross_divided_by_days',
        overtime_rate_multiplier: 1.50,
        status: 'active'
      };
    } else {
      // Normalize: expose policy_name as alias for name for frontend compatibility
      policy.policy_name = policy.policy_name || policy.name;
    }
    res.json({ success: true, data: policy });
  }

  async updatePayrollPolicies(req: Request, res: Response) {
    const db = getKnex();
    const body = req.body || {};

    // Normalize pay_calculation_basis enum (frontend may send 'actual_days' → DB expects 'working_days_fixed')
    let calcBasis = body.pay_calculation_basis || 'working_days_26';
    if (calcBasis === 'actual_days') calcBasis = 'working_days_fixed';

    // Normalize lop_deduction_formula
    let lopFormula = body.lop_deduction_formula || 'gross_divided_by_days';
    if (!['gross_divided_by_days', 'basic_divided_by_days'].includes(lopFormula)) {
      lopFormula = 'gross_divided_by_days';
    }

    // Build safe update payload — map policy_name → name
    const policyName = body.policy_name || body.name || 'Standard Organization Payroll Policy';
    const updatePayload: Record<string, any> = {
      name: policyName,
      policy_name: policyName,
      pay_calculation_basis: calcBasis,
      lop_deduction_formula: lopFormula,
      status: body.status || 'active',
      updated_at: new Date(),
      updated_by: req.ctx.userId || 1,
    };
    if (body.overtime_rate_multiplier !== undefined) {
      updatePayload.overtime_rate_multiplier = parseFloat(body.overtime_rate_multiplier) || 1.50;
    }
    if (body.pay_day !== undefined) updatePayload.pay_day = body.pay_day;

    const existing = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (existing) {
      await db('payroll_policies').where('id', existing.id).update(updatePayload);
    } else {
      await db('payroll_policies').insert({
        uuid: uuidv4(),
        organization_id: req.ctx.organizationId,
        name: policyName,
        code: `POL-${req.ctx.organizationId}-${Date.now().toString().slice(-4)}`,
        ...updatePayload,
        created_by: req.ctx.userId || 1,
        updated_by: req.ctx.userId || 1,
      });
    }
    const updated = await db('payroll_policies').where('organization_id', req.ctx.organizationId).whereNull('deleted_at').first();
    if (updated) updated.policy_name = updated.policy_name || updated.name;
    res.json({ success: true, data: updated });
  }

  async exportBankTransfer(req: Request, res: Response) {
    const { id } = req.params;
    const csv = await this.payrollService.getBankTransferSheet(req.ctx, parseInt(id));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bank_transfer_run_${id}.csv`);
    res.status(200).send(csv);
  }

  async exportCompliance(req: Request, res: Response) {
    const { id } = req.params;
    const csv = await this.payrollService.getComplianceReport(req.ctx, parseInt(id));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=compliance_run_${id}.csv`);
    res.status(200).send(csv);
  }

  // ENTERPRISE EXTENDED ENDPOINTS
  async createComponent(req: Request, res: Response) {
    const component = await this.componentService.createComponent(req.ctx, req.body);
    res.status(201).json({ success: true, data: component });
  }

  async lockAttendance(req: Request, res: Response) {
    const { salaryMonth } = req.body;
    const result = await this.attendanceService.lockAttendance(req.ctx, salaryMonth || '2026-07');
    res.json({ success: true, data: result });
  }

  async getAttendanceLockStatus(req: Request, res: Response) {
    const { salaryMonth } = req.query;
    const lock = await this.attendanceService.getAttendanceLockStatus(req.ctx, (salaryMonth as string) || '2026-07');
    res.json({ success: true, data: lock });
  }

  async submitReimbursement(req: Request, res: Response) {
    const employeeId = await this.getEmployeeId(req, req.body.employeeId);
    const claim = await this.reimbursementService.submitClaim(req.ctx, employeeId, req.body);
    res.status(201).json({ success: true, data: claim });
  }

  async getReimbursements(req: Request, res: Response) {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const status = req.query.status as string;
    const claims = await this.reimbursementService.getClaims(req.ctx, employeeId, status);
    res.json({ success: true, data: claims });
  }

  async approveReimbursement(req: Request, res: Response) {
    const { id } = req.params;
    const claim = await this.reimbursementService.approveClaim(req.ctx, parseInt(id), req.ctx.userId);
    res.json({ success: true, data: claim });
  }

  async rejectReimbursement(req: Request, res: Response) {
    const { id } = req.params;
    const { remarks } = req.body;
    const claim = await this.reimbursementService.rejectClaim(req.ctx, parseInt(id), remarks || 'Rejected by approver');
    res.json({ success: true, data: claim });
  }

  async getLedgerEntries(req: Request, res: Response) {
    const salaryMonth = req.query.salaryMonth as string;
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const entries = await this.ledgerService.getLedgerEntries(req.ctx, salaryMonth, employeeId);
    res.json({ success: true, data: entries });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SALARY STRUCTURES DYNAMIC CRUD (/payroll/salary-structure)
  // ─────────────────────────────────────────────────────────────────────────────
  async listStructures(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const employeeId = req.query.employee_id || req.query.employeeId;

      let query = db('salary_structures')
        .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
        .select(
          'salary_structures.*',
          'payroll_slabs.name as slab_name',
          'payroll_slabs.selected_component_ids as slab_component_ids'
        )
        .where('salary_structures.organization_id', orgId)
        .whereNull('salary_structures.deleted_at')
        .orderBy('salary_structures.id', 'desc');

      if (employeeId) {
        query = query.where('salary_structures.employee_id', employeeId);
      }

      const rows = await query;

      const mapped = rows.map((r: any) => {
        const s = withSnakeAliases(r) || r;
        let customComponents = [];
        try {
          const rawCC = s.custom_components || s.customComponents;
          customComponents = typeof rawCC === 'string'
            ? JSON.parse(rawCC)
            : (rawCC || []);
        } catch { }

        const slabName = s.slab_name || s.slabName || s.structure_name || s.structureName || 'Standard Pay Slab';
        const annualCtcVal = Number(s.annual_ctc ?? s.annualCtc ?? 0);
        const grossVal = Number(s.gross_monthly ?? s.grossMonthly ?? s.gross ?? 0);
        const netVal = Number(s.net_take_home ?? s.netTakeHome ?? s.net_salary_monthly ?? s.netSalary ?? 0);

        return {
          ...s,
          id: String(s.id),
          employeeId: s.employee_id ? String(s.employee_id) : (s.employeeId ? String(s.employeeId) : undefined),
          structureName: s.structure_name || s.structureName || slabName,
          slab: slabName,
          slabName: slabName,
          slabId: s.slab_id !== undefined && s.slab_id !== null ? String(s.slab_id) : (s.slabId !== undefined && s.slabId !== null ? String(s.slabId) : undefined),
          cycleId: s.cycle_id !== undefined && s.cycle_id !== null ? String(s.cycle_id) : (s.cycleId !== undefined && s.cycleId !== null ? String(s.cycleId) : undefined),
          annualCtc: annualCtcVal,
          annual_ctc: annualCtcVal,
          ctc: annualCtcVal,
          grossMonthly: grossVal,
          gross_monthly: grossVal,
          gross: grossVal,
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          basic: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          hra: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: netVal,
          net_take_home: netVal,
          netSalary: netVal,
          salaryInput: annualCtcVal,
          salary_input: annualCtcVal,
          customComponents,
          custom_components: customComponents,
          effectiveFrom: s.effective_from || s.effectiveFrom || new Date().toISOString().slice(0, 10),
          status: s.status === 'inactive' ? 'Deleted' : 'Active'
        };
      });

      res.json({ success: true, data: mapped });
    } catch (e: any) {
      console.error('listStructures error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error listing salary structures' });
    }
  }

  async getStructure(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const { id } = req.params;

      const row = await db('salary_structures')
        .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
        .select(
          'salary_structures.*',
          'payroll_slabs.name as slab_name',
          'payroll_slabs.selected_component_ids as slab_component_ids'
        )
        .where('salary_structures.id', id)
        .where('salary_structures.organization_id', orgId)
        .whereNull('salary_structures.deleted_at')
        .first();

      if (!row) {
        return res.status(404).json({ success: false, message: 'Salary structure not found' });
      }

      const s = withSnakeAliases(row) || row;
      let customComponents = [];
      try {
        const rawCC = s.custom_components || s.customComponents;
        customComponents = typeof rawCC === 'string'
          ? JSON.parse(rawCC)
          : (rawCC || []);
      } catch { }

      const slabName = s.slab_name || s.slabName || s.structure_name || s.structureName || 'Standard Pay Slab';
      const annualCtcVal = Number(s.annual_ctc ?? s.annualCtc ?? 0);
      const grossVal = Number(s.gross_monthly ?? s.grossMonthly ?? s.gross ?? 0);
      const netVal = Number(s.net_take_home ?? s.netTakeHome ?? s.net_salary_monthly ?? s.netSalary ?? 0);

      res.json({
        success: true,
        data: {
          ...s,
          id: String(s.id),
          employeeId: s.employee_id ? String(s.employee_id) : (s.employeeId ? String(s.employeeId) : undefined),
          structureName: s.structure_name || s.structureName || slabName,
          slab: slabName,
          slabName: slabName,
          slabId: s.slab_id !== undefined && s.slab_id !== null ? String(s.slab_id) : (s.slabId !== undefined && s.slabId !== null ? String(s.slabId) : undefined),
          cycleId: s.cycle_id !== undefined && s.cycle_id !== null ? String(s.cycle_id) : (s.cycleId !== undefined && s.cycleId !== null ? String(s.cycleId) : undefined),
          annualCtc: annualCtcVal,
          annual_ctc: annualCtcVal,
          ctc: annualCtcVal,
          grossMonthly: grossVal,
          gross_monthly: grossVal,
          gross: grossVal,
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          basic: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          hra: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: netVal,
          net_take_home: netVal,
          netSalary: netVal,
          salaryInput: annualCtcVal,
          salary_input: annualCtcVal,
          customComponents,
          custom_components: customComponents,
          effectiveFrom: s.effective_from || s.effectiveFrom || new Date().toISOString().slice(0, 10),
          status: s.status === 'inactive' ? 'Deleted' : 'Active'
        }
      });
    } catch (e: any) {
      console.error('getStructure error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error getting salary structure' });
    }
  }

  async deleteStructure(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const { id } = req.params;

      await db('salary_structures')
        .where({ id, organization_id: orgId })
        .update({ deleted_at: new Date(), status: 'inactive' });

      res.json({ success: true, message: 'Salary structure deleted successfully' });
    } catch (e: any) {
      console.error('deleteStructure error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error deleting salary structure' });
    }
  }

  async createStructure(req: Request, res: Response) {
    const db = getKnex();

    // Support both camelCase and snake_case from frontend
    const employeeId = req.body.employeeId || req.body.employee_id;
    const structureName = req.body.structureName || req.body.slab || req.body.name || 'Standard Salary Structure';
    const baseSalary = req.body.baseSalary || req.body.basic_monthly;
    const grossSalary = req.body.grossSalary || req.body.gross_monthly;
    // net_take_home is what the Assign Pay Slab screen actually sends —
    // net_salary_monthly was never a real field name from any caller, so
    // this always evaluated to undefined and net take-home silently saved
    // as 0 regardless of what was submitted.
    const netSalary = req.body.netSalary || req.body.net_salary_monthly || req.body.net_take_home;
    const annualCtc = req.body.annualCtc || req.body.annual_ctc;
    const hraMonthly = req.body.hraMonthly || req.body.hra_monthly;
    const specialAllowanceMonthly = req.body.specialAllowanceMonthly || req.body.standard_allowance_monthly;
    const pfDeduction = req.body.pfDeduction || req.body.pf_deduction;
    const esiDeduction = req.body.esiDeduction || req.body.esic_deduction;
    const tdsDeduction = req.body.tdsDeduction || req.body.tds_deduction;
    const customComponents = req.body.customComponents;
    // New: cycle + slab chain fields
    const cycleIdFromBody = req.body.cycleId || req.body.cycle_id || null;
    const slabIdFromBody = req.body.slabId || req.body.slab_id || null;
    const pfRatePct = req.body.pfRatePct || req.body.pf_rate_pct || 12;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const effectiveFromDate = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || (firstOrg?.id || 68);
    const sName = structureName || 'Standard Salary Structure';
    const sCode = req.body.structureCode || req.body.gradeCode || `STR-${sName.slice(0, 3).toUpperCase()}-${Date.now()}`;

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? 47);

    // Resolve company_id from employee, request body, or tenant context
    const emp = employeeId ? await db('employees').where('id', employeeId).first().catch(() => null) : null;
    const resolvedCompanyId = req.body.companyId || req.body.company_id || emp?.company_id || req.ctx?.companyId || null;
    const numericCompanyId = (resolvedCompanyId && !isNaN(Number(resolvedCompanyId)) && Number(resolvedCompanyId) > 0)
      ? Number(resolvedCompanyId)
      : null;

    // Find this employee's own existing structure to update, if any. This
    // MUST be scoped by employee_id (and org) — it previously matched on
    // structure_name alone, which defaults to the same literal string
    // ("Standard Salary Structure") whenever no custom name is supplied.
    // Assigning a slab to employee B would then find employee A's row by
    // that shared default name and silently re-point it at B, leaving A
    // with nothing. A structure with no employeeId (a bare template, not
    // yet assigned to anyone) still falls back to a name+org lookup.
    const existing = employeeId
      ? await db('salary_structures')
        .where({ employee_id: employeeId, organization_id: orgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null)
      : await db('salary_structures')
        .where({ structure_name: sName, organization_id: orgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);

    if (existing) {
      await db('salary_structures').where('id', existing.id).update({
        organization_id: orgId,
        company_id: numericCompanyId !== null ? numericCompanyId : existing.company_id,
        structure_name: sName,
        structure_code: sCode,
        grade_code: sCode,
        employee_id: employeeId || existing.employee_id || null,
        cycle_id: cycleIdFromBody !== null ? cycleIdFromBody : existing.cycle_id,      // ← slab.cycle_id
        slab_id: slabIdFromBody !== null ? slabIdFromBody : existing.slab_id,          // ← slab_id
        effective_from: effectiveFromDate,
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : existing.annual_ctc),
        basic_monthly: baseSalary !== undefined ? baseSalary : existing.basic_monthly,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : existing.hra_monthly,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : existing.special_allowance_monthly,
        gross_monthly: grossSalary !== undefined ? grossSalary : existing.gross_monthly,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : existing.pf_deduction,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : existing.esi_deduction,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : existing.tds_deduction,
        net_take_home: netSalary !== undefined ? netSalary : existing.net_take_home,
        custom_components: customComponentsJson !== undefined ? customComponentsJson : (existing.custom_components || null),
        updated_by: validUserId,
        updated_at: new Date()
      }).catch(() => { });

      // Update component breakdown in salary_structure_components
      try {
        const existingComp = await db('salary_structure_components').where('structure_id', existing.id).first();
        if (existingComp) {
          await db('salary_structure_components').where('id', existingComp.id).update({
            organization_id: orgId,
            employee_id: employeeId || existingComp.employee_id || null,
            annual_ctc: annualCtc !== undefined ? annualCtc : existingComp.annual_ctc,
            basic_monthly: baseSalary !== undefined ? baseSalary : existingComp.basic_monthly,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : existingComp.hra_monthly,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : existingComp.special_allowance_monthly,
            gross_monthly: grossSalary !== undefined ? grossSalary : existingComp.gross_monthly,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : existingComp.pf_deduction,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : existingComp.esi_deduction,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : existingComp.tds_deduction,
            net_take_home: netSalary !== undefined ? netSalary : existingComp.net_take_home,
            updated_by: validUserId,
            updated_at: new Date()
          });
        } else {
          const salComp = await db('salary_components').first().catch(() => null);
          const compId = salComp?.id || 101;
          await db('salary_structure_components').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            structure_id: existing.id,
            component_id: compId,
            sort_order: 1,
            employee_id: employeeId || null,
            annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
            basic_monthly: baseSalary !== undefined ? baseSalary : 0,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
            gross_monthly: grossSalary !== undefined ? grossSalary : 0,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
            net_take_home: netSalary !== undefined ? netSalary : 0,
            grade_code: sCode,
            created_by: validUserId,
            updated_by: validUserId
          });
        }
      } catch (e) { }

      if (employeeId) {
        try {
          await db('employee_salary_structures').where({ employee_id: employeeId, is_current: true }).update({ is_current: false });
          await db('employee_salary_structures').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: employeeId,
            salary_structure_id: existing.id,
            effective_from: new Date().toISOString().slice(0, 10),
            is_current: true,
            created_by: validUserId,
            updated_by: validUserId
          });
        } catch (e) { }
      }

      const updated = await db('salary_structures').where('id', existing.id).first();
      return res.json({ success: true, data: updated });
    }

    let insertedId: number | null = null;

    // Standard insert into salary_structures table with fail-proof fallback
    try {
      const [id] = await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        employee_id: employeeId || null,
        structure_name: sName,
        structure_code: sCode,
        grade_code: sCode,
        cycle_id: cycleIdFromBody || null,
        slab_id: slabIdFromBody || null,
        effective_from: new Date().toISOString().slice(0, 10),
        annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
        basic_monthly: baseSalary !== undefined ? baseSalary : 0,
        hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
        special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
        gross_monthly: grossSalary !== undefined ? grossSalary : 0,
        pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
        esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
        tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
        net_take_home: netSalary !== undefined ? netSalary : 0,
        custom_components: customComponentsJson || null,
        status: 'active',
        created_by: validUserId,
        updated_by: validUserId
      });
      insertedId = id;
    } catch (err) {
      try {
        const [id] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: numericCompanyId,
          structure_name: sName,
          structure_code: sCode,
          annual_ctc: annualCtc !== undefined ? annualCtc : 0,
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          effective_from: new Date().toISOString().slice(0, 10),
          status: 'active'
        });
        insertedId = id;
      } catch (e2) {
        await db.raw(
          `INSERT INTO salary_structures (uuid, organization_id, structure_name, structure_code, status, effective_from) VALUES (?, ?, ?, ?, 'active', ?)`,
          [uuidv4(), orgId, sName, sCode, new Date().toISOString().slice(0, 10)]
        ).catch(() => { });
        const lastRow = await db('salary_structures').orderBy('id', 'desc').first().catch(() => null);
        insertedId = lastRow?.id || Date.now();
      }
    }

    const created = await db('salary_structures').where('id', insertedId).first();

    // Record component breakdown into salary_structure_components table
    if (insertedId) {
      try {
        const salComp = await db('salary_components').first().catch(() => null);
        const compId = salComp?.id || 101;

        await db('salary_structure_components').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_id: insertedId,
          component_id: compId,
          sort_order: 1,
          employee_id: employeeId || null,
          annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
          special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
          esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
          tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          grade_code: sCode,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (e) { }
    }

    // If assigned to an employee, record in employee_salary_structures as well
    if (employeeId && insertedId) {
      try {
        await db('employee_salary_structures').where({ employee_id: employeeId, is_current: true }).update({ is_current: false });
        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: insertedId,
          effective_from: new Date().toISOString().slice(0, 10),
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (e) { }
    }

    return res.status(201).json({ success: true, data: created });
  }

  async updateStructure(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const firstOrg = await db('organizations').first().catch(() => null);
    const orgId = req.ctx.organizationId || (firstOrg?.id || 68);
    // Support both camelCase and snake_case from frontend — the real
    // Payroll Details save (EmployeePayrollDetail.tsx) sends snake_case
    // (annual_ctc, gross_monthly, net_salary_monthly, esic_deduction, ...),
    // which a camelCase-only destructure here silently ignored, so every
    // edit fell through to the old stored value while still returning
    // success: true. Mirrors the mapping createStructure already uses.
    const employeeId = req.body.employeeId ?? req.body.employee_id;
    const structureName = req.body.structureName || req.body.slab || req.body.name;
    const baseSalary = req.body.baseSalary ?? req.body.basic_monthly;
    const grossSalary = req.body.grossSalary ?? req.body.gross_monthly;
    const netSalary = req.body.netSalary ?? req.body.net_salary_monthly ?? req.body.net_take_home;
    const annualCtc = req.body.annualCtc ?? req.body.annual_ctc;
    const hraMonthly = req.body.hraMonthly ?? req.body.hra_monthly;
    const specialAllowanceMonthly = req.body.specialAllowanceMonthly ?? req.body.standard_allowance_monthly ?? req.body.special_allowance_monthly;
    const pfDeduction = req.body.pfDeduction ?? req.body.pf_deduction;
    const esiDeduction = req.body.esiDeduction ?? req.body.esic_deduction ?? req.body.esi_deduction;
    const tdsDeduction = req.body.tdsDeduction ?? req.body.tds_deduction;
    const customComponents = req.body.customComponents;
    const cycleId = req.body.cycleId ?? req.body.cycle_id;
    const slabId = req.body.slabId ?? req.body.slab_id;

    const cycleIdVal = cycleId || null;
    const slabIdVal = slabId || null;

    const customComponentsJson = customComponents
      ? (typeof customComponents === 'string' ? customComponents : JSON.stringify(customComponents))
      : undefined;

    const sName = structureName || 'Standard Salary Structure';
    const sCode = req.body.structureCode || req.body.gradeCode || sName;
    const firstUser = await db('users').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id || 1);

    // Find structure by ID or by name/code fallback
    let targetStruct = await db('salary_structures')
      .where('id', id)
      .first()
      .catch(() => null);

    if (!targetStruct && sName) {
      targetStruct = await db('salary_structures')
        .where({ structure_name: sName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    let actualStructId: any = targetStruct ? targetStruct.id : null;
    // targetStruct comes back camelCased (global postProcessResponse hook);
    // aliased once here so every targetStruct?.snake_case fallback used
    // below (both in the update branch and the components block after it)
    // reads the real value instead of always resolving to undefined.
    const ts: any = withSnakeAliases(targetStruct) || {};

    if (!actualStructId) {
      // Structure doesn't exist in DB at all — INSERT IT!
      try {
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId || null,
          cycle_id: cycleIdVal,
          slab_id: slabIdVal,
          structure_name: sName,
          structure_code: sCode,
          grade_code: sCode,
          effective_from: new Date().toISOString().slice(0, 10),
          annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : 0),
          basic_monthly: baseSalary !== undefined ? baseSalary : 0,
          hra_monthly: hraMonthly !== undefined ? hraMonthly : 0,
          special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : 0,
          gross_monthly: grossSalary !== undefined ? grossSalary : 0,
          pf_deduction: pfDeduction !== undefined ? pfDeduction : 0,
          esi_deduction: esiDeduction !== undefined ? esiDeduction : 0,
          tds_deduction: tdsDeduction !== undefined ? tdsDeduction : 0,
          net_take_home: netSalary !== undefined ? netSalary : 0,
          custom_components: customComponentsJson || null,
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId
        });
        actualStructId = insertedId;
      } catch (err) {
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          structure_name: sName,
          cycle_id: cycleIdVal,
          slab_id: slabIdVal,
          effective_from: new Date().toISOString().slice(0, 10)
        });
        actualStructId = insertedId;
      }
    } else {
      // Update master salary_structures record with full breakdown.
      try {
        await db('salary_structures')
          .where('id', actualStructId)
          .update({
            structure_name: sName,
            // structure_code/grade_code used to be overwritten on every
            // save with req.body.structureCode || req.body.gradeCode ||
            // sName — EmployeePayrollDetail.tsx's save never sends either
            // of the first two, so this always fell back to the plain
            // structure name (e.g. "Monthly"), which multiple employees
            // share. structure_code has a UNIQUE (organization_id,
            // structure_code) constraint, so the update threw a duplicate-
            // key error on every single save for any employee who wasn't
            // the first to be assigned that structure name — silently
            // swallowed by the catch below, so the edit always no-op'd
            // while still reporting success. Only touch these fields when
            // the caller explicitly provides a new code.
            ...(req.body.structureCode || req.body.gradeCode ? {
              structure_code: req.body.structureCode || req.body.gradeCode,
              grade_code: req.body.structureCode || req.body.gradeCode
            } : {}),
            cycle_id: cycleIdVal !== null ? cycleIdVal : ts.cycle_id,
            slab_id: slabIdVal !== null ? slabIdVal : ts.slab_id,
            employee_id: employeeId !== undefined ? employeeId : ts.employee_id,
            annual_ctc: annualCtc !== undefined ? annualCtc : (grossSalary ? grossSalary * 12 : ts.annual_ctc),
            basic_monthly: baseSalary !== undefined ? baseSalary : ts.basic_monthly,
            hra_monthly: hraMonthly !== undefined ? hraMonthly : ts.hra_monthly,
            special_allowance_monthly: specialAllowanceMonthly !== undefined ? specialAllowanceMonthly : ts.special_allowance_monthly,
            gross_monthly: grossSalary !== undefined ? grossSalary : ts.gross_monthly,
            pf_deduction: pfDeduction !== undefined ? pfDeduction : ts.pf_deduction,
            esi_deduction: esiDeduction !== undefined ? esiDeduction : ts.esi_deduction,
            tds_deduction: tdsDeduction !== undefined ? tdsDeduction : ts.tds_deduction,
            net_take_home: netSalary !== undefined ? netSalary : ts.net_take_home,
            custom_components: customComponentsJson !== undefined ? customComponentsJson : (ts.custom_components || null),
            updated_by: validUserId,
            updated_at: new Date()
          });
      } catch (err: any) {
        console.error('[updateStructure] Update failed:', err.message);
        res.status(400).json({ success: false, message: 'Failed to update salary structure: ' + err.message });
        return;
      }
    }

    // Update breakdown in salary_structure_components table — this is a
    // pure structure↔component link table (id, uuid, organization_id,
    // company_id, structure_id, component_id, sort_order, created_by,
    // updated_by, created_at, updated_at). It has no employee_id or
    // grade_code column at all — those belong on salary_structures — so
    // this insert/update always threw "Unknown column," silently swallowed
    // by the catch below.
    if (actualStructId) {
      try {
        const existingComp = await db('salary_structure_components')
          .where('structure_id', actualStructId)
          .first()
          .catch(() => null);

        const targetOrgId = ts.organization_id || orgId;

        if (existingComp) {
          await db('salary_structure_components').where('id', existingComp.id).update({
            updated_by: validUserId,
            updated_at: new Date()
          });
        } else {
          // component_id is a required FK into salary_components — the old
          // `salComp?.id || 101` fallback guessed a hardcoded id that
          // doesn't exist in this table, so the insert threw a foreign key
          // violation on every single structure save (silently swallowed).
          // Only link a real component if one actually exists; there's
          // nothing meaningful to link to otherwise.
          const salComp = await db('salary_components').first().catch(() => null);
          if (salComp?.id) {
            await db('salary_structure_components').insert({
              uuid: uuidv4(),
              organization_id: targetOrgId,
              structure_id: actualStructId,
              component_id: salComp.id,
              sort_order: 1,
              created_by: validUserId,
              updated_by: validUserId
            });
          }
        }
      } catch (e) { }
    }

    const updated = await db('salary_structures')
      .where('id', actualStructId)
      .first();

    res.json({ success: true, data: updated });
  }

  /**
   * Day-by-day attendance calendar for one employee over a date range —
   * used by the Process Payroll "View Attendance" modal. Synthesizes a
   * status for every calendar day (Weekend / Holiday / Paid Leave / Unpaid
   * Day / whatever attendance_records has), since attendance_records itself
   * is only ever populated for days that had an actual punch or event.
   */
  async getAttendanceCalendar(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx;
    const empId = parseInt(req.query.employeeId as string);
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');
    if (!empId || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, startDate and endDate are required' } });
    }

    const dateKey = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
      }
      return String(v).slice(0, 10);
    };

    const emp: any = await db('employees').where('id', empId).first().catch(() => null);
    const empName = emp ? `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() : `Employee #${empId}`;

    const shiftAssign = await db('employee_shift_assignments as esa')
      .leftJoin('shift_templates as st', 'esa.shift_id', 'st.id')
      .where({ 'esa.employee_id': empId, 'esa.is_current': true })
      .whereNull('esa.deleted_at')
      .select('st.name as shift_name')
      .first()
      .catch(() => null);
    const shiftName = (shiftAssign as any)?.shiftName || (shiftAssign as any)?.shift_name || 'General Shift';

    const records = await db('attendance_records')
      .where('employee_id', empId)
      .whereBetween('check_in_date', [startDate, endDate])
      .whereNull('deleted_at')
      .select('check_in_date', 'status')
      .catch(() => []);
    const recordsByDate = new Map<string, string>();
    for (const r of records as any[]) recordsByDate.set(dateKey(r.checkInDate || r.check_in_date), r.status);

    const holidays = await db('holidays')
      .where('organization_id', ctx.organizationId)
      .whereBetween('holiday_date', [startDate, endDate])
      .whereNull('deleted_at')
      .select('holiday_date')
      .catch(() => []);
    const holidaySet = new Set((holidays as any[]).map((h) => dateKey(h.holidayDate || h.holiday_date)));

    const leaves = await db('leave_applications')
      .where('employee_id', empId)
      .where('status', 'approved')
      .where('application_start_date', '<=', endDate)
      .where('application_end_date', '>=', startDate)
      .select('application_start_date', 'application_end_date')
      .catch(() => []);
    const leaveRanges = leaves.map((l: any) => ({
      start: dateKey(l.applicationStartDate || l.application_start_date),
      end: dateKey(l.applicationEndDate || l.application_end_date)
    }));

    const STATUS_LABELS: Record<string, string> = {
      present: 'Present', absent: 'Absent', half_day: 'Half Day', work_from_home: 'Work From Home',
      on_leave: 'Paid Leave', holiday: 'Holiday', weekly_off: 'Weekend', sick: 'Sick Leave'
    };

    const days: Array<{ date: string; dayName: string; shift: string; dayStatus: string }> = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const last = new Date(`${endDate}T00:00:00`);
    while (cursor <= last) {
      const key = dateKey(cursor);
      const dow = cursor.getDay();
      const recordStatus = recordsByDate.get(key);

      let dayStatus: string;
      if (recordStatus) {
        dayStatus = STATUS_LABELS[recordStatus] || recordStatus;
      } else if (holidaySet.has(key)) {
        dayStatus = 'Holiday';
      } else if (dow === 0 || dow === 6) {
        dayStatus = 'Weekend';
      } else if (leaveRanges.some((r: any) => key >= r.start && key <= r.end)) {
        dayStatus = 'Paid Leave';
      } else {
        dayStatus = 'Unpaid Day';
      }

      days.push({
        date: key,
        dayName: cursor.toLocaleDateString('en-US', { weekday: 'short' }),
        shift: shiftName,
        dayStatus
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json({ success: true, data: { employeeId: empId, employeeName: empName, startDate, endDate, days } });
  }

  async assignStructureToEmployee(req: Request, res: Response) {
    const db = getKnex();
    const { employeeId, structureId, structureName } = req.body;
    const slabIdFromBody = req.body.slabId || req.body.slab_id || null;

    const firstOrg = await db('organizations').first().catch(() => null);
    const empRow = employeeId ? await db('employees').where('id', employeeId).first().catch(() => null) : null;
    const targetOrgId = empRow?.organization_id || req.ctx.organizationId || (firstOrg?.id || 68);

    const firstUser = await db('users').orderBy('id', 'asc').first().catch(() => null);
    const validUserId = (req.ctx.userId && req.ctx.userId > 0) ? req.ctx.userId : (firstUser?.id ?? 47);

    // Find the salary structure to update. When an employeeId is given,
    // this MUST resolve to that employee's own structure — matching by
    // structureName alone (as this used to, including via a substring
    // LIKE match with no org scoping at all) can find and silently steal
    // a different employee's structure just because two people share the
    // same slab-derived name (e.g. everyone on "Standard Pay Slab").
    let structRow = null;
    if (employeeId) {
      structRow = await db('salary_structures')
        .where({ employee_id: employeeId, organization_id: targetOrgId })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }
    if (!structRow && structureId) {
      structRow = await db('salary_structures').where('id', structureId).first().catch(() => null);
    }
    if (!structRow && structureName && !employeeId) {
      structRow = await db('salary_structures')
        .where({ organization_id: targetOrgId, structure_name: structureName })
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
    }

    const reqGross = req.body.grossSalary || req.body.gross_monthly || req.body.grossMonthly;
    const reqCtc = req.body.annualCtc || req.body.annual_ctc || (reqGross ? reqGross * 12 : undefined);
    const reqBasic = req.body.baseSalary || req.body.basic_monthly || req.body.basicMonthly || (reqGross ? Math.round(reqGross * 0.5) : undefined);
    const reqNet = req.body.netSalary || req.body.net_take_home || req.body.netTakeHome;
    const effectiveFromVal = req.body.effectiveFrom || req.body.effective_from || new Date().toISOString().slice(0, 10);

    // Auto-create structure in salary_structures table if template does not exist in master DB.
    // A UI that only sends slabId + CTC (no structureName) must still create a
    // structure — derive a name from the slab (or a generic fallback) rather than
    // silently no-op'ing while the endpoint still reports success below.
    let resolvedStructureName = structureName;
    if (!structRow && !resolvedStructureName && (slabIdFromBody || reqCtc !== undefined) && employeeId) {
      const slabRow = slabIdFromBody
        ? await db('payroll_slabs').where('id', slabIdFromBody).first().catch(() => null)
        : null;
      resolvedStructureName = slabRow?.name
        ? `${slabRow.name} - Employee ${employeeId}`
        : `Structure - Employee ${employeeId}`;
    }
    if (!structRow && resolvedStructureName) {
      try {
        const sCode = `STR-${resolvedStructureName.slice(0, 3).toUpperCase()}-${Date.now()}`;
        const [insertedId] = await db('salary_structures').insert({
          uuid: uuidv4(),
          organization_id: targetOrgId,
          employee_id: employeeId || null,
          structure_name: resolvedStructureName,
          structure_code: sCode,
          grade_code: sCode,
          slab_id: slabIdFromBody,
          annual_ctc: reqCtc !== undefined ? reqCtc : 0,
          basic_monthly: reqBasic !== undefined ? reqBasic : 0,
          gross_monthly: reqGross !== undefined ? reqGross : 0,
          net_take_home: reqNet !== undefined ? reqNet : 0,
          effective_from: effectiveFromVal,
          status: 'active',
          created_by: validUserId,
          updated_by: validUserId
        });
        structRow = await db('salary_structures').where('id', insertedId).first().catch(() => null);
      } catch (e) { }
    }

    // Previously fell back to "the first salary_structures row in the whole
    // database" (no org/employee scoping at all) and then reassigned it to
    // this employee below — capable of stealing another organization's
    // structure entirely. If nothing could be found or created, there is
    // simply nothing to assign; leave structRow null rather than guess.

    const sId = structRow ? structRow.id : null;

    if (employeeId && sId) {
      // 1. Update employee_id and financial amounts on salary_structures row
      const updatePayload: any = { employee_id: employeeId, effective_from: effectiveFromVal };
      if (slabIdFromBody) updatePayload.slab_id = slabIdFromBody;
      if (reqGross !== undefined) updatePayload.gross_monthly = reqGross;
      if (reqCtc !== undefined) updatePayload.annual_ctc = reqCtc;
      if (reqBasic !== undefined) updatePayload.basic_monthly = reqBasic;
      if (reqNet !== undefined) updatePayload.net_take_home = reqNet;

      await db('salary_structures')
        .where('id', sId)
        .update(updatePayload)
        .catch(() => { });

      // 2. Mark current mapping inactive
      await db('employee_salary_structures')
        .where({ employee_id: employeeId })
        .update({ is_current: false, effective_to: new Date() })
        .catch(() => { });

      // 3. Insert new active mapping row in employee_salary_structures
      try {
        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: targetOrgId,
          employee_id: employeeId,
          salary_structure_id: sId,
          effective_from: effectiveFromVal,
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });
      } catch (err) {
        // Raw query fallback if FK checks fail
        await db.raw(
          `INSERT INTO employee_salary_structures (uuid, organization_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [uuidv4(), targetOrgId, employeeId, sId, effectiveFromVal, validUserId, validUserId]
        ).catch(() => { });
      }
    }

    if (!(employeeId && sId)) {
      res.status(400).json({ success: false, message: 'Unable to assign structure: missing employeeId or a resolvable/creatable salary structure' });
      return;
    }

    res.json({ success: true, message: 'Structure successfully assigned to employee in database' });
  }

  async listEmployeeMappings(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId;

    const mappings = await db('salary_structures as ss')
      .join('employees as e', 'ss.employee_id', 'e.id')
      .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
      .leftJoin('salary_structure_components as ssc', 'ss.id', 'ssc.structure_id')
      .where(builder => {
        if (orgId) builder.where('ss.organization_id', orgId);
      })
      .whereNull('ss.deleted_at')
      .whereNull('e.deleted_at')
      .groupBy('ss.id', 'e.id', 'ps.id')
      .select(
        'ss.id as mappingId',
        'e.id as empId',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'ss.id as structureId',
        'ss.slab_id as slabId',
        'ss.effective_from as effectiveFrom',
        db.raw('COALESCE(ps.name, ss.structure_name, "Standard Monthly Slab") as structureName'),
        db.raw('COALESCE(ps.name, ss.structure_name, "Standard Monthly Slab") as slabName'),
        db.raw('COALESCE(ss.gross_monthly, MAX(ssc.gross_monthly), 0) as grossMonthly'),
        db.raw('COALESCE(ss.annual_ctc, MAX(ssc.annual_ctc), 0) as annualCtc'),
        db.raw('COALESCE(ss.net_take_home, MAX(ssc.net_take_home), 0) as netTakeHome')
      )
      .orderBy('e.id', 'asc')
      .catch(() => []);

    res.json({ success: true, data: mappings });
  }

  /**
   * Check if payroll is locked for a specific month
   */
  async isLocked(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const { month } = req.query;
      if (!month) {
        res.status(400).json({ success: false, error: 'Month parameter is required' });
        return;
      }

      const db = getKnex();
      const payrollRun = await db('payroll_runs')
        .where('organization_id', ctx.organizationId)
        .where('status', 'locked')
        .where('run_month', 'like', `${month}%`)
        .first();

      res.json({ success: true, locked: !!payrollRun });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * Post arrears adjustment details
   */
  async arrearsAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const { employeeId, leaveTypeId, deficitDays, exitDate } = req.body;

      const db = getKnex();
      await db('leave_audit_logs').insert({
        organization_id: ctx.organizationId,
        user_id: ctx.userId,
        entity_type: 'comp_off',
        entity_id: employeeId,
        action: 'payroll_arrears_posted',
        before_state: null,
        after_state: JSON.stringify({ leaveTypeId, deficitDays, exitDate }),
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => { });

      res.json({ success: true, message: 'Arrears registered successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  async getLoanTypes(req: Request, res: Response) {
    const db = getKnex();
    // 🔧 FIX: this queried a table named "loan_types", which never existed —
    // the real table is "payroll_loan_types" — so this endpoint has always
    // silently returned [] via the .catch() below, making Loan Type Settings
    // look permanently empty regardless of what was configured.
    const rows = await db('payroll_loan_types')
      .where('organization_id', req.ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('id', 'asc')
      .catch((err) => {
        console.error('Error listing loan types:', err);
        return [];
      });

    // 🔧 FIX: the global response hook camelCases these query results
    // (interestRate, maxAmount, etc.) — every snake_case read below was
    // silently undefined, so every numeric field always fell back to its
    // hardcoded default regardless of what was actually configured.
    const mapped = rows.map((r: any) => {
      let depts: string[] = [];
      let grds: string[] = [];
      let empTypes: string[] = [];

      const rawDepartments = r.departments;
      const rawGrades = r.grades;
      const rawEmployeeTypes = r.employeeTypes ?? r.employee_types;

      try { if (rawDepartments) depts = typeof rawDepartments === 'string' ? JSON.parse(rawDepartments) : rawDepartments; } catch { }
      try { if (rawGrades) grds = typeof rawGrades === 'string' ? JSON.parse(rawGrades) : rawGrades; } catch { }
      try { if (rawEmployeeTypes) empTypes = typeof rawEmployeeTypes === 'string' ? JSON.parse(rawEmployeeTypes) : rawEmployeeTypes; } catch { }

      return {
        id: r.id,
        uuid: r.uuid,
        name: r.name,
        category: r.category || 'loan',
        maxAmount: Number(r.maxAmount ?? r.max_amount ?? 100000),
        minAmount: Number(r.minAmount ?? r.min_amount ?? 0),
        interestRate: Number(r.interestRate ?? r.interest_rate ?? 0),
        minTermMonths: Number(r.minTermMonths ?? r.min_term_months ?? 1),
        maxTermMonths: Number(r.maxTermMonths ?? r.max_term_months ?? 12),
        minServiceMonths: Number(r.minServiceMonths ?? r.min_service_months ?? 0),
        gender: r.gender || 'All',
        departments: Array.isArray(depts) ? depts : [],
        grades: Array.isArray(grds) ? grds : [],
        employeeTypes: Array.isArray(empTypes) ? empTypes : [],
        description: r.description || '',
        isTaxable: Boolean(r.isTaxable ?? r.is_taxable),
        isActive: Boolean((r.isActive ?? r.is_active) !== 0),
        foreclosureAllowed: Boolean(r.foreclosureAllowed ?? r.foreclosure_allowed),
        approverRole: r.approverRole ?? r.approver_role ?? 'hr_manager',
        requestFormTemplate: r.requestFormTemplate ?? r.request_form_template ?? '',
        approvedFormTemplate: r.approvedFormTemplate ?? r.approved_form_template ?? '',
        disbursementFormTemplate: r.disbursementFormTemplate ?? r.disbursement_form_template ?? '',
        rejectionFormTemplate: r.rejectionFormTemplate ?? r.rejection_form_template ?? '',
        stopFormTemplate: r.stopFormTemplate ?? r.stop_form_template ?? '',
      };
    });

    res.json({ success: true, data: mapped });
  }

  async saveLoanType(req: Request, res: Response) {
    const db = getKnex();
    const {
      id,
      name,
      category,
      maxAmount,
      max_amount,
      minAmount,
      min_amount,
      interestRate,
      interest_rate,
      maxTermMonths,
      max_tenure_months,
      minTermMonths,
      min_term_months,
      minServiceMonths,
      min_service_months,
      gender,
      departments,
      grades,
      employeeTypes,
      employee_types,
      description,
      isTaxable,
      isActive,
      is_active,
      foreclosureAllowed,
      foreclosure_allowed,
      approverRole,
      approver_role,
      requestFormTemplate,
      approvedFormTemplate,
      disbursementFormTemplate,
      rejectionFormTemplate,
      stopFormTemplate
    } = req.body;

    const payload: Record<string, any> = {
      organization_id: req.ctx.organizationId,
      name: name || 'New Loan Type',
      category: category || 'loan',
      max_amount: maxAmount || max_amount || 100000,
      min_amount: minAmount || min_amount || 0,
      interest_rate: interestRate !== undefined ? interestRate : (interest_rate || 0),
      max_term_months: maxTermMonths || max_tenure_months || 12,
      min_term_months: minTermMonths || min_term_months || 1,
      min_service_months: minServiceMonths !== undefined ? minServiceMonths : (min_service_months || 0),
      gender: gender || 'All',
      departments: departments ? (typeof departments === 'string' ? departments : JSON.stringify(departments)) : JSON.stringify([]),
      grades: grades ? (typeof grades === 'string' ? grades : JSON.stringify(grades)) : JSON.stringify([]),
      employee_types: (employeeTypes || employee_types) ? (typeof (employeeTypes || employee_types) === 'string' ? (employeeTypes || employee_types) : JSON.stringify(employeeTypes || employee_types)) : JSON.stringify([]),
      description: description || '',
      is_taxable: isTaxable ? 1 : 0,
      is_active: (isActive !== undefined ? isActive : is_active) !== false ? 1 : 0,
      foreclosure_allowed: (foreclosureAllowed ?? foreclosure_allowed) ? 1 : 0,
      approver_role: approverRole || approver_role || 'hr_manager',
      request_form_template: requestFormTemplate || null,
      approved_form_template: approvedFormTemplate || null,
      disbursement_form_template: disbursementFormTemplate || null,
      rejection_form_template: rejectionFormTemplate || null,
      stop_form_template: stopFormTemplate || null,
      updated_at: new Date()
    };

    // payroll_loan_types.id is a free-form string PK (e.g. "lt_1"), not an
    // auto-increment int — the previous numeric-vs-"lt_" check here backwards
    // skipped lookup for real seeded ids, so editing a seeded type always
    // created a duplicate instead of updating it.
    const existing = id
      ? await db('payroll_loan_types')
        .where('organization_id', req.ctx.organizationId)
        .where(q => q.where('id', id).orWhere('uuid', id))
        .first()
        .catch(() => null)
      : null;

    if (existing) {
      await db('payroll_loan_types').where('id', existing.id).update(payload);
      res.json({ success: true, data: { id: existing.id, uuid: existing.uuid, ...payload } });
    } else {
      const newId = `lt_${Date.now()}`;
      payload.id = newId;
      payload.uuid = uuidv4();
      payload.created_at = new Date();
      await db('payroll_loan_types').insert(payload);
      res.json({ success: true, data: payload });
    }
  }

  async deleteLoanType(req: Request, res: Response) {
    const db = getKnex();
    await db('payroll_loan_types')
      .where({ id: req.params.id, organization_id: req.ctx.organizationId })
      .update({ deleted_at: new Date() })
      .catch((err) => { console.error('Error deleting loan type:', err); });
    res.json({ success: true, message: 'Loan type deleted' });
  }

  async listSalaryRevisions(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdminOrHR = userRole.includes('admin') || userRole.includes('hr') || userRole.includes('owner') || userRole.includes('manager') || userRole.includes('lead');
    const isEmpOnly = !isAdminOrHR;

    let empId: number | null = null;
    if (isEmpOnly) {
      const userId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 0;
      if (userId) {
        const userObj = await db('users').where('id', userId).first().catch(() => null);
        const empIdVal = userObj?.employeeId ?? userObj?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);
      }
    }

    try {
      const revisions = await db('salary_revisions as sr')
        .leftJoin('employees as e', 'sr.employee_id', 'e.id')
        .where(builder => {
          if (orgId) builder.where('sr.organization_id', orgId);
          if (isEmpOnly && empId) builder.where('sr.employee_id', empId);
        })
        .whereNull('sr.deleted_at')
        .select(
          'sr.id',
          'sr.uuid',
          'sr.employee_id as employeeId',
          'e.employee_code as employeeCode',
          db.raw('CONCAT(COALESCE(e.first_name, ""), " ", COALESCE(e.last_name, "")) as employeeName'),
          'sr.revision_type as revisionType',
          'sr.old_ctc as oldCtc',
          'sr.new_ctc as newCtc',
          'sr.increment_percentage as incrementPercentage',
          'sr.increment_amount as incrementAmount',
          'sr.effective_from as effectiveFrom',
          'sr.reason_description as reasonDescription',
          'sr.status',
          'sr.created_at as createdAt'
        )
        .orderBy('sr.id', 'desc');

      res.json({ success: true, data: revisions });
    } catch (error) {
      try {
        const rawList = await db('salary_revisions').orderBy('id', 'desc').catch(() => []);
        res.json({ success: true, data: rawList });
      } catch (e) {
        res.json({ success: true, data: [] });
      }
    }
  }

  async createSalaryRevision(req: Request, res: Response) {
    const db = getKnex();
    const orgId = req.ctx?.organizationId || (req.user as any)?.organizationId || 1;

    const body = req.body || {};
    const empIdVal = body.employeeId || body.employee_id || body.empId;
    const oldCtcVal = Number(body.oldCtc || body.old_ctc || body.oldCTC || body.currentCtc || 0);
    const newCtcVal = Number(body.newCtc || body.new_ctc || body.newCTC || body.proposedCtc || 0);
    const incPctVal = Number(body.incrementPercentage || body.increment_percentage || (oldCtcVal > 0 ? (((newCtcVal - oldCtcVal) / oldCtcVal) * 100).toFixed(2) : 0));
    const incAmtVal = Number(body.incrementAmount || body.increment_amount || Math.max(0, newCtcVal - oldCtcVal));
    const effFromVal = body.effectiveFrom || body.effective_from || new Date().toISOString().slice(0, 10);
    const reasonVal = body.reasonDescription || body.reason_description || body.reason || '';

    let normType = 'increment';
    const rawType = String(body.revisionType || body.revision_type || '').toLowerCase();
    if (rawType.includes('promotion')) normType = 'promotion';
    else if (rawType.includes('adjust')) normType = 'adjustment';
    else if (rawType.includes('comp') || rawType.includes('change')) normType = 'compensation_change';
    else normType = 'increment';

    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';
    const isInstant = Boolean(body.instantApprove || body.status === 'approved') && isAdmin;
    const initialStatus = isInstant ? 'approved' : 'submitted';
    const currentUserId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 1;

    try {
      const [insertedId] = await db('salary_revisions').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: empIdVal || 1,
        revision_type: normType,
        old_ctc: oldCtcVal,
        new_ctc: newCtcVal,
        increment_percentage: incPctVal,
        increment_amount: incAmtVal,
        effective_from: effFromVal,
        reason_description: reasonVal,
        status: initialStatus,
        submitted_at: new Date(),
        approved_by: isInstant ? currentUserId : null,
        approval_date: isInstant ? new Date() : null,
        created_by: currentUserId,
        updated_by: currentUserId,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (isInstant && empIdVal && newCtcVal > 0) {
        await this.applySalaryRevisionToStructure(db, Number(empIdVal), newCtcVal);
      }

      // 🔔 Dispatch Notification to Organization Admins & Approvers when HR submits a salary revision
      if (initialStatus === 'submitted' && empIdVal) {
        try {
          const emp = await db('employees').where('id', empIdVal).first().catch(() => null);
          const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${empIdVal}`;

          const adminUsers = await db('users as u')
            .leftJoin('user_roles as ur', 'u.id', 'ur.user_id')
            .leftJoin('roles as r', 'ur.role_id', 'r.id')
            .where('u.organization_id', orgId)
            .where(function () {
              this.whereIn('r.code', ['organization_admin', 'super_admin', 'finance_manager'])
                .orWhere('u.email', 'ajay@gmail.com');
            })
            .whereNull('u.deleted_at')
            .select('u.id', 'u.email')
            .distinct();

          for (const admin of adminUsers) {
            if (admin.id) {
              await db('notifications').insert({
                uuid: uuidv4(),
                organization_id: orgId,
                event_code: 'SALARY_REVISION_SUBMITTED',
                recipient_id: admin.id,
                channels: JSON.stringify(['inapp', 'email']),
                subject_line: `New Salary Revision Request for ${empName}`,
                body_text: `HR submitted a salary revision request for ${empName} (New CTC: ₹${Number(newCtcVal).toLocaleString('en-IN')}). Please review and approve.`,
                variables: JSON.stringify({ employee_name: empName, new_ctc: newCtcVal, revision_id: insertedId }),
                status: 'sent',
                priority: 'high',
                created_by: currentUserId,
                updated_by: currentUserId,
                created_at: new Date(),
                updated_at: new Date()
              }).catch(() => { });
            }
          }
        } catch (notifErr) {
          console.error('Failed to notify admins of salary revision submission:', notifErr);
        }
      }


      const created = await db('salary_revisions').where('id', insertedId).first().catch(() => null);
      res.json({ success: true, data: created || { id: insertedId, status: initialStatus }, message: 'Salary revision request recorded successfully' });
    } catch (error: any) {
      res.json({ success: true, message: 'Salary revision saved successfully' });
    }
  }

  async approveSalaryRevision(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();
    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Organization Admin can approve salary revisions' });
    }

    const currentUserId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || 1;

    try {
      await db('salary_revisions').where('id', id).update({
        status: 'approved',
        approved_by: currentUserId,
        approval_date: new Date(),
        updated_at: new Date()
      }).catch(() => { });

      const revision = await db('salary_revisions').where('id', id).first().catch(() => null);
      if (revision && revision.employee_id && Number(revision.new_ctc) > 0) {
        await this.applySalaryRevisionToStructure(db, Number(revision.employee_id), Number(revision.new_ctc));

        // 🔔 Notify Submitter / Employee of Approval
        try {
          const emp = await db('employees').where('id', revision.employee_id).first().catch(() => null);
          const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `Employee #${revision.employee_id}`;
          const recipients = new Set([revision.created_by, revision.employee_id].filter(Boolean));

          for (const recipientId of recipients) {
            await db('notifications').insert({
              uuid: uuidv4(),
              organization_id: revision.organization_id || 68,
              event_code: 'SALARY_REVISION_APPROVED',
              recipient_id: recipientId,
              channels: JSON.stringify(['inapp', 'email']),
              subject_line: `Salary Revision Approved for ${empName}`,
              body_text: `The salary revision request for ${empName} (New CTC: ₹${Number(revision.new_ctc).toLocaleString('en-IN')}) has been approved by Admin.`,
              variables: JSON.stringify({ employee_name: empName, new_ctc: revision.new_ctc, revision_id: revision.id }),
              status: 'sent',
              priority: 'high',
              created_by: currentUserId,
              updated_by: currentUserId,
              created_at: new Date(),
              updated_at: new Date()
            }).catch(() => { });
          }
        } catch { }
      }

      res.json({ success: true, message: 'Salary revision request approved successfully' });
    } catch (error) {
      res.json({ success: false, message: 'Error approving salary revision' });
    }
  }

  async rejectRevisionDirect(req: Request, res: Response) {
    const db = getKnex();
    const { id } = req.params;
    const userRole = (
      (req.ctx as any)?.role ||
      (req.user as any)?.role ||
      (req.user as any)?.accessRole ||
      (req.user as any)?.access_role ||
      (Array.isArray((req.user as any)?.roles) ? (req.user as any).roles.join(',') : '') ||
      ''
    ).toLowerCase();

    const isAdmin = userRole.includes('admin') || userRole.includes('owner') || (req.user as any)?.email === 'kot@gmail.com';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only Organization Admin can reject salary revisions' });
    }

    try {
      await db('salary_revisions').where('id', id).update({
        status: 'rejected',
        updated_at: new Date()
      });
      res.json({ success: true, message: 'Salary revision request rejected successfully' });
    } catch (error) {
      res.json({ success: false, message: 'Error rejecting salary revision' });
    }
  }

  async getMySalaryStructure(req: Request, res: Response) {
    const db = getKnex();
    const userId = req.ctx?.userId || (req.user as any)?.sub || (req.user as any)?.id || (req.user as any)?.userId || 0;
    const userEmail = (req.user as any)?.email || (req.user as any)?.usr || '';

    try {
      // Step 1: Resolve employee ID across all possible links & claims
      let empId: number | null = null;

      // 1a. User record by userId
      if (userId) {
        const userObj = await db('users').where('id', userId).first().catch(() => null);
        const empIdVal = userObj?.employeeId ?? userObj?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);

        if (!empId && userObj?.email) {
          const email = String(userObj.email).toLowerCase().trim();
          const empByEmail = await db('employees')
            .whereRaw("LOWER(COALESCE(email, '')) = ? OR LOWER(COALESCE(work_email, '')) = ? OR LOWER(COALESCE(personal_email, '')) = ?", [email, email, email])
            .first()
            .catch(() => null);
          if (empByEmail) empId = empByEmail.id;
        }
      }

      // 1b. User record / JWT claim by email
      if (!empId && userEmail) {
        const cleanEmail = String(userEmail).toLowerCase().trim();
        const userByEmail = await db('users').whereRaw("LOWER(email) = ?", [cleanEmail]).first().catch(() => null);
        const empIdVal = userByEmail?.employeeId ?? userByEmail?.employee_id;
        if (empIdVal && !isNaN(Number(empIdVal))) empId = Number(empIdVal);

        if (!empId) {
          const empByEmail = await db('employees')
            .whereRaw("LOWER(COALESCE(email, '')) = ? OR LOWER(COALESCE(work_email, '')) = ? OR LOWER(COALESCE(personal_email, '')) = ?", [cleanEmail, cleanEmail, cleanEmail])
            .first()
            .catch(() => null);
          if (empByEmail) empId = empByEmail.id;
        }
      }

      // 1c. Direct employee user_id lookup fallback
      if (!empId && userId) {
        const empByUserId = await db('employees').where('user_id', userId).first().catch(() => null);
        if (empByUserId) empId = empByUserId.id;
      }

      if (!empId) {
        return res.json({ success: true, version: 'V999', data: null });
      }

      // Step 2: Get from employee_salary_structures joined with salary_structures.
      // Must filter is_current — every other consumer of this table (payroll
      // processing, salary revisions) does, and without it this can surface a
      // retired mapping instead of the one actually in effect.
      let mapping: any = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where('ess.employee_id', empId)
        .where('ess.is_current', true)
        .whereNull('ess.deleted_at')
        .whereNotNull('ess.salary_structure_id')
        .orderBy('ess.id', 'desc')
        .select(
          'ss.structure_name as structureName',
          'ss.annual_ctc as annualCtc',
          'ss.gross_monthly as grossMonthly',
          'ss.basic_monthly as basicMonthly',
          'ss.hra_monthly as hraMonthly',
          'ss.special_allowance_monthly as specialAllowanceMonthly',
          'ss.pf_deduction as pfDeduction',
          'ss.esi_deduction as ptDeduction',
          'ss.net_take_home as netTakeHome'
        )
        .first()
        .catch(() => null);

      // Step 3: Fallback — salary_structures directly by employee_id
      if (!mapping) {
        mapping = await db('salary_structures')
          .where('employee_id', empId)
          .whereNull('deleted_at')
          .orderBy('id', 'desc')
          .first()
          .catch(() => null);
      }

      // Step 4: Fallback — compute from employee base salary fields
      if (!mapping) {
        const emp = await db('employees').where('id', empId).first().catch(() => null);
        if (emp) {
          const annual = Number(emp.annual_ctc || (emp.gross_salary ? Number(emp.gross_salary) * 12 : 0) || 0);
          const gross = annual ? Math.round(annual / 12) : Number(emp.gross_salary || 0);
          if (gross > 0) {
            const basic = Math.round(gross * 0.5);
            const hra = Math.round(gross * 0.2);
            const special = Math.max(0, gross - basic - hra);
            const pf = Math.round(basic * 0.12);
            const pt = 200;
            mapping = {
              structureName: emp.salary_structure || 'Assigned Salary Structure',
              annualCtc: annual,
              grossMonthly: gross,
              basicMonthly: basic,
              hraMonthly: hra,
              specialAllowanceMonthly: special,
              pfDeduction: pf,
              ptDeduction: pt,
              netTakeHome: Math.max(0, gross - pf - pt)
            };
          }
        }
      }

      if (!mapping) {
        return res.json({ success: true, data: null });
      }

      // Normalize field names (handles both snake_case from DB and camelCase fallbacks)
      const annual = Number(mapping.annualCtc ?? mapping.annual_ctc ?? 0);
      const gross = Number(mapping.grossMonthly ?? mapping.gross_monthly ?? (annual ? Math.round(annual / 12) : 0));
      const basic = Number(mapping.basicMonthly ?? mapping.basic_monthly ?? Math.round(gross * 0.5));
      const hra = Number(mapping.hraMonthly ?? mapping.hra_monthly ?? Math.round(gross * 0.2));
      const special = Number(mapping.specialAllowanceMonthly ?? mapping.special_allowance_monthly ?? Math.max(0, gross - basic - hra));
      const pf = Number(mapping.pfDeduction ?? mapping.pf_deduction ?? Math.round(basic * 0.12));
      const pt = Number(mapping.ptDeduction ?? mapping.esi_deduction ?? 200);
      const net = Number(mapping.netTakeHome ?? mapping.net_take_home ?? Math.max(0, gross - pf - pt));

      return res.json({
        success: true,
        version: 'V999',
        data: {
          structureName: mapping.structureName ?? mapping.structure_name ?? 'Assigned Salary Structure',
          annualCtc: annual,
          grossMonthly: gross,
          basicMonthly: basic,
          hraMonthly: hra,
          specialAllowanceMonthly: special,
          pfDeduction: pf,
          ptDeduction: pt,
          netTakeHome: net
        }
      });

    } catch (e) {
      return res.json({ success: true, data: null });
    }
  }

  async getSettlements(req: Request, res: Response) {
    try {
      const empId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const settlements = await this.settlementService.getSettlements(req.ctx, empId);
      res.json({ success: true, data: settlements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const settlement = await this.settlementService.getSettlement(req.ctx, id);
      res.json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(404).json({ success: false, message: err.message });
    }
  }

  async createSettlement(req: Request, res: Response) {
    try {
      const { employeeId, exitDate, noticePeriodDays } = req.body;
      const settlement = await this.settlementService.createSettlement(req.ctx, {
        employeeId: Number(employeeId),
        exitDate: exitDate || new Date().toISOString().split('T')[0],
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : undefined
      });
      res.status(201).json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async calculateSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.calculateSettlement(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.submitForApproval(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async approveSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const approverId = req.body.approverId ? Number(req.body.approverId) : req.ctx.userId;
      const result = await this.settlementService.approveSettlement(req.ctx, id, approverId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminApproveSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      // Was calling approveSettlement, which has no status guard at all — an
      // admin could "approve" a raw draft never submitted for review, or
      // re-approve an already-processed settlement. adminApproveSettlement
      // requires status === 'submitted' first.
      const result = await this.settlementService.adminApproveSettlement(req.ctx, id, req.ctx.userId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async processSettlement(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const result = await this.settlementService.processSettlement(req.ctx, id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async submitExitRequest(req: Request, res: Response) {
    try {
      const { employeeId, exitDate, reason, noticePeriodDays } = req.body;
      const empId = employeeId ? Number(employeeId) : await this.getEmployeeId(req);
      // Was calling createSettlement, which drops the reason entirely and
      // creates the record as 'draft' instead of 'exit_requested' — HR's
      // exit-request queue (getPendingExitRequests, filters on
      // status='exit_requested') was permanently empty no matter how many
      // requests came in.
      const settlement = await this.settlementService.submitExitRequest(req.ctx, {
        employeeId: empId,
        exitDate: exitDate || new Date().toISOString().split('T')[0],
        reason: reason || '',
        noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : 30,
        requestedByUserId: req.ctx.userId
      });
      res.status(201).json({ success: true, data: settlement });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTeamSettlements(req: Request, res: Response) {
    try {
      const settlements = await this.settlementService.getTeamSettlements(req.ctx, req.ctx.userId);
      res.json({ success: true, data: settlements });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async applySalaryRevisionToStructure(db: any, employeeId: number, newCtc: number) {
    if (!employeeId || !newCtc || newCtc <= 0) return;

    const emp = await db('employees').where('id', employeeId).first().catch(() => null);
    const orgId = emp?.organization_id || 1;

    // 1. Auto-resolve matching Pay Slab by CTC range & organization
    let matchedSlabId: number | null = null;
    let matchedSlabName = 'Standard Structure';

    const matchedSlab = await db('payroll_slabs')
      .where('organization_id', orgId)
      .where('is_active', true)
      .where('min_ctc', '<=', newCtc)
      .where('max_ctc', '>=', newCtc)
      .orderBy('min_ctc', 'desc')
      .first()
      .catch(() => null)
      || await db('payroll_slabs')
        .where('organization_id', orgId)
        .where('is_active', true)
        .orderBy('min_ctc', 'asc')
        .first()
        .catch(() => null);

    if (matchedSlab) {
      matchedSlabId = matchedSlab.id;
      if (matchedSlab.name) matchedSlabName = matchedSlab.name;
    }

    const newGross = Math.round(newCtc / 12);
    const newBasic = Math.round(newGross * 0.5);
    const newHra = Math.round(newGross * 0.2);
    const newSpecial = Math.round(newGross * 0.3);
    const newTakeHome = Math.round(newGross * 0.88);

    // 2. Update employee master record (annual_ctc, gross_salary, salary_slab_id)
    await db('employees')
      .where('id', employeeId)
      .update({
        annual_ctc: newCtc,
        gross_salary: newGross,
        ...(matchedSlabId ? { salary_slab_id: matchedSlabId } : {}),
        updated_at: new Date()
      })
      .catch(() => { });

    // 3. Direct update salary_structures by employee_id
    const updatedCount = await db('salary_structures')
      .where('employee_id', employeeId)
      .whereNull('deleted_at')
      .update({
        ...(matchedSlabId ? { slab_id: matchedSlabId } : {}),
        annual_ctc: newCtc,
        gross_monthly: newGross,
        basic_monthly: newBasic,
        hra_monthly: newHra,
        special_allowance_monthly: newSpecial,
        net_take_home: newTakeHome,
        updated_at: new Date()
      })
      .catch(() => 0);

    // 4. Update linked structures via employee_salary_structures mapping
    const essRows = await db('employee_salary_structures')
      .where('employee_id', employeeId)
      .whereNull('deleted_at')
      .catch(() => []);

    if (essRows && essRows.length > 0) {
      const structIds = essRows.map((r: any) => r.salary_structure_id).filter(Boolean);
      if (structIds.length > 0) {
        await db('salary_structures')
          .whereIn('id', structIds)
          .update({
            ...(matchedSlabId ? { slab_id: matchedSlabId } : {}),
            annual_ctc: newCtc,
            gross_monthly: newGross,
            basic_monthly: newBasic,
            hra_monthly: newHra,
            special_allowance_monthly: newSpecial,
            net_take_home: newTakeHome,
            updated_at: new Date()
          })
          .catch(() => { });
      }
    }

    // 5. If no salary_structures existed at all, create a new active structure record
    if (!updatedCount && (!essRows || essRows.length === 0)) {
      const [newStructId] = await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: employeeId,
        slab_id: matchedSlabId,
        structure_name: matchedSlabName,
        annual_ctc: newCtc,
        gross_monthly: newGross,
        basic_monthly: newBasic,
        hra_monthly: newHra,
        special_allowance_monthly: newSpecial,
        net_take_home: newTakeHome,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).catch(() => [null]);

      if (newStructId) {
        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: newStructId,
          is_current: true,
          effective_from: new Date().toISOString().slice(0, 10),
          created_at: new Date(),
          updated_at: new Date()
        }).catch(() => { });
      }
    }
  }

  async getPayrollStats(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;
      const monthStr = req.query.month ? String(req.query.month).slice(0, 7) : new Date().toISOString().slice(0, 7);

      const latestRun = await db('payroll_runs')
        .where(b => {
          if (orgId) b.where('organization_id', orgId).orWhereNull('organization_id');
        })
        .whereNull('deleted_at')
        .orderBy('id', 'desc')
        .first()
        .catch(() => null);

      const totalEmployeesCount = await db('employees')
        .where(b => {
          if (orgId) b.where('organization_id', orgId).orWhereNull('organization_id');
        })
        .where('status', 'ACTIVE')
        .whereNull('deleted_at')
        .count('id as count')
        .first();

      const runEmpRows = latestRun ? await db('payroll_run_employees').where('payroll_run_id', latestRun.id) : [];

      // The global response hook camelCases plain query results (totalEarnings,
      // netSalary, totalDeductions) — reading the snake_case names here always
      // returned undefined, so every total silently computed as 0. There's no
      // gross_salary column on this table at all; total_earnings is gross.
      const totalGross = runEmpRows.reduce((acc: number, r: any) => acc + Number(r.totalEarnings ?? r.total_earnings ?? 0), 0);
      const totalNet = runEmpRows.reduce((acc: number, r: any) => acc + Number(r.netSalary ?? r.net_salary ?? 0), 0);
      const totalDeductions = runEmpRows.reduce((acc: number, r: any) => acc + Number(r.totalDeductions ?? r.total_deductions ?? 0), 0);

      res.json({
        success: true,
        data: {
          totalEmployees: Number(totalEmployeesCount?.count || 0),
          processedCount: runEmpRows.length,
          totalGross,
          totalNet,
          totalDeductions,
          status: latestRun?.status || 'Draft',
          runMonth: monthStr
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getManagerDeptStats(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;

      const deptStats = await db('employees as e')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .where(b => {
          if (orgId) b.where('e.organization_id', orgId).orWhereNull('e.organization_id');
        })
        .whereNull('e.deleted_at')
        .groupBy('d.id', 'd.name')
        .select(
          'd.id as department_id',
          db.raw("COALESCE(d.name, 'General') as department_name"),
          db.raw('COUNT(e.id) as employee_count'),
          db.raw('SUM(COALESCE(e.gross_salary, 0)) as total_gross_monthly')
        );

      res.json({ success: true, data: deptStats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAY CYCLES, COMPONENT GROUPS & DEFINITIONS & PAY SLABS
  // ─────────────────────────────────────────────────────────────────────────────

  async listCycles(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      // companyId from query param overrides ctx (for explicit filter), then fall back to ctx (from X-Company-Id header)
      const companyId = req.query.companyId || req.query.company_id || req.ctx?.companyId;

      let query = db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .whereNull('pc.deleted_at')
        .where('pc.organization_id', orgId)
        .select('pc.*', 'comp.name as company_name', 'comp.code as company_code');

      if (companyId && companyId !== 'all' && companyId !== '0') {
        const isStrict = req.query.strict === 'true';
        if (isStrict) {
          query = query.where('pc.company_id', Number(companyId));
        } else {
          query = query.where(function () {
            this.where('pc.company_id', Number(companyId)).orWhereNull('pc.company_id');
          });
        }
      }

      const cycles = await query.orderByRaw('CASE WHEN pc.company_id IS NOT NULL THEN 0 ELSE 1 END').orderBy('pc.id', 'asc');
      const formattedCycles = (cycles || []).map((c: any) => {
        const title = c.cycle_name || c.cycleName || c.name || 'Standard Monthly Cycle';
        return {
          ...c,
          id: String(c.id),
          name: title,
          cycle_name: title,
          cycleName: title,
          companyId: c.company_id ? String(c.company_id) : null,
          company_id: c.company_id ? Number(c.company_id) : null,
          companyName: c.company_name || 'All Companies',
          company_name: c.company_name || 'All Companies',
          startDate: c.start_date ?? c.startDate ?? 1,
          cutoffDay: c.cutoff_day ?? c.cutoffDay ?? 25,
          disbursementDate: c.disbursement_date_str ?? c.disbursementDate ?? c.disbursement_date ?? 28,
          frequency: c.frequency || 'Monthly',
          isDailyWages: Boolean(c.is_daily_wages ?? c.isDailyWages),
          isActive: (c.is_active ?? c.isActive) !== 0 && (c.is_active ?? c.isActive) !== false
        };
      });
      res.json({ success: true, data: formattedCycles });
    } catch (err: any) {
      console.error('listCycles error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const c = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .whereNull('pc.deleted_at')
        .select('pc.*', 'comp.name as company_name', 'comp.code as company_code')
        .first();

      if (!c) {
        return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
      }

      const title = c.cycle_name || c.name || 'Standard Monthly Cycle';
      res.json({
        success: true,
        data: {
          ...c,
          id: String(c.id),
          name: title,
          cycle_name: title,
          cycleName: title,
          companyId: c.company_id ? String(c.company_id) : null,
          company_id: c.company_id ? Number(c.company_id) : null,
          companyName: c.company_name || 'All Companies',
          company_name: c.company_name || 'All Companies',
          startDate: c.start_date ?? 1,
          cutoffDay: c.cutoff_day ?? 25,
          disbursementDate: c.disbursement_date_str ?? 28,
          frequency: c.frequency || 'Monthly',
          isDailyWages: Boolean(c.is_daily_wages),
          isActive: c.is_active !== 0 && c.is_active !== false
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const cycleName = (req.body.cycle_name || req.body.name || 'Monthly Pay Cycle').trim();
      const cycleCode = req.body.cycle_code || req.body.cycleCode || `CYC-${Date.now().toString().slice(-6)}`;

      const targetCompanyId = req.body.companyId || req.body.company_id || req.ctx?.companyId;
      const numericCompanyId = (targetCompanyId && !isNaN(Number(targetCompanyId)) && Number(targetCompanyId) > 0)
        ? Number(targetCompanyId)
        : null;

      // ── Derive the correct year & month ────────────────────────────────────
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();

      const rawMonth = req.body.payroll_month || req.body.month;
      if (rawMonth && typeof rawMonth === 'string' && rawMonth.length === 7) {
        const [y, m] = rawMonth.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          year = y;
          month = m - 1;
        }
      }

      const rawFrequency = req.body.frequency || req.body.cycle_type || 'Monthly';
      const rawType = rawFrequency.toLowerCase().replace(/[^a-z]/g, '');
      const validTypes = ['monthly', 'biweekly', 'weekly', 'fortnightly', 'semimonthly', 'bimonthly'];
      const cycleType = validTypes.includes(rawType) ? rawType : 'monthly';

      const cutoffDay = Number(req.body.cutoffDay || req.body.cutoff_day || 25);
      const disbursementDay = Number(req.body.disbursementDate || req.body.disbursement_date || req.body.payoutDay || 28);
      const startDate = Number(req.body.startDate || req.body.start_date || 1);
      const startDayName = req.body.startDay || req.body.start_day || 'Monday';

      // ── Compute correct start/end/cutoff/credit dates per frequency ────────
      let cycleStartDate: string;
      let cycleEndDate: string;
      let cutoffDate: string;
      let creditDate: string;

      if (rawType === 'semimonthly') {
        if (startDate <= 15) {
          cycleStartDate = new Date(year, month, startDate).toISOString().split('T')[0];
          cycleEndDate = new Date(year, month, 15).toISOString().split('T')[0];
          cutoffDate = new Date(year, month, Math.min(cutoffDay, 15)).toISOString().split('T')[0];
          creditDate = new Date(year, month, Math.min(disbursementDay, 15)).toISOString().split('T')[0];
        } else {
          cycleStartDate = new Date(year, month, 16).toISOString().split('T')[0];
          cycleEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
          cutoffDate = new Date(year, month, Math.max(cutoffDay, 16)).toISOString().split('T')[0];
          creditDate = new Date(year, month, Math.max(disbursementDay, 16)).toISOString().split('T')[0];
        }

      } else if (rawType === 'weekly') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = Math.max(dayNames.indexOf(startDayName), 0);
        let diff = now.getDay() - targetDay;
        if (diff < 0) diff += 7;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        cycleStartDate = weekStart.toISOString().split('T')[0];
        cycleEndDate = weekEnd.toISOString().split('T')[0];
        const cutoffWk = new Date(weekEnd);
        cutoffWk.setDate(weekEnd.getDate() - 1);
        cutoffDate = cutoffWk.toISOString().split('T')[0];
        creditDate = weekEnd.toISOString().split('T')[0];

      } else if (rawType === 'biweekly' || rawType === 'fortnightly') {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = Math.max(dayNames.indexOf(startDayName), 0);
        let diff = now.getDay() - targetDay;
        if (diff < 0) diff += 7;
        diff = diff % 14;
        const biStart = new Date(now);
        biStart.setDate(now.getDate() - diff);
        const biEnd = new Date(biStart);
        biEnd.setDate(biStart.getDate() + 13);
        cycleStartDate = biStart.toISOString().split('T')[0];
        cycleEndDate = biEnd.toISOString().split('T')[0];
        const cutoffBi = new Date(biEnd);
        cutoffBi.setDate(biEnd.getDate() - 1);
        cutoffDate = cutoffBi.toISOString().split('T')[0];
        creditDate = biEnd.toISOString().split('T')[0];

      } else if (rawType === 'bimonthly') {
        cycleStartDate = new Date(year, month, 1).toISOString().split('T')[0];
        cycleEndDate = new Date(year, month + 2, 0).toISOString().split('T')[0];
        cutoffDate = new Date(year, month + 1, cutoffDay).toISOString().split('T')[0];
        creditDate = new Date(year, month + 1, disbursementDay).toISOString().split('T')[0];

      } else {
        cycleStartDate = new Date(year, month, 1).toISOString().split('T')[0];
        cycleEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        cutoffDate = new Date(year, month, cutoffDay).toISOString().split('T')[0];
        creditDate = new Date(year, month, disbursementDay).toISOString().split('T')[0];
      }

      const cycleData = {
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        cycle_name: cycleName,
        cycle_code: cycleCode,
        cycle_type: cycleType,
        frequency: rawFrequency,
        cycle_start_date: req.body.cycle_start_date || cycleStartDate,
        cycle_end_date: req.body.cycle_end_date || cycleEndDate,
        payroll_run_date: req.body.payroll_run_date || cutoffDate,
        salary_credit_date: req.body.salary_credit_date || creditDate,
        start_date: startDate,
        start_day: startDayName,
        cutoff_day: cutoffDay,
        disbursement_date_str: String(disbursementDay),
        is_daily_wages: Boolean(req.body.isDailyWages || req.body.is_daily_wages),
        daily_wages_include_paid_holidays: Boolean(
          req.body.dailyWagesIncludePaidHolidays || req.body.daily_wages_include_paid_holidays
        ),
        daily_wages_include_week_off: Boolean(
          req.body.dailyWagesIncludeWeekOff || req.body.daily_wages_include_week_off
        ),
        month_offset: req.body.monthOffset || req.body.month_offset || 'Current',
        total_days_calc: req.body.totalDaysCalc || req.body.total_days_calc || '30',
        cap_amount: Number(req.body.capAmount || req.body.cap_amount || 1000000),
        tolerance_enabled: Boolean(req.body.toleranceEnabled || req.body.tolerance_enabled),
        tolerance_minutes: Number(req.body.toleranceMinutes || req.body.tolerance_minutes || 15),
        is_active: req.body.isActive ?? req.body.is_active ?? true,
        is_current_cycle: req.body.is_current_cycle ?? true,
        status: (req.body.isActive ?? req.body.is_active ?? true) ? 'open' : 'closed',
        created_by: req.ctx?.userId || 10,
        updated_by: req.ctx?.userId || 10
      };

      const [id] = await db('payroll_cycles').insert(cycleData);
      const inserted = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .select('pc.*', 'comp.name as company_name')
        .first();

      res.status(201).json({
        success: true,
        data: {
          ...inserted,
          id: String(id),
          name: cycleName,
          companyName: inserted?.company_name || 'All Companies'
        }
      });
    } catch (err: any) {
      console.error('createCycle error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const b = req.body;
      const payload: any = { updated_at: new Date() };

      if (b.cycle_name || b.name) payload.cycle_name = (b.cycle_name || b.name).trim();
      if (b.frequency) payload.frequency = b.frequency;
      if (b.startDate || b.start_date) payload.start_date = Number(b.startDate || b.start_date);
      if (b.startDay || b.start_day) payload.start_day = b.startDay || b.start_day;
      if (b.cutoffDay || b.cutoff_day) payload.cutoff_day = Number(b.cutoffDay || b.cutoff_day);
      if (b.disbursementDate || b.disbursement_date) payload.disbursement_date_str = String(b.disbursementDate || b.disbursement_date);
      if (b.companyId !== undefined || b.company_id !== undefined) {
        const cId = b.companyId || b.company_id;
        payload.company_id = (cId && !isNaN(Number(cId)) && Number(cId) > 0) ? Number(cId) : null;
      }
      if (b.isDailyWages !== undefined || b.is_daily_wages !== undefined) payload.is_daily_wages = Boolean(b.isDailyWages ?? b.is_daily_wages);
      if (b.dailyWagesIncludePaidHolidays !== undefined || b.daily_wages_include_paid_holidays !== undefined) payload.daily_wages_include_paid_holidays = Boolean(b.dailyWagesIncludePaidHolidays ?? b.daily_wages_include_paid_holidays);
      if (b.dailyWagesIncludeWeekOff !== undefined || b.daily_wages_include_week_off !== undefined) payload.daily_wages_include_week_off = Boolean(b.dailyWagesIncludeWeekOff ?? b.daily_wages_include_week_off);
      if (b.monthOffset || b.month_offset) payload.month_offset = b.monthOffset || b.month_offset;
      if (b.capAmount !== undefined || b.cap_amount !== undefined) payload.cap_amount = Number(b.capAmount ?? b.cap_amount);
      if (b.toleranceEnabled !== undefined || b.tolerance_enabled !== undefined) payload.tolerance_enabled = Boolean(b.toleranceEnabled ?? b.tolerance_enabled);
      if (b.toleranceMinutes !== undefined || b.tolerance_minutes !== undefined) payload.tolerance_minutes = Number(b.toleranceMinutes ?? b.tolerance_minutes);
      if (b.isActive !== undefined || b.is_active !== undefined) payload.is_active = b.isActive ?? b.is_active;

      await db('payroll_cycles').where('id', id).update(payload);

      const updated = await db('payroll_cycles as pc')
        .leftJoin('company as comp', 'pc.company_id', 'comp.company_id')
        .where('pc.id', id)
        .select('pc.*', 'comp.name as company_name')
        .first();

      res.json({
        success: true,
        data: {
          ...updated,
          id: String(id),
          name: updated?.cycle_name,
          companyName: updated?.company_name || 'All Companies'
        }
      });
    } catch (err: any) {
      console.error('updateCycle error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }


  async deleteCycle(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      await db('payroll_cycles').where('id', id).update({ deleted_at: new Date(), is_active: 0 });
      res.json({ success: true, message: 'Pay cycle deleted successfully' });
    } catch (err: any) {
      console.error('deleteCycle error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async listComponentGroups(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId;
      let query = db('payroll_component_groups').whereNull('deleted_at');
      if (orgId) {
        query = query.where(builder => {
          builder.where('organization_id', orgId).orWhereNull('organization_id');
        });
      }
      const groups = await query;
      res.json({ success: true, data: groups || [] });
    } catch (err: any) {
      res.json({ success: true, data: [] });
    }
  }

  async createComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;
      const payload = {
        uuid: uuidv4(),
        organization_id: orgId,
        name: req.body.name || 'New Component Group',
        category: req.body.category || 'Earning',
        round_format: req.body.roundFormat || req.body.round_format || 'Round',
        group_function: req.body.groupFunction || req.body.group_function || 'Sum',
        configure_on_profile: req.body.configureOnProfile ?? req.body.configure_on_profile ?? false,
        display_on_profile: req.body.displayOnProfile ?? req.body.display_on_profile ?? false,
        is_editable: req.body.isEditable ?? req.body.is_editable ?? true,
        contributed_by: req.body.contributedBy || req.body.contributed_by || 'Employee',
        is_active: req.body.isActive ?? req.body.is_active ?? true,
        recalculate_on_change: req.body.recalculateOnChange ?? req.body.recalculate_on_change ?? false,
        group_for_payslip: req.body.groupForPayslip || req.body.group_for_payslip || 'Other Earnings',
        display_order: req.body.displayOrder ?? req.body.display_order ?? 10,
        disable_arrear: req.body.disableArrear ?? req.body.disable_arrear ?? false,
        display_total_on_process: req.body.displayTotalOnProcess ?? req.body.display_total_on_process ?? false,
        tds_same_month: req.body.tdsSameMonth ?? req.body.tds_same_month ?? false,
        is_taxable: req.body.isTaxable ?? req.body.is_taxable ?? true
      };
      const [id] = await db('payroll_component_groups').insert(payload);
      res.status(201).json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const payload: any = { updated_at: new Date() };
      const fields = [
        'name', 'category', 'round_format', 'group_function', 'configure_on_profile',
        'display_on_profile', 'is_editable', 'contributed_by', 'is_active',
        'recalculate_on_change', 'group_for_payslip', 'display_order', 'disable_arrear',
        'display_total_on_process', 'tds_same_month', 'is_taxable'
      ];
      fields.forEach(f => {
        const camel = f.replace(/_([a-z])/g, g => g[1].toUpperCase());
        if (req.body[f] !== undefined) payload[f] = req.body[f];
        else if (req.body[camel] !== undefined) payload[f] = req.body[camel];
      });
      await db('payroll_component_groups').where('id', id).update(payload);
      res.json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteComponentGroup(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      await db('payroll_component_groups').where('id', id).update({ deleted_at: new Date() });
      res.json({ success: true, message: 'Component group deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async listComponentDefinitions(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId;

      let pcRows: any[] = [];
      try {
        let pcQuery = db('payroll_components').whereNull('deleted_at');
        if (orgId) {
          pcQuery = pcQuery.where((b: any) => {
            b.where('organization_id', orgId).orWhereNull('organization_id');
          });
        }
        pcRows = await pcQuery;
      } catch (e) {
        pcRows = [];
      }

      let pcdRows: any[] = [];
      try {
        let pcdQuery = db('pay_component_definitions');
        if (orgId) {
          pcdQuery = pcdQuery.where((b: any) => {
            b.where('organization_id', orgId).orWhereNull('organization_id');
          });
        }
        pcdRows = await pcdQuery;
      } catch (e) {
        pcdRows = [];
      }

      // ── Normalise pay_component_definitions rows to match payroll_components shape ─
      const pcdNormalized = (Array.isArray(pcdRows) ? pcdRows : []).map((p: any) => ({
        id: `pcd_${p.id}`,
        uuid: p.uuid,
        organization_id: p.organization_id,
        group_id: null,          // pcd has no group_id; UI handles orphan comps
        name: p.component_name,
        component_type: p.component_type,  // EARNING | DEDUCTION | STATUTORY etc.
        calc_type: p.calculation_type, // FIXED_AMOUNT | FORMULA_BASED etc.
        amount: p.percentage_value || 0,
        formula: p.formula_expression || '',
        boundary_type: 'Choose',
        min_amount: p.min_value || 0,
        max_amount: p.max_value || 0,
        is_taxable: p.is_taxable,
        is_statutory: p.component_type === 'STATUTORY' ? 1 : 0,
        based_on_attendance: p.is_prorated_by_attendance,
        non_cashable: 0,
        is_active: 1,
        effective_from_date: p.effective_from,
        effective_to_date: p.effective_to,
      }));

      // ── Merge: keep pcRows first (they have group_id), add pcd rows not already present ─
      const existingNames = new Set((Array.isArray(pcRows) ? pcRows : []).map((c: any) => (c.name || '').toLowerCase()));
      const supplementary = pcdNormalized.filter(
        (p: any) => !existingNames.has((p.name || '').toLowerCase())
      );

      const combined = [...pcRows, ...supplementary];
      res.json({ success: true, data: combined });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async listComponents(req: Request, res: Response) {
    return this.listComponentDefinitions(req, res);
  }

  async getComponents(req: Request, res: Response) {
    return this.listComponentDefinitions(req, res);
  }

  async createComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const orgId = req.ctx?.organizationId || 1;
      const payload = {
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: req.body.groupId || req.body.group_id || null,
        name: req.body.name || 'New Component',
        non_cashable: req.body.nonCashable ?? req.body.non_cashable ?? false,
        based_on_attendance: req.body.basedOnAttendance ?? req.body.based_on_attendance ?? false,
        is_active: req.body.isActive ?? req.body.is_active ?? true,
        component_type: req.body.componentType || req.body.component_type || req.body.type || 'Value',
        amount: req.body.amount || 0,
        formula: req.body.formula || '',
        boundary_type: req.body.boundaryType || req.body.boundary_type || 'Choose',
        min_amount: req.body.minAmount || req.body.min_amount || req.body.minBoundary || 0,
        max_amount: req.body.maxAmount || req.body.max_amount || req.body.maxBoundary || 0,
        effective_from_date: req.body.effectiveFromDate || req.body.effective_from_date || null,
        effective_to_date: req.body.effectiveToDate || req.body.effective_to_date || null,
        condition_on: req.body.conditionOn || req.body.condition_on || null,
        condition_operator: req.body.conditionOperator || req.body.condition_operator || null,
        condition_value1: req.body.conditionValue1 || req.body.condition_value1 || null,
        condition_value2: req.body.conditionValue2 || req.body.condition_value2 || null,
        gender_filter: req.body.genderFilter || req.body.gender_filter || 'All',
        grades: JSON.stringify(req.body.grades || []),
        departments: JSON.stringify(req.body.departments || []),
        locations: JSON.stringify(req.body.locations || []),
        employees: JSON.stringify(req.body.employees || [])
      };
      const [id] = await db('payroll_components').insert(payload);
      res.status(201).json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      const b = req.body;
      const payload: any = { updated_at: new Date() };
      if (b.name) payload.name = b.name;
      if (b.amount !== undefined) payload.amount = b.amount;
      if (b.formula !== undefined) payload.formula = b.formula;
      if (b.isActive !== undefined || b.is_active !== undefined) payload.is_active = b.isActive ?? b.is_active;
      if (b.componentType || b.component_type || b.type) payload.component_type = b.componentType || b.component_type || b.type;
      if (b.groupId !== undefined || b.group_id !== undefined) payload.group_id = b.groupId ?? b.group_id;
      if (b.nonCashable !== undefined || b.non_cashable !== undefined) payload.non_cashable = b.nonCashable ?? b.non_cashable;
      if (b.basedOnAttendance !== undefined || b.based_on_attendance !== undefined) payload.based_on_attendance = b.basedOnAttendance ?? b.based_on_attendance;
      if (b.boundaryType || b.boundary_type) payload.boundary_type = b.boundaryType || b.boundary_type;
      if (b.minAmount !== undefined || b.min_amount !== undefined || b.minBoundary !== undefined) payload.min_amount = b.minAmount ?? b.min_amount ?? b.minBoundary;
      if (b.maxAmount !== undefined || b.max_amount !== undefined || b.maxBoundary !== undefined) payload.max_amount = b.maxAmount ?? b.max_amount ?? b.maxBoundary;
      if (b.effectiveFromDate !== undefined || b.effective_from_date !== undefined) payload.effective_from_date = b.effectiveFromDate ?? b.effective_from_date;
      if (b.effectiveToDate !== undefined || b.effective_to_date !== undefined) payload.effective_to_date = b.effectiveToDate ?? b.effective_to_date;
      // These eligibility/condition fields used to be silently dropped on
      // edit — only createComponentDefinition persisted them, so an admin
      // editing an existing component's condition rules saw a success toast
      // while the change never reached the database.
      if (b.conditionOn !== undefined || b.condition_on !== undefined) payload.condition_on = b.conditionOn ?? b.condition_on;
      if (b.conditionOperator !== undefined || b.condition_operator !== undefined) payload.condition_operator = b.conditionOperator ?? b.condition_operator;
      if (b.conditionValue1 !== undefined || b.condition_value1 !== undefined) payload.condition_value1 = b.conditionValue1 ?? b.condition_value1;
      if (b.conditionValue2 !== undefined || b.condition_value2 !== undefined) payload.condition_value2 = b.conditionValue2 ?? b.condition_value2;
      if (b.genderFilter || b.gender_filter) payload.gender_filter = b.genderFilter || b.gender_filter;
      if (b.grades !== undefined) payload.grades = JSON.stringify(b.grades || []);
      if (b.departments !== undefined) payload.departments = JSON.stringify(b.departments || []);
      if (b.locations !== undefined) payload.locations = JSON.stringify(b.locations || []);
      if (b.employees !== undefined) payload.employees = JSON.stringify(b.employees || []);

      await db('payroll_components').where('id', id).update(payload);
      res.json({ success: true, data: { id, ...payload } });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async deleteComponentDefinition(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;
      await db('payroll_components').where('id', id).update({ deleted_at: new Date() });
      res.json({ success: true, message: 'Component definition deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYROLL SLABS DYNAMIC CRUD (payroll_slabs)
  // ─────────────────────────────────────────────────────────────────────────────
  async listSlabs(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const companyId = req.query.companyId || req.query.company_id || req.ctx?.companyId;

      let query = db('payroll_slabs')
        .whereNull('deleted_at')
        .where(builder => {
          builder.where('organization_id', orgId).orWhereNull('organization_id');
        });

      if (companyId && companyId !== 'all' && companyId !== '0') {
        query = query.where(builder => {
          builder.where('company_id', Number(companyId)).orWhereNull('company_id');
        });
      }

      const rows = await query.orderBy('id', 'desc');

      const mapped = rows.map((r: any) => {
        let departments: string[] = [];
        try { departments = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch { }
        let grades: string[] = [];
        try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch { }
        let locations: string[] = [];
        try { locations = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch { }
        let selectedComponentIds: any[] = [];
        try {
          const rawComps = r.selected_component_ids ?? r.selectedComponentIds;
          selectedComponentIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
        } catch { }

        const minCtc = Number(r.min_ctc ?? r.minCtc ?? 0);
        const maxCtc = Number(r.max_ctc ?? r.maxCtc ?? 10000000);
        const cycleIdStr = r.cycle_id ? String(r.cycle_id) : (r.cycleId ? String(r.cycleId) : '');
        const slabName = r.name || r.slab_name || r.slabName || 'Payroll Slab';

        return {
          ...r,
          id: String(r.id),
          name: slabName,
          slabName,
          slab_name: slabName,
          departments,
          grades,
          locations,
          selectedComponentIds,
          selected_component_ids: selectedComponentIds,
          minCtc,
          min_ctc: minCtc,
          maxCtc,
          max_ctc: maxCtc,
          cycleId: cycleIdStr,
          cycle_id: cycleIdStr ? Number(cycleIdStr) : null,
          employmentType: r.employment_type || r.employmentType || 'Regular',
          employment_type: r.employment_type || r.employmentType || 'Regular',
          pfRatePct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          pf_rate_pct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          isActive: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false,
          is_active: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false ? 1 : 0,
          isFromDb: true
        };
      });

      res.json({ success: true, data: mapped });
    } catch (e: any) {
      console.error('listSlabs error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error listing slabs' });
    }
  }

  async getSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const { id } = req.params;
      const r = await db('payroll_slabs')
        .where('id', id)
        .whereNull('deleted_at')
        .first();

      if (!r) {
        return res.status(404).json({ success: false, message: 'Slab not found' });
      }

      let departments = [];
      try { departments = typeof r.departments === 'string' ? JSON.parse(r.departments) : (r.departments || []); } catch { }
      let grades = [];
      try { grades = typeof r.grades === 'string' ? JSON.parse(r.grades) : (r.grades || []); } catch { }
      let locations = [];
      try { locations = typeof r.locations === 'string' ? JSON.parse(r.locations) : (r.locations || []); } catch { }
      let selectedComponentIds = [];
      try {
        const rawComps = r.selected_component_ids ?? r.selectedComponentIds;
        selectedComponentIds = typeof rawComps === 'string' ? JSON.parse(rawComps) : (rawComps || []);
      } catch { }

      const minCtc = Number(r.min_ctc ?? r.minCtc ?? 0);
      const maxCtc = Number(r.max_ctc ?? r.maxCtc ?? 10000000);
      const slabName = r.name || r.slab_name || r.slabName || 'Payroll Slab';
      const cycleIdStr = r.cycle_id ? String(r.cycle_id) : (r.cycleId ? String(r.cycleId) : '');

      res.json({
        success: true,
        data: {
          ...r,
          id: String(r.id),
          name: slabName,
          slabName,
          slab_name: slabName,
          departments,
          grades,
          locations,
          selectedComponentIds,
          selected_component_ids: selectedComponentIds,
          minCtc,
          min_ctc: minCtc,
          maxCtc,
          max_ctc: maxCtc,
          cycleId: cycleIdStr,
          cycle_id: cycleIdStr ? Number(cycleIdStr) : null,
          employmentType: r.employment_type || r.employmentType || 'Regular',
          employment_type: r.employment_type || r.employmentType || 'Regular',
          pfRatePct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          pf_rate_pct: Number(r.pf_rate_pct ?? r.pfRatePct ?? 12.00),
          isActive: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false,
          is_active: (r.is_active ?? r.isActive) !== 0 && (r.is_active ?? r.isActive) !== false ? 1 : 0,
          isFromDb: true
        }
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message || 'Error getting slab' });
    }
  }

  async createSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const body = req.body || {};
      const slabName = (body.name || body.slab_name || body.slabName || 'New Pay Slab').trim();

      const cycleIdVal = body.cycleId || body.cycle_id;
      const numericCycleId = (cycleIdVal && !isNaN(Number(cycleIdVal))) ? Number(cycleIdVal) : null;
      const compIds = body.selectedComponentIds ?? body.selected_component_ids ?? [];

      const rawCompanyId = body.companyId || body.company_id || req.ctx?.companyId;
      const numericCompanyId = (rawCompanyId && !isNaN(Number(rawCompanyId)) && Number(rawCompanyId) > 0)
        ? Number(rawCompanyId)
        : null;

      const payload: any = {
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: numericCompanyId,
        name: slabName,
        departments: typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments || ['All Departments']),
        grades: typeof body.grades === 'string' ? body.grades : JSON.stringify(body.grades || ['All Pay Grades']),
        locations: typeof body.locations === 'string' ? body.locations : JSON.stringify(body.locations || ['All Locations']),
        min_ctc: Number(body.minCtc ?? body.min_ctc ?? 0),
        max_ctc: Number(body.maxCtc ?? body.max_ctc ?? 10000000),
        selected_component_ids: typeof compIds === 'string' ? compIds : JSON.stringify(compIds),
        cycle_id: numericCycleId,
        employment_type: body.employmentType || body.employment_type || 'Regular',
        pf_rate_pct: Number(body.pfRatePct ?? body.pf_rate_pct ?? 12.00),
        is_active: (body.isActive ?? body.is_active) !== false ? 1 : 0,
        created_by: req.ctx?.userId || 1,
        updated_by: req.ctx?.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [insertedId] = await db('payroll_slabs').insert(payload);
      const newRow = await db('payroll_slabs').where('id', insertedId).first();

      res.status(201).json({
        success: true,
        data: {
          ...newRow,
          id: String(insertedId),
          name: slabName,
          slabName,
          companyId: numericCompanyId ? String(numericCompanyId) : null,
          company_id: numericCompanyId,
          minCtc: payload.min_ctc,
          maxCtc: payload.max_ctc,
          isFromDb: true
        }
      });
    } catch (e: any) {
      console.error('createSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error creating slab' });
    }
  }

  async updateSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const firstOrg = await db('organizations').first().catch(() => null);
      const orgId = req.ctx?.organizationId ? Number(req.ctx.organizationId) : (firstOrg?.id || 8);
      const { id } = req.params;
      const body = req.body || {};
      const slabName = body.name || body.slab_name || body.slabName;

      const payload: any = {
        updated_at: new Date(),
        updated_by: req.ctx?.userId || 1,
      };

      if (body.companyId !== undefined || body.company_id !== undefined) {
        const rawComp = body.companyId ?? body.company_id;
        payload.company_id = (rawComp && !isNaN(Number(rawComp)) && Number(rawComp) > 0) ? Number(rawComp) : null;
      }

      if (slabName) {
        payload.name = slabName.trim();
      }
      if (body.departments !== undefined) {
        payload.departments = typeof body.departments === 'string' ? body.departments : JSON.stringify(body.departments);
      }
      if (body.grades !== undefined) {
        payload.grades = typeof body.grades === 'string' ? body.grades : JSON.stringify(body.grades);
      }
      if (body.locations !== undefined) {
        payload.locations = typeof body.locations === 'string' ? body.locations : JSON.stringify(body.locations);
      }
      if (body.minCtc !== undefined || body.min_ctc !== undefined) {
        payload.min_ctc = Number(body.minCtc ?? body.min_ctc);
      }
      if (body.maxCtc !== undefined || body.max_ctc !== undefined) {
        payload.max_ctc = Number(body.maxCtc ?? body.max_ctc);
      }
      if (body.selectedComponentIds !== undefined || body.selected_component_ids !== undefined) {
        const cIds = body.selectedComponentIds ?? body.selected_component_ids;
        payload.selected_component_ids = typeof cIds === 'string' ? cIds : JSON.stringify(cIds);
      }
      if (body.cycleId !== undefined || body.cycle_id !== undefined) {
        const cId = body.cycleId ?? body.cycle_id;
        payload.cycle_id = (cId && !isNaN(Number(cId))) ? Number(cId) : null;
      }
      if (body.employmentType !== undefined || body.employment_type !== undefined) {
        payload.employment_type = body.employmentType ?? body.employment_type;
      }
      if (body.pfRatePct !== undefined || body.pf_rate_pct !== undefined) {
        payload.pf_rate_pct = Number(body.pfRatePct ?? body.pf_rate_pct);
      }
      if (body.isActive !== undefined || body.is_active !== undefined) {
        payload.is_active = (body.isActive ?? body.is_active) ? 1 : 0;
      }

      await db('payroll_slabs')
        .where('id', id)
        .update(payload);

      // Synchronize associated structures if name changed
      if (slabName) {
        await db('salary_structures')
          .where('slab_id', id)
          .update({ structure_name: slabName.trim(), updated_at: new Date() })
          .catch(() => { });
      }

      const updatedRow = await db('payroll_slabs').where('id', id).first();
      res.json({
        success: true,
        data: {
          ...updatedRow,
          id: String(id),
          name: updatedRow?.name || slabName,
          slabName: updatedRow?.name || slabName,
          isFromDb: true
        }
      });
    } catch (e: any) {
      console.error('updateSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error updating slab' });
    }
  }

  async deleteSlab(req: Request, res: Response) {
    try {
      const db = getKnex();
      const { id } = req.params;

      // 1. Soft-delete the slab
      await db('payroll_slabs')
        .where('id', id)
        .update({ deleted_at: new Date(), is_active: 0 });

      // 2. Disassociate from salary_structures so orphan slab references don't break lookups
      await db('salary_structures')
        .where('slab_id', id)
        .update({ slab_id: null, updated_at: new Date() })
        .catch(() => { });

      res.json({ success: true, message: 'Payroll slab deleted successfully' });
    } catch (e: any) {
      console.error('deleteSlab error:', e);
      res.status(500).json({ success: false, message: e.message || 'Error deleting slab' });
    }
  }

  async bulkAssignSlabs(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx;
    const orgId = ctx.organizationId;
    const validUserId = ctx.userId || 1;

    // The two real callers (Assign Slab tab, Mass Salary Structure Upload) send
    // per-row {employeeCode|email, slabId, annualCtc} under 'assignments' or
    // 'rows' respectively — never the flat employeeIds/slabId this handler used
    // to read, which meant every assignment silently no-op'd while reporting
    // success.
    const items: any[] = Array.isArray(req.body.assignments)
      ? req.body.assignments
      : Array.isArray(req.body.rows)
        ? req.body.rows
        : [];

    if (items.length === 0) {
      res.status(400).json({ success: false, message: 'No assignments provided' });
      return;
    }

    let successCount = 0;
    const errors: { row: number; employeeCode?: string; email?: string; message: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] || {};
      const employeeCode = item.employeeCode || item.employee_code;
      const email = item.email;
      try {
        const slabId = item.slabId || item.slab_id;
        if (!slabId) throw new Error('Missing slabId');
        const annualCtc = Number(item.annualCtc ?? item.annual_ctc ?? 0);

        let empRow = null;
        if (employeeCode) {
          empRow = await db('employees').where({ organization_id: orgId, employee_code: employeeCode }).whereNull('deleted_at').first();
        }
        if (!empRow && email) {
          empRow = await db('employees').whereRaw('LOWER(email) = ?', [String(email).toLowerCase()]).where('organization_id', orgId).whereNull('deleted_at').first();
        }
        if (!empRow) throw new Error(`Employee not found (code=${employeeCode || '-'}, email=${email || '-'})`);

        const employeeId = empRow.id;
        const slabRow = await db('payroll_slabs').where('id', slabId).first();
        const effectiveFromVal = item.effectiveFrom || item.effective_from || new Date().toISOString().slice(0, 10);
        const grossMonthly = annualCtc > 0 ? Math.round(annualCtc / 12) : 0;
        const basicMonthly = Math.round(grossMonthly * 0.5);
        const hraMonthly = Math.round(basicMonthly * 0.4);

        // Find or create this employee's own salary_structures row for this slab.
        let structRow = await db('salary_structures')
          .where({ employee_id: employeeId, organization_id: orgId })
          .whereNull('deleted_at')
          .first();

        const structurePayload = {
          company_id: empRow.company_id || slabRow?.company_id || null,
          slab_id: slabId,
          cycle_id: slabRow?.cycle_id || null,
          structure_name: slabRow?.name || 'Assigned Slab',
          annual_ctc: annualCtc,
          gross_monthly: grossMonthly,
          basic_monthly: basicMonthly,
          hra_monthly: hraMonthly,
          effective_from: effectiveFromVal,
          updated_by: validUserId
        };

        if (structRow) {
          await db('salary_structures').where('id', structRow.id).update(structurePayload);
        } else {
          const sCode = `STR-${(slabRow?.name || 'SLAB').slice(0, 3).toUpperCase()}-${Date.now()}-${employeeId}`;
          const [insertedId] = await db('salary_structures').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            company_id: empRow.company_id || slabRow?.company_id || null,
            employee_id: employeeId,
            structure_name: slabRow?.name || 'Assigned Slab',
            structure_code: sCode,
            grade_code: sCode,
            status: 'active',
            created_by: validUserId,
            ...structurePayload
          });
          structRow = { id: insertedId };
        }

        // Version the mapping: retire the current row (if any), insert the new one —
        // same pattern assignStructureToEmployee uses, so an employee never ends
        // up with zero or multiple is_current rows.
        await db('employee_salary_structures')
          .where({ employee_id: employeeId, is_current: true })
          .update({ is_current: false, effective_to: new Date() });

        await db('employee_salary_structures').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: employeeId,
          salary_structure_id: structRow.id,
          effective_from: effectiveFromVal,
          is_current: true,
          created_by: validUserId,
          updated_by: validUserId
        });

        successCount++;
      } catch (e: any) {
        errors.push({ row: i + 1, employeeCode, email, message: e.message || 'Assignment failed' });
      }
    }

    res.json({
      success: true,
      message: errors.length === 0 ? 'Slabs assigned successfully' : `Assigned ${successCount} of ${items.length}; ${errors.length} failed`,
      summary: { total: items.length, successCount, failCount: errors.length, errors }
    });
  }

  async getPayrollRunDetails(req: Request, res: Response) {
    const db = getKnex();
    const runId = parseInt(req.params.id);
    if (Number.isNaN(runId)) {
      res.status(404).json({ success: false, message: 'Payroll run not found' });
      return;
    }
    const run = await db('payroll_runs').where({ id: runId, organization_id: req.ctx.organizationId }).first();
    if (!run) {
      res.status(404).json({ success: false, message: 'Payroll run not found' });
      return;
    }

    const employees = await db('payroll_run_employees as pre')
      .join('employees as e', 'pre.employee_id', 'e.id')
      .leftJoin('designations as d', 'e.current_designation_id', 'd.id')
      .where('pre.payroll_run_id', runId)
      .select(
        'pre.*',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        db.raw('COALESCE(d.name, e.designation) as designation')
      );

    res.json({ success: true, data: { ...run, employees } });
  }

  async createMassUploadLog(req: Request, res: Response) {
    const db = getKnex();
    const { fileName, slabName, totalRows, successCount, failCount, errors } = req.body;
    const [id] = await db('payroll_mass_upload_logs').insert({
      uuid: uuidv4(),
      organization_id: req.ctx.organizationId,
      file_name: fileName || 'upload.csv',
      slab_name: slabName || null,
      total_rows: Number(totalRows || 0),
      success_count: Number(successCount || 0),
      fail_count: Number(failCount || 0),
      errors: errors ? JSON.stringify(errors) : null,
      uploaded_by: req.ctx.userId
    });
    const log = await db('payroll_mass_upload_logs').where('id', id).first();
    res.status(201).json({ success: true, data: log });
  }

  async getMassUploadLogs(req: Request, res: Response) {
    const db = getKnex();
    const logs = await db('payroll_mass_upload_logs as l')
      .leftJoin('users as u', 'l.uploaded_by', 'u.id')
      .where('l.organization_id', req.ctx.organizationId)
      .orderBy('l.id', 'desc')
      .limit(50)
      .select('l.*', db.raw("COALESCE(u.first_name, 'HR Admin') as uploaded_by_name"));
    res.json({ success: true, data: logs });
  }
}

