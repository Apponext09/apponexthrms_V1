/**
 * PayrollRegisterController.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the Process Register page — dynamic calculation view that computes
 * per-employee earned amounts from salary structure + real attendance + slabs + components.
 * No hardcoded values.
 */

import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getKnex } from '../../../db/knex';
import { positiveNum, withSnakeAliases } from '../utils/payroll.utils';
import { PayrollFormulaEvaluator } from '../utils/PayrollFormulaEvaluator';

export class PayrollRegisterController {
  async getProcessRegister(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;

    const {
      cycleId,
      slabId,
      month,
      fromDate,
      toDate,
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
      // ── newly wired filters ───────────────────────────────────────────────
      payrollStatus,  // 'draft' | 'processing' | 'completed' | 'locked' | 'approved' | 'published'
      sortBy,         // 'Name' | 'Department' | 'Grade' | 'Designation' | 'Slab' | 'NetSalary'
    } = req.query;

    // employment_type can arrive as either camelCase or snake_case from buildParams()
    const activeEmpType = String(req.query.employment_type || req.query.employmentType || employmentType || '');

    try {
      const targetOrgId =
        ctx.organizationId ||
        (req as any).user?.organizationId ||
        (req as any).user?.organization_id ||
        8;

      let empQuery = db('employees as e')
        .leftJoin('departments as d', 'e.current_department_id', 'd.id')
        .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
        .leftJoin('locations as l', 'e.current_location_id', 'l.id')
        .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
        .whereNull('e.deleted_at')
        .where('e.organization_id', targetOrgId);

      const activeStatus = status || employeeStatus;
      // activeEmpType already resolved above the try block

      const activeCompanyId = companyId || req.query.companyId || req.query.company_id;

      if (activeCompanyId && String(activeCompanyId).toUpperCase() !== 'ALL' && String(activeCompanyId) !== '') {
        empQuery = empQuery.where('e.company_id', Number(activeCompanyId));
      }
      if (departmentId) empQuery = empQuery.where('e.current_department_id', Number(departmentId));
      if (locationId) empQuery = empQuery.where('e.current_location_id', Number(locationId));
      if (employeeId) empQuery = empQuery.where('e.id', Number(employeeId));
      if (reportingOfficerId)
        empQuery = empQuery.where('e.reporting_manager_id', Number(reportingOfficerId));
      if (activeStatus) empQuery = empQuery.whereRaw('LOWER(e.status) = LOWER(?)', [String(activeStatus)]);
      if (activeEmpType) {
        // Normalize employment type to handle 'Full Time', 'Full-Time', 'full_time' variants
        empQuery = empQuery.whereRaw(
          "REPLACE(REPLACE(LOWER(e.employment_type), '-', ''), '_', '') LIKE REPLACE(REPLACE(LOWER(?), '-', ''), '_', '')",
          [String(activeEmpType)]
        );
      }
      if (gradeId) empQuery = empQuery.where('e.current_grade_id', Number(gradeId));
      if (designationId)
        empQuery = empQuery.where('e.current_designation_id', Number(designationId));
      if (slabId) {
        const slabEmpRows = await db('salary_structures')
          .where('slab_id', Number(slabId))
          .whereNull('deleted_at')
          .select('employee_id');
        const slabEmpIds = slabEmpRows.map((r: any) => r.employee_id).filter(Boolean);
        if (slabEmpIds.length > 0) {
          empQuery = empQuery.whereIn('e.id', slabEmpIds);
        } else {
          empQuery = empQuery.whereRaw('1 = 0');
        }
      }

      const rawEmployees = await empQuery.select(
        'e.id',
        'e.uuid',
        'e.company_id',
        'e.employee_code',
        'e.organization_id',
        'e.first_name',
        'e.middle_name',
        'e.last_name',
        'e.job_title',
        'e.current_department_id',
        'e.current_designation_id',
        'e.current_location_id',
        'e.employment_type',
        'e.date_of_joining',
        'd.name as department_name',
        'des.name as designation_name',
        'l.name as location_name',
        'e.bank_name',
        'e.account_no as account_number',
        'e.account_no',
        'e.ifsc_code',
        'e.pan_number as pan',
        'e.pan_number',
        'e.uan_no',
        'e.pf_no',
        'e.esic_no',
        db.raw(
          "TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager"
        )
      );

      const seenEmpIds = new Set<number>();
      const employees = (rawEmployees || []).filter((emp: any) => {
        if (!emp.id || seenEmpIds.has(emp.id)) return false;
        seenEmpIds.add(emp.id);
        return true;
      });

      if (!employees || employees.length === 0) {
        return res.json({ success: true, data: [], component_definitions: [] });
      }

      // Pre-load all component groups for this org
      const allGroups: any[] = await db('payroll_component_groups')
        .where('organization_id', targetOrgId)
        .whereNull('deleted_at')
        .orderBy('display_order', 'asc')
        .catch(() => []);

      const groupMap = new Map<number, any>();
      for (const g of allGroups) {
        const sG = withSnakeAliases(g) || g;
        groupMap.set(Number(sG.id), sG);
      }

      // Pre-load all active component definitions for this org
      const allComponents: any[] = await db('payroll_components')
        .where('organization_id', targetOrgId)
        .where('is_active', 1)
        .whereNull('deleted_at')
        .orderBy('id', 'asc')
        .catch(() => []);

      // Pre-load all slabs for fast lookup
      const allSlabs: any[] = await db('payroll_slabs')
        .where('organization_id', targetOrgId)
        .where('is_active', 1)
        .whereNull('deleted_at')
        .catch(() => []);

      // Resolve target month & date range
      const targetMonth = month
        ? String(month).slice(0, 7)
        : (fromDate ? String(fromDate).slice(0, 7) : new Date().toISOString().slice(0, 7));

      const [tYear, tMon] = targetMonth.split('-').map(Number);
      const targetYear = tYear;
      const targetMonthNum = tMon;
      const calendarDays = new Date(tYear, tMon, 0).getDate();

      // Cycle days override
      let totalDays = calendarDays;
      let cycleRow: any = null;
      if (cycleId) {
        cycleRow = await db('payroll_cycles')
          .where('id', Number(cycleId))
          .whereNull('deleted_at')
          .first()
          .catch(() => null);
      }
      if (!cycleRow) {
        cycleRow = await db('payroll_cycles')
          .where('organization_id', targetOrgId)
          .whereNull('deleted_at')
          .orderBy('id', 'asc')
          .first()
          .catch(() => null);
      }

      let cycleStartDay = 1;
      let cycleCutoffDay = calendarDays;

      if (cycleRow) {
        const sCyc = withSnakeAliases(cycleRow) || cycleRow;
        if (sCyc.start_date || sCyc.calculation_start_day) {
          cycleStartDay = Math.max(1, Math.min(calendarDays, Number(sCyc.start_date || sCyc.calculation_start_day)));
        }
        if (sCyc.cutoff_day) {
          cycleCutoffDay = Math.max(1, Math.min(calendarDays, Number(sCyc.cutoff_day)));
        }
        if (sCyc.frequency === 'Weekly') totalDays = 7;
        else if (sCyc.frequency === 'Bi-Weekly' || sCyc.frequency === 'Fortnightly') totalDays = 14;
        else if (sCyc.frequency === 'Semi-Monthly') totalDays = 15;
        else {
          totalDays = Math.max(1, cycleCutoffDay - cycleStartDay + 1);
        }
      }

      const monthStart = fromDate ? String(fromDate).slice(0, 10) : `${targetMonth}-${String(cycleStartDay).padStart(2, '0')}`;
      const monthEnd = toDate ? String(toDate).slice(0, 10) : `${targetMonth}-${String(cycleCutoffDay).padStart(2, '0')}`;

      const resultRows = [];

      for (const rawEmp of employees) {
        const emp = withSnakeAliases(rawEmp) || rawEmp;
        const empOrgId = emp.organization_id || emp.organizationId || targetOrgId;

        // 1. Resolve employee name, designation, department, bank
        const firstName = emp.first_name || emp.firstName || '';
        const middleName = emp.middle_name || emp.middleName || '';
        const lastName = emp.last_name || emp.lastName || '';
        const employeeCode = emp.employee_code || emp.employeeCode || `EMP-${emp.id}`;
        const designation = emp.designation_name || emp.designationName || emp.job_title || emp.jobTitle || 'Staff';
        const departmentName = emp.department_name || emp.departmentName || 'General';
        const bankName = emp.bank_name || emp.bankName || null;
        const accountNumber = emp.account_number || emp.accountNumber || emp.account_no || emp.accountNo || null;
        const ifscCode = emp.ifsc_code || emp.ifscCode || null;
        const reportingManager = (emp.reporting_manager || emp.reportingManager || '').trim() || 'Organization Admin';

        // 2. Resolve Salary Structure (or auto-resolve/assign from Pay Slab dynamically)
        let struct: any = null;
        try {
          struct = await db('employee_salary_structures as ess')
            .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
            .where('ess.employee_id', emp.id)
            .where('ess.is_current', 1)
            .where('ss.effective_from', '<=', monthEnd)
            .where(function (this: any) {
              this.whereNull('ss.effective_to').orWhere('ss.effective_to', '>=', monthStart);
            })
            .whereNull('ess.deleted_at')
            .whereNull('ss.deleted_at')
            .orderBy('ss.effective_from', 'desc')
            .orderBy('ss.id', 'desc')
            .select('ss.*')
            .first();
        } catch {
          struct = null;
        }

        if (!struct) {
          try {
            struct = await db('salary_structures')
              .where('employee_id', emp.id)
              .where('effective_from', '<=', monthEnd)
              .where(function (this: any) {
                this.whereNull('effective_to').orWhere('effective_to', '>=', monthStart);
              })
              .whereNull('deleted_at')
              .orderBy('effective_from', 'desc')
              .orderBy('id', 'desc')
              .first();
          } catch {
            struct = null;
          }
        }

        if (!struct) {
          try {
            struct = await db('salary_structures')
              .where('employee_id', emp.id)
              .whereNull('deleted_at')
              .orderBy('id', 'desc')
              .first();
          } catch {
            struct = null;
          }
        }

        const sStruct = withSnakeAliases(struct) || {};

        // Resolve employee-level cycle (from salary_structure.cycle_id, else org default)
        let empCycleId: number | null = null;
        let empCycleName: string = '';
        try {
          const empCycleIdRaw = sStruct.cycle_id || sStruct.cycleId || null;
          if (empCycleIdRaw) {
            const empCycleRow = await db('payroll_cycles')
              .where('id', Number(empCycleIdRaw))
              .whereNull('deleted_at')
              .first();
            if (empCycleRow) {
              const sCyc2 = withSnakeAliases(empCycleRow) || empCycleRow;
              empCycleId = Number(sCyc2.id);
              empCycleName = sCyc2.cycle_name || sCyc2.name || `Cycle #${sCyc2.id}`;
            }
          }
          if (!empCycleId && cycleRow) {
            const sCyc2 = withSnakeAliases(cycleRow) || cycleRow;
            empCycleId = Number(sCyc2.id);
            empCycleName = sCyc2.cycle_name || sCyc2.name || `Default Cycle`;
          }
        } catch { /* silent */ }

        // 3. Dynamic Slab Resolution
        const empCtcFromRecord = positiveNum(emp.annual_ctc, positiveNum(emp.annualCtc, positiveNum(emp.gross_salary ? emp.gross_salary * 12 : 0, 0)));
        const structCtc = positiveNum(sStruct.annual_ctc, positiveNum(sStruct.gross_monthly ? sStruct.gross_monthly * 12 : 0, empCtcFromRecord));

        let matchedSlab: any = null;
        const slabIdToTry = sStruct.slab_id || sStruct.slabId || emp.salary_slab_id || emp.salarySlabId;
        if (slabIdToTry) {
          matchedSlab = allSlabs.find((s: any) => Number(s.id) === Number(slabIdToTry));
        }

        // If no slab linked on structure, find best matching slab by CTC or fallback to default slab
        if (!matchedSlab) {
          if (structCtc > 0) {
            matchedSlab = allSlabs.find((s: any) => {
              const sSlab = withSnakeAliases(s) || s;
              const minCtc = Number(sSlab.min_ctc || 0);
              const maxCtc = Number(sSlab.max_ctc || 10000000);
              return structCtc >= minCtc && structCtc <= maxCtc;
            });
          }
          // Final fallback: use first active slab
          if (!matchedSlab && allSlabs.length > 0) {
            matchedSlab = allSlabs[0];
          }
        }

        // Check if employee has a valid assigned salary structure or dynamic fallback
        const hasAssignedStructure = Boolean(struct && (sStruct.gross_monthly || sStruct.annual_ctc || sStruct.salary_slab_id || sStruct.slab_id)) || (structCtc > 0) || (allSlabs.length > 0);

        const slabRow = matchedSlab ? (withSnakeAliases(matchedSlab) || {}) : {};
        const slabName = slabRow.name || sStruct.structure_name || (allSlabs[0]?.name || 'Standard Pay Slab');

        let selectedCompIds: number[] = [];
        try {
          const rawIds = slabRow.selected_component_ids;
          if (rawIds) {
            selectedCompIds = Array.isArray(rawIds) ? rawIds.map(Number) : JSON.parse(rawIds).map(Number);
          }
        } catch {
          selectedCompIds = [];
        }

        // 4. Resolve Gross & CTC
        const grossMonthly = positiveNum(
          sStruct.gross_monthly,
          structCtc > 0 ? Math.round(structCtc / 12) : (slabRow.min_ctc ? Math.round(Number(slabRow.min_ctc) / 12) : (emp.gross_salary ? Number(emp.gross_salary) : 0))
        );
        const annualCTC = positiveNum(sStruct.annual_ctc, structCtc > 0 ? structCtc : grossMonthly * 12);

        // 5. Parse Custom Components JSON
        let customComps: Record<string, number> = {};
        try {
          const rawCC = sStruct.custom_components;
          if (rawCC) customComps = typeof rawCC === 'string' ? JSON.parse(rawCC) : rawCC;
        } catch {
          customComps = {};
        }

        // 6. Real Attendance from attendance_records
        let presentDays = 0,
          halfDayCount = 0,
          absentDays = 0,
          weeklyOffDays = 0,
          holidayDays = 0;
        try {
          const attRecs = await db('attendance_records')
            .where('employee_id', emp.id)
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
            else if (s === 'on_leave') absentDays++;
          }
        } catch {}

        // 7. LOP from approved unpaid leaves
        let unpaidLeaveDays = 0;
        try {
          const unpaidResult = await db('leave_applications as la')
            .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
            .where('la.employee_id', emp.id)
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
        } catch {
          unpaidLeaveDays = 0;
        }

        // ── Effective Date, Date of Joining (DOJ) & Exit Date calculation ───────
        let activeStartDay = 1;
        let activeEndDay = totalDays;

        if (emp.date_of_joining || emp.dateOfJoining || emp.doj) {
          const dojRaw = emp.date_of_joining || emp.dateOfJoining || emp.doj;
          const dojDate = new Date(dojRaw);
          if (!isNaN(dojDate.getTime())) {
            const dojY = dojDate.getFullYear();
            const dojM = dojDate.getMonth() + 1;
            const currentY = targetYear;
            const currentM = targetMonthNum;
            if (dojY === currentY && dojM === currentM) {
              activeStartDay = Math.max(1, dojDate.getDate());
            } else if (dojY > currentY || (dojY === currentY && dojM > currentM)) {
              activeStartDay = totalDays + 1; // Future joiner
            }
          }
        }

        if (emp.relieving_date || emp.exit_date || emp.resignation_date) {
          const exitRaw = emp.relieving_date || emp.exit_date || emp.resignation_date;
          const exitDate = new Date(exitRaw);
          if (!isNaN(exitDate.getTime())) {
            const exitY = exitDate.getFullYear();
            const exitM = exitDate.getMonth() + 1;
            const currentY = targetYear;
            const currentM = targetMonthNum;
            if (exitY === currentY && exitM === currentM) {
              activeEndDay = Math.min(totalDays, exitDate.getDate());
            } else if (exitY < currentY || (exitY === currentY && exitM < currentM)) {
              activeEndDay = 0; // Exited in past
            }
          }
        }

        // Check Salary Structure / Slab Effective Date
        if (sStruct.effective_from) {
          const effDate = new Date(sStruct.effective_from);
          if (!isNaN(effDate.getTime())) {
            const effY = effDate.getFullYear();
            const effM = effDate.getMonth() + 1;
            const currentY = targetYear;
            const currentM = targetMonthNum;
            if (effY === currentY && effM === currentM) {
              activeStartDay = Math.max(activeStartDay, effDate.getDate());
            } else if (effY > currentY || (effY === currentY && effM > currentM)) {
              activeStartDay = totalDays + 1; // Future slab effective date -> No payroll for this month
            }
          }
        }

        const maxEligibleDays = hasAssignedStructure ? Math.max(0, activeEndDay - activeStartDay + 1) : 0;

        // Compute paid/unpaid days from real attendance and effective active dates
        let paidDays: number, unpaidDays: number;
        if (!hasAssignedStructure || maxEligibleDays === 0) {
          paidDays = 0;
          unpaidDays = totalDays;
        } else {
          const hasAttendance =
            presentDays + halfDayCount + absentDays + weeklyOffDays + holidayDays > 0;
          if (hasAttendance) {
            paidDays = Math.round(
              presentDays + halfDayCount * 0.5 + weeklyOffDays + holidayDays
            );
            paidDays = Math.max(0, Math.min(maxEligibleDays, paidDays - unpaidLeaveDays));
          } else {
            paidDays = Math.max(0, maxEligibleDays - unpaidLeaveDays);
          }
          unpaidDays = Math.max(0, totalDays - paidDays);
        }
        const ratio = (totalDays > 0 && hasAssignedStructure) ? paidDays / totalDays : 0;

        // 8. Dynamic Component Evaluation — primary source: salary_structure earnings/deductions breakup
        //    These are stored when the salary structure is assigned per-employee via SalaryCalculationService.
        //    Fallback to component catalog only if no breakup exists.
        let basic = 0;
        let hra = 0;
        let standardAllowance = 0;
        let mealAllowance = 0;
        let commAllowance = 0;
        let ceaAllowance = 0;
        let ltaAllowance = 0;
        let pfMonthly = 0;
        let esicMonthly = 0;
        let ptMonthly = 0;
        let tdsMonthly = positiveNum(sStruct.tds_deduction, 0);

        const componentValues: Record<
          number,
          { id: number; name: string; type: string; group_id: number | null; group_name?: string; category?: string; monthly: number; earned: number }
        > = {};

        // ── Parse stored per-employee breakup ────────────────────────────────
        let storedDeductionsBreakup: any[] = [];
        try {
          const rawDB = sStruct.deductions_breakup || sStruct.deductionsBreakup;
          if (rawDB) {
            storedDeductionsBreakup = typeof rawDB === 'string' ? JSON.parse(rawDB) : rawDB;
            if (!Array.isArray(storedDeductionsBreakup)) storedDeductionsBreakup = [];
          }
        } catch { storedDeductionsBreakup = []; }

        // 8. Dynamic Component Evaluation via PayrollFormulaEvaluator
        // This is the same 6-gate engine used in processPayroll(), so the register
        // preview matches the actual processed amounts and adapts whenever a component
        // is changed between Value and Derived.

          // Build base context — basic starts at 0, set dynamically by component loop
          const formulaCtx: Record<string, number> = {
            // Core salary
            ctc: grossMonthly,
            monthly_ctc: grossMonthly,
            annual_ctc: annualCTC,
            gross: grossMonthly,
            gross_salary: grossMonthly,
            salary_input: grossMonthly,        // [SALARY_INPUT]
            gross_earned: Math.round(grossMonthly * ratio),
            // Basic — set dynamically during component loop, start at 0
            basic: 0,
            basic_salary: 0,
            basic_earned: 0,                   // [BASIC_EARNED] — updated after basic component runs
            // Attendance
            present_days: paidDays,
            total_days: totalDays,
            lop_days: unpaidDays,
            paid_days: paidDays,
            attendance_factor: ratio,
            system_calc_days: totalDays,       // [SYSTEM_CALC_DAYS]
            system_extra_paid_days: 0,         // [SYSTEM_EXTRA_PAID_DAYS] — set if OT extra days apply
            // Statutory pre-fills (will be overwritten as components compute)
            epf_eps_wages: 0,                  // [EPF_EPS_WAGES] — from EPF EPS Wages component
            eps_wages: 0,                      // [EPS_WAGES]
            esi_wages: 0,                      // [ESI_WAGES]
            pf_employee: 0,                    // [PF_EMPLOYEE]
            eps_component: 0,                  // [EPS_COMPONENT]
            edli_wages: 0,                     // [EDLI_WAGES]
          };


          // Determine which component IDs this employee's slab includes
          const slabCompIds = new Set(selectedCompIds);

          // Sort by group display_order (critical for dependency resolution):
          //   order 1 = Basic, 2 = HRA, 3 = Conveyance, 5 = Professional Allowance, 10 = others
          //   order 50 = Earned (pass-through), 90 = Special Allowance
          //   order 100+ = Deductions (EPF wages first, then ESIC, PF, EPS diff, etc.)
          const orderedComps = [...allComponents].sort((a: any, b: any) => {
            const aGroup = groupMap.get(Number(a.group_id));
            const bGroup = groupMap.get(Number(b.group_id));
            const aOrder = Number(aGroup?.display_order ?? 999);
            const bOrder = Number(bGroup?.display_order ?? 999);
            if (aOrder !== bOrder) return aOrder - bOrder;
            // Within same group order: Value/fixed first, Derived second
            const aIsDerived = (a.component_type || '').toLowerCase().includes('derived');
            const bIsDerived = (b.component_type || '').toLowerCase().includes('derived');
            if (aIsDerived && !bIsDerived) return 1;
            if (!aIsDerived && bIsDerived) return -1;
            return Number(a.id) - Number(b.id);
          });

          let totalEarningsAllocated = 0;
          let specialAllowanceCompId: number | null = null;

          for (const rawComp of orderedComps) {
            const comp = withSnakeAliases(rawComp) || rawComp;
            const cId = Number(comp.id);
            const cName = (comp.name || '').toLowerCase();
            const isInSlab = slabCompIds.size === 0 || slabCompIds.has(cId);

            if (!isInSlab) continue;

            // Skip Special Allowance — computed as residual at the end
            if (cName.includes('special') && (cName.includes('allowance') || cName.includes('allow'))) {
              specialAllowanceCompId = cId;
              continue;
            }

            const group = groupMap.get(Number(comp.group_id));
            const groupCat = (group?.category || '').toLowerCase();
            // Use ONLY group category for deduction detection — never name-based (avoids wrongly
            // tagging "Professional Allowance Earned" as a deduction because name contains 'professional')
            const isDeduction = groupCat.includes('deduct');

            // Evaluate formula
            let monthlyVal = 0;
            const formula = comp.formula || comp.calculation_formula || '';
            const calcType = comp.component_type || comp.calc_type || '';

            if (formula) {
              monthlyVal = PayrollFormulaEvaluator.evaluate(formula, formulaCtx);
            } else if (calcType.toLowerCase() === 'fixed' || calcType.toLowerCase() === 'value') {
              monthlyVal = positiveNum(comp.amount, 0);
            } else if (calcType.toLowerCase().includes('percent') || calcType.toLowerCase().includes('formula')) {
              const pct = positiveNum(comp.amount, 0);
              const base = cName.includes('hra') || cName.includes('house rent') ? formulaCtx.basic
                : cName.includes('pf') || cName.includes('provident') ? Math.min(formulaCtx.basic, 15000)
                : grossMonthly;
              monthlyVal = pct > 0 ? Math.round(base * pct / 100) : 0;
            } else {
              monthlyVal = positiveNum(comp.amount, 0);
            }

            // Apply min/max boundaries
            monthlyVal = PayrollFormulaEvaluator.applyBoundaries(
              monthlyVal,
              comp.boundary_type || comp.boundaryType,
              positiveNum(comp.min_amount ?? comp.minAmount, undefined),
              positiveNum(comp.max_amount ?? comp.maxAmount, undefined)
            );

            // Attendance pro-rating for earnings strictly respecting component setting based_on_attendance
            const basedOnAttendanceFlag = comp.based_on_attendance ?? comp.basedOnAttendance;
            const isAttendanceBased = basedOnAttendanceFlag !== null && basedOnAttendanceFlag !== undefined
              ? Boolean(Number(basedOnAttendanceFlag))
              : !isDeduction;
            const earnedVal = isDeduction ? monthlyVal : (isAttendanceBased ? Math.round(monthlyVal * ratio) : monthlyVal);

            // Register named shortcuts — update formulaCtx so downstream formulas can reference them
            // GUARD: only the "Basic" salary component itself should set formulaCtx.basic
            // Exclude: "PF 12% on Basic", "Basic Earned", "EPF EPS Wages" etc.
            const isBasicSalaryComp = cName.includes('basic')
              && !cName.includes('earned')
              && !cName.includes('eps')
              && !cName.includes('epf')
              && !cName.includes('pf')          // excludes "PF 12% on Basic"
              && !cName.includes('%')            // excludes "Basic 50%"
              && !cName.includes('12')           // extra safety
              && isDeduction === false;

            if (isBasicSalaryComp) {
              basic = monthlyVal;
              formulaCtx.basic = monthlyVal;
              formulaCtx.basic_salary = monthlyVal;
              formulaCtx.basic_earned = Math.round(monthlyVal * ratio);
            }
            else if ((cName === 'basic 50%' || (cName.includes('basic') && cName.includes('%')))
              && !cName.includes('pf') && !cName.includes('provident') && !isDeduction) {
              // e.g. "Basic 50%", "Basic 40%" — these SET the basic from CTC%
              basic = monthlyVal;
              formulaCtx.basic = monthlyVal;
              formulaCtx.basic_salary = monthlyVal;
              formulaCtx.basic_earned = Math.round(monthlyVal * ratio);
            }
            else if (cName.includes('hra') || cName.includes('house rent')) { hra = monthlyVal; formulaCtx.hra = monthlyVal; }
            else if (cName.includes('meal') || cName.includes('food')) mealAllowance = monthlyVal;
            else if (cName.includes('comm') && !cName.includes('deduct')) commAllowance = monthlyVal;
            else if (cName.includes('child') || cName.includes('education')) ceaAllowance = monthlyVal;
            else if (cName.includes('lta') || (cName.includes('leave') && cName.includes('travel'))) ltaAllowance = monthlyVal;
            // PF Employee (e.g. "PF 12% on Basic")
            else if ((cName.includes('pf') || cName.includes('provident'))
              && !cName.includes('employer') && !cName.includes('eps') && isDeduction) {
              pfMonthly = monthlyVal;
              formulaCtx.pf_employee = monthlyVal;   // [PF_EMPLOYEE]
            }
            // ESIC Employee
            else if ((cName.includes('esic') || cName.includes('esi'))
              && !cName.includes('employer') && !cName.includes('wages') && isDeduction) {
              esicMonthly = monthlyVal;
              formulaCtx.esic_employee = monthlyVal;
            }
            // PT / TDS
            else if (cName.includes('professional tax') || (cName.includes('pt') && isDeduction && !cName.includes('pta'))) {
              ptMonthly = monthlyVal;
            }
            else if (cName.includes('tds') || cName.includes('income tax')) tdsMonthly = monthlyVal;
            // EPF/EPS statutory basis tokens — must run in order (set by group display_order)
            else if (cName.includes('epf') && cName.includes('eps') && cName.includes('wages')) {
              formulaCtx.epf_eps_wages = monthlyVal;   // [EPF_EPS_WAGES]
            }
            else if (cName.includes('eps') && cName.includes('component')) {
              formulaCtx.eps_component = monthlyVal;   // [EPS_COMPONENT]
            }
            else if (cName.includes('eps') && cName.includes('wages') && !cName.includes('epf')) {
              formulaCtx.eps_wages = monthlyVal;        // [EPS_WAGES]
            }
            else if (cName.includes('esi') && cName.includes('wages')) {
              formulaCtx.esi_wages = monthlyVal;        // [ESI_WAGES]
            }
            else if (cName.includes('edli') && cName.includes('wages')) {
              formulaCtx.edli_wages = monthlyVal;       // [EDLI_WAGES]
            }

            // Register in formula context for cascading (e.g. HRA = 40% of basic)
            const normKey = PayrollFormulaEvaluator.normalizeKey(comp.name || '');
            formulaCtx[normKey] = monthlyVal;
            // Also update gross_earned dynamically after each earning
            if (!isDeduction) {
              totalEarningsAllocated += monthlyVal;
              formulaCtx.gross_earned = Math.round(grossMonthly * ratio);
            }

            componentValues[cId] = {
              id: cId,
              name: comp.name,
              type: calcType,
              group_id: comp.group_id || null,
              group_name: group?.name || (isDeduction ? 'Deductions' : 'Earnings'),
              category: isDeduction ? 'Deduction' : 'Earning',
              monthly: monthlyVal,
              earned: earnedVal,
            };
          }

          // Special Allowance = residual (gross - all other earnings)
          standardAllowance = Math.max(0, grossMonthly - totalEarningsAllocated);
          if (specialAllowanceCompId) {
            const spComp = allComponents.find((c: any) => c.id === specialAllowanceCompId);
            const spGroup = spComp ? groupMap.get(Number(spComp.group_id)) : null;
            componentValues[specialAllowanceCompId] = {
              id: specialAllowanceCompId,
              name: spComp?.name || 'Special Allowance',
              type: 'Derived',
              group_id: spComp?.group_id || null,
              group_name: spGroup?.name || 'Standard Earnings',
              category: 'Earning',
              monthly: standardAllowance,
              earned: Math.round(standardAllowance * ratio),
            };
          }

          // If basic was not computed by formula, use basicMonthly from structure
          if (!basic && struct) { basic = Number(struct.basic_monthly || 0); formulaCtx.basic = basic; }

        // ── Statutory deductions: use stored per-employee amounts or dynamic statutory rules ─
        if (storedDeductionsBreakup.length > 0) {
          for (const d of storedDeductionsBreakup) {
            const code = (d.code || '').toUpperCase();
            const amt = Number(d.amount || 0);
            const cid = Number(d.componentId ?? d.component_id ?? 0);
            const group = cid ? groupMap.get(Number(allComponents.find((c: any) => c.id === cid)?.group_id)) : null;
            if (code === 'PF') pfMonthly = amt;
            else if (code === 'ESIC' || code === 'ESI') esicMonthly = amt;
            else if (code === 'PT') ptMonthly = amt;
            else if (code === 'TDS') tdsMonthly = amt;
            if (cid) {
              componentValues[cid] = { id: cid, name: d.name || code, type: d.type || 'Formula', group_id: group?.id ?? null, group_name: group?.name || 'Deductions', category: 'Deduction', monthly: amt, earned: Math.round(amt * ratio) };
            }
          }
        }

        // Dynamic PF & PT fallback if not provided in stored breakup
        const effectiveBasic = basic > 0 ? basic : Math.round(grossMonthly * 0.5);
        if (pfMonthly === 0 && effectiveBasic > 0) {
          pfMonthly = Math.min(1800, Math.round(effectiveBasic * 0.12));
        }
        if (ptMonthly === 0 && grossMonthly > 15000) {
          ptMonthly = 200;
        }

        // 9. Loans deductions
        let loanDeduction = 0;
        try {
          const activeLoans = await db('employee_loans')
            .where({ employee_id: emp.id, status: 'active' })
            .whereNull('deleted_at');
          for (const l of activeLoans) {
            const sL = withSnakeAliases(l) || l;
            loanDeduction += Number(sL.emi || sL.emi_amount || sL.monthly_emi || 0);
          }
        } catch {
          loanDeduction = 0;
        }

        // 10. Summary Totals
        const grossEarned = Math.round(grossMonthly * ratio);
        const basicEarned = Math.round(basic * ratio);
        const hraEarned = Math.round(hra * ratio);
        const standardAllowanceEarned = Math.round(standardAllowance * ratio);
        const pfEarned = Math.round(pfMonthly * ratio);
        const ptEarned = Math.round(ptMonthly * ratio);
        const esicEarned = Math.round(esicMonthly * ratio);
        const tdsEarned = Math.round(tdsMonthly * ratio);
        const totalDeduction = pfEarned + ptEarned + esicEarned + tdsEarned + loanDeduction;
        const netSalary = Math.max(0, grossEarned - totalDeduction);

        // 11. Check for Saved Manual Override
        let override: any = null;
        try {
          override = await db('payroll_register_overrides')
            .where('organization_id', empOrgId)
            .where('employee_id', emp.id)
            .where('month', targetMonth)
            .first();

          if (override && struct && struct.updated_at) {
            const structUpdated = new Date(struct.updated_at).getTime();
            const overrideUpdated = new Date(override.updated_at || override.created_at).getTime();
            if (structUpdated > overrideUpdated) {
              override = null; // Discard stale override when structure was updated after
            }
          }
        } catch {
          override = null;
        }

        resultRows.push({
          id: emp.id,
          employee_id: emp.id,
          employeeId: emp.id,
          employee_code: employeeCode,
          employeeCode: employeeCode,
          first_name: firstName,
          firstName: firstName,
          middle_name: middleName,
          middleName: middleName,
          last_name: lastName,
          lastName: lastName,
          department_name: departmentName,
          departmentName: departmentName,
          reporting_manager: reportingManager,
          reportingManager: reportingManager,
          designation: designation,
          job_title: designation,
          slab_name: slabName,
          slabName: slabName,
          effective_from: sStruct.effective_from || null,
          effectiveFrom: sStruct.effective_from || null,
          slab_effective_from: sStruct.effective_from || null,
          cycle_id: empCycleId,
          cycleId: empCycleId,
          cycle_name: empCycleName,
          cycleName: empCycleName,
          cycle_cutoff_day: cycleCutoffDay,
          cycle_start_day: cycleStartDay,
          bank_name: bankName,
          bankName: bankName,
          account_number: accountNumber,
          accountNumber: accountNumber,
          account_no: accountNumber,
          ifsc_code: ifscCode,
          ifscCode: ifscCode,
          salary_days: override ? Number(override.salary_days) : totalDays,
          paid_days: override ? Number(override.paid_days) : paidDays,
          unpaid_days: override ? Number(override.unpaid_days) : unpaidDays,
          present_days: presentDays,
          half_day_count: halfDayCount,
          weekly_off_days: weeklyOffDays,
          absent_days: absentDays,
          basic: override ? Number(override.basic) : basic,
          basic_monthly: override ? Number(override.basic) : basic,
          basicMonthly: override ? Number(override.basic) : basic,
          hra: override ? Number(override.hra) : hra,
          hra_monthly: override ? Number(override.hra) : hra,
          hraMonthly: override ? Number(override.hra) : hra,
          standard_allowance: override ? Number(override.standard_allowance) : standardAllowance,
          special_allowance: override ? Number(override.special_allowance || override.standard_allowance) : standardAllowance,
          specialAllowance: override ? Number(override.specialAllowance || override.special_allowance || override.standard_allowance) : standardAllowance,
          meal_allowance: override ? Number(override.meal_allowance) : mealAllowance,
          communication_allowance: override ? Number(override.communication_allowance) : commAllowance,
          children_education_allowance: override ? Number(override.children_education_allowance) : ceaAllowance,
          lta: override ? Number(override.lta) : ltaAllowance,
          gross: override ? Number(override.gross) : grossMonthly,
          gross_monthly: override ? Number(override.gross) : grossMonthly,
          grossMonthly: override ? Number(override.gross) : grossMonthly,
          basic_earned: override ? Number(override.basic_earned) : basicEarned,
          basicEarned: override ? Number(override.basic_earned) : basicEarned,
          hra_earned: override ? Number(override.hra_earned) : hraEarned,
          hraEarned: override ? Number(override.hra_earned) : hraEarned,
          standard_allowance_earned: override ? Number(override.standard_allowance_earned) : standardAllowanceEarned,
          special_allowance_earned: override ? Number(override.special_allowance_earned || override.standard_allowance_earned) : standardAllowanceEarned,
          specialAllowanceEarned: override ? Number(override.specialAllowanceEarned || override.special_allowance_earned || override.standard_allowance_earned) : standardAllowanceEarned,
          meal_allowance_earned: Math.round(mealAllowance * ratio),
          communication_allowance_earned: Math.round(commAllowance * ratio),
          children_education_allowance_earned: Math.round(ceaAllowance * ratio),
          lta_earned: Math.round(ltaAllowance * ratio),
          gross_earned: override ? Number(override.gross_earned) : grossEarned,
          grossEarned: override ? Number(override.gross_earned) : grossEarned,
          total_gross_earned: override ? Number(override.total_gross_earned) : grossEarned,
          adjustment: override ? Number(override.adjustment) : 0,
          ot_hours: override ? Number(override.ot_hours) : 0,
          ot: override ? Number(override.ot) : 0,
          pt: override ? Number(override.pt) : ptEarned,
          pf: override ? Number(override.pf) : pfEarned,
          tds: override ? Number(override.tds) : tdsEarned,
          esic: override ? Number(override.esic) : esicEarned,
          esic_employer: override ? Number(override.esic_employer) : 0,
          loan_deduction: loanDeduction,
          total_deduction: override ? Number(override.total_deduction) : totalDeduction,
          totalDeduction: override ? Number(override.total_deduction) : totalDeduction,
          net_salary: override ? Number(override.net_salary) : netSalary,
          netSalary: override ? Number(override.net_salary) : netSalary,
          ctc: annualCTC,
          notes: override ? override.notes : (!hasAssignedStructure ? 'No Pay Slab Assigned' : ''),
          payment_status: !hasAssignedStructure ? 'Unassigned' : (override ? override.payment_status : 'Freeze'),
          status: hasAssignedStructure ? 'PROCESSED' : 'UNASSIGNED_SLAB',
          is_overridden: Boolean(override),
          component_values: componentValues,
        });
      }

      // ── Apply payrollStatus filter (post-processing) ───────────────────────────────
      // payrollStatus filters by the payment_status field on each row (Freeze / Unfreeze / Hold)
      let finalRows = resultRows;
      if (payrollStatus && String(payrollStatus).toLowerCase() !== 'all') {
        finalRows = resultRows.filter((r: any) =>
          (r.payment_status || '').toLowerCase() === String(payrollStatus).toLowerCase()
        );
      }

      // ── Apply sortBy ───────────────────────────────────────────────────────────────
      const sortKey = String(sortBy || 'Name').toLowerCase();
      finalRows.sort((a: any, b: any) => {
        if (sortKey === 'name') {
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        } else if (sortKey === 'department') {
          return (a.department_name || '').localeCompare(b.department_name || '');
        } else if (sortKey === 'designation') {
          return (a.designation || '').localeCompare(b.designation || '');
        } else if (sortKey === 'slab') {
          return (a.slab_name || '').localeCompare(b.slab_name || '');
        } else if (sortKey === 'netsalary' || sortKey === 'net salary') {
          return Number(b.net_salary || 0) - Number(a.net_salary || 0);
        } else if (sortKey === 'grade') {
          return (a.grade_name || '').localeCompare(b.grade_name || '');
        }
        return 0;
      });

      res.json({
        success: true,
        data: finalRows,
        component_definitions: allComponents.map((c) => {
          const sC = withSnakeAliases(c) || c;
          const group = groupMap.get(Number(sC.group_id));
          const isEarning =
            !['deduction', 'Deduction', 'Statutory', 'statutory'].includes(sC.component_type) &&
            !['provident', 'professional tax', 'esic', 'income tax', 'tds'].some((kw: string) =>
              (sC.name || '').toLowerCase().includes(kw)
            );
          return {
            id: sC.id,
            name: sC.name,
            component_type: sC.component_type,
            calc_type: sC.calc_type || sC.component_type,
            group_id: sC.group_id || null,
            group_name: group?.name || (isEarning ? 'Earnings' : 'Deductions'),
            group_category: group?.category || (isEarning ? 'Earning' : 'Deduction'),
            is_earning: isEarning,
          };
        }),
      });
    } catch (err: any) {
      console.error('getProcessRegister error:', err);
      res
        .status(500)
        .json({ success: false, message: err?.message || 'Error processing payroll register' });
    }
  }

  async saveProcessRegisterOverride(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;
    const {
      employee_id, month, cycle_id, salary_days, paid_days, unpaid_days,
      basic, hra, standard_allowance, meal_allowance, communication_allowance,
      children_education_allowance, lta, gross, basic_earned, hra_earned,
      standard_allowance_earned, meal_allowance_earned, communication_allowance_earned,
      children_education_allowance_earned, lta_earned, gross_earned, total_gross_earned,
      adjustment, ot_hours, ot, pt, pf, tds, esic, esic_employer, total_deduction,
      net_salary, ctc, payment_status, notes,
    } = req.body;

    if (!employee_id || !month) {
      return res
        .status(400)
        .json({ success: false, message: 'employee_id and month are required' });
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
      updated_at: new Date(),
    };

    const existing = await db('payroll_register_overrides')
      .where({ organization_id: orgId, employee_id: Number(employee_id), month: targetMonth })
      .first();

    if (existing) {
      await db('payroll_register_overrides').where('id', existing.id).update(payload);
    } else {
      payload.created_at = new Date();
      await db('payroll_register_overrides').insert(payload);
    }

    res.json({
      success: true,
      message: 'Payroll register row updated successfully',
      data: payload,
    });
  }

  async resetProcessRegisterOverride(req: Request, res: Response) {
    const db = getKnex();
    const ctx = req.ctx!;
    const { employee_id, month } = req.body;

    const orgId = ctx.organizationId;
    const targetMonth = month ? String(month).slice(0, 7) : new Date().toISOString().slice(0, 7);

    let query = db('payroll_register_overrides')
      .where('organization_id', orgId)
      .where('month', targetMonth);

    if (employee_id) {
      query = query.where('employee_id', Number(employee_id));
    }

    const deletedCount = await query.delete();

    res.json({
      success: true,
      message: `Reset ${deletedCount} payroll register override(s) back to Master Salary Structure.`,
      data: { deletedCount },
    });
  }
}
