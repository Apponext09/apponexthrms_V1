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
 * Helper to calculate the financial year start date.
 * Timezone-safe string parsing ensures no timezone shifts alter the calculations.
 * @param dateStr Date string in format YYYY-MM-DD or ISO string
 * @param startMonth Start month of the holiday/financial year (1-12, default 4 for April)
 */
export function calculateFinancialYearStart(dateStr: string, startMonth: number = 4): string {
  const localDateStr = toLocalYYYYMMDD(dateStr); // guaranteed 'YYYY-MM-DD'
  const parts = localDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-indexed (Jan = 1, Dec = 12)

  if (month < startMonth) {
    return `${year - 1}-${String(startMonth).padStart(2, '0')}-01`;
  }
  return `${year}-${String(startMonth).padStart(2, '0')}-01`;
}

/**
 * Helper to calculate the financial year end date
 * @param fyStart Financial year start date string in format YYYY-MM-DD
 */
export function calculateFinancialYearEnd(fyStart: string): string {
  const parts = fyStart.split('-');
  const year = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10);

  if (startMonth === 1) {
    return `${year}-12-31`;
  }
  const endYear = year + 1;
  const endMonth = startMonth - 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  return `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
