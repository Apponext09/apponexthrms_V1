import { describe, it, expect } from 'vitest';
import { resolvePeriodContext } from './payroll.period';

const monthlyCycle = { frequency: 'Monthly', start_date: 1, cutoff_day: 25, total_days_calc: 30 };

describe('resolvePeriodContext', () => {
  it('full-month employee, no leave → full pay (cutoff_day must NOT reduce pay)', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: '2020-01-01' } });
    expect(p.totalDays).toBe(30);
    expect(p.payableDays).toBe(30);
    expect(p.lopRatio).toBe(1);
    expect(p.lopDays).toBe(0);
  });

  it('February is 28/28, not 30 or 31 (leap-safe divisor from calendar)', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-02', cycleRow: { frequency: 'Monthly' }, empRow: {} });
    expect(p.monthDays).toBe(28);
    expect(p.totalDays).toBe(28);
    expect(p.payableDays).toBe(28);
  });
  it('Feb 2028 is a leap year → 29', () => {
    expect(resolvePeriodContext({ runMonthStr: '2028-02', empRow: {} }).monthDays).toBe(29);
  });

  it('mid-month joiner: DOJ 9th of a 30-day month → 22/30', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: '2026-09-09' } });
    expect(p.activeStartDay).toBe(9);
    expect(p.activeDays).toBe(22);
    expect(p.payableDays).toBe(22);
    expect(p.lopRatio).toBeCloseTo(22 / 30, 5);
    expect(p.isNewJoiner).toBe(true);
  });

  it('DOJ parsing is timezone-safe (UTC-midnight DATE stays same day)', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: new Date('2026-09-09T00:00:00.000Z') } });
    expect(p.activeStartDay).toBe(9);
  });

  it('mid-month leaver: last working day 10th → 10/30', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: '2020-01-01', last_working_date: '2026-09-10' } });
    expect(p.activeEndDay).toBe(10);
    expect(p.activeDays).toBe(10);
    expect(p.payableDays).toBe(10);
    expect(p.isExiting).toBe(true);
  });

  it('joined after the run month → zero pay', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: '2026-11-01' } });
    expect(p.activeDays).toBe(0);
    expect(p.payableDays).toBe(0);
    expect(p.lopRatio).toBe(0);
  });

  it('unpaid leave reduces payable days but not below zero', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: {}, unpaidLeaveDays: 4 });
    expect(p.lopDays).toBe(4);
    expect(p.payableDays).toBe(26);
    expect(p.lopRatio).toBeCloseTo(26 / 30, 5);
  });

  it('absence + half days from attendance count as LOP', () => {
    const p = resolvePeriodContext({
      runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: {},
      attendance: { recordCount: 20, absentDays: 2, halfDays: 2 },
    });
    expect(p.lopDays).toBe(3); // 2 absent + 2×0.5
    expect(p.payableDays).toBe(27);
  });

  it('no attendance rows → assumed present (not zero)', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: {}, attendance: { recordCount: 0 } });
    expect(p.payableDays).toBe(30);
    expect(p.notes.join(' ')).toMatch(/assumed present/i);
  });

  it('leave cannot exceed employed days (joiner on 20th with 20 unpaid days)', () => {
    const p = resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: monthlyCycle, empRow: { date_of_joining: '2026-09-20' }, unpaidLeaveDays: 20 });
    expect(p.activeDays).toBe(11);
    expect(p.lopDays).toBe(11);
    expect(p.payableDays).toBe(0);
  });

  it('weekly cycle divisor', () => {
    expect(resolvePeriodContext({ runMonthStr: '2026-09', cycleRow: { frequency: 'Weekly' }, empRow: {} }).totalDays).toBe(7);
  });
});
