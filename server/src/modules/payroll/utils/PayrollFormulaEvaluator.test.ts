import { describe, it, expect } from 'vitest';
import { PayrollFormulaEvaluator } from './PayrollFormulaEvaluator';

const ctx = { ctc: 1200000, annual_ctc: 1200000, monthly_ctc: 100000, gross: 100000, basic: 50000 };

describe('PayrollFormulaEvaluator.evaluate — legitimate formulas', () => {
  it('percentage of basic', () => {
    expect(PayrollFormulaEvaluator.evaluate('40% of basic', ctx)).toBe(20000);
  });
  it('arithmetic on gross', () => {
    expect(PayrollFormulaEvaluator.evaluate('gross / 12', { gross: 120000 })).toBe(10000);
  });
  it('min() cap', () => {
    expect(PayrollFormulaEvaluator.evaluate('min(basic * 0.12, 1800)', ctx)).toBe(1800);
  });
  it('bracket notation', () => {
    expect(PayrollFormulaEvaluator.evaluate('[basic] * 0.5', ctx)).toBe(25000);
  });
  it('plain number', () => {
    expect(PayrollFormulaEvaluator.evaluate('1600', ctx)).toBe(1600);
  });
});

describe('PayrollFormulaEvaluator.evaluate — injection / unsafe input is refused', () => {
  const attacks = [
    "process.exit(1)",
    "require('fs')",
    "global.process",
    "(()=>{return 1})()",
    "this.constructor.constructor('return process')()",
    "gross.constructor",
    "1;while(true){}",
    "`${gross}`",
    "basic + unknownVariableThatWasNeverResolved",
  ];
  for (const a of attacks) {
    it(`returns 0 for ${JSON.stringify(a)}`, () => {
      expect(PayrollFormulaEvaluator.evaluate(a, ctx)).toBe(0);
    });
  }

  it('rejects an over-long formula', () => {
    expect(PayrollFormulaEvaluator.evaluate('1+'.repeat(300) + '1', ctx)).toBe(0);
  });
});
