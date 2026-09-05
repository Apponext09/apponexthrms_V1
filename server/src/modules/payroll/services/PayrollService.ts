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
import { TaxService } from './TaxService';
import { NotFoundError, ValidationError } from '../../../common/errors/index';
import { positiveNum, withSnakeAliases, resolveRunMonthStr } from '../utils/payroll.utils';
import type { TenantContext } from '../../../db/types';
import { SalaryCalculationService } from './SalaryCalculationService';
import { PayrollFormulaEvaluator } from '../utils/PayrollFormulaEvaluator';

export { positiveNum, withSnakeAliases };

// ─── Component Condition Matching Engine ───────────────────────────────────

/** Parse a JSON-encoded array from DB, returning [] on failure */
function parseJsonArr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try { return (JSON.parse(val) as any[]).map(String); } catch { return []; }
}

/**
 * Best-effort match of a payslip line-item label to a real payroll_components
 * row, so payroll_earnings/payroll_deductions.component_id (a real FK) can be
 * populated. Not every generated line (LOP, ad-hoc adjustment) has a catalog
 * counterpart — callers must handle a null return.
 */
function findComponentId(defs: any[], hints: string[]): number | null {
  for (const hint of hints) {
    const h = hint.toLowerCase();
    const match = defs.find(d => String(d.name || '').toLowerCase().includes(h));
    if (match) return match.id;
  }
  return null;
}

/**
 * Returns true if this component definition should apply to the given employee.
 * Checks: departments, grades, locations, gender, and the numeric condition.
 */
function matchesComponentCondition(rawComp: any, emp: any, struct: any, runMonthStr?: string): boolean {
  const comp = withSnakeAliases(rawComp) || rawComp;
  // 1. Department filter — match by ID or name
  const depts = parseJsonArr(comp.departments);
  if (depts.length > 0) {
    const empDeptId = String(emp.department_id || emp.current_department_id || '');
    const empDeptName = String(emp.department_name || emp.department || '').toLowerCase();
    const matches = depts.some(d => d === empDeptId || d.toLowerCase() === empDeptName);
    if (!matches) return false;
  }

  // 2. Grade filter — match by ID or name
  const grades = parseJsonArr(comp.grades);
  if (grades.length > 0) {
    const empGradeId = String(emp.grade_id || emp.pay_grade_id || '');
    const empGradeName = String(emp.grade || emp.pay_grade || emp.designation || '').toLowerCase();
    const matches = grades.some(g => g === empGradeId || g.toLowerCase() === empGradeName);
    if (!matches) return false;
  }

  // 3. Location filter — match by ID or name
  const locs = parseJsonArr(comp.locations);
  if (locs.length > 0) {
    const empLocId = String(emp.work_location_id || emp.location_id || '');
    const empLocName = String(emp.location || emp.work_location || '').toLowerCase();
    const matches = locs.some(l => l === empLocId || l.toLowerCase() === empLocName);
    if (!matches) return false;
  }

  // 4. Gender filter
  const gf = (comp.gender_filter || comp.genderFilter || 'All').toLowerCase();
  if (gf && gf !== 'all') {
    if ((emp.gender || '').toLowerCase() !== gf) return false;
  }

  // 5. Month filter — only apply in specified months
  const allowedMonths = parseJsonArr(comp.months);
  if (allowedMonths.length > 0) {
    let currentMonth = new Date().getMonth() + 1; // 1–12
    let currentMonthName = new Date().toLocaleString('default', { month: 'long' }); // 'January'
    if (runMonthStr) {
      const parts = String(runMonthStr).split('-');
      if (parts.length >= 2) {
        const mNum = parseInt(parts[1], 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
          currentMonth = mNum;
          const d = new Date(parseInt(parts[0], 10), mNum - 1, 1);
          currentMonthName = d.toLocaleString('default', { month: 'long' });
        }
      }
    }
    const matches = allowedMonths.some(
      (m: string) => String(m) === String(currentMonth) || m.toLowerCase() === currentMonthName.toLowerCase()
    );
    if (!matches) return false;
  }

  // 6. Effective Date Range filter — compare against the PAYROLL RUN PERIOD, not today
  // runMonthStr format: 'YYYY-MM'. Compare effective_from against end of run month,
  // and effective_to against start of run month so past-month processing works correctly.
  const effFrom = comp.effective_from_date || comp.effectiveFromDate || comp.effective_from;
  const effTo = comp.effective_to_date || comp.effectiveToDate || comp.effective_to;
  // Build period reference dates from runMonthStr (e.g. '2026-07')
  let periodStart: Date;
  let periodEnd: Date;
  if (runMonthStr && /^\d{4}-\d{2}$/.test(runMonthStr)) {
    const [y, m] = runMonthStr.split('-').map(Number);
    periodStart = new Date(y, m - 1, 1);          // 1st of run month
    periodEnd = new Date(y, m, 0);               // last day of run month
  } else {
    periodStart = new Date();
    periodEnd = new Date();
  }
  if (effFrom) {
    const fromDate = new Date(effFrom);
    // Component not yet effective at the END of the run period
    if (!isNaN(fromDate.getTime()) && fromDate > periodEnd) return false;
  }
  if (effTo) {
    const toDate = new Date(effTo);
    // Component already expired BEFORE the START of the run period
    if (!isNaN(toDate.getTime()) && toDate < periodStart) return false;
  }

  // 7. Numeric condition — supports both symbol (>, <, >=, <=, =, BETWEEN)
  //    and word operators (Greater, Less, LessThanEqual, Equals, Between)
  const condOn = (comp.condition_on || comp.conditionOn || '').trim();
  const condOp = (comp.condition_operator || comp.conditionOperator || '').trim();
  const cVal1 = comp.condition_value1 ?? comp.conditionValue1 ?? '';
  const cVal2 = comp.condition_value2 ?? comp.conditionValue2 ?? '';

  if (condOn && condOn !== 'Choose' && cVal1 !== '' && cVal1 !== null) {
    // Resolve what value to compare against based on conditionOn
    const gross = positiveNum(
      struct?.gross_monthly,
      positiveNum(struct?.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0, positiveNum(emp.gross_salary, 0))
    );
    const basic = positiveNum(struct?.basic_monthly, positiveNum(struct?.basic_salary, Math.round(gross * 0.50)));
    const condOnLower = condOn.toLowerCase();

    let compareValue = gross; // default to gross
    if (condOnLower.includes('basic')) compareValue = basic;
    if (condOnLower.includes('gross')) compareValue = gross;
    if (condOnLower.includes('days')) compareValue = 30; // can override later
    if (condOnLower.includes('attend')) compareValue = gross; // attendance-linked

    const t1 = Number(cVal1);
    const t2 = Number(cVal2 || 0);

    // Match both symbol and word operators
    const op = condOp;
    const isGt = op === '>' || op.includes('Greater') && !op.includes('Equal');
    const isGte = op === '>=' || (op.includes('Greater') && op.includes('Equal'));
    const isLt = op === '<' || (op.includes('Less') && !op.includes('Equal') && !op.includes('Than'));
    const isLte = op === '<=' || op === 'LessThanEqual' || (op.includes('Less') && op.includes('Equal'));
    const isEq = op === '=' || op === '==' || op.includes('Equals');
    const isBtw = op === 'BETWEEN' || op.includes('Between');

    if (isGt && !(compareValue > t1)) return false;
    if (isGte && !(compareValue >= t1)) return false;
    if (isLt && !(compareValue < t1)) return false;
    if (isLte && !(compareValue <= t1)) return false;
    if (isEq && compareValue !== t1) return false;
    if (isBtw && (compareValue < t1 || compareValue > t2)) return false;
  }

  return true;
}

/**
 * Given the list of component definitions that match an employee,
 * compute override values for Basic, HRA, and other allowances.
 * Returns an object with optional overrides — only fields where a matching
 * component definition was found will be present.
 */
function resolveComponentOverrides(
  matchedComps: any[],
  grossMonthly: number,
  structFallbackBasic: number
): { basic?: number; hra?: number; lta?: number; meal?: number; comm?: number; cea?: number } {
  const overrides: Record<string, number> = {};

  const computeAmount = (comp: any, base: number): number => {
    const type = (comp.component_type || comp.componentType || 'Value').toLowerCase();
    const formula = (comp.formula || '').toLowerCase();
    const amount = Number(comp.amount || 0);

    if (type === 'value') return amount;
    if (type !== 'derived') return 0;

    // 🔧 FIX: the old fallback — "grab the first number anywhere in the
    // formula and treat it as a raw percentage" — silently corrupted any
    // formula written as "(N * X) / 100" (e.g. Hoshi-style "(50 * CTC) / 100"):
    // it read the 50 as 5000% instead of resolving the /100, producing
    // wildly wrong Basic/HRA overrides (e.g. HRA = grossMonthly * 25).
    // Parse explicit "N%" first, then "(N * X) / 100" style, then a bare
    // "X * 0.N" decimal fraction. A formula with no recognizable pattern
    // (e.g. "BASIC" / "[HRA]" — a same-value reference, not a percentage)
    // intentionally yields 0 so it's skipped below, same as before.
    const pctMatch = formula.match(/(\d+(?:\.\d+)?)\s*%/);
    const divBy100Match = formula.match(/(\d+(?:\.\d+)?)\s*\*[^/]*\/\s*100/);
    const decimalMultMatch = formula.match(/\*\s*(0?\.\d+)/);
    const pct = pctMatch ? Number(pctMatch[1]) / 100
      : divBy100Match ? Number(divBy100Match[1]) / 100
        : decimalMultMatch ? Number(decimalMultMatch[1])
          : 0;
    return pct > 0 ? Math.round(base * pct) : 0;
  };

  // Pass 1 — resolve Basic first. Its own formula only ever references
  // CTC/GROSS (never itself), so grossMonthly is always the right base here.
  for (const comp of matchedComps) {
    if (!(comp.name || '').toLowerCase().includes('basic')) continue;
    const computed = computeAmount(comp, grossMonthly);
    if (computed > 0) overrides.basic = computed;
  }
  const resolvedBasic = overrides.basic ?? structFallbackBasic;

  // Pass 2 — everything else. Multiplying every formula against grossMonthly
  // regardless of what it actually references silently doubled HRA whenever
  // a formula read "BASIC * 0.4" (40% of Basic ≈ ₹8,000) — it computed 40%
  // of gross instead (₹16,000), which then ate into Special Allowance since
  // that's derived as whatever's left of gross after the other components.
  // Pick the base the formula text actually names.
  for (const comp of matchedComps) {
    const name = (comp.name || '').toLowerCase();
    if (name.includes('basic')) continue;
    const formula = (comp.formula || '').toLowerCase();
    const base = formula.includes('basic') ? resolvedBasic : grossMonthly;
    const computed = computeAmount(comp, base);
    if (computed <= 0) continue;

    if (name.includes('hra') || name.includes('house')) overrides['hra'] = computed;
    else if (name.includes('lta') || name.includes('travel')) overrides['lta'] = computed;
    else if (name.includes('meal') || name.includes('food')) overrides['meal'] = computed;
    else if (name.includes('comm')) overrides['comm'] = computed;
    else if (name.includes('child') || name.includes('cea')) overrides['cea'] = computed;
  }

  return overrides;
}

/**
 * MySQL DATETIME columns reject new Date().toISOString()'s ISO 8601 format
 * ('2026-08-16T13:45:06.197Z') — it needs 'YYYY-MM-DD HH:MM:SS'. Every
 * *_at timestamp written directly in this service (processed_at, locked_at,
 * approved_at, published_at) must go through this instead.
 */
function mysqlNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
  private taxService: TaxService;

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
    this.taxService = new TaxService();
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
      month?: string;
    },
    monthParam?: string
  ) {
    let resolvedCycleId = Number(payrollCycleId);
    let cycle = !isNaN(resolvedCycleId) && resolvedCycleId > 0 ? await this.cycleRepo.getById(ctx, resolvedCycleId) : null;
    if (!cycle) {
      cycle = await this.cycleRepo.getCurrentCycle(ctx)
        || await this.cycleRepo.query(ctx).whereNull('deleted_at').orderBy('id', 'desc').first();
    }
    if (!cycle) throw new NotFoundError('Payroll cycle not found');
    payrollCycleId = cycle.id;

    const isCycleActive = cycle.status === 'open' || (cycle as any).isActive === true || (cycle as any).is_active === 1 || (cycle as any).isActive === 1 || !cycle.status;
    if (!isCycleActive && cycle.status === 'closed') {
      throw new ValidationError('Payroll cycle is not open for processing');
    }

    // Resolve target month dynamically
    const rawMonth = options?.month || monthParam;
    let resolvedRunMonth: string;
    if (rawMonth && typeof rawMonth === 'string' && rawMonth.length >= 7) {
      const ym = rawMonth.slice(0, 7);
      resolvedRunMonth = `${ym}-01`;
    } else {
      const cycleStartDate0 = (cycle as any).cycleStartDate || (cycle as any).cycle_start_date;
      if (cycleStartDate0 instanceof Date && !isNaN(cycleStartDate0.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        resolvedRunMonth = `${cycleStartDate0.getFullYear()}-${pad(cycleStartDate0.getMonth() + 1)}-01`;
      } else if (typeof cycleStartDate0 === 'string' && /^\d{4}-\d{2}/.test(cycleStartDate0)) {
        resolvedRunMonth = `${cycleStartDate0.slice(0, 7)}-01`;
      } else {
        resolvedRunMonth = `${new Date().toISOString().slice(0, 7)}-01`;
      }
    }

    let targetCompanyId = options?.companyId || (cycle as any).companyId || (cycle as any).company_id || ctx.companyId || null;

    // ── Duplicate-run / Re-generation handling ────────────────────────────
    let run: any = null;
    {
      const runMonthPrefix = resolvedRunMonth.slice(0, 7);
      const db0 = getKnex();
      let query = db0('payroll_runs')
        .where('organization_id', ctx.organizationId)
        .where('payroll_cycle_id', payrollCycleId)
        .whereRaw("DATE_FORMAT(run_month, '%Y-%m') = ?", [runMonthPrefix])
        .whereNotIn('status', ['cancelled', 'deleted']);

      if (targetCompanyId) {
        query = query.where('company_id', targetCompanyId);
      }

      const existingRun = await query.first().catch(() => null);
      if (existingRun) {
        const runId = existingRun.id;
        const empRows = await db0('payroll_run_employees').where('payroll_run_id', runId).select('id');
        const empIds = empRows.map((r: any) => r.id);
        if (empIds.length > 0) {
          await db0('payroll_earnings').whereIn('payroll_run_employee_id', empIds).del();
          await db0('payroll_deductions').whereIn('payroll_run_employee_id', empIds).del();
          await db0('payroll_adjustments').whereIn('payroll_run_employee_id', empIds).del();
        }
        await db0('advance_recoveries').where('payroll_run_id', runId).del().catch(() => { });
        await db0('payslips').where('payroll_run_id', runId).del();
        await db0('payroll_run_employees').where('payroll_run_id', runId).del();

        await db0('payroll_runs').where('id', runId).update({
          status: 'draft',
          total_employees: 0,
          processed_employees: 0,
          error_count: 0,
          locked_by: null,
          locked_at: null,
          approved_by: null,
          approved_at: null,
          published_at: null,
          updated_at: new Date(),
          updated_by: ctx.userId
        });

        run = withSnakeAliases(await db0('payroll_runs').where('id', runId).first());
      }
    }

    const db = getKnex();

    if (!run) {
      run = await this.runRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_id: targetCompanyId ? Number(targetCompanyId) : null,
        payroll_cycle_id: payrollCycleId,
        run_type: runType as any,
        run_month: resolvedRunMonth,
        status: 'draft',
        total_employees: 0,
        processed_employees: 0,
        error_count: 0,
        created_by: ctx.userId,
        updated_by: ctx.userId
      } as any);
    }

    // Get active employees in organization filtered by company, location, department, or specific employeeIds
    let empQuery = db('employees')
      .where('organization_id', ctx.organizationId)  // always use the authenticated org — never caller-supplied
      .whereRaw("UPPER(status) = 'ACTIVE'");

    if (targetCompanyId) {
      empQuery = empQuery.where((q) => {
        q.where('company_id', targetCompanyId).orWhereNull('company_id');
      });
    }

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

    // ── Resolve actual cycle days for working_days initialization ──────────
    const sCycle = (cycle as any);
    let initCycleDays: number;
    const freq = sCycle.frequency || sCycle.cycle_frequency || '';
    if (freq === 'Weekly') initCycleDays = 7;
    else if (freq === 'Bi-Weekly' || freq === 'Fortnightly') initCycleDays = 14;
    else if (freq === 'Semi-Monthly') initCycleDays = 15;
    else {
      const cStart = Number(sCycle.calculation_start_day || sCycle.start_date || 1);
      const cEnd = Number(sCycle.cutoff_day || 28);
      initCycleDays = Math.max(1, cEnd - cStart + 1);
    }

    for (const emp of employees) {
      await this.runEmployeeRepo.create(ctx, {
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        payroll_run_id: run.id,
        employee_id: emp.id,
        status: 'pending',
        working_days: initCycleDays, // ← actual cycle days, not hardcoded 30
        leave_days: 0,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        overtime_hours: 0,
        total_earnings: 0,
        total_deductions: 0,
        net_salary: 0,
        tax_deducted: 0,
        processing_notes: 'Initialized',
        created_by: ctx.userId,
        updated_by: ctx.userId
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
    const db = getKnex();

    // ── Atomic status update — prevents race condition on double-process ────
    const atomicUpdated = await db('payroll_runs')
      .where('id', payrollRunId)
      .where('organization_id', ctx.organizationId)
      .where('status', 'draft')
      .update({ status: 'processing', updated_by: ctx.userId, updated_at: new Date() });

    if (atomicUpdated === 0) {
      const current = await db('payroll_runs').where('id', payrollRunId).first().catch(() => null);
      const currentStatus = current?.status || 'unknown';
      if (currentStatus === 'processing') {
        throw new ValidationError('Payroll run is already being processed. Please wait.');
      }
      throw new ValidationError(`Payroll run cannot be processed (current status: ${currentStatus}). Only draft runs can be processed.`);
    }

    const run = withSnakeAliases(await this.runRepo.getById(ctx, payrollRunId));
    if (!run) throw new NotFoundError('Payroll run not found');

    // ── Load all pending employees for this run ──────────────────────────────
    const employees = await this.runEmployeeRepo.getByStatus(ctx, payrollRunId, 'pending');

    // ── Shared service for formula evaluation ───────────────────────────────
    const calcService = new SalaryCalculationService();

    let processedCount = 0;
    let errorCount = 0;

    for (const empRun of employees) {
      try {
        const empId = (empRun as any).employeeId ?? (empRun as any).employee_id;
        const runMonthStr = resolveRunMonthStr(run);
        const periodEnd = `${runMonthStr}-31`;
        const periodStart = `${runMonthStr}-01`;

        // 🌟 1. Date-aware lookup: find active salary structure for this payroll month
        const struct = withSnakeAliases(
          await db('salary_structures')
            .where('employee_id', empId)
            .where('effective_from', '<=', periodEnd)
            .where(function () {
              this.whereNull('effective_to').orWhere('effective_to', '>=', periodStart);
            })
            .whereNull('deleted_at')
            .orderBy('effective_from', 'desc')
            .orderBy('id', 'desc')
            .first()
            .catch(() => null)
          || await db('employee_salary_structures as ess')
            .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
            .where({ 'ess.employee_id': empId, 'ess.is_current': true })
            .whereNull('ess.deleted_at')
            .select('ss.*')
            .first()
            .catch(() => null)
          || await db('salary_structures')
            .where('employee_id', empId)
            .whereNull('deleted_at')
            .orderBy('id', 'desc')
            .first()
            .catch(() => null)
        );

        const empRow = withSnakeAliases(await db('employees').where('id', empId).first().catch(() => null));

        const resolvedGross = positiveNum(
          struct?.gross_monthly,
          positiveNum(
            struct?.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0,
            positiveNum(
              empRow?.gross_salary,
              empRow?.annual_ctc ? Math.round(Number(empRow.annual_ctc) / 12) : 0
              // ↑ No hardcoded 35000 fallback — if 0, processing notes will flag it
            )
          )
        );
        const resolvedAnnualCtc = positiveNum(struct?.annual_ctc, resolvedGross * 12);
        const resolvedBasicMonthly = positiveNum(struct?.basic_monthly, Math.round(resolvedGross * 0.5));

        // ── Cycle dates ──────────────────────────────────────────────────────
        const [runYear, runMon] = runMonthStr.split('-').map(Number);
        const monthDays = new Date(runYear, runMon, 0).getDate();
        let totalCycleDays = monthDays;
        let cycleRow: any = null;
        let cycleStartDay = 1;
        let cycleCutoffDay = monthDays;

        if (run.payroll_cycle_id) {
          cycleRow = await db('payroll_cycles').where('id', run.payroll_cycle_id).whereNull('deleted_at').first().catch(() => null);
          if (cycleRow) {
            if (cycleRow.start_date || cycleRow.calculation_start_day) {
              cycleStartDay = Math.max(1, Math.min(monthDays, Number(cycleRow.start_date || cycleRow.calculation_start_day)));
            }
            if (cycleRow.cutoff_day) {
              cycleCutoffDay = Math.max(1, Math.min(monthDays, Number(cycleRow.cutoff_day)));
            }
            if (cycleRow.total_days_calc && !isNaN(Number(cycleRow.total_days_calc))) {
              totalCycleDays = Number(cycleRow.total_days_calc);
            } else if (cycleRow.frequency === 'Weekly') totalCycleDays = 7;
            else if (cycleRow.frequency === 'Bi-Weekly') totalCycleDays = 14;
            else if (cycleRow.frequency === 'Semi-Monthly') totalCycleDays = 15;
            else {
              totalCycleDays = Math.max(1, cycleCutoffDay - cycleStartDay + 1);
            }
          }
        }

        const monthStart = `${runMonthStr}-${String(cycleStartDay).padStart(2, '0')}`;
        const monthEnd = `${runMonthStr}-${String(cycleCutoffDay).padStart(2, '0')}`;
        let attendanceLopDays = 0;
        try {
          const [yearStr, monStr] = runMonthStr.split('-');
          const lr = await db('leave_applications')
            .where('employee_id', empId)
            .whereIn('status', ['approved', 'processed'])
            .whereRaw('YEAR(application_start_date) = ? AND MONTH(application_start_date) = ?', [Number(yearStr), Number(monStr)])
            .sum('total_days as total_lop').first();
          attendanceLopDays = Number(lr?.total_lop || 0);
        } catch { attendanceLopDays = 0; }

        const unpaidLeaveResult = await db('leave_applications as la')
          .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
          .where('la.employee_id', empId).where('la.status', 'approved')
          .where('la.application_start_date', '>=', monthStart)
          .where('la.application_end_date', '<=', monthEnd)
          .where(function () {
            this.where('lt.paid_type', 'unpaid')
              .orWhere('lt.leave_classification', 'unpaid')
              .orWhereRaw("UPPER(lt.leave_code) = 'LOP'")
              .orWhereRaw("UPPER(lt.leave_code) = 'UL'");
          })
          .sum('la.total_days as lopDays').first().catch(() => null);

        // ── Effective Date, Date of Joining (DOJ) & Exit Date calculation ───────
        let activeStartDay = cycleStartDay;
        let activeEndDay = cycleCutoffDay;

        if (empRow?.date_of_joining || empRow?.dateOfJoining || empRow?.doj) {
          const dojRaw = empRow.date_of_joining || empRow.dateOfJoining || empRow.doj;
          const dojDate = new Date(dojRaw);
          if (!isNaN(dojDate.getTime())) {
            const dojY = dojDate.getFullYear();
            const dojM = dojDate.getMonth() + 1;
            if (dojY === runYear && dojM === runMon) {
              activeStartDay = Math.max(cycleStartDay, dojDate.getDate());
            } else if (dojY > runYear || (dojY === runYear && dojM > runMon)) {
              activeStartDay = monthDays + 1; // Future joiner
            }
          }
        }

        if (empRow?.relieving_date || empRow?.exit_date || empRow?.resignation_date) {
          const exitRaw = empRow.relieving_date || empRow.exit_date || empRow.resignation_date;
          const exitDate = new Date(exitRaw);
          if (!isNaN(exitDate.getTime())) {
            const exitY = exitDate.getFullYear();
            const exitM = exitDate.getMonth() + 1;
            if (exitY === runYear && exitM === runMon) {
              activeEndDay = Math.min(cycleCutoffDay, exitDate.getDate());
            } else if (exitY < runYear || (exitY === runYear && exitM < runMon)) {
              activeEndDay = 0; // Exited in past
            }
          }
        }

        const maxEligibleDays = Math.max(0, activeEndDay - activeStartDay + 1);
        const unadjustedLopDays = Number((unpaidLeaveResult as any)?.lopDays ?? 0);
        const payableDays = Math.max(0, maxEligibleDays - unadjustedLopDays);
        const lopDays = Math.max(0, totalCycleDays - payableDays);
        const lopRatio = totalCycleDays > 0 ? Math.max(0, Math.min(1, payableDays / totalCycleDays)) : 1;

        // ── Loan EMI (Module-type source) ─────────────────────────────────────
        let loanEmiDeduction = 0;
        const activeLoans = await db('employee_loans')
          .where({ employee_id: empId, status: 'active' }).whereNull('deleted_at')
          .select('emi').catch(() => []);
        for (const loan of activeLoans) loanEmiDeduction += Number(loan.emi || 0);

        // ── Load slab + fresh components ──────────────────────────────────────
        const slabId = (struct as any)?.slab_id || (struct as any)?.slabId || (empRow as any)?.salary_slab_id;
        let slabComponents: any[] = [];
        let slabRow: any = null;

        if (slabId) {
          slabRow = withSnakeAliases(await db('payroll_slabs').where('id', slabId).first().catch(() => null));
        }
        if (!slabRow && resolvedAnnualCtc > 0) {
          slabRow = withSnakeAliases(await db('payroll_slabs')
            .where('organization_id', ctx.organizationId)
            .where('min_ctc', '<=', resolvedAnnualCtc)
            .where('max_ctc', '>=', resolvedAnnualCtc)
            .orderBy('id', 'desc').first().catch(() => null)
            || await db('payroll_slabs').where('organization_id', ctx.organizationId).first().catch(() => null));
        }

        if (slabRow?.selected_component_ids) {
          let selectedIds: string[] = [];
          try {
            const raw = typeof slabRow.selected_component_ids === 'string'
              ? JSON.parse(slabRow.selected_component_ids) : slabRow.selected_component_ids;
            if (Array.isArray(raw)) selectedIds = raw.map(String);
          } catch { selectedIds = []; }

          if (selectedIds.length > 0) {
            slabComponents = await db('payroll_components as pc')
              .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
              .whereIn('pc.id', selectedIds)
              .where('pc.is_active', 1)
              .whereNull('pc.deleted_at')
              .orderBy('pcg.display_order', 'asc')
              .orderBy('pc.id', 'asc')
              .select(
                'pc.*',
                'pcg.category as group_category',
                'pcg.name as group_name',
                'pcg.display_order as group_display_order',
                'pcg.is_taxable as group_is_taxable',
                'pcg.disable_arrear as group_disable_arrear'
              )
              .catch(() => []);
          }
        }

        let usedFallback = false;
        if (slabComponents.length === 0) {
          usedFallback = true;
          // Fall back to all active Master Components configured for this organization
          slabComponents = await db('payroll_components as pc')
            .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
            .where('pc.organization_id', ctx.organizationId)
            .where('pc.is_active', 1)
            .whereNull('pc.deleted_at')
            .orderBy('pcg.display_order', 'asc')
            .orderBy('pc.id', 'asc')
            .select(
              'pc.*',
              'pcg.category as group_category',
              'pcg.name as group_name',
              'pcg.display_order as group_display_order',
              'pcg.is_taxable as group_is_taxable',
              'pcg.disable_arrear as group_disable_arrear'
            )
            .catch(() => []);
        }

        // ── Build formula context (base values) ───────────────────────────────
        const formulaContext: Record<string, any> = {
          ctc: resolvedGross,
          monthly_ctc: resolvedGross,
          ctc_monthly: resolvedGross,
          annual_ctc: resolvedAnnualCtc,
          gross: resolvedGross,
          gross_salary: resolvedGross,
          basic: resolvedBasicMonthly,
          basic_salary: resolvedBasicMonthly,
          earned_basic: resolvedBasicMonthly,
          total_days: totalCycleDays,
          lop_days: lopDays,
          present_days: Math.max(0, totalCycleDays - lopDays),
          paid_days: Math.max(0, totalCycleDays - lopDays),
          attendance_factor: lopRatio,
          gender: empRow?.gender || '',
        };

        // ── Intern check ──────────────────────────────────────────────────────
        const internPattern = /^intern(ship)?$/i;
        const isIntern = Boolean(
          struct?.is_intern || struct?.employee_type === 'intern' ||
          internPattern.test(empRow?.employment_type || '') ||
          internPattern.test(empRow?.job_type || '')
        );

        // ── Evaluate each component through all 6 gates ───────────────────────
        const earnedRows: Array<{
          componentId: number; name: string; groupName: string;
          groupCategory: string; baseAmount: number; earnedAmount: number;
          formula: string; isNonCashable: boolean;
        }> = [];

        const deductionRows: Array<{
          componentId: number | null; name: string;
          amount: number; isSystemRow: boolean;
        }> = [];

        // Track if we have a special allowance component to fill as residual
        let specialAllowanceIdx = -1;

        for (const rawComp of slabComponents) {
          const comp = withSnakeAliases(rawComp) || rawComp;
          const category = (comp.group_category || comp.groupCategory || '').toLowerCase();
          const compType = (comp.component_type || comp.componentType || comp.type || 'Value');
          const compNameLower = (comp.name || '').toLowerCase();

          // ── GATE 1: Effective date range — compare against PAYROLL RUN PERIOD not today ─
          // runMonthStr = 'YYYY-MM'. Component is included only if it was active
          // at any point during the run month (from >= period start AND to <= period end)
          if (comp.effective_from_date) {
            const fd = new Date(comp.effective_from_date);
            // Not yet effective at end of run month → skip
            if (!isNaN(fd.getTime()) && fd > new Date(`${runMonthStr}-28`)) continue;
          }
          if (comp.effective_to_date) {
            const td = new Date(comp.effective_to_date);
            // Already expired before start of run month → skip
            if (!isNaN(td.getTime()) && td < new Date(`${runMonthStr}-01`)) continue;
          }

          // ── GATE 2: Employment filters (gender/grade/dept/location/months) ──
          if (!matchesComponentCondition(comp, empRow || {}, struct || {}, runMonthStr)) continue;

          // ── GATE 3: Intern exemption for statutory components ───────────────
          if (isIntern && (compNameLower.includes('provident') || compNameLower.includes('pf') ||
            compNameLower.includes('esic') || compNameLower.includes('professional tax'))) continue;

          // ── GATE 4: Amount computation by component type ───────────────────────
          let baseAmount = 0;
          if (compType === 'Value') {
            baseAmount = Number(comp.amount || 0);
          } else if (compType === 'Derived' || compType === 'Formula') {
            const formula = (comp.formula || '').trim();
            baseAmount = formula
              ? PayrollFormulaEvaluator.evaluate(formula, formulaContext)
              : Number(comp.amount || 0);
          } else if (compType === 'Module') {
            const src = (comp.module_source || comp.moduleSource || '').toLowerCase().trim();
            if (src === 'loan' || src === 'loan_emi' || src.includes('loan')) {
              baseAmount = loanEmiDeduction;
            } else if (src === 'lop' || src === 'loss_of_pay' || src.includes('lop')) {
              baseAmount = (lopDays > 0 && resolvedGross > 0 && totalCycleDays > 0)
                ? Math.round((resolvedGross / totalCycleDays) * lopDays)
                : 0;
            } else if (src === 'tds' || src === 'tax' || src.includes('tds')) {
              let onDemandTds = Number(struct?.tds_deduction || 0);
              if (!isIntern && onDemandTds === 0) {
                try {
                  const now = new Date();
                  const yr = now.getFullYear();
                  const currentFY = now.getMonth() >= 3 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
                  const projected = (formulaContext['gross'] || resolvedGross) * 12;
                  const tdsResult = await this.taxService.calculateTDS(ctx, empId, currentFY, projected, 'new');
                  onDemandTds = Math.round(tdsResult.totalTaxCalculated / 12);
                } catch { onDemandTds = 0; }
              }
              baseAmount = onDemandTds;
            } else if (src === 'overtime' || src === 'ot') {
              try {
                // Query OT minutes from attendance_records, broken down by day_type from overtime_requests
                const otRows = await db('attendance_records as ar')
                  .leftJoin('overtime_requests as ot', function (this: any) {
                    this.on('ot.employee_id', 'ar.employee_id')
                      .andOnRaw("DATE(ot.overtime_date) = DATE(ar.check_in_date)")
                      .andOn(db.raw("ot.approval_status = 'approved'"));
                  })
                  .where('ar.employee_id', empId)
                  .where('ar.organization_id', ctx.organizationId)
                  .whereRaw("DATE_FORMAT(ar.check_in_date, '%Y-%m') = ?", [runMonthStr])
                  .where('ar.overtime_minutes', '>', 0)
                  .select(
                    db.raw("COALESCE(ot.day_type, 'normal') as day_type"),
                    db.raw("SUM(ar.overtime_minutes) as ot_mins")
                  )
                  .groupByRaw("COALESCE(ot.day_type, 'normal')")
                  .catch(() => []);

                // Load OT rule for this employee
                const { OTRuleService } = await import('../../../modules/attendance/services/OTRuleService');
                const otRuleService = new OTRuleService();
                const otRule = await otRuleService.getEligibleRule(ctx, empId).catch(() => null);

                const hourlyRate = resolvedGross / totalCycleDays / 8;
                const dailyRate  = resolvedGross / totalCycleDays;

                for (const row of otRows) {
                  const mins = Number((row as any).ot_mins || 0);
                  if (mins <= 0) continue;
                  const dayType = ((row as any).day_type || 'normal') as 'normal' | 'holiday' | 'weekend';
                  if (otRule) {
                    baseAmount += otRuleService.calculateOTPayAmount({
                      rule:            otRule,
                      overtimeMinutes: mins,
                      dayType,
                      basicAmount:     resolvedBasicMonthly ?? resolvedGross * 0.4,
                      grossAmount:     resolvedGross,
                      dailyRate,
                      hourlyRate,
                    });
                  } else {
                    // Fallback: 1.5x normal, 2x holiday/weekend
                    const multiplier = dayType === 'normal' ? 1.5 : 2.0;
                    baseAmount += Math.round((mins / 60) * hourlyRate * multiplier);
                  }
                }
              } catch { baseAmount = 0; }
            } else if (src === 'late_deduction' || src === 'late') {
              try {
                const lateRow = await db('attendance_records')
                  .where('employee_id', empId)
                  .whereRaw("DATE_FORMAT(check_in_date, '%Y-%m') = ?", [runMonthStr])
                  .where('is_late', 1)
                  .count('id as late_count').first().catch(() => null);
                const lateDays = Number((lateRow as any)?.late_count || 0);
                baseAmount = lateDays > 0
                  ? Math.round((resolvedGross / totalCycleDays) * lateDays)
                  : 0;
              } catch { baseAmount = 0; }
            } else if (src === 'salary_advance' || src === 'advance') {
              try {
                const advRows = await db('salary_advances')
                  .where('employee_id', empId)
                  .where('status', 'active')
                  .whereNull('deleted_at')
                  .select('advance_amount', 'recovery_months').catch(() => []);
                for (const adv of advRows) {
                  const m = Math.max(1, Number(adv.recovery_months || 1));
                  baseAmount += Math.round(Number(adv.advance_amount || 0) / m);
                }
              } catch { baseAmount = 0; }
            } else {
              baseAmount = Number(comp.amount || 0);
            }
          }

          // ── GATE 5: Boundary (min/max) ──────────────────────────────────────
          baseAmount = PayrollFormulaEvaluator.applyBoundaries(
            baseAmount,
            comp.boundary_type,
            comp.min_amount ? Number(comp.min_amount) : undefined,
            comp.max_amount ? Number(comp.max_amount) : undefined
          );
          baseAmount = Math.max(0, baseAmount);

          // ── GATE 6: Attendance pro-rating ────────────────────────────────────
          const basedOnAttendanceFlag = comp.basedOnAttendance ?? comp.based_on_attendance;
          const isAttendanceBased = basedOnAttendanceFlag !== null && basedOnAttendanceFlag !== undefined
            ? Boolean(basedOnAttendanceFlag)
            : (category === 'earning');
          const earnedAmount = isAttendanceBased
            ? Math.round(baseAmount * lopRatio)
            : Math.round(baseAmount);

          // ── Register in formula context for cascading (next component can use this value) ─
          const normKey = PayrollFormulaEvaluator.normalizeKey(comp.name);
          formulaContext[normKey] = earnedAmount;
          formulaContext[comp.name.toLowerCase()] = earnedAmount;
          formulaContext[`${normKey}_base`] = baseAmount;

          // ── Route to earnings or deductions ─────────────────────────────────
          if (category === 'earning') {
            const isSpecial = compNameLower.includes('special') || compNameLower.includes('balance allowance') || compNameLower.includes('residual');
            earnedRows.push({
              componentId: comp.id,
              name: comp.name,
              groupName: comp.group_name || '',
              groupCategory: 'Earning',
              baseAmount,
              earnedAmount: isSpecial ? -1 : earnedAmount,
              formula: comp.formula || `${compType}: ${comp.amount}`,
              isNonCashable: Boolean(comp.is_non_cashable || comp.isNonCashable),
            });
            if (isSpecial) specialAllowanceIdx = earnedRows.length - 1;
          } else if (category === 'deduction') {
            deductionRows.push({
              componentId: comp.id,
              name: comp.name,
              amount: earnedAmount,
              isSystemRow: false,
            });
          }
        }

        // ── Special Allowance: residual = gross - sum(other earnings) ──────────
        if (specialAllowanceIdx >= 0) {
          const otherEarningsSum = earnedRows
            .filter((_, i) => i !== specialAllowanceIdx)
            .reduce((s, r) => s + (r.earnedAmount === -1 ? 0 : r.earnedAmount), 0);
          const residual = Math.max(0, Math.round(resolvedGross - otherEarningsSum));
          earnedRows[specialAllowanceIdx].earnedAmount = residual;
          earnedRows[specialAllowanceIdx].baseAmount = residual;
          formulaContext['special_allowance'] = residual;
        }

        // ── Track which system-level items are covered by slab components ─────────
        const slabCoversLop = slabComponents.some(c => (c.module_source || c.moduleSource || '').toLowerCase().includes('lop'));
        const slabCoversTds = slabComponents.some(c => (c.module_source || c.moduleSource || '').toLowerCase().includes('tds')
          || deductionRows.some(d => d.name.toLowerCase().includes('tds') && !d.isSystemRow));
        const slabCoversLoan = slabComponents.some(c => (c.module_source || c.moduleSource || '').toLowerCase().includes('loan'));

        // ── TDS calculation ───────────────────────────────────────────────────
        let tdsDeduction = Number(struct?.tds_deduction || 0);
        const totalEarningsCalc = earnedRows.reduce((s, r) => s + r.earnedAmount, 0);
        if (!isIntern && !slabCoversTds && tdsDeduction === 0 && totalEarningsCalc > 0) {
          try {
            const now = new Date();
            const yr = now.getFullYear();
            const currentFY = now.getMonth() >= 3 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
            const tdsResult = await this.taxService.calculateTDS(ctx, empId, currentFY, totalEarningsCalc * 12, 'new');
            tdsDeduction = Math.round(tdsResult.totalTaxCalculated / 12);
          } catch { /* ignore */ }
        }
        if (tdsDeduction > 0 && !deductionRows.some(d => d.name.toLowerCase().includes('tds'))) {
          deductionRows.push({ componentId: null, name: 'TDS (Tax Deducted at Source)', amount: tdsDeduction, isSystemRow: true });
        }

        // ── Loan EMI: add if not already in deductions via Module component ───
        if (loanEmiDeduction > 0 && !deductionRows.some(d => d.name.toLowerCase().includes('loan'))) {
          deductionRows.push({ componentId: null, name: 'Loan EMI', amount: loanEmiDeduction, isSystemRow: true });
        }

        // ── LOP informational calculation (already prorated in earnings Gate 6) ───
        let lopDeduction = 0;
        if (lopDays > 0 && resolvedGross > 0) {
          lopDeduction = Math.round((resolvedGross / totalCycleDays) * lopDays);
          // Note: Earnings components are already prorated by lopRatio in Gate 6 (earnedAmount = baseAmount * lopRatio).
          // We do NOT add lopDeduction to deductionRows to avoid double deduction.
        }

        // ── Backdated arrears ─────────────────────────────────────────────────
        let arrearsAmount = 0;
        if (struct?.arrear_pay_month && (struct.arrear_pay_month === runMonthStr || struct.arrear_pay_month.startsWith(runMonthStr))) {
          const prevStruct = await db('salary_structures')
            .where('employee_id', empId).where('id', '<', struct.id)
            .whereNull('deleted_at').orderBy('id', 'desc').first().catch(() => null);
          if (prevStruct) {
            const prevGross = positiveNum(prevStruct.gross_monthly, Math.round(Number(prevStruct.annual_ctc || 0) / 12));
            const diff = Math.max(0, resolvedGross - prevGross);
            if (diff > 0 && struct.effective_from) {
              const effDate = new Date(struct.effective_from);
              const runDate = new Date(periodStart);
              const monthsDiff = Math.max(1, (runDate.getFullYear() - effDate.getFullYear()) * 12 + (runDate.getMonth() - effDate.getMonth()));
              arrearsAmount = diff * monthsDiff;
            }
          }
        }

        // ── Process register override (HR manual adjustments) ─────────────────
        let regOverride: any = null;
        try {
          regOverride = await db('payroll_register_overrides')
            .where('organization_id', ctx.organizationId)
            .where('employee_id', empId)
            .where('month', runMonthStr).first();
        } catch { regOverride = null; }

        // ── Final totals ──────────────────────────────────────────────────────
        let totalEarnings = earnedRows.reduce((s, r) => s + r.earnedAmount, 0) + arrearsAmount;
        let totalDeductions = deductionRows.reduce((s, r) => s + r.amount, 0);

        if (regOverride) {
          totalEarnings = Number(regOverride.total_gross_earned || regOverride.gross_earned || totalEarnings);
          totalDeductions = Number(regOverride.total_deduction || totalDeductions);
        }

        // ── Earnings-exceed-gross warning ─────────────────────────────────────
        let processingWarning = '';
        if (!regOverride && totalEarnings > resolvedGross * 1.1) {
          const excess = Math.round(totalEarnings - resolvedGross);
          processingWarning = ` [ALERT: Earnings ₹${totalEarnings} exceed gross ₹${resolvedGross} by ₹${excess}. Check component amounts.]`;
        }

        const netSalary = regOverride ? Number(regOverride.net_salary) : Math.max(0, totalEarnings - totalDeductions);
        const paidDays = regOverride ? Number(regOverride.paid_days) : Math.max(0, totalCycleDays - lopDays);
        const unpaidDays = regOverride ? Number(regOverride.unpaid_days) : lopDays;

        // Employer contributions (for CTC display only — NOT employee deductions)
        const pfDeductionAmt = deductionRows.find(d => d.name.toLowerCase().includes('provident') || d.name.toLowerCase().includes(' epf') || d.name === 'Employee Provident Fund (EPF)')?.amount ?? 0;
        const pfEmployer = Number(struct?.pf_employer || pfDeductionAmt);
        const esicDeductionAmt = deductionRows.find(d => d.name.toLowerCase().includes('esi') || d.name.toLowerCase().includes('esic'))?.amount ?? 0;
        const esicEmployer = Number(struct?.esic_employer || (esicDeductionAmt > 0 ? Math.round(totalEarnings * 0.0325) : 0));

        const basicEarned = earnedRows.find(r => r.name.toLowerCase().includes('basic'))?.earnedAmount ?? Math.round(totalEarnings * 0.5);
        const processingNotes = `Dynamic: ${earnedRows.length} earnings, ${deductionRows.length} deductions. LOP=${lopDays}d, PaidDays=${paidDays}${arrearsAmount > 0 ? `, Arrears=₹${arrearsAmount}` : ''}${usedFallback ? ' [fallback: no slab components]' : ''}${processingWarning}`;

        // ── Update payroll_run_employees ──────────────────────────────────────
        await this.runEmployeeRepo.update(ctx, empRun.id, {
          working_days: paidDays,
          leave_days: Number((unadjustedLopDays + attendanceLopDays).toFixed(2)),
          paid_leave_days: Math.max(0, paidDays),
          unpaid_leave_days: unpaidDays,
          overtime_hours: 0,
          tax_deducted: tdsDeduction,
          total_earnings: totalEarnings,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          status: 'processed',
          processed_at: mysqlNow(),
          processing_notes: processingNotes,
          updated_by: ctx.userId
        });

        // ── Write payroll_earnings rows ───────────────────────────────────────
        try {
          await db('payroll_earnings').where('payroll_run_employee_id', empRun.id).delete().catch(() => { });
          await db('payroll_deductions').where('payroll_run_employee_id', empRun.id).delete().catch(() => { });

          for (const row of earnedRows) {
            if (row.earnedAmount === 0 && row.baseAmount === 0) continue;
            await db('payroll_earnings').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id,
              component_id: row.componentId || null,
              component_name: row.name,
              group_name: row.groupName || null,
              calculated_value: row.baseAmount,
              actual_value: row.earnedAmount,
              formula_used: row.formula || row.name,
              is_non_cashable: row.isNonCashable ? 1 : 0,
              created_at: new Date()
            }).catch(() => { });
          }

          if (arrearsAmount > 0) {
            await db('payroll_earnings').insert({
              uuid: uuidv4(), organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id, component_id: null,
              component_name: 'Arrears (Backdated Revision)',
              calculated_value: arrearsAmount, actual_value: arrearsAmount,
              formula_used: 'Backdated salary revision arrear', created_at: new Date()
            }).catch(() => { });
          }

          if (regOverride && Number(regOverride.adjustment || 0) !== 0) {
            await db('payroll_earnings').insert({
              uuid: uuidv4(), organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id, component_id: null,
              component_name: 'Adjustment / Bonus',
              calculated_value: Number(regOverride.adjustment), actual_value: Number(regOverride.adjustment),
              formula_used: 'Manual override', created_at: new Date()
            }).catch(() => { });
          }

          for (const ded of deductionRows) {
            if (ded.amount === 0) continue;
            await db('payroll_deductions').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id,
              component_id: ded.componentId || null,
              component_name: ded.name,
              calculated_value: ded.amount,
              actual_value: ded.amount,
              created_at: new Date()
            }).catch(() => { });
          }
        } catch { /* supplemental rows — silent */ }

        // ── Upsert preview payslip ────────────────────────────────────────────
        try {
          const payslipMonthDate = `${runMonthStr}-01`;
          const payslipNum = `PS-${runMonthStr.replace(/-/g, '')}-${empId}`;
          const empCompanyId = empRow?.company_id || (run as any).company_id || ctx.companyId || null;
          const existing = await db('payslips')
            .where({ employee_id: empId, payslip_month: payslipMonthDate })
            .whereNull('deleted_at').first().catch(() => null);

          if (existing) {
            await db('payslips').where('id', existing.id).update({
              payroll_run_id: payrollRunId,
              company_id: existing.company_id || (empCompanyId ? Number(empCompanyId) : null),
              // Always keep CTC from the salary structure — never recompute from earnings
              ctc: resolvedAnnualCtc || existing.ctc || 0,
              basic_salary: basicEarned,
              gross_salary: totalEarnings,
              total_deductions: totalDeductions,
              net_salary: netSalary,
              is_locked: false,
              updated_at: new Date()
            });
          } else {
            await db('payslips').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              company_id: empCompanyId ? Number(empCompanyId) : null,
              employee_id: empId,
              payroll_run_id: payrollRunId,
              payslip_month: payslipMonthDate,
              payslip_number: payslipNum,
              // CTC = annual CTC from salary structure (source of truth)
              // Never compute as (earnings + employer contributions) × 12 — that inflates CTC
              ctc: resolvedAnnualCtc || 0,
              basic_salary: basicEarned,
              gross_salary: totalEarnings,
              total_deductions: totalDeductions,
              net_salary: netSalary,
              is_locked: false,
              created_by: ctx.userId, updated_by: ctx.userId,
              created_at: new Date(), updated_at: new Date()
            });
          }
        } catch { }

        processedCount++;
      } catch (error) {
        errorCount++;
        await this.runEmployeeRepo.updateProcessingStatus(
          ctx, empRun.id, 'error', (error as Error).message
        );
      }
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'calculated',
      processed_employees: processedCount,
      error_count: errorCount,
      updated_by: ctx.userId
    });

    return updated;
  }

  async lockPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'locked',
      locked_by: ctx.userId,
      locked_at: mysqlNow(),
      updated_by: ctx.userId
    });

    // Notify CEO / Org Admin users
    try {
      const db = getKnex();
      const adminUsers = await db('users')
        .where('organization_id', ctx.organizationId)
        .where(qb => {
          qb.whereIn('role_code', ['organization_admin', 'super_admin', 'ceo', 'admin'])
            .orWhere('is_admin', true);
        });

      const runPeriod = (run as any).payroll_month || (run as any).month || 'Active Period';
      const staffCount = (run as any).employee_count || (run as any).total_employees || 0;
      const netPay = Math.round(Number((run as any).total_net_pay || 0)).toLocaleString('en-IN');

      for (const u of adminUsers) {
        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          user_id: u.id,
          title: `📋 Payroll Run #${payrollRunId} Locked for Approval`,
          message: `Payroll run for ${runPeriod} (${staffCount} staff, Net: ₹${netPay}) is locked and awaiting your approval.`,
          type: 'payroll_approval',
          link: '/payroll/processing?tab=payroll_requests',
          created_at: new Date()
        }).catch(() => { });
      }
    } catch { }

    return updated;
  }

  async unlockPayroll(ctx: TenantContext, payrollRunId: number, reason?: string) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status === 'published') {
      throw new ValidationError('Cannot unlock published payroll');
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'calculated',   // return to calculated — not draft; HR keeps figures, just unlocked for edits
      locked_by: null,
      locked_at: null,
      updated_by: ctx.userId
    });

    // If revision reason was given, notify HR
    if (reason) {
      try {
        const db = getKnex();
        const hrUsers = await db('users')
          .where('organization_id', ctx.organizationId)
          .whereIn('role_code', ['hr_admin', 'hr', 'hr_manager']);

        for (const u of hrUsers) {
          await db('notifications').insert({
            uuid: uuidv4(),
            organization_id: ctx.organizationId,
            user_id: u.id,
            title: `⚠️ Payroll Run #${payrollRunId} Returned for Revision`,
            message: `Approver requested revision for Payroll Run #${payrollRunId}. Note: "${reason}". Run has been unlocked to draft.`,
            type: 'payroll_revision_requested',
            link: '/payroll/processing',
            created_at: new Date()
          }).catch(() => { });
        }
      } catch { }
    }

    return updated;
  }

  async approvePayroll(ctx: TenantContext, payrollRunId: number) {
    const run = await this.runRepo.getById(ctx, payrollRunId);
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status !== 'locked') {
      throw new ValidationError(`Payroll must be locked before approval. Current status: "${run.status}"`);
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: mysqlNow(),
      updated_by: ctx.userId
    });

    // Notify HR Admin users
    try {
      const db = getKnex();
      const hrUsers = await db('users')
        .where('organization_id', ctx.organizationId)
        .whereIn('role_code', ['hr_admin', 'hr', 'hr_manager']);

      const runPeriod = (run as any).payroll_month || (run as any).month || 'Active Period';

      for (const u of hrUsers) {
        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          user_id: u.id,
          title: `✅ Payroll Run #${payrollRunId} Approved`,
          message: `Payroll run for ${runPeriod} has been approved. You can now publish payslips to employees.`,
          type: 'payroll_approved',
          link: '/payroll/processing',
          created_at: new Date()
        }).catch(() => { });
      }
    } catch { }

    return updated;
  }

  async publishPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = withSnakeAliases(await this.runRepo.getById(ctx, payrollRunId));
    if (!run) throw new NotFoundError('Payroll run not found');

    if (run.status !== 'approved') {
      throw new ValidationError(`Payroll must be approved before publishing. Current status: "${run.status}". CEO/Admin approval is required.`);
    }

    const updated = await this.runRepo.update(ctx, payrollRunId, {
      status: 'published',
      approved_by: run.approved_by || ctx.userId,
      approved_at: run.approved_at || mysqlNow(),
      published_at: mysqlNow(),
      updated_by: ctx.userId
    });

    // Generate / upsert payslips — preview payslips may already exist from processPayroll
    // 🔧 FIX: Upsert by (employee_id + payslip_month) to prevent duplicates.
    const db = getKnex();
    const employees = await this.runEmployeeRepo.getForRun(ctx, payrollRunId);
    for (const emp of employees) {
      // getForRun() goes through BaseRepository.list(), which camelCases —
      // emp.employee_id / emp.total_earnings / emp.total_deductions / emp.net_salary
      // are always undefined; use the camelCase fields the repo actually returns.
      const empId = (emp as any).employeeId ?? (emp as any).employee_id;
      const empTotalEarnings = Number((emp as any).totalEarnings ?? (emp as any).total_earnings ?? 0);
      const empTotalDeductions = Number((emp as any).totalDeductions ?? (emp as any).total_deductions ?? 0);
      const empNetSalary = Number((emp as any).netSalary ?? (emp as any).net_salary ?? 0);

      const struct = withSnakeAliases(await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where({ 'ess.employee_id': empId, 'ess.is_current': true })
        .whereNull('ess.deleted_at')
        .select('ss.*')
        .first()
        .catch(() => null)
        || await db('salary_structures').where('employee_id', empId).whereNull('deleted_at').first().catch(() => null));

      const rawRunMonth = resolveRunMonthStr(run);
      const payslipMonthVal = `${rawRunMonth}-01`;
      const payslipNumber = `PS-${rawRunMonth.replace(/-/g, '')}-${empId}`;
      const ctcVal = struct ? Number(struct.annual_ctc || 0) : 0;

      // Check for existing payslip (created as preview during processPayroll)
      const existingPayslip = await db('payslips')
        .where('employee_id', empId)
        .where('payslip_month', payslipMonthVal)
        .whereNull('deleted_at')
        .first()
        .catch(() => null);

      // processPayroll's preview payslip already wrote the real computed
      // basic (basicEarned, post-LOP/overrides) — struct.basic_monthly is
      // frequently an unset "0.00" DECIMAL string, so recomputing from it
      // here would clobber a correct value with 0. Only fall back to an
      // estimate when there's no preview to inherit from.
      const basicVal = existingPayslip
        ? positiveNum(existingPayslip.basic_salary, Math.round(empTotalEarnings * 0.5))
        : positiveNum(struct?.basic_monthly, Math.round(empTotalEarnings * 0.5));

      if (existingPayslip) {
        // Update the preview payslip with final locked values
        await db('payslips').where('id', existingPayslip.id).update({
          payroll_run_id: payrollRunId,
          ctc: ctcVal,
          basic_salary: basicVal,
          gross_salary: empTotalEarnings,
          total_deductions: empTotalDeductions,
          net_salary: empNetSalary,
          is_locked: true,
          locked_at: mysqlNow(),
          updated_by: ctx.userId,
          updated_at: new Date()
        });
      } else {
        await this.payslipRepo.create(ctx, {
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: empId,
          payroll_run_id: payrollRunId,
          payslip_month: payslipMonthVal,
          payslip_number: payslipNumber,
          ctc: ctcVal,
          basic_salary: basicVal,
          gross_salary: empTotalEarnings,
          total_deductions: empTotalDeductions,
          net_salary: empNetSalary,
          is_locked: true,
          locked_at: mysqlNow(),
          created_by: ctx.userId,
          updated_by: ctx.userId
        });
      }

      // Send in-app and template notifications to each employee
      try {
        const empUser = await db('users')
          .where(function () {
            this.where('employee_id', empId).orWhere('id', empId);
          })
          .andWhere('organization_id', ctx.organizationId)
          .first()
          .catch(() => null);

        const recipientUserId = empUser?.id || empId;
        const monthLabel = rawRunMonth;

        // 1. Direct in-app notification in notifications table for immediate bell visibility
        await db('notifications').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          recipient_id: recipientUserId,
          event_code: 'payslip_generated',
          channels: JSON.stringify(['in_app']),
          subject_line: `Your Salary Payslip for ${monthLabel} is Ready 💰`,
          body_text: `Your salary payslip for ${monthLabel} has been published with Net Take-Home Pay ₹${empNetSalary.toLocaleString('en-IN')}. View and download your PDF payslip now.`,
          variables: JSON.stringify({
            month: monthLabel,
            employee_name: empUser ? `${empUser.first_name || ''} ${empUser.last_name || ''}`.trim() : 'Employee',
            net_salary: empNetSalary,
            gross_salary: empTotalEarnings,
            total_deductions: empTotalDeductions,
            action_url: '/employee/payslips'
          }),
          status: 'delivered',
          priority: 'high',
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        }).catch(() => null);

        // 2. Notification Service template engine
        await this.notificationService.sendNotification(ctx, {
          eventCode: 'payslip_generated',
          recipientId: recipientUserId,
          variables: {
            month: monthLabel,
            payslipMonth: monthLabel,
            net_salary: empNetSalary.toLocaleString('en-IN'),
            gross_salary: empTotalEarnings.toLocaleString('en-IN'),
            total_deductions: empTotalDeductions.toLocaleString('en-IN'),
            employee_name: empUser ? `${empUser.first_name || ''} ${empUser.last_name || ''}`.trim() : 'Employee',
            action_url: '/employee/payslips'
          }
        } as any).catch(() => null);
      } catch { /* notifications are supplemental to publishing */ }
    }

    return updated;
  }

  async getPayrollStatus(ctx: TenantContext, payrollRunId: number) {
    return this.runRepo.getById(ctx, payrollRunId);
  }

  async getPayrollRuns(ctx: TenantContext, cycleId?: number, month?: string, limit = 20) {
    // ── Bug 3 fix: filter by company when context has one ────────────────────────────
    // Org admin (no company context) sees all runs.
    // Company-level HR sees only their company's runs.
    if (ctx.companyId) {
      const db = getKnex();
      let q = db('payroll_runs')
        .where('organization_id', ctx.organizationId)
        .where('company_id', ctx.companyId)
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc')
        .limit(limit);
      if (cycleId) q = q.where('payroll_cycle_id', cycleId);
      let runs: any[] = await q;
      if (month) {
        const targetYM = month.slice(0, 7);
        runs = runs.filter((r: any) => {
          const ym = resolveRunMonthStr(r);
          return ym === targetYM;
        });
      }
      return runs;
    }

    let runs = cycleId
      ? await this.runRepo.getForCycle(ctx, cycleId, { pageSize: limit })
      : (await this.runRepo.list(ctx, { pageSize: limit, sortBy: 'created_at', sortOrder: 'desc' })).items;

    // The Payroll Processing screen keys its Process/Lock/Publish button
    // state off "the run for the cycle+month currently selected"
    if (month) {
      const targetYM = month.slice(0, 7);
      runs = runs.filter((r: any) => {
        const ym = resolveRunMonthStr(r);
        return ym === targetYM;
      });
    }

    if (runs.length === 0) return runs;

    // payroll_runs has no stored gross/net columns — the Payroll Runs list
    // used to fall back to hardcoded placeholder figures (₹5,35,000 /
    // ₹4,70,800) whenever these were read directly off the run row, showing
    // fabricated numbers for every single run. Real totals live on
    // payroll_run_employees and have to be summed per run.
    const db = getKnex();
    const runIds = runs.map((r: any) => r.id);
    const sums = await db('payroll_run_employees')
      .whereIn('payroll_run_id', runIds)
      .groupBy('payroll_run_id')
      .select(
        'payroll_run_id',
        db.raw('COUNT(*) as emp_count'),
        db.raw("SUM(CASE WHEN status = 'processed' THEN total_earnings ELSE 0 END) as total_gross_pay"),
        db.raw("SUM(CASE WHEN status = 'processed' THEN net_salary ELSE 0 END) as total_net_pay")
      );
    const sumsByRunId = new Map(sums.map((s: any) => [Number(s.payroll_run_id ?? s.payrollRunId), s]));

    return runs.map((r: any) => {
      const s: any = sumsByRunId.get(Number(r.id)) || {};
      return {
        ...r,
        employee_count: Number(s.emp_count ?? s.empCount ?? r.total_employees ?? 0),
        total_gross_pay: Number(s.total_gross_pay ?? s.totalGrossPay ?? 0),
        total_net_pay: Number(s.total_net_pay ?? s.totalNetPay ?? 0)
      };
    });
  }

  async getPendingApprovals(ctx: TenantContext) {
    return this.runRepo.getPendingApprovals(ctx);
  }

  async getBankTransferSheet(ctx: TenantContext, payrollRunId: number) {
    const db = getKnex();
    // The global postProcessResponse hook camelCases every knex result row —
    // reading employees.first_name / employees.bank_name /
    // payroll_run_employees.net_salary here always returned undefined,
    // producing a blank name and ₹0.00 for every employee.
    const rows: any[] = await db('payroll_run_employees')
      .join('employees', 'payroll_run_employees.employee_id', 'employees.id')
      .where('payroll_run_employees.payroll_run_id', payrollRunId)
      .where('payroll_run_employees.organization_id', ctx.organizationId)
      .select(
        'employees.first_name',
        'employees.last_name',
        'employees.bank_name',
        'employees.account_no as account_number',
        'employees.ifsc_code',
        'payroll_run_employees.net_salary'
      );

    let csv = 'Employee Name,Bank Name,Account Number,IFSC Code,Net Salary\n';
    for (const r of rows) {
      const name = `"${r.firstName ?? r.first_name ?? ''} ${r.lastName ?? r.last_name ?? ''}"`;
      const bank = `"${r.bankName ?? r.bank_name ?? 'N/A'}"`;
      const account = `"${r.accountNumber ?? r.account_number ?? 'N/A'}"`;
      const ifsc = `"${r.ifscCode ?? r.ifsc_code ?? 'N/A'}"`;
      const salary = Number(r.netSalary ?? r.net_salary ?? 0).toFixed(2);
      csv += `${name},${bank},${account},${ifsc},${salary}\n`;
    }
    return csv;
  }

  async getComplianceReport(ctx: TenantContext, payrollRunId: number) {
    const db = getKnex();
    // For the compliance report we need one row per employee with their Basic Salary.
    // We use a subquery to get only the Basic Salary earning row per run-employee.
    const rows: any[] = await db('payroll_run_employees as pre')
      .join('employees as e', 'pre.employee_id', 'e.id')
      .leftJoin(
        db('payroll_earnings')
          .whereRaw("LOWER(component_name) LIKE '%basic%'")
          .select('payroll_run_employee_id', db.raw('MAX(actual_value) as basic_earned'))
          .groupBy('payroll_run_employee_id')
          .as('be'),
        'be.payroll_run_employee_id', 'pre.id'
      )
      .where('pre.payroll_run_id', payrollRunId)
      .where('pre.organization_id', ctx.organizationId)
      .select(
        'e.first_name',
        'e.last_name',
        'e.uan_no as uan_number',
        'e.esic_no as esic_number',
        db.raw('COALESCE(be.basic_earned, 0) as basic_salary'),
        'pre.total_earnings as gross_salary'
      );

    let csv = 'Employee Name,UAN,ESIC Number,Basic Salary,PF Employee (12%),Gross Salary,ESI Employee (0.75%)\n';
    for (const r of rows) {
      const name = `"${r.firstName ?? r.first_name ?? ''} ${r.lastName ?? r.last_name ?? ''}"`;
      const uan = `"${r.uanNumber ?? r.uan_number ?? 'N/A'}"`;
      const esic = `"${r.esicNumber ?? r.esic_number ?? 'N/A'}"`;
      const basic = Number(r.basicSalary ?? r.basic_salary ?? 0);
      const gross = Number(r.grossSalary ?? r.gross_salary ?? 0);
      const pf = (basic * 0.12).toFixed(2);
      const esi = (gross * 0.0075).toFixed(2);
      csv += `${name},${uan},${esic},${basic.toFixed(2)},${pf},${gross.toFixed(2)},${esi}\n`;
    }
    return csv;
  }

  // getCycles defined below (delegating to PayrollCycleService)

  // ── Cycle CRUD — delegates to PayrollCycleService (single source of truth) ──────────────────
  // Duplicate implementations previously lived here AND in PayrollCycleService.
  // All calls now go through PayrollCycleService to avoid double-maintenance bugs.

  async getCycles(ctx: TenantContext) {
    const { PayrollCycleService } = await import('./PayrollCycleService');
    return new PayrollCycleService().getCycles(ctx);
  }

  async createCycle(ctx: TenantContext, data: any) {
    const { PayrollCycleService } = await import('./PayrollCycleService');
    return new PayrollCycleService().createCycle(ctx, data);
  }

  async getCycle(ctx: TenantContext, id: number | string) {
    const { PayrollCycleService } = await import('./PayrollCycleService');
    return new PayrollCycleService().getCycle(ctx, id);
  }

  async updateCycle(ctx: TenantContext, id: number | string, data: any) {
    const { PayrollCycleService } = await import('./PayrollCycleService');
    return new PayrollCycleService().updateCycle(ctx, id, data);
  }

  async deleteCycle(ctx: TenantContext, id: number | string) {
    const { PayrollCycleService } = await import('./PayrollCycleService');
    return new PayrollCycleService().deleteCycle(ctx, id);
  }

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
      loanEmiAmount = 0
    } = params;

    let computedValue = 0;

    if (type === 'Value') {
      computedValue = fixedAmount;
    } else if (type === 'Derived') {
      if (formula && formula.trim()) {
        try {
          let expr = formula.toLowerCase();
          const epfEpsWages = Math.min(parentValues.earnedBasic || parentValues.basic || 0, 15000);

          expr = expr
            .replace(/\[epf_eps_wages\]/g, String(epfEpsWages))
            .replace(/\[earned_basic\]/g, String(parentValues.earnedBasic || 0))
            .replace(/\[earned_gross\]/g, String(parentValues.earnedGross || 0))
            .replace(/\[basic\]/g, String(parentValues.basic || 0))
            .replace(/\[gross\]/g, String(parentValues.gross || 0))
            .replace(/\[lop_factor\]/g, String(lopFactor || 1))
            .replace(/\[attendance_days\]/g, String(lopFactor || 1))
            .replace(/\[salary_days\]/g, String(lopFactor || 1))
            .replace(/\bbasic\b/g, String(parentValues.basic || 0))
            .replace(/\bgross\b/g, String(parentValues.gross || 0));

          // Strip any characters except digits, decimals, basic operators, and parentheses
          const safeExpr = expr.replace(/[^0-9.\+\-\*\/\(\)\s]/g, '');
          if (safeExpr.trim()) {
            const evalResult = new Function(`"use strict"; return (${safeExpr});`)();
            if (typeof evalResult === 'number' && !isNaN(evalResult)) {
              computedValue = Math.round(evalResult);
            }
          }
        } catch (err) {
          console.error('Error evaluating formula expression:', formula, err);
          computedValue = fixedAmount;
        }
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

    // Apply attendance proration factor if enabled
    if (basedOnAttendance && type === 'Value') {
      computedValue = Math.round(computedValue * lopFactor);
    }

    // Apply Min / Max boundary guardrails
    if (minBoundary !== undefined && computedValue < minBoundary) {
      computedValue = minBoundary;
    }
    if (maxBoundary !== undefined && computedValue > maxBoundary) {
      computedValue = maxBoundary;
    }

    return Math.max(0, computedValue);
  }

  async getReconciliation(ctx: TenantContext, currentRunId: number) {
    const db = getKnex();
    const currentRun = await db('payroll_runs').where('id', currentRunId).where('organization_id', ctx.organizationId).first();
    if (!currentRun) throw new NotFoundError('Current payroll run not found');

    const currentEmployees = await db('payroll_run_employees as pre')
      .join('employees as e', 'pre.employee_id', 'e.id')
      .where('pre.payroll_run_id', currentRunId)
      .select('pre.*', 'e.first_name', 'e.last_name', 'e.employee_code');

    const prevRun = await db('payroll_runs')
      .where('organization_id', ctx.organizationId)
      .where('id', '<', currentRunId)
      .orderBy('id', 'desc')
      .first();

    let prevEmployeesMap: Record<number, any> = {};
    if (prevRun) {
      const prevEmps = await db('payroll_run_employees').where('payroll_run_id', prevRun.id);
      for (const pe of prevEmps) {
        prevEmployeesMap[pe.employee_id] = pe;
      }
    }

    const items = currentEmployees.map((ce: any) => {
      const prev = prevEmployeesMap[ce.employee_id];
      const prevGross = prev ? Number(prev.total_earnings || 0) : 0;
      const currGross = Number(ce.total_earnings || 0);
      const diffGross = currGross - prevGross;
      const prevNet = prev ? Number(prev.net_salary || 0) : 0;
      const currNet = Number(ce.net_salary || 0);
      const diffNet = currNet - prevNet;

      const anomalyFlag = Boolean(prev && (Math.abs(diffGross) > (prevGross * 0.15)));

      return {
        employeeId: ce.employee_id,
        employeeName: `${ce.first_name || ''} ${ce.last_name || ''}`.trim(),
        employeeCode: ce.employee_code || `EMP-${ce.employee_id}`,
        prevGross,
        currGross,
        diffGross,
        prevNet,
        currNet,
        diffNet,
        anomalyFlag,
        status: ce.status
      };
    });

    return {
      currentRunId,
      previousRunId: prevRun ? prevRun.id : null,
      totalEmployees: items.length,
      anomaliesCount: items.filter(i => i.anomalyFlag).length,
      reconciliation: items
    };
  }

  /**
   * Dynamically calculate employee salary structure based on Actual CTC and Slab component rules.
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
    const salaryCalcService = new SalaryCalculationService();
    return salaryCalcService.calculateDynamicSalaryStructure(params);
  }
}
