// ============================================================
// Local-date helpers for Live Tracking
// client/src/features/Livetracking/utils/dates.ts
//
// `new Date().toISOString().slice(0, 10)` is the UTC date — in IST it is
// still "yesterday" until 05:30, which loaded the wrong day's trail/history.
// ============================================================

/** Browser-local calendar date as YYYY-MM-DD */
export function localDateStr(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a YYYY-MM-DD date by whole days (local calendar, DST-safe) */
export function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d + days));
}
