import { describe, it, expect } from 'vitest';
import {
  getDefaultWeeklyWorkPattern,
  resolveWorkingDate,
} from '../utils/settingsResolver';
import {
  toLocalYYYYMMDD,
  calculateFinancialYearStart,
  calculateFinancialYearEnd,
} from '../utils/dateUtils';

// ─────────────────────────────────────────────────────────
//  1. getDefaultWeeklyWorkPattern
// ─────────────────────────────────────────────────────────
describe('getDefaultWeeklyWorkPattern', () => {
  it('should include all 7 days', () => {
    const p = getDefaultWeeklyWorkPattern();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const d of days) {
      expect(p).toHaveProperty(d);
    }
  });

  it('should mark Mon-Fri as working with 09:00-18:00', () => {
    const p = getDefaultWeeklyWorkPattern();
    for (const d of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
      expect(p[d].is_working).toBe(true);
      expect(p[d].start).toBe('09:00');
      expect(p[d].end).toBe('18:00');
    }
  });

  it('should mark Saturday and Sunday as non-working', () => {
    const p = getDefaultWeeklyWorkPattern();
    expect(p.saturday.is_working).toBe(false);
    expect(p.sunday.is_working).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
//  2. resolveWorkingDate — standard shifts
// ─────────────────────────────────────────────────────────
describe('resolveWorkingDate', () => {
  const standardPattern = getDefaultWeeklyWorkPattern();

  it('should return the same date for a mid-day timestamp on a standard shift', () => {
    // 2026-08-03 is a Monday
    const result = resolveWorkingDate(new Date('2026-08-03T12:30:00'), standardPattern);
    expect(result).toBe('2026-08-03');
  });

  it('should return the same date when timestamp is exactly at shift start', () => {
    const result = resolveWorkingDate(new Date('2026-08-04T09:00:00'), standardPattern);
    expect(result).toBe('2026-08-04');
  });

  // ─── Overnight shift tests ────────────────────────────
  describe('overnight shift crossing midnight', () => {
    const nightPattern: Record<string, any> = {
      sunday: { is_working: false },
      monday: { is_working: true, start: '22:00', end: '06:00' },
      tuesday: { is_working: true, start: '22:00', end: '06:00' },
      wednesday: { is_working: true, start: '22:00', end: '06:00' },
      thursday: { is_working: true, start: '22:00', end: '06:00' },
      friday: { is_working: true, start: '22:00', end: '06:00' },
      saturday: { is_working: false },
    };

    it('should map 01:00 Tuesday to Monday when Monday has a 22:00-06:00 shift', () => {
      // 2026-08-04 is a Tuesday — but at 01:00 it's still Monday's shift
      const result = resolveWorkingDate(new Date('2026-08-04T01:00:00'), nightPattern);
      expect(result).toBe('2026-08-03');
    });

    it('should map 06:00 Tuesday to Monday (boundary end time)', () => {
      const result = resolveWorkingDate(new Date('2026-08-04T06:00:00'), nightPattern);
      expect(result).toBe('2026-08-03');
    });

    it('should keep 23:00 Tuesday on Tuesday (still in Tuesday shift)', () => {
      const result = resolveWorkingDate(new Date('2026-08-04T23:00:00'), nightPattern);
      expect(result).toBe('2026-08-04');
    });

    it('should return the current date when previous day is non-working (Sunday)', () => {
      // 2026-08-03 is a Monday; Sunday is non-working so no overnight carry
      const result = resolveWorkingDate(new Date('2026-08-03T02:00:00'), nightPattern);
      expect(result).toBe('2026-08-03');
    });
  });
});

// ─────────────────────────────────────────────────────────
//  3. toLocalYYYYMMDD
// ─────────────────────────────────────────────────────────
describe('toLocalYYYYMMDD', () => {
  it('should format a Date object to YYYY-MM-DD', () => {
    // Using an explicit date string that's unambiguous
    const result = toLocalYYYYMMDD('2026-06-15T12:00:00Z', 'Asia/Kolkata');
    expect(result).toBe('2026-06-15');
  });

  it('should return empty string for invalid date', () => {
    expect(toLocalYYYYMMDD('not-a-date')).toBe('');
  });

  it('should pad single-digit months and days', () => {
    const result = toLocalYYYYMMDD('2026-01-05T12:00:00Z', 'Asia/Kolkata');
    expect(result).toBe('2026-01-05');
  });
});

// ─────────────────────────────────────────────────────────
//  4. calculateFinancialYearStart — with configurable start month
// ─────────────────────────────────────────────────────────
describe('calculateFinancialYearStart', () => {
  describe('default April start (Indian FY)', () => {
    it('should return same-year April 1 when month is April or later', () => {
      expect(calculateFinancialYearStart('2026-07-15')).toBe('2026-04-01');
      expect(calculateFinancialYearStart('2026-04-01')).toBe('2026-04-01');
      expect(calculateFinancialYearStart('2026-12-31')).toBe('2026-04-01');
    });

    it('should return previous-year April 1 when month is before April', () => {
      expect(calculateFinancialYearStart('2027-01-15')).toBe('2026-04-01');
      expect(calculateFinancialYearStart('2027-02-28')).toBe('2026-04-01');
      expect(calculateFinancialYearStart('2027-03-31')).toBe('2026-04-01');
    });
  });

  describe('January start (calendar year)', () => {
    it('should always return Jan 1 of the same year', () => {
      expect(calculateFinancialYearStart('2026-01-01', 1)).toBe('2026-01-01');
      expect(calculateFinancialYearStart('2026-06-15', 1)).toBe('2026-01-01');
      expect(calculateFinancialYearStart('2026-12-31', 1)).toBe('2026-01-01');
    });
  });

  describe('July start (Australian FY)', () => {
    it('should return same-year July 1 when month >= 7', () => {
      expect(calculateFinancialYearStart('2026-07-01', 7)).toBe('2026-07-01');
      expect(calculateFinancialYearStart('2026-11-20', 7)).toBe('2026-07-01');
    });

    it('should return previous-year July 1 when month < 7', () => {
      expect(calculateFinancialYearStart('2026-03-15', 7)).toBe('2025-07-01');
      expect(calculateFinancialYearStart('2026-06-30', 7)).toBe('2025-07-01');
    });
  });
});

// ─────────────────────────────────────────────────────────
//  5. calculateFinancialYearEnd
// ─────────────────────────────────────────────────────────
describe('calculateFinancialYearEnd', () => {
  it('should return Mar 31 of next year for Indian FY starting April', () => {
    expect(calculateFinancialYearEnd('2026-04-01')).toBe('2027-03-31');
  });

  it('should return Dec 31 of same year for calendar FY starting January', () => {
    expect(calculateFinancialYearEnd('2026-01-01')).toBe('2026-12-31');
  });

  it('should return June 30 of next year for Australian FY starting July', () => {
    expect(calculateFinancialYearEnd('2026-07-01')).toBe('2027-06-30');
  });

  it('should handle February end correctly (non-leap year)', () => {
    // FY starting March 2026 => ends Feb 28, 2027
    expect(calculateFinancialYearEnd('2026-03-01')).toBe('2027-02-28');
  });

  it('should handle February end correctly (leap year)', () => {
    // FY starting March 2027 => ends Feb 29, 2028 (2028 is a leap year)
    expect(calculateFinancialYearEnd('2027-03-01')).toBe('2028-02-29');
  });
});
