import { describe, it, expect } from 'vitest';
import { classifyComponent, isProvidentFund } from './payroll.classify';

const earn = (name: string, extra: any = {}) => ({ name, group_category: 'Earning', ...extra });
const ded = (name: string, extra: any = {}) => ({ name, group_category: 'Deduction', ...extra });

describe('classifyComponent — explicit column wins', () => {
  it('uses statutory_code when present', () => {
    const c = classifyComponent(ded('Retirement Contribution', { statutory_code: 'epf', is_statutory: 1 }));
    expect(c.statutoryCode).toBe('epf');
    expect(c.isStatutory).toBe(true);
  });
  it('camelCase key also works (knex hook)', () => {
    expect(classifyComponent(ded('X', { statutoryCode: 'esi' })).statutoryCode).toBe('esi');
  });
  it('is_statutory=0 (the column default) still allows heuristic fallback', () => {
    // 0 means "not yet classified", not "forced non-statutory" — a component
    // literally named "Provident Fund" is still PF.
    const c = classifyComponent(ded('Provident Fund', { is_statutory: 0 }));
    expect(c.statutoryCode).toBe('epf');
  });
  it('a non-statutory-named component with is_statutory=0 stays unclassified', () => {
    const c = classifyComponent(ded('Mess Recovery', { is_statutory: 0 }));
    expect(c.statutoryCode).toBeNull();
    expect(c.isStatutory).toBe(false);
  });
});

describe('classifyComponent — name heuristics (legacy rows, no column)', () => {
  it('PF / EPF / Provident Fund', () => {
    expect(classifyComponent(ded('Provident Fund')).statutoryCode).toBe('epf');
    expect(classifyComponent(ded('EPF Employee')).statutoryCode).toBe('epf');
    expect(classifyComponent(ded('PF 12% on Basic')).statutoryCode).toBe('epf');
  });
  it('ESI but NOT "insurance" (the old bug)', () => {
    expect(classifyComponent(ded('ESIC')).statutoryCode).toBe('esi');
    expect(classifyComponent(ded('Employee State Insurance')).statutoryCode).toBe('esi');
    expect(classifyComponent(ded('Group Health Insurance')).statutoryCode).toBeNull();
  });
  it('Professional Tax but NOT bare substrings like "Receipt" (the old bug)', () => {
    expect(classifyComponent(ded('Professional Tax')).statutoryCode).toBe('pt');
    expect(classifyComponent(ded('PT')).statutoryCode).toBe('pt');
    expect(classifyComponent(earn('Receipt Reimbursement')).statutoryCode).toBeNull();
    expect(classifyComponent(earn('Option Premium')).statutoryCode).toBeNull();
  });
  it('TDS / income tax', () => {
    expect(classifyComponent(ded('TDS (Tax Deducted at Source)')).statutoryCode).toBe('tds');
    expect(classifyComponent(ded('Income Tax')).statutoryCode).toBe('tds');
  });
  it('EPS vs EPF vs VPF disambiguation', () => {
    expect(classifyComponent(ded('EPS Wages')).statutoryCode).toBe('eps');
    expect(classifyComponent(ded('VPF Contribution')).statutoryCode).toBe('vpf');
    expect(isProvidentFund(ded('VPF Contribution'))).toBe(true);
  });
});

describe('classifyComponent — earning roles', () => {
  it('Basic is an earning literally named basic, not "PF on Basic"', () => {
    expect(classifyComponent(earn('Basic')).isBasic).toBe(true);
    expect(classifyComponent(earn('Basic Salary (50%)')).isBasic).toBe(true);
    expect(classifyComponent(ded('PF 12% on Basic')).isBasic).toBe(false);
  });
  it('special allowance residual detection', () => {
    expect(classifyComponent(earn('Special Allowance')).isSpecialAllowanceResidual).toBe(true);
    expect(classifyComponent(earn('Balance Allowance')).isSpecialAllowanceResidual).toBe(true);
    expect(classifyComponent(earn('Transport Allowance')).isSpecialAllowanceResidual).toBe(false);
  });
  it('HRA', () => {
    expect(classifyComponent(earn('HRA')).isHRA).toBe(true);
    expect(classifyComponent(earn('House Rent Allowance')).isHRA).toBe(true);
  });
});
