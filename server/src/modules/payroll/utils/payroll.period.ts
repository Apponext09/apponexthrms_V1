/**
 * payroll.period.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for "how many days of this month does the employee get
 * paid for, and what is the per-day divisor?".
 *
 * Previously `PayrollService.processPayroll` and `PayslipService.getPayslipDetails`
 * each had their own ~80-line copy of this logic, and they disagreed (payslip
 * attendance summary vs. actual pay). They also conflated the pay period with
 * the cycle's *data cut-off day* — a 1st–30th monthly cycle with a 25th cut-off
 * was paying everyone only 25/30 of their salary.
 *
 * Rules
 *  - Pay period = the calendar run month. `cutoff_day` gates which
 *    attendance/leave rows are *counted*, it never shortens the pay period.
 *    (True offset cycles — "26th to 25th" — are not modelled yet; noted.)
 *  - Divisor (`totalDays`): policy fixed working days → cycle total_days_calc →
 *    frequency shortcut → calendar days in the month.
 *  - Proration for a mid-month joiner / leaver is by *active calendar days*.
 *  - LOP = unpaid leave + unauthorised absence + half-day fractions. Approved
 *    *paid* leave is NOT loss of pay.
 *  - With zero attendance rows we assume the employee was present (never prorate
 *    a full-time employee to zero just because punches are missing).
 */

export interface PeriodContext {
  periodStart: string;          // 'YYYY-MM-DD'
  periodEnd: string;            // 'YYYY-MM-DD' (real last day of month)
  monthDays: number;
  totalDays: number;           // per-day divisor
  activeStartDay: number;      // 1-based; monthDays+1 ⇒ not yet on payroll
  activeEndDay: number;        // 0 ⇒ already left before the month
  activeDays: number;          // employed calendar days within the month
  unpaidLeaveDays: number;
  absentDays: number;
  halfDayDeductionDays: number;
  lopDays: number;             // true loss-of-pay days (leave+absence+half)
  payableDays: number;         // activeDays − lopDays
  nonEmployedDays: number;     // totalDays − activeDays (joiner/leaver gap)
  lopRatio: number;            // payableDays / totalDays, clamped to [0,1]
  isNewJoiner: boolean;
  isExiting: boolean;
  notes: string[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Parse a Y-M-D out of a date value without letting the local timezone shift the day. */
function ymd(value: any): { y: number; m: number; d: number } | null {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    // A DB DATE comes back as UTC midnight; use the UTC parts so "2026-09-09"
    // stays the 9th regardless of server TZ.
    return { y: value.getUTCFullYear(), m: value.getUTCMonth() + 1, d: value.getUTCDate() };
  }
  const s = String(value);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  return null;
}

const firstDefined = (obj: any, ...keys: string[]) => {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  return undefined;
};

export function resolvePeriodContext(input: {
  runMonthStr: string;                 // 'YYYY-MM'
  cycleRow?: any;
  empRow?: any;
  policyRow?: any;
  unpaidLeaveDays?: number;
  attendance?: { recordCount: number; presentDays?: number; absentDays?: number; halfDays?: number };
}): PeriodContext {
  const notes: string[] = [];
  const [runYear, runMon] = input.runMonthStr.split('-').map(Number);
  const monthDays = new Date(runYear, runMon, 0).getDate();
  const periodStart = `${input.runMonthStr}-01`;
  const periodEnd = `${input.runMonthStr}-${pad2(monthDays)}`;

  // ── Divisor ──────────────────────────────────────────────────────────────
  const cyc = input.cycleRow || {};
  const policyFixed = Number(firstDefined(input.policyRow, 'fixed_working_days', 'fixedWorkingDays'));
  const cycleTotal = Number(firstDefined(cyc, 'total_days_calc', 'totalDaysCalc'));
  const freq = String(firstDefined(cyc, 'frequency', 'cycle_frequency') || '').toLowerCase();
  let totalDays: number;
  if (Number.isFinite(policyFixed) && policyFixed > 0) totalDays = policyFixed;
  else if (Number.isFinite(cycleTotal) && cycleTotal > 0) totalDays = cycleTotal;
  else if (freq === 'weekly') totalDays = 7;
  else if (freq === 'bi-weekly' || freq === 'fortnightly') totalDays = 14;
  else if (freq === 'semi-monthly') totalDays = 15;
  else totalDays = monthDays;

  // ── Active window (joiner / leaver) ──────────────────────────────────────
  let activeStartDay = 1;
  let activeEndDay = monthDays;
  let isNewJoiner = false;
  let isExiting = false;

  const doj = ymd(firstDefined(input.empRow, 'date_of_joining', 'dateOfJoining', 'doj', 'joining_date'));
  if (doj) {
    if (doj.y === runYear && doj.m === runMon) {
      activeStartDay = Math.max(1, doj.d);
      isNewJoiner = activeStartDay > 1;
      if (isNewJoiner) notes.push(`Joined on day ${doj.d} — prorated from there`);
    } else if (doj.y > runYear || (doj.y === runYear && doj.m > runMon)) {
      activeStartDay = monthDays + 1;
      notes.push('Not yet joined in this period');
    }
  }

  const exit = ymd(
    firstDefined(
      input.empRow,
      'relieving_date', 'relievingDate',
      'last_working_date', 'lastWorkingDate', 'last_working_day',
      'exit_date', 'exitDate',
      'termination_date', 'terminationDate',
      'resignation_date', 'resignationDate', 'date_of_leaving', 'date_of_exit'
    )
  );
  if (exit) {
    if (exit.y === runYear && exit.m === runMon) {
      activeEndDay = Math.min(monthDays, Math.max(0, exit.d));
      isExiting = activeEndDay < monthDays;
      if (isExiting) notes.push(`Last working day ${exit.d} — prorated to there`);
    } else if (exit.y < runYear || (exit.y === runYear && exit.m < runMon)) {
      activeEndDay = 0;
      notes.push('Already exited before this period');
    }
  }

  const activeDays = Math.max(0, Math.min(monthDays, activeEndDay) - Math.max(1, activeStartDay) + 1);
  const clampedActive = Math.max(0, Math.min(activeDays, monthDays));

  // ── Loss of pay: unpaid leave + unauthorised absence + half days ─────────
  const unpaidLeaveDays = Math.max(0, Number(input.unpaidLeaveDays || 0));
  const att = input.attendance;
  let absentDays = 0;
  let halfDayDeductionDays = 0;
  if (att && att.recordCount > 0) {
    absentDays = Math.max(0, Number(att.absentDays || 0));
    halfDayDeductionDays = Math.max(0, Number(att.halfDays || 0)) * 0.5;
  } else if (att && att.recordCount === 0) {
    notes.push('No attendance records — assumed present for the full active period');
  }

  // Don't let leave + absence exceed the days actually employed.
  const rawLop = unpaidLeaveDays + absentDays + halfDayDeductionDays;
  const lopDays = Math.min(clampedActive, Number(rawLop.toFixed(2)));
  const payableDays = Math.max(0, Number((clampedActive - lopDays).toFixed(2)));
  const nonEmployedDays = Math.max(0, totalDays - clampedActive);
  const lopRatio = totalDays > 0 ? Math.max(0, Math.min(1, payableDays / totalDays)) : 1;

  return {
    periodStart,
    periodEnd,
    monthDays,
    totalDays,
    activeStartDay,
    activeEndDay,
    activeDays: clampedActive,
    unpaidLeaveDays,
    absentDays,
    halfDayDeductionDays,
    lopDays,
    payableDays,
    nonEmployedDays,
    lopRatio,
    isNewJoiner,
    isExiting,
    notes,
  };
}
