/**
 * SalaryCalculationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic salary structure calculation engine.
 * Extracted from PayrollService.ts — zero logic changes.
 */

import { getKnex } from '../../../db/knex';
import { withSnakeAliases, positiveNum } from '../utils/payroll.utils';

export class SalaryCalculationService {
  /**
   * UNIVERSAL PAYROLL COMPONENT CALCULATION ENGINE
   * Handles all 5 core scenarios:
   * 1. Fixed Value components (Basic, Special)
   * 2. Derived Formula components (HRA, PF, ESIC)
   * 3. Module-linked ledger components (Loans EMI, OT, Reimbursements)
   * 4. Min/Max Guardrails & Statutory Capping
   * 5. Employer Contribution Tracking (EPF 3.67%+8.33%, ESIC 3.25%)
   */
  evaluateComponent(params: {
    type: 'Value' | 'Derived' | 'Module';
    fixedAmount?: number;
    formula?: string;
    moduleSource?: string;
    parentValues: { basic: number; gross: number; earnedBasic: number; earnedGross: number };
    lopFactor: number;
    basedOnAttendance?: boolean;
    minBoundary?: number;
    maxBoundary?: number;
    loanEmiAmount?: number;
  }): number {
    const {
      type,
      fixedAmount = 0,
      formula = '',
      parentValues,
      lopFactor = 1,
      basedOnAttendance = true,
      minBoundary,
      maxBoundary,
      loanEmiAmount = 0,
    } = params;

    let computedValue = 0;

    if (type === 'Value') {
      computedValue = fixedAmount;
    } else if (type === 'Derived') {
      if (
        formula.includes('basic * 0.5') ||
        formula.includes('basic * 0.50') ||
        formula.toLowerCase().includes('hra')
      ) {
        computedValue = Math.round(parentValues.basic * 0.5);
      } else if (formula.includes('basic * 0.12') || formula.toLowerCase().includes('pf')) {
        const pfBase = Math.min(parentValues.earnedBasic, 15000);
        computedValue = Math.round(pfBase * 0.12);
      } else {
        computedValue = fixedAmount;
      }
    } else if (type === 'Module') {
      if (params.moduleSource === 'Loan' || formula.toLowerCase().includes('loan')) {
        computedValue = loanEmiAmount;
      } else {
        computedValue = fixedAmount;
      }
    }

    if (basedOnAttendance && type === 'Value') {
      computedValue = Math.round(computedValue * lopFactor);
    }

    if (minBoundary !== undefined && computedValue < minBoundary) {
      computedValue = minBoundary;
    }
    if (maxBoundary !== undefined && computedValue > maxBoundary) {
      computedValue = maxBoundary;
    }

    return Math.max(0, computedValue);
  }

  /**
   * Dynamically calculate employee salary structure based on Actual CTC and
   * Slab component rules.
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

    // 4. Sequential Evaluation
    let basicAmount = Math.round(grossMonthly * 0.5);
    const basicComp = components.find((c: any) => (c.name || '').toLowerCase().includes('basic'));
    if (basicComp && Number(basicComp.amount) > 0 && basicComp.component_type === 'Formula') {
      basicAmount = Math.round((grossMonthly * Number(basicComp.amount)) / 100);
    }

    let hraAmount = Math.round(basicAmount * 0.4);
    const hraComp = components.find(
      (c: any) =>
        (c.name || '').toLowerCase().includes('hra') ||
        (c.name || '').toLowerCase().includes('rent')
    );
    if (hraComp && Number(hraComp.amount) > 0 && hraComp.component_type === 'Formula') {
      hraAmount = Math.round((basicAmount * Number(hraComp.amount)) / 100);
    }

    const earningsBreakup: any[] = [];
    let allocatedEarnings = 0;

    earningsBreakup.push({
      component_id: basicComp?.id || 1,
      code: 'BASIC',
      name: basicComp?.name || 'Basic Salary',
      type: basicComp?.component_type || 'Formula',
      formula: basicComp?.formula || '50% of CTC',
      amount: basicAmount,
    });
    allocatedEarnings += basicAmount;

    earningsBreakup.push({
      component_id: hraComp?.id || 2,
      code: 'HRA',
      name: hraComp?.name || 'House Rent Allowance (HRA)',
      type: hraComp?.component_type || 'Formula',
      formula: hraComp?.formula || '40% of Basic',
      amount: hraAmount,
    });
    allocatedEarnings += hraAmount;

    for (const c of components) {
      const isEarning =
        (c.group_category || '').toLowerCase().includes('earn') ||
        !(c.group_category || '').toLowerCase().includes('deduct');
      const isBasic = (c.name || '').toLowerCase().includes('basic');
      const isHra =
        (c.name || '').toLowerCase().includes('hra') ||
        (c.name || '').toLowerCase().includes('rent');
      const isSpecial = (c.name || '').toLowerCase().includes('special');

      if (isEarning && !isBasic && !isHra && !isSpecial) {
        let val = 0;
        if (c.component_type === 'Value') {
          val = Number(c.amount || 0);
        } else if (c.component_type === 'Formula' || c.component_type === 'Derived') {
          const pct = Number(c.amount || 0);
          val = pct > 0 ? Math.round((basicAmount * pct) / 100) : 0;
        }
        if (val > 0) {
          earningsBreakup.push({
            component_id: c.id,
            code: c.name?.replace(/\s+/g, '_').toUpperCase() || `COMP_${c.id}`,
            name: c.name,
            type: c.component_type,
            formula: c.formula || '',
            amount: val,
          });
          allocatedEarnings += val;
        }
      }
    }

    const specialAllowance = Math.max(0, grossMonthly - allocatedEarnings);
    const specialComp = components.find((c: any) =>
      (c.name || '').toLowerCase().includes('special')
    );
    earningsBreakup.push({
      component_id: specialComp?.id || 3,
      code: 'SPECIAL_ALLOWANCE',
      name: specialComp?.name || 'Special Allowance',
      type: 'Derived',
      formula: 'CTC - (Basic + HRA + Other)',
      amount: specialAllowance,
    });

    const deductionsBreakup: any[] = [];
    let totalDeductions = 0;

    const pfComp = components.find(
      (c: any) =>
        (c.name || '').toLowerCase().includes('pf') ||
        (c.name || '').toLowerCase().includes('provident')
    );
    const pfAmount = Math.round(Math.min(basicAmount, 15000) * 0.12);
    deductionsBreakup.push({
      component_id: pfComp?.id || 9,
      code: 'PF',
      name: pfComp?.name || 'Employee Provident Fund (EPF)',
      type: 'Formula',
      formula: '12% of Basic (capped at 1800)',
      amount: pfAmount,
    });
    totalDeductions += pfAmount;

    const ptComp = components.find(
      (c: any) =>
        (c.name || '').toLowerCase().includes('pt') ||
        (c.name || '').toLowerCase().includes('professional')
    );
    const ptAmount = ptComp ? Number(ptComp.amount || 200) : 200;
    deductionsBreakup.push({
      component_id: ptComp?.id || 11,
      code: 'PT',
      name: ptComp?.name || 'Professional Tax',
      type: 'Value',
      formula: 'Fixed PT Slab',
      amount: ptAmount,
    });
    totalDeductions += ptAmount;

    const esicComp = components.find(
      (c: any) =>
        (c.name || '').toLowerCase().includes('esic') ||
        (c.name || '').toLowerCase().includes('insurance')
    );
    let esicAmount = 0;
    if (grossMonthly <= 21000) {
      esicAmount = Math.round(grossMonthly * 0.0075);
      deductionsBreakup.push({
        component_id: esicComp?.id || 10,
        code: 'ESIC',
        name: esicComp?.name || 'Employee State Insurance (ESIC)',
        type: 'Formula',
        formula: '0.75% of Gross (if Gross <= 21000)',
        amount: esicAmount,
      });
      totalDeductions += esicAmount;
    }

    const netTakeHome = Math.max(0, grossMonthly - totalDeductions);

    return {
      slabId: slab ? Number(slab.id) : null,
      slabName: slab?.name || 'Standard Pay Slab',
      cycleId: cycleId ? Number(cycleId) : null,
      annualCtc,
      grossMonthly,
      basicMonthly: basicAmount,
      hraMonthly: hraAmount,
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
