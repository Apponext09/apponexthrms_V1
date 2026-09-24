import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, roundMoney, sumMoney, subtractMoney, prorate, resolveRoundingConfig } from './payroll.money';

describe('payroll.money', () => {
  it('toPaise / toRupees round-trip', () => {
    expect(toPaise('1234.56')).toBe(123456);
    expect(toRupees(123456)).toBe(1234.56);
    expect(toPaise(null)).toBe(0);
    expect(toPaise('abc')).toBe(0);
  });

  it('sumMoney does not drift on classic float cases', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);            // 0.1+0.2 !== 0.3 in raw JS
    expect(sumMoney([1728.03, 2400.01, 5040.55])).toBe(9168.59);
    // 12 identical components that each end in .33
    expect(sumMoney(Array(12).fill(4166.67))).toBe(50000.04);
  });

  it('subtractMoney is exact', () => {
    expect(subtractMoney(100000, 46666.66)).toBe(53333.34);
  });

  it('roundMoney half_up to whole rupees', () => {
    expect(roundMoney(1800.5, { mode: 'half_up', nearest: 1 })).toBe(1801);
    expect(roundMoney(1800.49, { mode: 'half_up', nearest: 1 })).toBe(1800);
    expect(roundMoney(-2.5, { mode: 'half_up', nearest: 1 })).toBe(-3); // away from zero
  });

  it('roundMoney half_even (banker\'s)', () => {
    expect(roundMoney(2.5, { mode: 'half_even', nearest: 1 })).toBe(2);
    expect(roundMoney(3.5, { mode: 'half_even', nearest: 1 })).toBe(4);
    expect(roundMoney(2.51, { mode: 'half_even', nearest: 1 })).toBe(3);
  });

  it('roundMoney floor / ceil / none', () => {
    expect(roundMoney(1899.99, { mode: 'floor', nearest: 1 })).toBe(1899);
    expect(roundMoney(1800.01, { mode: 'ceil', nearest: 1 })).toBe(1801);
    expect(roundMoney(1800.99, { mode: 'none', nearest: 1 })).toBe(1800);
  });

  it('roundMoney nearest:0 keeps paise', () => {
    expect(roundMoney(1234.5678)).toBe(1234.57);
  });

  it('prorate applies fraction then rounds', () => {
    expect(prorate(50000, 22 / 30, { mode: 'half_up', nearest: 0 })).toBe(36666.67);
    expect(prorate(50000, 22 / 30, { mode: 'half_up', nearest: 1 })).toBe(36667);
  });

  it('resolveRoundingConfig tolerates junk', () => {
    expect(resolveRoundingConfig({ rounding_mode: 'CEIL', rounding_nearest: '1' })).toEqual({ mode: 'ceil', nearest: 1 });
    expect(resolveRoundingConfig({})).toEqual({ mode: 'half_up', nearest: 0 });
    expect(resolveRoundingConfig({ rounding_mode: 'nonsense', rounding_nearest: -5 })).toEqual({ mode: 'half_up', nearest: 0 });
  });
});
