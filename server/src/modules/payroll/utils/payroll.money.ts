/**
 * payroll.money.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Decimal-safe money helpers for payroll.
 *
 * JavaScript numbers are IEEE-754 doubles, so `0.1 + 0.2 !== 0.3` and summing
 * dozens of component amounts drifts. Payroll DB columns are DECIMAL(x,2); the
 * safe representation in JS is an integer number of *paise* (1 rupee = 100
 * paise). We cross the float boundary exactly once, in `toPaise()`, on values
 * that are already at most 2 decimal places, then do all arithmetic on integers
 * (safe to ~₹90 trillion, well past any payroll).
 *
 * Rounding is configurable per organization (see `RoundingConfig`) because
 * statutory practice varies: Indian payroll usually rounds net pay — and often
 * each component — to the nearest rupee, half-up.
 */

export type RoundingMode = 'half_up' | 'half_even' | 'ceil' | 'floor' | 'none';

export interface RoundingConfig {
  /** How to break ties / drop fractions. Default 'half_up'. */
  mode: RoundingMode;
  /**
   * Round to the nearest multiple of this many rupees. `1` → whole rupees,
   * `0` → keep paise (2 dp). Default `0`.
   */
  nearest: number;
}

export const DEFAULT_ROUNDING: RoundingConfig = { mode: 'half_up', nearest: 0 };

/** Convert a rupee value (number or DECIMAL string from mysql2) to integer paise. */
export function toPaise(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Convert integer paise back to a rupee number with 2-decimal precision. */
export function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Round a rupee amount according to `cfg`.
 * Always returns a clean number (≤ 2 dp, or a whole multiple of `cfg.nearest`).
 */
export function roundMoney(value: unknown, cfg: Partial<RoundingConfig> = {}): number {
  const mode: RoundingMode = cfg.mode ?? DEFAULT_ROUNDING.mode;
  const nearest = cfg.nearest ?? DEFAULT_ROUNDING.nearest;

  // Work in paise, or in "nearest-rupee units" when a rupee step is configured.
  const unitPaise = nearest > 0 ? Math.round(nearest * 100) : 1;
  const raw = toPaise(value) / unitPaise;

  let unitsRounded: number;
  switch (mode) {
    case 'none':
      unitsRounded = Math.trunc(raw);
      break;
    case 'floor':
      unitsRounded = Math.floor(raw);
      break;
    case 'ceil':
      unitsRounded = Math.ceil(raw);
      break;
    case 'half_even': {
      const floor = Math.floor(raw);
      const diff = raw - floor;
      if (diff > 0.5) unitsRounded = floor + 1;
      else if (diff < 0.5) unitsRounded = floor;
      else unitsRounded = floor % 2 === 0 ? floor : floor + 1;
      break;
    }
    case 'half_up':
    default:
      // half away from zero
      unitsRounded = Math.sign(raw) * Math.round(Math.abs(raw));
      break;
  }
  return toRupees(unitsRounded * unitPaise);
}

/** Exact sum of many rupee amounts (adds in paise, then back to rupees). */
export function sumMoney(values: Array<unknown>): number {
  let paise = 0;
  for (const v of values) paise += toPaise(v);
  return toRupees(paise);
}

/** Exact `a - b` in rupees. */
export function subtractMoney(a: unknown, b: unknown): number {
  return toRupees(toPaise(a) - toPaise(b));
}

/** `base * fraction` (e.g. proration by attendance factor) rounded per `cfg`. */
export function prorate(base: unknown, fraction: number, cfg?: Partial<RoundingConfig>): number {
  return roundMoney(toRupees(Math.round(toPaise(base) * fraction)), cfg);
}

/** Parse a rounding config out of a payroll_settings-style row. Safe on junk. */
export function resolveRoundingConfig(row: any): RoundingConfig {
  const modeRaw = String(row?.rounding_mode ?? row?.roundingMode ?? '').toLowerCase().trim();
  const mode: RoundingMode =
    (['half_up', 'half_even', 'ceil', 'floor', 'none'] as const).includes(modeRaw as RoundingMode)
      ? (modeRaw as RoundingMode)
      : DEFAULT_ROUNDING.mode;
  const nearestRaw = Number(row?.rounding_nearest ?? row?.roundingNearest);
  const nearest = Number.isFinite(nearestRaw) && nearestRaw >= 0 ? nearestRaw : DEFAULT_ROUNDING.nearest;
  return { mode, nearest };
}
