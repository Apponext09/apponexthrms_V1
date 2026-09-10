import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardized Date Formatter for Payroll & Enterprise Modules
 * Output Format: "19 Aug 2026" (Day Month Year)
 */
export function formatPayrollDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  try {
    const str = String(dateVal).trim();
    if (!str || str === 'null' || str === 'undefined') return '—';

    // Handle 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS'
    const cleanDate = str.split('T')[0].split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(m, 10) - 1;
      const monthStr = monthNames[mIdx] || m;
      const dayStr = String(parseInt(d, 10)).padStart(2, '0');
      return `${dayStr} ${monthStr} ${y}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return str;
  } catch {
    return String(dateVal || '—');
  }
}

/**
 * Standardized Month-Year Formatter
 * Output Format: "August 2026"
 */
export function formatPayrollMonth(monthVal?: string | Date | null): string {
  if (!monthVal) return '—';
  try {
    const str = String(monthVal).trim();
    const parts = str.split('-');
    if (parts.length >= 2) {
      const [y, m] = parts;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const mIdx = parseInt(m, 10) - 1;
      return `${monthNames[mIdx] || m} ${y}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return str;
  } catch {
    return String(monthVal || '—');
  }
}
