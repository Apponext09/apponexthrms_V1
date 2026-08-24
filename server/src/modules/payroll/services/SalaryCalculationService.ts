/**
 * SalaryCalculationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic salary structure calculation engine powered by PayrollFormulaEvaluator.
 * Handles dynamic component names, CTC variables, operators, math functions,
 * conditions, and boundaries.
 */

import { getKnex } from '../../../db/knex';
import { withSnakeAliases, positiveNum } from '../utils/payroll.utils';
import { PayrollFormulaEvaluator, FormulaContext } from '../utils/PayrollFormulaEvaluator';

export class SalaryCalculationService {
  /**
   * UNIVERSAL PAYROLL COMPONENT CALCULATION ENGINE
   * Evaluates individual component against context, conditions, and boundaries.
   */
  evaluateComponent(params: {
    type: 'Value' | 'Derived' | 'Module' | string;
    fixedAmount?: number;
    formula?: string;
    moduleSource?: string;
    parentValues?: { basic: number; gross: number; earnedBasic?: number; earnedGross?: number };
    context?: FormulaContext;
    lopFactor?: number;
    basedOnAttendance?: boolean;
    minBoundary?: number;
    maxBoundary?: number;
    boundaryType?: string;
    conditionOn?: string;
    conditionOperator?: string;
    conditionValue1?: string | number;
    conditionValue2?: string | number;
    loanEmiAmount?: number;
  }): number {
    const {
      type = 'Value',
      fixedAmount = 0,
      formula = '',
      parentValues = { basic: 0, gross: 0, earnedBasic: 0, earnedGross: 0 },
      context = {},
      lopFactor = 1,
      basedOnAttendance = true,
      minBoundary,
      maxBoundary,
      boundaryType,
      conditionOn,
      conditionOperator,
      conditionValue1,
      conditionValue2,
      loanEmiAmount = 0,
    } = params;

    // Merge parentValues into evaluation context
    const fullContext: FormulaContext = {
      gross: parentValues.gross,
      basic: parentValues.basic,
      earned_basic: parentValues.earnedBasic ?? parentValues.basic,
      earned_gross: parentValues.earnedGross ?? parentValues.gross,
      attendance_factor: lopFactor,
      ...context,
    };

    // 1. Check Condition
    if (conditionOn && conditionOperator) {
      const isEligible = PayrollFormulaEvaluator.checkCondition(
        conditionOn,
        conditionOperator,
        conditionValue1,
        conditionValue2,
        fullContext
      );
      if (!isEligible) return 0;
    }

    // 2. Calculate Base Amount
    let computedValue = 0;

    if (type === 'Value') {
      computedValue = Number(fixedAmount || 0);
    } else if (type === 'Derived' || type === 'Formula') {
      if (formula && formula.trim()) {
        computedValue = PayrollFormulaEvaluator.evaluate(formula, fullContext);
      } else {
        computedValue = Number(fixedAmount || 0);
      }
    } else if (type === 'Module') {
      if (params.moduleSource === 'Loan EMI' || params.moduleSource === 'Loan' || formula.toLowerCase().includes('loan')) {
        computedValue = loanEmiAmount;
      } else {
        computedValue = Number(fixedAmount || 0);
      }
    }

    // 3. Attendance LOP Factor for attendance-linked value components
    if (basedOnAttendance && type === 'Value' && lopFactor < 1) {
      computedValue = Math.round(computedValue * lopFactor);
    }

    // 4. Apply Min/Max Boundaries
    computedValue = PayrollFormulaEvaluator.applyBoundaries(
      computedValue,
      boundaryType || (minBoundary ? 'Min' : maxBoundary ? 'Max' : 'Choose'),
      minBoundary,
      maxBoundary
    );

    return Math.max(0, computedValue);
  }

  /**
   * Static convenience helper for calculateDynamicSalaryStructure
   */
  static async calculateSalaryBreakup(
    ctx: { organizationId?: number; userId?: number; companyId?: number },
    params: {
      ctc?: number;
      grossMonthly?: number;
      slabId?: number | null;
      cycleId?: number | null;
      employeeId?: number | null;
      effectiveFrom?: string;
    }
  ) {
    const service = new SalaryCalculationService();
    const firstOrg = await getKnex()('organizations').first().catch(() => null);
    const orgId = Number(ctx?.organizationId || firstOrg?.id || 1);
    return service.calculateDynamicSalaryStructure({
      orgId,
      companyId: ctx?.companyId,
      ...params
    });
  }

  /**
   * Dynamically calculate employee salary structure based on Actual CTC,
   * user-defined custom components, operators, formulas, and conditions.
   */
  async calculateDynamicSalaryStructure(params: {
    orgId: number;
    companyId?: number | null;
    employeeId?: number | null;
    ctc?: number;
    grossMonthly?: number;
    slabId?: number | null;
    cycleId?: number | null;
    effectiveFrom?: string;
  }) {
    const db = getKnex();
    const annualCtc = Number(params.ctc || (params.grossMonthly ? params.grossMonthly * 12 : 0));
    const grossMonthly = Number(params.grossMonthly || (params.ctc ? params.ctc / 12 : 0));

    // 1. Resolve Slab
    let rawSlab: any = null;
    if (params.slabId) {
      rawSlab = await db('payroll_slabs').where('id', params.slabId).first().catch(() => null);
    }
    if (!rawSlab) {
      rawSlab = await db('payroll_slabs')
        .where('organization_id', params.orgId)
        .andWhere(function () {
          if (params.companyId) {
            this.where('company_id', params.companyId).orWhereNull('company_id');
          }
        })
        .where('min_ctc', '<=', annualCtc)
        .where('max_ctc', '>=', annualCtc)
        .orderBy('id', 'desc')
        .first()
        .catch(() => null);
    }
    if (!rawSlab) {
      rawSlab = await db('payroll_slabs')
        .where('organization_id', params.orgId)
        .first()
        .catch(() => null);
    }

    const slab = withSnakeAliases(rawSlab) || {};

    // 2. Resolve Cycle
    let cycleId = params.cycleId || slab?.cycle_id || null;
    if (!cycleId && params.companyId) {
      const compCycle = await db('payroll_cycles')
        .where('company_id', params.companyId)
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
      if (compCycle) cycleId = compCycle.id;
    }
    if (!cycleId) {
      const defaultCycle = await db('payroll_cycles')
        .where('organization_id', params.orgId)
        .whereNull('deleted_at')
        .first()
        .catch(() => null);
      if (defaultCycle) cycleId = defaultCycle.id;
    }

    // 3. Resolve Selected Components
    let selectedComponentIds: string[] = [];
    if (slab?.selected_component_ids) {
      try {
        const raw =
          typeof slab.selected_component_ids === 'string'
            ? JSON.parse(slab.selected_component_ids)
            : slab.selected_component_ids;
        if (Array.isArray(raw)) selectedComponentIds = raw.map(String);
      } catch {}
    }

    let componentsQuery = db('payroll_components as c')
      .leftJoin('payroll_component_groups as g', 'c.group_id', 'g.id')
      .select('c.*', 'g.category as group_category', 'g.name as group_name')
      .where('c.organization_id', params.orgId);

    if (selectedComponentIds.length > 0) {
      componentsQuery = componentsQuery.whereIn('c.id', selectedComponentIds);
    }
    const rawComponents = await componentsQuery.catch(() => []);
    const components = rawComponents.map((c: any) => withSnakeAliases(c) || c);

    // 3b. If employeeId is given, fetch employee attributes to evaluate demographic filters
    let empRecord: any = null;
    if (params.employeeId) {
      empRecord = await db('employees').where('id', params.employeeId).first().catch(() => null);
    }

    const checkDemographicEligibility = (c: any): boolean => {
      if (!empRecord) return true;

      // Gender filter ('All', 'Male', 'Female')
      const genderFilter = (c.gender_filter || c.genderFilter || 'All').toString().toLowerCase();
      if (genderFilter !== 'all' && empRecord.gender) {
        if (empRecord.gender.toString().toLowerCase() !== genderFilter) return false;
      }

      // Department filter
      if (c.departments) {
        try {
          const depts = typeof c.departments === 'string' ? JSON.parse(c.departments) : c.departments;
          if (Array.isArray(depts) && depts.length > 0 && empRecord.department_id) {
            if (!depts.map(String).includes(String(empRecord.department_id))) return false;
          }
        } catch {}
      }

      // Grades / Designations filter
      if (c.grades) {
        try {
          const grades = typeof c.grades === 'string' ? JSON.parse(c.grades) : c.grades;
          if (Array.isArray(grades) && grades.length > 0 && (empRecord.grade_id || empRecord.designation_id)) {
            const matchesGrade = empRecord.grade_id && grades.map(String).includes(String(empRecord.grade_id));
            const matchesDesig = empRecord.designation_id && grades.map(String).includes(String(empRecord.designation_id));
            if (!matchesGrade && !matchesDesig) return false;
          }
        } catch {}
      }

      // Locations filter
      if (c.locations) {
        try {
          const locs = typeof c.locations === 'string' ? JSON.parse(c.locations) : c.locations;
          if (Array.isArray(locs) && locs.length > 0 && (empRecord.location_id || empRecord.branch_id)) {
            const matchesLoc = empRecord.location_id && locs.map(String).includes(String(empRecord.location_id));
            const matchesBranch = empRecord.branch_id && locs.map(String).includes(String(empRecord.branch_id));
            if (!matchesLoc && !matchesBranch) return false;
          }
        } catch {}
      }

      // Specific Employees filter
      if (c.employees) {
        try {
          const emps = typeof c.employees === 'string' ? JSON.parse(c.employees) : c.employees;
          if (Array.isArray(emps) && emps.length > 0) {
            if (!emps.map(String).includes(String(empRecord.id))) return false;
          }
        } catch {}
      }

      // Month filter (e.g. [10, 11] for Diwali bonus)
      if (c.months && (params as any).month) {
        try {
          const mArr = typeof c.months === 'string' ? JSON.parse(c.months) : c.months;
          if (Array.isArray(mArr) && mArr.length > 0) {
            const runMonthNum = new Date((params as any).month).getMonth() + 1; // 1-12
            if (!mArr.map(Number).includes(runMonthNum)) return false;
          }
        } catch {}
      }

      return true;
    };

    // 4. Build Evaluation Context
    const evalContext: FormulaContext = {
      ctc: annualCtc,
      annual_ctc: annualCtc,
      monthly_ctc: grossMonthly,
      gross: grossMonthly,
      gross_salary: grossMonthly,
      present_days: 30,
      total_days: 30,
      paid_days: 30,
      attendance_factor: 1,
    };

    // Separate Earnings and Deductions
    const earningComponents: any[] = [];
    const deductionComponents: any[] = [];

    for (const c of components) {
      if (!checkDemographicEligibility(c)) continue;
      const cat = (c.group_category || c.category || '').toLowerCase();
      if (cat.includes('deduct')) {
        deductionComponents.push(c);
      } else {
        earningComponents.push(c);
      }
    }

    // 5. Pre-register all fixed Value components into evaluation context
    for (const c of earningComponents) {
      const compType = c.type || c.component_type || 'Value';
      if (compType === 'Value') {
        const val = Number(c.amount || 0);
        const normKey = PayrollFormulaEvaluator.normalizeKey(c.name);
        evalContext[normKey] = val;
        evalContext[c.name.toLowerCase()] = val;
      }
    }

    const getFormula = (c: any): string => {
      if (c.formula && typeof c.formula === 'string' && c.formula.trim()) return c.formula.trim();
      const match = (c.name || '').match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const inside = match[1].trim();
        if (
          inside.includes('%') ||
          inside.includes('*') ||
          inside.includes('+') ||
          inside.includes('-') ||
          inside.includes('/') ||
          inside.includes('min(') ||
          inside.includes('max(') ||
          inside.includes('if') ||
          inside.toLowerCase().includes('gross') ||
          inside.toLowerCase().includes('basic') ||
          inside.toLowerCase().includes('ctc')
        ) {
          return inside;
        }
      }
      return '';
    };

    // 6. Evaluate Basic Component (Primary Anchor) — fully DB-driven, no hardcoded %
    let basicAmount = 0;
    const basicComp = earningComponents.find((c: any) =>
      (c.name || '').toLowerCase().includes('basic')
    );

    if (basicComp) {
      const compType = basicComp.type || basicComp.component_type || 'Value';
      const bFormula = getFormula(basicComp);
      if (bFormula) {
        basicAmount = PayrollFormulaEvaluator.evaluate(bFormula, evalContext);
      } else if (compType === 'Value' && Number(basicComp.amount || 0) > 0) {
        basicAmount = Number(basicComp.amount);
      } else {
        basicAmount = Number(basicComp.amount || 0);
      }
    }

    evalContext.basic = basicAmount;
    evalContext.basic_salary = basicAmount;
    evalContext.earned_basic = basicAmount;

    const earningsBreakup: any[] = [];
    let allocatedEarnings = 0;

    // Push Basic only if it's in the slab components
    if (basicComp) {
      earningsBreakup.push({
        component_id: basicComp.id,
        code: (basicComp.name || 'BASIC').replace(/\s+/g, '_').toUpperCase(),
        name: basicComp.name,
        type: basicComp.type || basicComp.component_type || 'Value',
        formula: getFormula(basicComp) || basicComp.formula || '',
        amount: basicAmount,
      });
      allocatedEarnings += basicAmount;
    }

    // 7. Evaluate Remaining Earning Components (Values & Multi-Tier Derived)
    for (const c of earningComponents) {
      const nameLower = (c.name || '').toLowerCase();
      if (nameLower.includes('basic') || nameLower.includes('special')) continue;

      const compType = c.type || c.component_type || 'Value';
      const formulaStr = getFormula(c);
      let compAmount = 0;

      if (formulaStr) {
        compAmount = PayrollFormulaEvaluator.evaluate(formulaStr, evalContext);
      } else if (compType === 'Value') {
        compAmount = Number(c.amount || 0);
      } else if (compType === 'Module') {
        compAmount = Number(c.amount || 0);
      }

      // Check condition & boundaries
      const isEligible = PayrollFormulaEvaluator.checkCondition(
        c.condition_on || c.conditionOn,
        c.condition_operator || c.conditionOperator,
        c.condition_value1 || c.conditionValue1,
        c.condition_value2 || c.conditionValue2,
        evalContext
      );

      if (!isEligible) {
        compAmount = 0;
      } else {
        compAmount = PayrollFormulaEvaluator.applyBoundaries(
          compAmount,
          c.boundary_type || c.boundaryType,
          Number(c.min_amount || c.minAmount || 0),
          Number(c.max_amount || c.maxAmount || 0)
        );
      }

      // Register into evaluation context so subsequent components can use it
      const normKey = PayrollFormulaEvaluator.normalizeKey(c.name);
      evalContext[normKey] = compAmount;
      evalContext[c.name.toLowerCase()] = compAmount;

      if (compAmount > 0) {
        earningsBreakup.push({
          component_id: c.id,
          code: c.name?.replace(/\s+/g, '_').toUpperCase() || `COMP_${c.id}`,
          name: c.name,
          type: compType,
          formula: c.formula || '',
          amount: compAmount,
        });
        allocatedEarnings += compAmount;
      }
    }

    // 8. Special Allowance — dynamic residual balancing component (Gross minus all other earnings)
    const specialComp = earningComponents.find((c: any) =>
      (c.name || '').toLowerCase().includes('special')
    );
    let specialAllowance = 0;
    if (specialComp) {
      // Residual: gross minus everything allocated so far
      specialAllowance = Math.max(0, grossMonthly - allocatedEarnings);
      earningsBreakup.push({
        component_id: specialComp.id,
        code: (specialComp.name || 'SPECIAL_ALLOWANCE').replace(/\s+/g, '_').toUpperCase(),
        name: specialComp.name,
        type: specialComp.type || specialComp.component_type || 'Derived',
        formula: specialComp.formula || '',
        amount: Math.round(specialAllowance * 100) / 100,
      });
      evalContext['special_allowance'] = specialAllowance;
    }

    // 8. Evaluate Deductions
    const deductionsBreakup: any[] = [];
    let totalDeductions = 0;
    let pfAmount = 0;
    let esicAmount = 0;
    let ptAmount = 0;

    for (const c of deductionComponents) {
      const nameLower = (c.name || '').toLowerCase();
      const compType = c.type || c.component_type || 'Value';
      const formulaStr = getFormula(c);
      let compAmount = 0;

      if (formulaStr) {
        compAmount = PayrollFormulaEvaluator.evaluate(formulaStr, evalContext);
      } else if (compType === 'Value') {
        compAmount = Number(c.amount || 0);
      } else if (compType === 'Derived' || compType === 'Formula') {
        compAmount = Number(c.amount || 0);
      }

      // Check condition & boundaries
      const isEligible = PayrollFormulaEvaluator.checkCondition(
        c.condition_on || c.conditionOn,
        c.condition_operator || c.conditionOperator,
        c.condition_value1 || c.conditionValue1,
        c.condition_value2 || c.conditionValue2,
        evalContext
      );

      if (isEligible && compAmount > 0) {
        compAmount = PayrollFormulaEvaluator.applyBoundaries(
          compAmount,
          c.boundary_type || c.boundaryType,
          Number(c.min_amount || c.minAmount || 0),
          Number(c.max_amount || c.maxAmount || 0)
        );

        if (nameLower.includes('pf') || nameLower.includes('provident')) pfAmount = compAmount;
        if (nameLower.includes('esic') || nameLower.includes('insurance')) esicAmount = compAmount;
        if (nameLower.includes('pt') || nameLower.includes('professional')) ptAmount = compAmount;

        deductionsBreakup.push({
          component_id: c.id,
          code: c.name?.replace(/\s+/g, '_').toUpperCase() || `DEDUCT_${c.id}`,
          name: c.name,
          type: compType,
          formula: c.formula || '',
          amount: compAmount,
        });
        totalDeductions += compAmount;
      }
    }

    // No hardcoded fallback — if no deduction components are in the slab, deductions = 0.
    // HR must configure deduction components (PF, PT, ESIC, TDS) in Settings → Components.

    const netTakeHome = Math.max(0, grossMonthly - totalDeductions);

    return {
      slabId: slab ? Number(slab.id) : null,
      slabName: slab?.name || 'Standard Pay Slab',
      cycleId: cycleId ? Number(cycleId) : null,
      annualCtc,
      grossMonthly,
      basicMonthly: basicAmount,
      hraMonthly: evalContext['hra'] ?? evalContext['house_rent_allowance'] ?? 0,
      specialAllowanceMonthly: specialAllowance,
      totalDeductions,
      netTakeHome,
      pfDeduction: pfAmount,
      esiDeduction: esicAmount,
      ptDeduction: ptAmount,
      earningsBreakup,
      deductionsBreakup,
      effectiveFrom: params.effectiveFrom || new Date().toISOString().slice(0, 10),
    };
  }
}
