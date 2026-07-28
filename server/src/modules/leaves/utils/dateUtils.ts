/**
 * Converts a Date object or date-string to local calendar YYYY-MM-DD format
 * in a timezone-safe manner (defaulting to Asia/Kolkata to align with Indian FY).
 */
export function toLocalYYYYMMDD(date: Date | string, timeZone: string = 'Asia/Kolkata'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Helper to calculate the financial year start date (Indian FY: April 1st).
 * Timezone-safe string parsing ensures no timezone shifts alter the calculations.
 * @param dateStr Date string in format YYYY-MM-DD or ISO string
 */
export function calculateFinancialYearStart(dateStr: string): string {
  const localDateStr = toLocalYYYYMMDD(dateStr); // guaranteed 'YYYY-MM-DD'
  const parts = localDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-indexed (Jan = 1, Dec = 12)

  // FY starts in April (month 4). If Jan, Feb, or Mar, it belongs to the previous year.
  if (month < 4) {
    return `${year - 1}-04-01`;
  }
  return `${year}-04-01`;
}

/**
 * Helper to calculate the financial year end date (Indian FY: March 31st)
 * @param fyStart Financial year start date string in format YYYY-MM-DD
 */
export function calculateFinancialYearEnd(fyStart: string): string {
  const year = parseInt(fyStart.substring(0, 4), 10);
  return `${year + 1}-03-31`;
}
