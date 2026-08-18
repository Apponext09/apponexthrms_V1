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
import type { TenantContext } from '../../../db/types';

// ─── Component Condition Matching Engine ───────────────────────────────────

/** Parse a JSON-encoded array from DB, returning [] on failure */
function parseJsonArr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try { return (JSON.parse(val) as any[]).map(String); } catch { return []; }
}

/**
 * DECIMAL columns come back from mysql2 as strings (e.g. "0.00"), which are
 * truthy in JS — `struct?.gross_monthly || fallback` picks "0.00" over the
 * fallback even though the real value is zero. Use this anywhere an unset
 * monetary field should defer to a fallback instead of resolving to 0.
 */
export function positiveNum(val: any, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
function matchesComponentCondition(comp: any, emp: any, struct: any): boolean {
  // 1. Department filter — match by ID or name
  const depts = parseJsonArr(comp.departments);
  if (depts.length > 0) {
    const empDeptId   = String(emp.department_id || emp.current_department_id || '');
    const empDeptName = String(emp.department_name || emp.department || '').toLowerCase();
    const matches = depts.some(d => d === empDeptId || d.toLowerCase() === empDeptName);
    if (!matches) return false;
  }

  // 2. Grade filter — match by ID or name
  const grades = parseJsonArr(comp.grades);
  if (grades.length > 0) {
    const empGradeId   = String(emp.grade_id || emp.pay_grade_id || '');
    const empGradeName = String(emp.grade || emp.pay_grade || emp.designation || '').toLowerCase();
    const matches = grades.some(g => g === empGradeId || g.toLowerCase() === empGradeName);
    if (!matches) return false;
  }

  // 3. Location filter — match by ID or name
  const locs = parseJsonArr(comp.locations);
  if (locs.length > 0) {
    const empLocId   = String(emp.work_location_id || emp.location_id || '');
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
    const currentMonth = new Date().getMonth() + 1; // 1–12
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' }); // 'January'
    const matches = allowedMonths.some(
      (m: string) => String(m) === String(currentMonth) || m.toLowerCase() === currentMonthName.toLowerCase()
    );
    if (!matches) return false;
  }

  // 6. Numeric condition — supports both symbol (>, <, >=, <=, =, BETWEEN)
  //    and word operators (Greater, Less, LessThanEqual, Equals, Between)
  const condOn = (comp.condition_on || comp.conditionOn || '').trim();
  const condOp = (comp.condition_operator || comp.conditionOperator || '').trim();
  const cVal1  = comp.condition_value1 ?? comp.conditionValue1 ?? '';
  const cVal2  = comp.condition_value2 ?? comp.conditionValue2 ?? '';

  if (condOn && condOn !== 'Choose' && cVal1 !== '' && cVal1 !== null) {
    // Resolve what value to compare against based on conditionOn
    const gross = positiveNum(
      struct?.gross_monthly,
      positiveNum(struct?.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0, positiveNum(emp.gross_salary, 0))
    );
    const basic = positiveNum(struct?.basic_monthly, positiveNum(struct?.basic_salary, Math.round(gross * 0.50)));
    const condOnLower = condOn.toLowerCase();

    let compareValue = gross; // default to gross
    if (condOnLower.includes('basic'))  compareValue = basic;
    if (condOnLower.includes('gross'))  compareValue = gross;
    if (condOnLower.includes('days'))   compareValue = 30; // can override later
    if (condOnLower.includes('attend')) compareValue = gross; // attendance-linked

    const t1 = Number(cVal1);
    const t2 = Number(cVal2 || 0);

    // Match both symbol and word operators
    const op = condOp;
    const isGt  = op === '>'  || op.includes('Greater') && !op.includes('Equal');
    const isGte = op === '>=' || (op.includes('Greater') && op.includes('Equal'));
    const isLt  = op === '<'  || (op.includes('Less') && !op.includes('Equal') && !op.includes('Than') );
    const isLte = op === '<=' || op === 'LessThanEqual' || (op.includes('Less') && op.includes('Equal'));
    const isEq  = op === '='  || op === '==' || op.includes('Equals');
    const isBtw = op === 'BETWEEN' || op.includes('Between');

    if (isGt  && !(compareValue >  t1)) return false;
    if (isGte && !(compareValue >= t1)) return false;
    if (isLt  && !(compareValue <  t1)) return false;
    if (isLte && !(compareValue <= t1)) return false;
    if (isEq  && compareValue !== t1)   return false;
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
    const type    = (comp.component_type || comp.componentType || 'Value').toLowerCase();
    const formula = (comp.formula || '').toLowerCase();
    const amount  = Number(comp.amount || 0);

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

    if (name.includes('hra') || name.includes('house'))       overrides['hra']  = computed;
    else if (name.includes('lta') || name.includes('travel')) overrides['lta']  = computed;
    else if (name.includes('meal') || name.includes('food'))  overrides['meal'] = computed;
    else if (name.includes('comm'))                            overrides['comm'] = computed;
    else if (name.includes('child') || name.includes('cea'))   overrides['cea']  = computed;
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

/**
 * The global postProcessResponse hook camelCases query results, so a run
 * fetched via the repository has `runMonth`, not `run_month` — reading
 * `run.run_month` is always undefined and silently falls back to "today",
 * which is wrong once the actual run month differs from the current month.
 * mysql2 also returns DATE columns as JS Date objects, and `.toISOString()`
 * on those shifts by the server's UTC offset (e.g. 2026-07-01 IST becomes
 * 2026-06-30T18:30:00.000Z) — so local-time getters are used, not UTC ones.
 */
/**
 * The global postProcessResponse hook camelCases every query result, but large
 * swathes of this file were written reading snake_case DB column names
 * (struct.basic_monthly, run.payroll_cycle_id, empRow.gross_salary, etc.) —
 * every one of those reads is silently undefined and falls through to a
 * hardcoded default. Rather than rewrite every read site, this aliases each
 * camelCase key back onto its snake_case form right after fetch, so either
 * style resolves to the real value.
 */
export function withSnakeAliases<T extends Record<string, any>>(obj: T | null | undefined): T | null {
  if (!obj) return (obj as any) ?? null;
  const out: Record<string, any> = { ...obj };
  for (const key of Object.keys(obj)) {
    const snake = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    if (snake !== key && !(snake in out)) out[snake] = (obj as any)[key];
  }
  return out as T;
}

function resolveRunMonthStr(run: any): string {
  const raw = run?.runMonth ?? run?.run_month;
  if (!raw) return new Date().toISOString().slice(0, 7);
  if (raw instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}`;
  }
  return String(raw).slice(0, 7);
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
    }
  ) {
    const cycle = await this.cycleRepo.getById(ctx, payrollCycleId);
    if (!cycle) throw new NotFoundError('Payroll cycle not found');

    if (cycle.status !== 'open') {
      throw new ValidationError('Payroll cycle is not open for processing');
    }

    // BaseRepository.getById() converts columns to camelCase, so
    // cycle.cycle_start_date was always undefined here — Knex silently
    // drops undefined keys from an insert, and run_month has no DB default,
    // so every single payroll run generation failed outright.
    const cycleStartDate = (cycle as any).cycleStartDate || (cycle as any).cycle_start_date;
    const run = await this.runRepo.create(ctx, {
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      payroll_cycle_id: payrollCycleId,
      run_type: runType as any,
      run_month: cycleStartDate,
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
    const run = withSnakeAliases(await this.runRepo.getById(ctx, payrollRunId));
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

    // ── Load all active component definitions for this org once ─────────────
    //    These will be used to apply condition-based overrides per employee.
    const db2 = getKnex();
    const allComponentDefs: any[] = await db2('payroll_components')
      .where('organization_id', ctx.organizationId)
      .where('is_active', 1)
      .whereNull('deleted_at')
      .catch(() => []);
    // ────────────────────────────────────────────────────────────────────────

    let processedCount = 0;
    let errorCount = 0;

    for (const empRun of employees) {
      try {
        const db = getKnex();
        // runEmployeeRepo.getByStatus() goes through BaseRepository.list(), which
        // returns camelCase (employeeId) — empId was always
        // undefined, so every salary-structure lookup below silently matched
        // nothing and every employee was marked "no salary structure assigned"
        // regardless of what was actually on file.
        const empId = (empRun as any).employeeId ?? (empRun as any).employee_id;
        // Dynamic lookup for assigned salary structure
        const struct = withSnakeAliases(await db('employee_salary_structures as ess')
          .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
          .where({ 'ess.employee_id': empId, 'ess.is_current': true })
          .whereNull('ess.deleted_at')
          .select('ss.*')
          .first()
          .catch(() => null)
          || await db('salary_structures').where('employee_id', empId).whereNull('deleted_at').first().catch(() => null));

        // If no structure found, mark employee as error — do NOT fall back to another employee's structure
        if (!struct) {
          await this.runEmployeeRepo.update(ctx, empRun.id, {
            status: 'error',
            processing_notes: 'No salary structure assigned. Please assign a salary structure before processing payroll.',
            updated_by: ctx.userId
          });
          errorCount++;
          continue;
        }

        const empRow = withSnakeAliases(await db('employees').where('id', empId).first().catch(() => null));

        // 1. Fetch Attendance LOP (Loss of Pay) Days & Paid Days for the specific payroll run month
        const monthDays = 30;
        let attendanceLopDays = 0;
        try {
          const runMonthStr = resolveRunMonthStr(run);
          const [yearStr, monthStr] = runMonthStr.split('-');

          const leaveRecord = await db('leave_applications')
            .where('employee_id', empId)
            .whereIn('status', ['approved', 'processed'])
            .whereRaw('YEAR(application_start_date) = ? AND MONTH(application_start_date) = ?', [Number(yearStr), Number(monthStr)])
            .sum('total_days as total_lop')
            .first();
          attendanceLopDays = Number(leaveRecord?.total_lop || 0);
        } catch {
          attendanceLopDays = 0;
        }

        const paidDays = Math.max(0, monthDays - attendanceLopDays);
        const lOPFactor = paidDays / monthDays;

        // 2. Earnings Components (Scaled by LOP)
        let totalEarnings = 0;
        let loanEmiDeduction = 0;
        let lopDeduction = 0;

        // Resolve base gross from salary structure or employee record
        const baseGross = positiveNum(
          struct?.gross_monthly,
          positiveNum(
            struct?.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0,
            positiveNum(empRow?.gross_salary, 50000)
          )
        );
        totalEarnings = baseGross;  // refined below after LOP

        if (!struct && empRow && !empRow.gross_salary) {
          // Minimal fallback — no structure attached at all
          totalEarnings = Number(empRow.annual_ctc ? Math.round(Number(empRow.annual_ctc) / 12) : 0);
        }

        // 🌟 1. Active Loan EMI Deduction — sum ALL active loans, not just first
        const activeLoans = await db('employee_loans')
          .where({ employee_id: empId, status: 'active' })
          .whereNull('deleted_at')
          .select('emi', 'monthly_emi')
          .catch(() => []);

        for (const loan of activeLoans) {
          loanEmiDeduction += Number(loan.emi || loan.monthly_emi || 0);
        }

        // 🌟 2. Attendance / Unpaid Leave (LOP) Deduction
        const runMonthStr = resolveRunMonthStr(run);
        const monthStart = `${runMonthStr}-01`;
        const monthEnd = `${runMonthStr}-31`;

        // 🔧 FIX: Only sum approved leaves that are unpaid.
        // Paid leaves (CL, SL, EL etc.) must NOT reduce salary.
        // Uses correct DB column names: application_start_date, application_end_date, paid_type, leave_classification
        const unpaidLeaves = await db('leave_applications as la')
          .leftJoin('leave_types as lt', 'la.leave_type_id', 'lt.id')
          .where('la.employee_id', empId)
          .where('la.status', 'approved')
          .where('la.application_start_date', '>=', monthStart)
          .where('la.application_end_date', '<=', monthEnd)
          .where(function () {
            this.where('lt.paid_type', 'unpaid')
              .orWhere('lt.leave_classification', 'unpaid')
              .orWhereRaw("UPPER(lt.leave_code) = 'LOP'")
              .orWhereRaw("UPPER(lt.leave_code) = 'UL'")
              .orWhereNull('lt.id'); // fallback: if no leave_type linked, treat as LOP
          })
          .sum('la.total_days as lopDays')
          .first()
          .catch(() => null);

        // Dynamic cycle calculation days resolution (7 for Weekly, 14 for Bi-Weekly, 15 for Semi-Monthly, 30 for Monthly)
        let totalCycleDays = 30;
        if (run.payroll_cycle_id) {
          const cyc = await db('payroll_cycles').where('id', run.payroll_cycle_id).whereNull('deleted_at').first().catch(() => null);
          if (cyc) {
            if (cyc.total_days_calc && !isNaN(Number(cyc.total_days_calc))) {
              totalCycleDays = Number(cyc.total_days_calc);
            } else if (cyc.frequency === 'Weekly') {
              totalCycleDays = 7;
            } else if (cyc.frequency === 'Bi-Weekly') {
              totalCycleDays = 14;
            } else if (cyc.frequency === 'Semi-Monthly') {
              totalCycleDays = 15;
            }
          }
        }

        const lopDays = Number((unpaidLeaves as any)?.lopDays || 0);

        // ── Apply Component Definition Conditions (Master Settings overrides) ─
        //    Use baseGross (not post-LOP earnings) so percentage-based components
        //    are computed on the full monthly amount before LOP scaling.
        const matchedComps = allComponentDefs.filter(c =>
          matchesComponentCondition(c, empRow || {}, struct)
        );
        const structFallbackBasic = positiveNum(struct?.basic_monthly, positiveNum(struct?.basic_salary, Math.round(baseGross * 0.50)));
        const compOverrides = resolveComponentOverrides(matchedComps, baseGross, structFallbackBasic);

        // ── Derive per-component monthly amounts ─────────────────────────────
        //    Priority: component override > salary_structure stored value > formula default
        const basicMonthly = compOverrides.basic ?? structFallbackBasic;
        const hraMonthly   = compOverrides.hra
          ?? positiveNum(struct?.hra_monthly, Math.round(basicMonthly * 0.40));
        const ltaMonthly   = compOverrides.lta
          ?? Number(struct?.lta_monthly   || Number(struct?.lta || 0));
        const mealMonthly  = compOverrides.meal
          ?? Number(struct?.meal_allowance_monthly || 0);
        const commMonthly  = compOverrides.comm
          ?? Number(struct?.communication_allowance_monthly || 0);
        const ceaMonthly   = compOverrides.cea
          ?? Number(struct?.children_edu_allowance_monthly || 0);
        const stdAllow     = Math.max(0, baseGross - basicMonthly - hraMonthly - ltaMonthly - mealMonthly - commMonthly - ceaMonthly);

        // ── Scale each component by LOP ratio ────────────────────────────────
        const lopRatio    = totalCycleDays > 0 ? Math.max(0, (totalCycleDays - lopDays) / totalCycleDays) : 1;
        const basicEarned = Math.round(basicMonthly * lopRatio);
        const hraEarned   = Math.round(hraMonthly   * lopRatio);
        const ltaEarned   = Math.round(ltaMonthly   * lopRatio);
        const mealEarned  = Math.round(mealMonthly  * lopRatio);
        const commEarned  = Math.round(commMonthly  * lopRatio);
        const ceaEarned   = Math.round(ceaMonthly   * lopRatio);
        const stdEarned   = Math.round(stdAllow      * lopRatio);
        totalEarnings     = basicEarned + hraEarned + ltaEarned + mealEarned + commEarned + ceaEarned + stdEarned;

        // ── LOP monetary deduction ────────────────────────────────────────────
        if (lopDays > 0 && baseGross > 0) {
          lopDeduction = Math.round((baseGross / totalCycleDays) * lopDays);
        }

        // ── Statutory Deductions ─────────────────────────────────────────────
        const isIntern   = Boolean(struct?.is_intern || struct?.employee_type === 'intern' || empRow?.employment_type === 'intern' || empRow?.job_type === 'intern');
        const pfEnabled  = struct?.pf_enabled  !== false && !isIntern;
        const esiEnabled = struct?.esi_enabled !== false && !isIntern;
        const ptEnabled  = struct?.pt_enabled  !== false && !isIntern;

        // A. PF: 12% of earned basic, ceiling at ₹1,800/month (based on ₹15,000 wage ceiling)
        const pfWageCeiling  = Math.min(basicEarned, 15000);
        const pfDeduction    = pfEnabled  ? Math.round(pfWageCeiling * 0.12) : 0;  // max ₹1,800
        const pfEmployer     = Number(struct?.pf_employer  || pfDeduction);

        // B. ESIC: 0.75% employee if gross ≤ ₹21,000
        const esicDeduction  = esiEnabled && totalEarnings > 0 && totalEarnings <= 21000
          ? Math.ceil(totalEarnings * 0.0075) : 0;
        const esicEmployer   = Number(struct?.esic_employer || (esicDeduction > 0 ? Math.round(totalEarnings * 0.0325) : 0));

        // C. PT: ₹200/month if gross > ₹15,000 (standard slab)
        const ptDeduction    = ptEnabled && totalEarnings > 15000 ? 200 : 0;

        // D. TDS: Use TaxService slab engine (new regime, annualised) — skip for interns
        let tdsDeduction = Number(struct?.tds_deduction || 0);
        if (!isIntern && tdsDeduction === 0 && totalEarnings > 0) {
          try {
            const currentFY = (() => {
              const now = new Date();
              const yr = now.getFullYear();
              return now.getMonth() >= 3 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
            })();
            const tdsResult = await this.taxService.calculateTDS(
              ctx,
              empId,
              currentFY,
              totalEarnings * 12,   // annualised YTD gross
              'new'                 // default to new regime
            );
            // Monthly TDS = annual tax ÷ 12 (rounded)
            tdsDeduction = Math.round(tdsResult.totalTaxCalculated / 12);
          } catch {
            // Fall through — tdsDeduction remains 0
          }
        }

        // Check for custom manual override from process payroll register
        let regOverride: any = null;
        try {
          regOverride = await db('payroll_register_overrides')
            .where('organization_id', ctx.organizationId)
            .where('employee_id', empId)
            .where('month', runMonthStr)
            .first();
        } catch {
          regOverride = null;
        }

        const finalBasicMonthly = regOverride ? Number(regOverride.basic) : basicMonthly;
        const finalHraMonthly = regOverride ? Number(regOverride.hra) : hraMonthly;
        const finalLtaMonthly = regOverride ? Number(regOverride.lta) : ltaMonthly;
        const finalMealMonthly = regOverride ? Number(regOverride.meal_allowance) : mealMonthly;
        const finalCommMonthly = regOverride ? Number(regOverride.communication_allowance) : commMonthly;
        const finalCeaMonthly = regOverride ? Number(regOverride.children_education_allowance) : ceaMonthly;
        const finalStdAllow = regOverride ? Number(regOverride.standard_allowance) : stdAllow;

        const finalBasicEarned = regOverride ? Number(regOverride.basic_earned) : basicEarned;
        const finalHraEarned = regOverride ? Number(regOverride.hra_earned) : hraEarned;
        const finalLtaEarned = regOverride ? Number(regOverride.lta_earned) : ltaEarned;
        const finalMealEarned = regOverride ? Number(regOverride.meal_allowance_earned) : mealEarned;
        const finalCommEarned = regOverride ? Number(regOverride.communication_allowance_earned) : commEarned;
        const finalCeaEarned = regOverride ? Number(regOverride.children_education_allowance_earned) : ceaEarned;
        const finalStdEarned = regOverride ? Number(regOverride.standard_allowance_earned) : stdEarned;
        const finalAdjustment = regOverride ? Number(regOverride.adjustment) : 0;
        const finalOt = regOverride ? Number(regOverride.ot) : 0;

        const finalEarnings = regOverride
          ? Number(regOverride.total_gross_earned || regOverride.gross_earned)
          : (basicEarned + hraEarned + ltaEarned + mealEarned + commEarned + ceaEarned + stdEarned);

        const finalPf = regOverride ? Number(regOverride.pf) : pfDeduction;
        const finalPt = regOverride ? Number(regOverride.pt) : ptDeduction;
        const finalEsic = regOverride ? Number(regOverride.esic) : esicDeduction;
        const finalTds = regOverride ? Number(regOverride.tds) : tdsDeduction;
        const finalTotalDeductions = regOverride
          ? Number(regOverride.total_deduction)
          : (pfDeduction + esicDeduction + ptDeduction + tdsDeduction + loanEmiDeduction + lopDeduction);

        const finalNetSalary = regOverride ? Number(regOverride.net_salary) : Math.max(0, finalEarnings - finalTotalDeductions);
        const finalPaidDays = regOverride ? Number(regOverride.paid_days) : Math.max(0, totalCycleDays - lopDays);
        const finalUnpaidDays = regOverride ? Number(regOverride.unpaid_days) : lopDays;

        await this.runEmployeeRepo.update(ctx, empRun.id, {
          working_days: finalPaidDays,
          unpaid_leave_days: finalUnpaidDays,
          total_earnings: finalEarnings,
          total_deductions: finalTotalDeductions,
          net_salary: finalNetSalary,
          status: 'processed',
          processed_at: mysqlNow(),
          processing_notes: `Processed: Basic=₹${finalBasicEarned}, HRA=₹${finalHraEarned}, PF=₹${finalPf}, PT=₹${finalPt}, ESIC=₹${finalEsic}, LoanEMI=₹${loanEmiDeduction}, LOP=${finalUnpaidDays}d`,
          updated_by: ctx.userId
        });

        // ── Write per-component payroll_earnings rows ───────────────────────────
        try {
          // Clear any previous earnings rows for this empRun (in case of reprocess)
          await db('payroll_earnings').where('payroll_run_employee_id', empRun.id).delete().catch(() => {});
          await db('payroll_deductions').where('payroll_run_employee_id', empRun.id).delete().catch(() => {});

          // Uses correct DB columns: calculated_value (full amount), actual_value (earned after LOP)
          const earningRows = [
            { name: 'Basic Salary',              calculated: finalBasicMonthly, actual: finalBasicEarned, hints: ['basic'] },
            { name: 'House Rent Allowance (HRA)',calculated: finalHraMonthly,   actual: finalHraEarned,   hints: ['hra', 'house rent'] },
            ...(finalLtaMonthly  > 0 ? [{ name: 'LTA',                  calculated: finalLtaMonthly,  actual: finalLtaEarned,  hints: ['lta'] }] : []),
            ...(finalMealMonthly > 0 ? [{ name: 'Meal Allowance',       calculated: finalMealMonthly, actual: finalMealEarned, hints: ['meal'] }] : []),
            ...(finalCommMonthly > 0 ? [{ name: 'Communication Allow.', calculated: finalCommMonthly, actual: finalCommEarned, hints: ['communication'] }] : []),
            ...(finalCeaMonthly  > 0 ? [{ name: 'Child Edu. Allowance', calculated: finalCeaMonthly,  actual: finalCeaEarned,  hints: ['child', 'education'] }] : []),
            ...(finalStdEarned   > 0 ? [{ name: 'Special Allowance',    calculated: finalStdAllow,    actual: finalStdEarned,  hints: ['special allowance', 'special'] }] : []),
            ...(finalAdjustment  !== 0 ? [{ name: 'Adjustment / Bonus', calculated: finalAdjustment, actual: finalAdjustment, hints: ['adjustment', 'bonus'] }] : []),
            ...(finalOt          > 0 ? [{ name: 'Overtime (OT)',        calculated: finalOt,          actual: finalOt,         hints: ['overtime'] }] : []),
          ];
          for (const row of earningRows) {
            await db('payroll_earnings').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id,
              component_id: findComponentId(allComponentDefs, row.hints),
              calculated_value: row.calculated,
              actual_value: row.actual,
              formula_used: row.name,
              created_at: new Date()
            }).catch(() => {});
          }

          const deductionRows = [
            ...(pfDeduction   > 0 ? [{ component_name: 'PF Employee (12%)',    actual_value: pfDeduction,      hints: ['provident fund', 'pf'] }] : []),
            ...(esicDeduction > 0 ? [{ component_name: 'ESI Employee (0.75%)', actual_value: esicDeduction,    hints: ['esi'] }] : []),
            ...(ptDeduction   > 0 ? [{ component_name: 'Professional Tax',     actual_value: ptDeduction,      hints: ['professional tax', ' pt '] }] : []),
            ...(tdsDeduction  > 0 ? [{ component_name: 'TDS',                  actual_value: tdsDeduction,     hints: ['tds', 'tax deducted'] }] : []),
            ...(loanEmiDeduction > 0 ? [{ component_name: 'Loan EMI',           actual_value: loanEmiDeduction, hints: ['loan'] }] : []),
            ...(lopDeduction  > 0 ? [{ component_name: `LOP (${lopDays} days)`, actual_value: lopDeduction,     hints: ['lop', 'loss of pay'] }] : []),
          ];
          for (const row of deductionRows) {
            await db('payroll_deductions').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              payroll_run_employee_id: empRun.id,
              component_id: findComponentId(allComponentDefs, row.hints),
              component_name: row.component_name,
              calculated_value: row.actual_value,
              actual_value: row.actual_value,
              created_at: new Date()
            }).catch(() => {});
          }

          // Employer PF/ESIC contributions are NOT the employee's deduction — they
          // must never land in payroll_deductions (that table is what the payslip's
          // "Deductions" section is built from). The CTC figure below already
          // accounts for them independently; nothing reads this row back, so it
          // existed only to show employees a phantom deduction they never had.
        } catch { /* silent — component rows are supplemental */ }

        // ── Create/upsert preview payslip ───────────────────────────────────────
        try {
          const payslipMonthDate = `${runMonthStr}-01`;
          const payslipNum = `PS-${runMonthStr.replace(/-/g, '')}-${empId}`;
          const existingSlip = await db('payslips')
            .where({ employee_id: empId, payslip_month: payslipMonthDate })
            .whereNull('deleted_at')
            .first();

          const basicVal = finalBasicEarned;  // ✅ Use real basic from structure, not gross*0.5
          if (existingSlip) {
            await db('payslips').where('id', existingSlip.id).update({
              gross_salary: finalEarnings,
              total_deductions: finalTotalDeductions,
              net_salary: finalNetSalary,
              basic_salary: basicVal,
              updated_at: new Date()
            });
          } else {
            await db('payslips').insert({
              uuid: uuidv4(),
              organization_id: ctx.organizationId,
              employee_id: empId,
              payroll_run_id: payrollRunId,
              payslip_month: payslipMonthDate,
              payslip_number: payslipNum,
              ctc: (finalEarnings + pfEmployer + esicEmployer) * 12,
              basic_salary: basicVal,
              gross_salary: finalEarnings,
              total_deductions: finalTotalDeductions,
              net_salary: finalNetSalary,
              is_locked: false,
              created_by: ctx.userId,
              updated_by: ctx.userId,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        } catch { }

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
      status: 'completed',
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
      locked_at: mysqlNow(),
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

    if (!['locked', 'processed', 'completed'].includes(run.status)) {
      throw new ValidationError('Payroll must be processed, completed, or locked before approval');
    }

    return this.runRepo.update(ctx, payrollRunId, {
      status: 'approved',
      approved_by: ctx.userId,
      approved_at: mysqlNow(),
      updated_by: ctx.userId
    });
  }

  async publishPayroll(ctx: TenantContext, payrollRunId: number) {
    const run = withSnakeAliases(await this.runRepo.getById(ctx, payrollRunId));
    if (!run) throw new NotFoundError('Payroll run not found');

    // Simple flow: process → publish (no separate approve step needed)
    if (!['approved', 'completed', 'processed', 'locked'].includes(run.status)) {
      throw new ValidationError('Payroll must be processed before publishing');
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

      // Send notifications to each employee — best-effort, must not block
      // the payslip loop (a missing/disabled notification event previously
      // aborted publishing for every employee after the first).
      try {
        await this.notificationService.sendNotification(ctx, {
          eventCode: 'payslip_generated',
          recipientId: empId,
          variables: { payslipMonth: resolveRunMonthStr(run) }
        } as any);
      } catch { /* notifications are supplemental to publishing */ }
    }

    return updated;
  }

  async getPayrollStatus(ctx: TenantContext, payrollRunId: number) {
    return this.runRepo.getById(ctx, payrollRunId);
  }

  async getPayrollRuns(ctx: TenantContext, cycleId?: number, limit = 20) {
    const runs = cycleId
      ? await this.runRepo.getForCycle(ctx, cycleId, { pageSize: limit })
      : (await this.runRepo.list(ctx, { pageSize: limit, sortBy: 'created_at', sortOrder: 'desc' })).items;

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
    // reading employees.first_name / employee_compensation.bank_name /
    // payroll_run_employees.net_salary here always returned undefined,
    // producing a blank name and ₹0.00 for every employee.
    const rows: any[] = await db('payroll_run_employees')
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
    // payroll_run_employees has no basic_salary/gross_salary columns — the
    // real earned-basic breakdown lives in payroll_earnings (written per
    // run), and total_earnings is the closest equivalent to gross.
    const rows: any[] = await db('payroll_run_employees')
      .join('employees', 'payroll_run_employees.employee_id', 'employees.id')
      .leftJoin('employee_compensation', 'employees.id', 'employee_compensation.employee_id')
      .leftJoin('payroll_earnings', function () {
        this.on('payroll_earnings.payroll_run_employee_id', '=', 'payroll_run_employees.id')
          .andOn('payroll_earnings.formula_used', '=', db.raw('?', ['Basic Salary']));
      })
      .where('payroll_run_employees.payroll_run_id', payrollRunId)
      .where('payroll_run_employees.organization_id', ctx.organizationId)
      .select(
        'employees.first_name',
        'employees.last_name',
        'employee_compensation.uan_number',
        'employee_compensation.esic_number',
        'payroll_earnings.actual_value as basic_salary',
        'payroll_run_employees.total_earnings as gross_salary'
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

  async getCycles(ctx: TenantContext) {
    const db = getKnex();
    const orgId = ctx.organizationId || 1;

    const cycles = await db('payroll_cycles')
      .where(b => {
        b.where('organization_id', orgId).orWhereNull('organization_id');
      })
      .whereNull('deleted_at')
      .orderBy('id', 'asc');

    return cycles || [];
  }

  async createCycle(ctx: TenantContext, data: any) {
    const db = getKnex();

    let userId = ctx.userId;
    if (!userId) {
      const user = await db('users').where('organization_id', ctx.organizationId).first('id');
      userId = user?.id || 1;
    }

    // Derive cycle dates from frequency/start_date if not explicitly provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const cycleName = data.cycle_name || data.name || 'Monthly';
    const frequency = data.frequency || 'Monthly';
    const startDate = Number(data.start_date ?? 1);
    const cutoffDay = Number(data.cutoff_day ?? 25);
    const disbursementDate = Number(data.disbursement_date ?? data.salary_credit_date ?? 27);

    const rawType = frequency.toLowerCase().replace(/[^a-z]/g, '');
    const validEnumTypes = ['monthly', 'biweekly', 'weekly', 'fortnightly'];
    const cycleType = validEnumTypes.includes(rawType) ? rawType : 'monthly';

    const cycle: any = {
      uuid: uuidv4(),
      organization_id: ctx.organizationId || 1,
      cycle_name: cycleName,
      cycle_code: data.cycle_code || `CYCLE-${Date.now()}`,
      cycle_type: cycleType,
      // New Hoshi-style fields
      frequency,
      start_date: startDate,
      start_date_2: data.start_date_2 ? Number(data.start_date_2) : null,
      start_day: data.start_day || null,
      cutoff_day: cutoffDay,
      cutoff_day_name: data.cutoff_day_name || null,
      month_offset: data.month_offset || 'Current',
      total_days_calc: data.total_days_calc || '30',
      cap_amount: Number(data.cap_amount ?? 1000000),
      is_daily_wages: Boolean(data.is_daily_wages),
      daily_wages_include_paid_holidays: Boolean(data.daily_wages_include_paid_holidays),
      daily_wages_include_week_off: Boolean(data.daily_wages_include_week_off),
      tolerance_enabled: Boolean(data.tolerance_enabled),
      tolerance_minutes: Number(data.tolerance_minutes ?? 15),
      is_active: data.is_active !== false,
      // Legacy date fields
      cycle_start_date: data.cycle_start_date || firstDay,
      cycle_end_date: data.cycle_end_date || lastDay,
      payroll_run_date: data.payroll_run_date || lastDay,
      salary_credit_date: (data.salary_credit_date && String(data.salary_credit_date).includes('-'))
        ? data.salary_credit_date
        : `${year}-${String(month + 1).padStart(2, '0')}-${String(disbursementDate).padStart(2, '0')}`,
      is_current_cycle: data.is_current_cycle ?? true,
      status: data.is_active === false ? 'closed' : 'open',
      created_by: userId || 1,
      updated_by: userId || 1
    };

    const [id] = await db('payroll_cycles').insert(cycle);
    return { id, ...cycle };
  }

  async getCycle(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    return db('payroll_cycles').where({ id, organization_id: ctx.organizationId }).first();
  }

  async updateCycle(ctx: TenantContext, id: number | string, data: any) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);
    const cycleName = data.cycle_name || data.name;

    const updateData: any = {
      updated_at: new Date()
    };
    if (ctx.userId) updateData.updated_by = ctx.userId;

    if (cycleName) {
      updateData.cycle_name = cycleName;
    }
    if (data.isDailyWages !== undefined || data.is_daily_wages !== undefined) {
      updateData.is_daily_wages = (data.isDailyWages ?? data.is_daily_wages) ? 1 : 0;
    }
    if (data.dailyWagesIncludePaidHolidays !== undefined || data.daily_wages_include_paid_holidays !== undefined) {
      updateData.daily_wages_include_paid_holidays = (data.dailyWagesIncludePaidHolidays ?? data.daily_wages_include_paid_holidays) ? 1 : 0;
    }
    if (data.dailyWagesIncludeWeekOff !== undefined || data.daily_wages_include_week_off !== undefined) {
      updateData.daily_wages_include_week_off = (data.dailyWagesIncludeWeekOff ?? data.daily_wages_include_week_off) ? 1 : 0;
    }
    if (data.frequency !== undefined) {
      updateData.frequency = data.frequency;
      updateData.cycle_type = String(data.frequency).toLowerCase().replace('-', '');
    }
    if (data.startDate !== undefined || data.start_date !== undefined) {
      updateData.start_date = data.startDate ?? data.start_date;
    }
    if (data.cutoffDay !== undefined || data.cutoff_day !== undefined) {
      updateData.cutoff_day = data.cutoffDay ?? data.cutoff_day;
    }
    if (data.monthOffset !== undefined || data.month_offset !== undefined) {
      updateData.month_offset = data.monthOffset ?? data.month_offset;
    }
    if (data.disbursementDate !== undefined || data.disbursement_date !== undefined) {
      updateData.disbursement_date = data.disbursementDate ?? data.disbursement_date;
    }
    if (data.capAmount !== undefined || data.cap_amount !== undefined) {
      updateData.cap_amount = data.capAmount ?? data.cap_amount;
    }
    if (data.toleranceEnabled !== undefined || data.tolerance_enabled !== undefined) {
      updateData.tolerance_enabled = (data.toleranceEnabled ?? data.tolerance_enabled) ? 1 : 0;
    }
    if (data.toleranceMinutes !== undefined || data.tolerance_minutes !== undefined) {
      updateData.tolerance_minutes = data.toleranceMinutes ?? data.tolerance_minutes;
    }
    if (data.isActive !== undefined || data.is_active !== undefined) {
      const active = data.isActive ?? data.is_active;
      updateData.status = active ? 'open' : 'closed';
    }

    try {
      let query = db('payroll_cycles');
      if (ctx?.organizationId) {
        query = query.where('organization_id', ctx.organizationId);
      }

      if (!isNaN(numId)) {
        await query.where(function() {
          this.where('id', numId).orWhere('uuid', strId);
        }).update(updateData);
      } else {
        await query.where('uuid', strId).update(updateData);
      }
    } catch (err) {
      console.error('Error updating cycle in DB:', err);
    }

    let fetchQuery = db('payroll_cycles');
    const updated = await fetchQuery
      .where(function() {
        if (!isNaN(numId)) this.where('id', numId).orWhere('uuid', strId);
        else this.where('uuid', strId);
      })
      .first();

    if (!updated) {
      return { id: strId, ...data, ...updateData, name: cycleName || data.name };
    }

    const nameVal = updated.cycleName || updated.cycle_name || updated.name || '';
    const isDaily = Boolean(updated.isDailyWages ?? updated.is_daily_wages);
    const incHolidays = Boolean(updated.dailyWagesIncludePaidHolidays ?? updated.daily_wages_include_paid_holidays);
    const incWeekOff = Boolean(updated.dailyWagesIncludeWeekOff ?? updated.daily_wages_include_week_off);
    const start = updated.startDate ?? updated.start_date ?? 1;
    const cutoff = updated.cutoffDay ?? updated.cutoff_day ?? 25;
    const offset = updated.monthOffset || updated.month_offset || 'Current';
    const disbursement = updated.disbursementDate ?? updated.disbursement_date ?? 1;
    const cap = updated.capAmount ?? updated.cap_amount ?? 1000000;
    const tolEnabled = Boolean(updated.toleranceEnabled ?? updated.tolerance_enabled);
    const tolMinutes = updated.toleranceMinutes ?? updated.tolerance_minutes ?? 15;
    const active = updated.status !== 'closed' && updated.isActive !== false && updated.is_active !== false;

    return {
      ...updated,
      id: String(updated.id || updated.uuid),
      name: nameVal,
      cycle_name: nameVal,
      cycleName: nameVal,
      is_daily_wages: isDaily,
      isDailyWages: isDaily,
      daily_wages_include_paid_holidays: incHolidays,
      dailyWagesIncludePaidHolidays: incHolidays,
      daily_wages_include_week_off: incWeekOff,
      dailyWagesIncludeWeekOff: incWeekOff,
      frequency: updated.frequency || 'Monthly',
      start_date: start,
      startDate: start,
      cutoff_day: cutoff,
      cutoffDay: cutoff,
      month_offset: offset,
      monthOffset: offset,
      disbursement_date: disbursement,
      disbursementDate: disbursement,
      cap_amount: cap,
      capAmount: cap,
      tolerance_enabled: tolEnabled,
      toleranceEnabled: tolEnabled,
      tolerance_minutes: tolMinutes,
      toleranceMinutes: tolMinutes,
      is_active: active,
      isActive: active
    };
  }

  async deleteCycle(ctx: TenantContext, id: number | string) {
    const db = getKnex();
    const strId = String(id);
    const numId = parseInt(strId, 10);
    const orgId = ctx.organizationId || 1;

    try {
      // 1. Unlink salary structures associated with this cycle to prevent foreign key errors
      if (!isNaN(numId)) {
        await db('salary_structures').where('cycle_id', numId).update({ cycle_id: null }).catch(() => {});
      }

      // 2. Soft-delete in payroll_cycles
      let updated = 0;
      if (!isNaN(numId)) {
        updated = await db('payroll_cycles')
          .where('id', numId)
          .where('organization_id', orgId)
          .update({ deleted_at: new Date(), status: 'closed', is_active: false })
          .catch(() => 0);
      }
      if (!updated) {
        updated = await db('payroll_cycles')
          .where('uuid', strId)
          .update({ deleted_at: new Date(), status: 'closed', is_active: false })
          .catch(() => 0);
      }
      if (!updated && !isNaN(numId)) {
        await db('payroll_cycles').where('id', numId).update({ deleted_at: new Date(), status: 'closed', is_active: false }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to delete payroll cycle:', err);
    }
    return { success: true };
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
      if (formula.includes('basic * 0.5') || formula.includes('basic * 0.50') || formula.toLowerCase().includes('hra')) {
        computedValue = Math.round(parentValues.basic * 0.50);
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
}




