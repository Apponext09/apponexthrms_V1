/**
 * payroll.utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure helper functions shared across payroll services and controllers.
 * No DB access, no business logic changes — extracted from PayrollService.ts
 * to keep each file focused.
 */

// ─── Numeric helpers ─────────────────────────────────────────────────────────

/**
 * DECIMAL columns from mysql2 return as strings (e.g. "0.00"), which are
 * truthy — `val || fallback` would pick "0.00" over the fallback.
 * Use this wherever an unset monetary field should defer to a fallback.
 */
export function positiveNum(val: any, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─── camelCase ↔ snake_case bridge ──────────────────────────────────────────

/**
 * The global postProcessResponse hook camelCases every Knex result. Large
 * swathes of the payroll code read snake_case DB column names (struct.basic_monthly,
 * run.payroll_cycle_id, etc.) — those reads are silently undefined.
 * This aliases each camelCase key back onto its snake_case form right after
 * fetch, so either style resolves to the real value.
 */
export function withSnakeAliases<T extends Record<string, any>>(
  obj: T | null | undefined
): T | null {
  if (!obj) return (obj as any) ?? null;
  const out: Record<string, any> = { ...obj };
  for (const key of Object.keys(obj)) {
    const snake = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    if (snake !== key && !(snake in out)) out[snake] = (obj as any)[key];
  }
  return out as T;
}

// ─── Run month resolution ────────────────────────────────────────────────────

/**
 * BaseRepository.getById() converts columns to camelCase, so a run fetched
 * via the repo has `runMonth`, not `run_month`. mysql2 also returns DATE
 * columns as JS Date objects — `.toISOString()` shifts by the UTC offset.
 * Use local-time getters, not UTC ones.
 */
export function resolveRunMonthStr(run: any): string {
  const raw = run?.runMonth ?? run?.run_month;
  if (!raw) return new Date().toISOString().slice(0, 7);
  if (raw instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${raw.getFullYear()}-${pad(raw.getMonth() + 1)}`;
  }
  return String(raw).slice(0, 7);
}

// ─── MySQL datetime formatter ─────────────────────────────────────────────────

/**
 * MySQL DATETIME columns reject ISO 8601 format ('2026-08-16T13:45:06.197Z').
 * Every *_at timestamp written in services must go through this.
 */
export function mysqlNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// ─── JSON array parser ────────────────────────────────────────────────────────

/** Parse a JSON-encoded array from DB, returning [] on failure */
export function parseJsonArr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try {
    return (JSON.parse(val) as any[]).map(String);
  } catch {
    return [];
  }
}

// ─── Component ID finder ──────────────────────────────────────────────────────

/**
 * Best-effort match of a payslip line-item label to a real payroll_components
 * row so that component_id (a real FK) can be populated.
 * Callers must handle a null return.
 */
export function findComponentId(defs: any[], hints: string[]): number | null {
  for (const hint of hints) {
    const h = hint.toLowerCase();
    const match = defs.find((d) => String(d.name || '').toLowerCase().includes(h));
    if (match) return match.id;
  }
  return null;
}

// ─── Component condition matching ─────────────────────────────────────────────

/**
 * Returns true if this component definition should apply to the given employee.
 * Checks: departments, grades, locations, gender, effective dates, and the
 * numeric condition expression.
 */
export function matchesComponentCondition(
  comp: any,
  emp: any,
  struct: any,
  targetMonthStr?: string
): boolean {
  // 1. Department filter — match by ID or name
  const depts = parseJsonArr(comp.departments);
  if (depts.length > 0) {
    const empDeptId = String(emp.department_id || emp.current_department_id || '');
    const empDeptName = String(emp.department_name || emp.department || '').toLowerCase();
    const matches = depts.some(
      (d) => d === empDeptId || d.toLowerCase() === empDeptName
    );
    if (!matches) return false;
  }

  // 2. Grade filter — match by ID or name
  const grades = parseJsonArr(comp.grades);
  if (grades.length > 0) {
    const empGradeId = String(emp.grade_id || emp.pay_grade_id || emp.current_grade_id || '');
    const empGradeName = String(
      emp.grade || emp.pay_grade || emp.designation || ''
    ).toLowerCase();
    const matches = grades.some(
      (g) => g === empGradeId || g.toLowerCase() === empGradeName
    );
    if (!matches) return false;
  }

  // 3. Location filter — match by ID or name
  const locs = parseJsonArr(comp.locations);
  if (locs.length > 0) {
    const empLocId = String(emp.work_location_id || emp.location_id || emp.current_location_id || '');
    const empLocName = String(emp.location || emp.work_location || '').toLowerCase();
    const matches = locs.some(
      (l) => l === empLocId || l.toLowerCase() === empLocName
    );
    if (!matches) return false;
  }

  // 4. Gender filter
  const gf = (comp.gender_filter || comp.genderFilter || 'All').toLowerCase();
  if (gf && gf !== 'all') {
    if ((emp.gender || '').toLowerCase() !== gf) return false;
  }

  // 5. Month filter — only apply in specified months
  const allowedMonths = parseJsonArr(comp.months);
  const checkDate = targetMonthStr ? new Date(`${targetMonthStr.slice(0, 7)}-01`) : new Date();
  if (allowedMonths.length > 0) {
    const currentMonth = checkDate.getMonth() + 1;
    const currentMonthName = checkDate.toLocaleString('default', { month: 'long' });
    const matches = allowedMonths.some(
      (m: string) =>
        String(m) === String(currentMonth) ||
        m.toLowerCase() === currentMonthName.toLowerCase()
    );
    if (!matches) return false;
  }

  // 6. Effective Date Range filter
  const effFrom =
    comp.effective_from_date || comp.effectiveFromDate || comp.effective_from;
  const effTo =
    comp.effective_to_date || comp.effectiveToDate || comp.effective_to;
  
  if (effFrom) {
    const fromDate = new Date(effFrom);
    if (!isNaN(fromDate.getTime()) && fromDate > checkDate) return false;
  }
  if (effTo) {
    const toDate = new Date(effTo);
    if (!isNaN(toDate.getTime()) && toDate < checkDate) return false;
  }

  // 7. Numeric condition — supports both symbol (>, <, >=, <=, =, BETWEEN)
  //    and word operators (Greater, Less, LessThanEqual, Equals, Between)
  const condOn = (comp.condition_on || comp.conditionOn || '').trim();
  const condOp = (comp.condition_operator || comp.conditionOperator || '').trim();
  const cVal1 = comp.condition_value1 ?? comp.conditionValue1 ?? '';
  const cVal2 = comp.condition_value2 ?? comp.conditionValue2 ?? '';

  if (condOn && condOn !== 'Choose' && cVal1 !== '' && cVal1 !== null) {
    const gross = positiveNum(
      struct?.gross_monthly,
      positiveNum(
        struct?.annual_ctc ? Math.round(Number(struct.annual_ctc) / 12) : 0,
        positiveNum(emp.gross_salary, 0)
      )
    );
    const basic = positiveNum(
      struct?.basic_monthly,
      positiveNum(struct?.basic_salary, Math.round(gross * 0.5))
    );
    const condOnLower = condOn.toLowerCase();

    let compareValue = gross;
    if (condOnLower.includes('basic')) compareValue = basic;
    if (condOnLower.includes('gross')) compareValue = gross;
    if (condOnLower.includes('days')) compareValue = 30;
    if (condOnLower.includes('attend')) compareValue = gross;

    const t1 = Number(cVal1);
    const t2 = Number(cVal2 || 0);

    const op = condOp;
    const isGt = op === '>' || (op.includes('Greater') && !op.includes('Equal'));
    const isGte = op === '>=' || (op.includes('Greater') && op.includes('Equal'));
    const isLt =
      op === '<' ||
      (op.includes('Less') && !op.includes('Equal') && !op.includes('Than'));
    const isLte =
      op === '<=' ||
      op === 'LessThanEqual' ||
      (op.includes('Less') && op.includes('Equal'));
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

// ─── Component override resolver ──────────────────────────────────────────────

/**
 * Given the list of component definitions that match an employee,
 * compute override values for Basic, HRA, and other allowances.
 * Returns only fields where a matching component definition was found.
 */
export function resolveComponentOverrides(
  matchedComps: any[],
  grossMonthly: number,
  structFallbackBasic: number
): {
  basic?: number;
  hra?: number;
  lta?: number;
  meal?: number;
  comm?: number;
  cea?: number;
} {
  const overrides: Record<string, number> = {};

  const computeAmount = (comp: any, base: number): number => {
    const type = (comp.component_type || comp.componentType || 'Value').toLowerCase();
    const formula = (comp.formula || '').toLowerCase();
    const amount = Number(comp.amount || 0);

    if (type === 'value') return amount;
    if (type !== 'derived') return 0;

    const pctMatch = formula.match(/(\d+(?:\.\d+)?)\s*%/);
    const divBy100Match = formula.match(/(\d+(?:\.\d+)?)\s*\*[^/]*\/\s*100/);
    const decimalMultMatch = formula.match(/\*\s*(0?\.\d+)/);
    const pct = pctMatch
      ? Number(pctMatch[1]) / 100
      : divBy100Match
      ? Number(divBy100Match[1]) / 100
      : decimalMultMatch
      ? Number(decimalMultMatch[1])
      : 0;
    return pct > 0 ? Math.round(base * pct) : 0;
  };

  // Pass 1 — resolve Basic first (formula always references CTC/GROSS)
  for (const comp of matchedComps) {
    if (!(comp.name || '').toLowerCase().includes('basic')) continue;
    const computed = computeAmount(comp, grossMonthly);
    if (computed > 0) overrides.basic = computed;
  }
  const resolvedBasic = overrides.basic ?? structFallbackBasic;

  // Pass 2 — everything else; pick the base the formula text actually names
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
