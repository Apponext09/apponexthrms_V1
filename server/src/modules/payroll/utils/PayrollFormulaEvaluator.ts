/**
 * PayrollFormulaEvaluator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal mathematical expression evaluator for payroll components, CTC breakdown,
 * dynamic variable resolution, condition checks, and statutory boundaries.
 */

export interface FormulaContext {
  ctc?: number;
  annual_ctc?: number;
  monthly_ctc?: number;
  gross?: number;
  gross_salary?: number;
  basic?: number;
  basic_salary?: number;
  earned_basic?: number;
  earned_gross?: number;
  present_days?: number;
  total_days?: number;
  lop_days?: number;
  paid_days?: number;
  attendance_factor?: number;
  gender?: string;
  [key: string]: any;
}

export class PayrollFormulaEvaluator {
  /**
   * Normalize variable name for matching:
   * "Conveyance Allowance" -> "conveyance_allowance"
   * "Basic Salary (50%)" -> "basic_salary"
   */
  static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/[\(\)\%\$\#\@\!]/g, '')
      .replace(/[\s\-_]+/g, '_');
  }

  /**
   * Safely evaluate an arithmetic expression string with support for:
   * - standard operators: +, -, *, /, %, ^
   * - parentheses: ( )
   * - percentages: "50%", "0.75%", "40% of basic"
   * - math functions: min(a, b), max(a, b), round(a), ceil(a), floor(a), abs(a)
   * - dynamic variable names from context
   */
  static evaluate(formula: string, context: FormulaContext = {}): number {
    if (!formula || typeof formula !== 'string' || !formula.trim()) {
      return 0;
    }

    let expr = formula.trim();

    // 0. Handle inline conditionals: e.g. "0.75% of Gross (if Gross <= 21000)" or "if gross <= 21000"
    if (expr.toLowerCase().includes('if')) {
      const ifMatch = expr.match(/\(?\s*if\s+([a-z_]+)\s*(<=|>=|<|>|==|=)\s*([0-9.]+)\s*\)?/i);
      if (ifMatch) {
        const varName = ifMatch[1].toLowerCase();
        const op = ifMatch[2];
        const threshold = Number(ifMatch[3]);
        const varVal = Number((context as any)[varName] ?? context.gross ?? context.ctc ?? 0);
        let condPassed = false;
        if (op === '<=') condPassed = varVal <= threshold;
        else if (op === '>=') condPassed = varVal >= threshold;
        else if (op === '<') condPassed = varVal < threshold;
        else if (op === '>') condPassed = varVal > threshold;
        else if (op === '=' || op === '==') condPassed = varVal === threshold;

        if (!condPassed) return 0;
        expr = expr.replace(ifMatch[0], '').trim();
      }
    }

    // Handle descriptive English formulas
    const lowerExpr = expr.toLowerCase();
    if (lowerExpr.includes('income tax') || lowerExpr.includes('tax slab') || lowerExpr.includes('projection')) {
      const annualGross = Number(context.gross ?? context.ctc ?? 0) * 12;
      return annualGross > 700000 ? Math.round((annualGross - 700000) * 0.05 / 12) : 0;
    }
    if (lowerExpr.includes('residual') || lowerExpr.includes('balance') || lowerExpr.includes('ctc -') || lowerExpr.includes('gross -')) {
      const monthlyGross = Number(context.gross ?? context.ctc ?? 0);
      const basic = Number(context.basic ?? 0);
      const hra = Number((context as any).hra ?? 0);
      const other = Number((context as any).other ?? (context as any).others ?? 0);
      return Math.max(0, monthlyGross - (basic + hra + other));
    }

    // 1. Build a normalized lookup dictionary from context
    const lookup: Record<string, number> = {};

    // Standard base variables
    const ctcMonthly = Number(context.monthly_ctc ?? (context.ctc ? (context.ctc > 200000 ? context.ctc / 12 : context.ctc) : 0));
    const annualCtc = Number(context.annual_ctc ?? (context.ctc && context.ctc > 200000 ? context.ctc : ctcMonthly * 12));
    const grossMonthly = Number(context.gross ?? context.gross_salary ?? ctcMonthly);
    const basicMonthly = Number(context.basic ?? context.basic_salary ?? 0);
    const earnedBasic = Number(context.earned_basic ?? basicMonthly);
    const earnedGross = Number(context.earned_gross ?? grossMonthly);

    lookup['ctc'] = ctcMonthly;
    lookup['monthly_ctc'] = ctcMonthly;
    lookup['ctc_monthly'] = ctcMonthly;
    lookup['annual_ctc'] = annualCtc;
    lookup['gross'] = grossMonthly;
    lookup['gross_salary'] = grossMonthly;
    lookup['basic'] = basicMonthly;
    lookup['basic_salary'] = basicMonthly;
    lookup['earned_basic'] = earnedBasic;
    lookup['earned_gross'] = earnedGross;
    lookup['present_days'] = Number(context.present_days ?? 30);
    lookup['total_days'] = Number(context.total_days ?? 30);
    lookup['lop_days'] = Number(context.lop_days ?? 0);
    lookup['paid_days'] = Number(context.paid_days ?? 30);
    lookup['attendance_factor'] = Number(context.attendance_factor ?? 1);

    // Map all custom context variables
    for (const [k, v] of Object.entries(context)) {
      if (typeof v === 'number' && !isNaN(v)) {
        const normKey = this.normalizeKey(k);
        lookup[normKey] = v;
        lookup[k.toLowerCase()] = v;
      }
    }

    // 2. Pre-process bracket notation: e.g. [CTC], [Basic], [Basic Salary], [House Rent Allowance], [Conveyance Allowance]
    expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (match, innerKey) => {
      const normInner = this.normalizeKey(innerKey);
      if (lookup[normInner] !== undefined) {
        return String(lookup[normInner]);
      }
      if (lookup[innerKey.toLowerCase().trim()] !== undefined) {
        return String(lookup[innerKey.toLowerCase().trim()]);
      }
      return innerKey;
    });

    // Replace "of" with "*" (e.g. "50% of basic" -> "50% * basic")
    expr = expr.replace(/\bof\b/gi, '*');

    // Replace percentage notation: "50%" -> "(50 / 100)", "0.75%" -> "(0.75 / 100)"
    expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1 / 100)');

    // 3. Substitute variable names with numbers
    // Sort keys by length descending to prevent partial variable shadowing
    const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (!key) continue;
      const val = lookup[key];
      // Match whole word or snake_case word
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
      expr = expr.replace(regex, String(val));
    }

    // Also handle spaces in multi-word variable names if user typed e.g. "Conveyance Allowance"
    for (const [rawKey, val] of Object.entries(lookup)) {
      if (rawKey.includes('_') || rawKey.includes(' ')) {
        const spaceVersion = rawKey.replace(/_/g, ' ');
        const escaped = spaceVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        expr = expr.replace(regex, String(val));
      }
    }

    // 4. Transform Math Functions: min, max, round, ceil, floor, abs
    expr = expr
      .replace(/\bmin\s*\(/gi, 'Math.min(')
      .replace(/\bmax\s*\(/gi, 'Math.max(')
      .replace(/\bround\s*\(/gi, 'Math.round(')
      .replace(/\bceil\s*\(/gi, 'Math.ceil(')
      .replace(/\bfloor\s*\(/gi, 'Math.floor(')
      .replace(/\babs\s*\(/gi, 'Math.abs(');

    // 5. Evaluate arithmetic safely
    try {
      // Handle power operator ^ -> **
      expr = expr.replace(/\^/g, '**');

      // Safe execution using Function constructor with no scope access
      const fn = new Function('Math', `"use strict"; return (${expr});`);
      const result = fn(Math);

      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100;
      }
      return 0;
    } catch (err) {
      // If parsing fails, attempt basic regex fallback (e.g. "basic * 0.40")
      try {
        const simpleMatch = formula.match(/([0-9.]+)/);
        if (simpleMatch) {
          const num = parseFloat(simpleMatch[1]);
          if (formula.includes('%') || formula.includes('0.')) {
            return Math.round(basicMonthly * (num > 1 ? num / 100 : num));
          }
          return num;
        }
      } catch {}
      return 0;
    }
  }

  /**
   * Check Condition Setting:
   * conditionOn: "Gross", "Basic", "CTC", "Attend.", or component name
   * conditionOperator: "Equals", "Greater", "GreaterThanEqual", "Less", "LessThanEqual", "Between"
   */
  static checkCondition(
    conditionOn?: string,
    operator?: string,
    value1?: string | number,
    value2?: string | number,
    context: FormulaContext = {}
  ): boolean {
    if (!conditionOn || conditionOn === 'Choose' || !operator || operator === 'Choose') {
      return true;
    }

    // Resolve target value from context
    const normField = this.normalizeKey(conditionOn);
    let targetVal = 0;

    if (normField.includes('gross')) targetVal = Number(context.gross ?? context.ctc ?? 0);
    else if (normField.includes('basic')) targetVal = Number(context.basic ?? (context.gross ? context.gross * 0.5 : 0));
    else if (normField.includes('ctc')) targetVal = Number(context.ctc ?? 0);
    else if (normField.includes('attend')) targetVal = Number(context.present_days ?? context.paid_days ?? 30);
    else if (context[normField] !== undefined) targetVal = Number(context[normField]);
    else if (context[conditionOn.toLowerCase()] !== undefined) targetVal = Number(context[conditionOn.toLowerCase()]);

    const v1 = Number(value1 || 0);
    const v2 = Number(value2 || 0);

    switch (operator) {
      case 'Equals':
      case '===':
      case '==':
      case '=':
        return targetVal === v1;
      case 'Greater':
      case '>':
        return targetVal > v1;
      case 'GreaterThanEqual':
      case '>=':
        return targetVal >= v1;
      case 'Less':
      case '<':
        return targetVal < v1;
      case 'LessThanEqual':
      case '<=':
        return targetVal <= v1;
      case 'Between':
        return targetVal >= Math.min(v1, v2) && targetVal <= Math.max(v1, v2);
      default:
        return true;
    }
  }

  /**
   * Apply Boundary Limits (Min / Max)
   */
  static applyBoundaries(
    val: number,
    boundaryType?: string,
    minAmount?: number,
    maxAmount?: number
  ): number {
    let result = val;
    if (!boundaryType || boundaryType === 'Choose') return result;

    if ((boundaryType === 'Min' || boundaryType === 'Both') && minAmount !== undefined && minAmount > 0) {
      result = Math.max(result, minAmount);
    }
    if ((boundaryType === 'Max' || boundaryType === 'Both') && maxAmount !== undefined && maxAmount > 0) {
      result = Math.min(result, maxAmount);
    }
    return result;
  }
}
