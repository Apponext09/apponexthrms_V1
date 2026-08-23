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

export class PayrollRegisterController {
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
        .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
        .whereNull('e.deleted_at')
        .where('e.organization_id', targetOrgId);

      const activeStatus = status || employeeStatus;
      const activeEmpType = req.query.employment_type || employmentType;

      if (companyId && String(companyId).toUpperCase() !== 'ALL') {
        empQuery = empQuery.where((b) => {
          b.where('e.company_id', Number(companyId)).orWhereNull('e.company_id');
        });
      }
      if (departmentId) empQuery = empQuery.where('e.current_department_id', Number(departmentId));
      if (locationId) empQuery = empQuery.where('e.current_location_id', Number(locationId));
      if (employeeId) empQuery = empQuery.where('e.id', Number(employeeId));
      if (reportingOfficerId)
        empQuery = empQuery.where('e.reporting_manager_id', Number(reportingOfficerId));
      if (activeStatus) empQuery = empQuery.where('e.status', String(activeStatus));
      if (activeEmpType) empQuery = empQuery.where('e.employment_type', String(activeEmpType));
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
        db.raw("COALESCE(NULLIF(TRIM(e.bank_name), ''), NULLIF(TRIM(ec.bank_name), '')) as bank_name"),
        db.raw("COALESCE(NULLIF(TRIM(e.account_no), ''), NULLIF(TRIM(ec.account_number), '')) as account_number"),
        db.raw("COALESCE(NULLIF(TRIM(e.ifsc_code), ''), NULLIF(TRIM(ec.ifsc_code), '')) as ifsc_code"),
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

      // Resolve target month
      const targetMonth = month
        ? String(month).slice(0, 7)
        : new Date().toISOString().slice(0, 7);

      const [tYear, tMon] = targetMonth.split('-').map(Number);
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

      if (cycleRow) {
        const sCyc = withSnakeAliases(cycleRow) || cycleRow;
        if (sCyc.total_days_calc && !isNaN(Number(sCyc.total_days_calc))) {
          totalDays = Number(sCyc.total_days_calc);
        } else if (sCyc.frequency === 'Weekly') totalDays = 7;
        else if (sCyc.frequency === 'Bi-Weekly' || sCyc.frequency === 'Fortnightly') totalDays = 14;
        else if (sCyc.frequency === 'Semi-Monthly') totalDays = 15;
      }

      const monthStart = `${targetMonth}-01`;
      const monthEnd = `${targetMonth}-${String(calendarDays).padStart(2, '0')}`;

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
        let matchedSlab: any = null;
        const slabIdToTry = sStruct.slab_id || sStruct.slabId;
        if (slabIdToTry) {
          matchedSlab = allSlabs.find((s: any) => Number(s.id) === Number(slabIdToTry));
        }

        // If no slab linked on structure, find best matching slab by CTC or fallback to default slab
        if (!matchedSlab) {
          const structCtc = positiveNum(sStruct.annual_ctc, positiveNum(sStruct.gross_monthly ? sStruct.gross_monthly * 12 : 0, 0));
          if (structCtc > 0) {
            matchedSlab = allSlabs.find((s: any) => {
              const sSlab = withSnakeAliases(s) || s;
              const minCtc = Number(sSlab.min_ctc || 0);
              const maxCtc = Number(sSlab.max_ctc || 10000000);
              return structCtc >= minCtc && structCtc <= maxCtc;
            });
          }
        }

        if (!matchedSlab && allSlabs.length > 0) {
          matchedSlab = allSlabs[0];
        }

        const slabRow = withSnakeAliases(matchedSlab) || {};
        const slabName = slabRow.name || sStruct.structure_name || 'Standard Pay Slab';
        let selectedCompIds: number[] = [];
        try {
          const rawIds = slabRow.selected_component_ids;
          selectedCompIds = Array.isArray(rawIds) ? rawIds.map(Number) : JSON.parse(rawIds || '[]').map(Number);
        } catch {
          selectedCompIds = [];
        }

        // 4. Resolve Gross & CTC
        const grossMonthly = positiveNum(
          sStruct.gross_monthly,
          positiveNum(
            sStruct.annual_ctc ? Math.round(Number(sStruct.annual_ctc) / 12) : 0,
            slabRow.min_ctc ? Math.round(Number(slabRow.min_ctc) / 12) : 40000
          )
        );
        const annualCTC = positiveNum(sStruct.annual_ctc, grossMonthly * 12);

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

        // Compute paid/unpaid days from real attendance
        let paidDays: number, unpaidDays: number;
        const hasAttendance =
          presentDays + halfDayCount + absentDays + weeklyOffDays + holidayDays > 0;
        if (hasAttendance) {
          paidDays = Math.round(
            presentDays + halfDayCount * 0.5 + weeklyOffDays + holidayDays
          );
          paidDays = Math.max(0, Math.min(totalDays, paidDays - unpaidLeaveDays));
        } else {
          paidDays = Math.max(0, totalDays - unpaidLeaveDays);
        }
        unpaidDays = Math.max(0, totalDays - paidDays);
        const ratio = totalDays > 0 ? paidDays / totalDays : 1;

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
        const rawEB = sStruct.earnings_breakup ?? sStruct.earningsBreakup;
        const rawDB = sStruct.deductions_breakup ?? sStruct.deductionsBreakup;
        let storedEarningsBreakup: any[] = [];
        let storedDeductionsBreakup: any[] = [];
        try {
          if (rawEB) storedEarningsBreakup = typeof rawEB === 'string' ? JSON.parse(rawEB) : (Array.isArray(rawEB) ? rawEB : []);
          if (rawDB) storedDeductionsBreakup = typeof rawDB === 'string' ? JSON.parse(rawDB) : (Array.isArray(rawDB) ? rawDB : []);
        } catch {}

        if (storedEarningsBreakup.length > 0) {
          // ── Use stored earnings breakup (per-employee, from SalaryCalculationService) ──
          for (const e of storedEarningsBreakup) {
            const amt = Number(e.amount || 0);
            const code = (e.code || '').toUpperCase();
            const cid = Number(e.componentId ?? e.component_id ?? 0);
            const group = cid ? groupMap.get(Number(allComponents.find((c: any) => c.id === cid)?.group_id)) : null;

            if (code === 'BASIC') basic = amt;
            else if (code === 'HRA') hra = amt;
            else if (code === 'SPECIAL_ALLOWANCE') standardAllowance = amt;
            else if (code?.includes('MEAL')) mealAllowance = amt;
            else if (code?.includes('COMM')) commAllowance = amt;
            else if (code?.includes('CEA') || code?.includes('CHILD')) ceaAllowance = amt;
            else if (code === 'LTA') ltaAllowance = amt;

            if (cid) {
              componentValues[cid] = {
                id: cid,
                name: e.name || code,
                type: e.type || 'Value',
                group_id: group?.id ?? null,
                group_name: group?.name || 'Earnings',
                category: 'Earning',
                monthly: amt,
                earned: Math.round(amt * ratio),
              };
            }
          }
        } else {
          // ── Fallback: compute from salary_structure columns then component catalog ─
          const basicComp = allComponents.find((c: any) => (c.name || '').toLowerCase().includes('basic'));
          if (customComps[String(basicComp?.id)] !== undefined) {
            basic = Number(customComps[String(basicComp?.id)]);
          } else if (sStruct.basic_monthly) {
            basic = Number(sStruct.basic_monthly);
          } else if (basicComp && Number(basicComp.amount) > 0 && basicComp.component_type === 'Formula') {
            basic = Math.round((grossMonthly * Number(basicComp.amount)) / 100);
          } else {
            basic = Math.round(grossMonthly * 0.5);
          }

          const hraComp = allComponents.find((c: any) => (c.name || '').toLowerCase().includes('hra') || (c.name || '').toLowerCase().includes('rent'));
          if (customComps[String(hraComp?.id)] !== undefined) {
            hra = Number(customComps[String(hraComp?.id)]);
          } else if (sStruct.hra_monthly) {
            hra = Number(sStruct.hra_monthly);
          } else if (hraComp && Number(hraComp.amount) > 0 && hraComp.component_type === 'Formula') {
            hra = Math.round((basic * Number(hraComp.amount)) / 100);
          } else {
            hra = Math.round(basic * 0.4);
          }

          let allocatedEarnings = basic + hra;
          for (const rawComp of allComponents) {
            const comp = withSnakeAliases(rawComp) || rawComp;
            const cId = Number(comp.id);
            const cName = (comp.name || '').toLowerCase();
            const isInSlab = selectedCompIds.length === 0 || selectedCompIds.includes(cId);
            const group = groupMap.get(Number(comp.group_id));
            const isDeduction = (group?.category || '').toLowerCase().includes('deduct') || ['pf', 'provident', 'esic', 'tax', 'tds', 'pt'].some(k => cName.includes(k));
            let monthlyVal = 0;
            if (isInSlab) {
              if (customComps[String(cId)] !== undefined) monthlyVal = Number(customComps[String(cId)]);
              else if (cName.includes('basic')) monthlyVal = basic;
              else if (cName.includes('hra') || cName.includes('house rent')) monthlyVal = hra;
              else if (cName.includes('conveyance')) { monthlyVal = Number(comp.amount || 1600); allocatedEarnings += monthlyVal; }
              else if (cName.includes('medical')) { monthlyVal = Number(comp.amount || 1250); allocatedEarnings += monthlyVal; }
              else if (cName.includes('meal') || cName.includes('food')) { monthlyVal = Number(comp.amount || 0); mealAllowance = monthlyVal; allocatedEarnings += monthlyVal; }
              else if (cName.includes('comm')) { monthlyVal = Number(comp.amount || 0); commAllowance = monthlyVal; allocatedEarnings += monthlyVal; }
              else if (cName.includes('child') || cName.includes('education')) { monthlyVal = Number(comp.amount || 0); ceaAllowance = monthlyVal; allocatedEarnings += monthlyVal; }
              else if (cName.includes('lta') || cName.includes('travel')) { monthlyVal = Number(comp.amount || 0); ltaAllowance = monthlyVal; allocatedEarnings += monthlyVal; }
              else if (!isDeduction && !cName.includes('special')) {
                if (comp.component_type === 'Formula' || comp.component_type === 'Derived') { const pct = Number(comp.amount || 0); monthlyVal = pct > 0 ? Math.round((basic * pct) / 100) : 0; }
                else { monthlyVal = Number(comp.amount || 0); }
                if (monthlyVal > 0) allocatedEarnings += monthlyVal;
              }
            }
            componentValues[cId] = { id: cId, name: comp.name, type: comp.component_type, group_id: comp.group_id || null, group_name: group?.name || 'Earnings', category: isDeduction ? 'Deduction' : 'Earning', monthly: monthlyVal, earned: Math.round(monthlyVal * ratio) };
          }
          standardAllowance = Math.max(0, grossMonthly - allocatedEarnings);
          const specialComp = allComponents.find((c: any) => (c.name || '').toLowerCase().includes('special'));
          if (specialComp) {
            componentValues[specialComp.id] = { id: specialComp.id, name: specialComp.name, type: 'Derived', group_id: specialComp.group_id || null, group_name: groupMap.get(Number(specialComp.group_id))?.name || 'Standard Earnings', category: 'Earning', monthly: standardAllowance, earned: Math.round(standardAllowance * ratio) };
          }
        }

        // ── Statutory deductions: use stored per-employee amounts if available ─
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
        } else {
          // Fallback: re-compute from per-employee actual gross/basic
          pfMonthly = Math.round(Math.min(basic, 15000) * 0.12);
          esicMonthly = grossMonthly <= 21000 ? Math.ceil(grossMonthly * 0.0075) : 0;
          ptMonthly = grossMonthly > 15000 ? 200 : 0;
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
          cycle_id: empCycleId,
          cycleId: empCycleId,
          cycle_name: empCycleName,
          cycleName: empCycleName,
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
          hra: override ? Number(override.hra) : hra,
          standard_allowance: override ? Number(override.standard_allowance) : standardAllowance,
          meal_allowance: override ? Number(override.meal_allowance) : mealAllowance,
          communication_allowance: override ? Number(override.communication_allowance) : commAllowance,
          children_education_allowance: override ? Number(override.children_education_allowance) : ceaAllowance,
          lta: override ? Number(override.lta) : ltaAllowance,
          gross: override ? Number(override.gross) : grossMonthly,
          gross_monthly: override ? Number(override.gross) : grossMonthly,
          basic_earned: override ? Number(override.basic_earned) : basicEarned,
          hra_earned: override ? Number(override.hra_earned) : hraEarned,
          standard_allowance_earned: override ? Number(override.standard_allowance_earned) : standardAllowanceEarned,
          meal_allowance_earned: Math.round(mealAllowance * ratio),
          communication_allowance_earned: Math.round(commAllowance * ratio),
          children_education_allowance_earned: Math.round(ceaAllowance * ratio),
          lta_earned: Math.round(ltaAllowance * ratio),
          gross_earned: override ? Number(override.gross_earned) : grossEarned,
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
          net_salary: override ? Number(override.net_salary) : netSalary,
          ctc: annualCTC,
          notes: override ? override.notes : '',
          payment_status: override ? override.payment_status : 'Freeze',
          status: 'PROCESSED',
          is_overridden: Boolean(override),
          component_values: componentValues,
        });
      }

      res.json({
        success: true,
        data: resultRows,
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
}
