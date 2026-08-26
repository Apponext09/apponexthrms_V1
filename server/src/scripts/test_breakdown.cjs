const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

const evaluateFormula = (formulaStr, ctx) => {
  if (!formulaStr || !formulaStr.trim()) return 0;
  let expr = formulaStr.toLowerCase().trim();

  // 1. Handle inline conditionals
  if (expr.includes('if')) {
    const ifMatch = expr.match(/\(?\s*if\s+([a-z_]+)\s*(<=|>=|<|>|==|=)\s*([0-9.]+)\s*\)?/i);
    if (ifMatch) {
      const varName = ifMatch[1].toLowerCase();
      const op = ifMatch[2];
      const threshold = Number(ifMatch[3]);
      const varVal = ctx[varName] ?? ctx['gross'] ?? 0;
      let condPassed = false;
      if (op === '<=') condPassed = varVal <= threshold;
      else if (op === '>=') condPassed = varVal >= threshold;
      else if (op === '<') condPassed = varVal < threshold;
      else if (op === '>') condPassed = varVal > threshold;
      else if (op === '=' || op === '==') condPassed = varVal === threshold;

      if (!condPassed) return 0;
      expr = expr.replace(ifMatch[0], '').trim();
    }
  }

  // 2. Handle descriptive English formulas
  if (expr.includes('income tax') || expr.includes('tax slab') || expr.includes('projection')) {
    const annualGross = (ctx.gross || 0) * 12;
    return annualGross > 700000 ? Math.round((annualGross - 700000) * 0.05 / 12) : 0;
  }
  if (expr.includes('residual') || expr.includes('balance') || expr.includes('ctc -') || expr.includes('gross -')) {
    const monthlyGross = ctx.gross || ctx.ctc || 0;
    const basic = ctx.basic || 0;
    const hra = ctx.hra || 0;
    const other = ctx.other || ctx.others || 0;
    return Math.max(0, monthlyGross - (basic + hra + other));
  }

  // 3. Normalize percentage expressions: e.g. "80% of gross" -> "(gross * (80 / 100))"
  expr = expr.replace(/([0-9.]+)\s*%\s*(?:of\s*)?([a-z_]+)/gi, '($2 * ($1 / 100))');
  expr = expr.replace(/([0-9.]+)\s*%/g, '($1 / 100)');
  expr = expr.replace(/\bof\b/gi, '*');

  // 4. Bind Math functions
  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(');
  expr = expr.replace(/\bmax\s*\(/gi, 'Math.max(');
  expr = expr.replace(/\bround\s*\(/gi, 'Math.round(');
  expr = expr.replace(/\bceil\s*\(/gi, 'Math.ceil(');
  expr = expr.replace(/\bfloor\s*\(/gi, 'Math.floor(');

  // 5. Replace mapped variable keys
  const sortedKeys = Object.keys(ctx).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (!k) continue;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    expr = expr.replace(regex, String(ctx[k] ?? 0));
  }

  try {
    const res = Function('Math', `'use strict'; return (${expr});`)(Math);
    return isNaN(res) || !isFinite(res) ? 0 : Math.round(res);
  } catch (e) {
    return 0;
  }
};

const calculateSalaryBreakdown = (annualCtc, slabId, slabs, compDefs) => {
  const ctc = Number(annualCtc) || 0;
  const monthlyGross = Math.round(ctc / 12);
  const chosenSlab = slabs.find(s => String(s.id) === String(slabId)) || slabs[0];

  let selectedIds = [];
  if (chosenSlab && (chosenSlab.selected_component_ids || chosenSlab.selectedComponentIds)) {
    try {
      const raw = chosenSlab.selected_component_ids || chosenSlab.selectedComponentIds;
      selectedIds = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
      selectedIds = selectedIds.map(String);
    } catch {}
  }

  const availableComps = selectedIds.length > 0
    ? compDefs.filter(c => selectedIds.includes(String(c.id)))
    : compDefs;

  const formulaCtx = {
    ctc: monthlyGross,
    monthly_ctc: monthlyGross,
    annual_ctc: ctc,
    gross: monthlyGross,
    gross_salary: monthlyGross,
    basic: 0,
    basic_salary: 0,
    hra: 0,
    other: 0,
    others: 0
  };

  const earningComps = [];
  const deductionComps = [];

  for (const comp of availableComps) {
    const nameLower = (comp.name || '').toLowerCase();
    const isDeduction = ['pf', 'provident', 'esic', 'esi', 'tax', 'tds', 'pt', 'professional', 'deduct'].some(k => nameLower.includes(k));
    if (isDeduction) deductionComps.push(comp);
    else earningComps.push(comp);
  }

  // Pass 1: Fixed non-basic earnings
  let fixedOtherSum = 0;
  for (const comp of earningComps) {
    const nameLower = (comp.name || '').toLowerCase();
    const cType = (comp.component_type || comp.componentType || comp.type || 'Value').toString();
    const amt = Number(comp.amount || 0);
    if (!nameLower.includes('basic') && !nameLower.includes('special') && !nameLower.includes('hra')) {
      if (cType === 'Value' && amt > 0) {
        fixedOtherSum += amt;
        const normKey = nameLower.replace(/[^a-z0-9]/g, '_');
        formulaCtx[normKey] = amt;
      }
    }
  }
  formulaCtx['other'] = fixedOtherSum;
  formulaCtx['others'] = fixedOtherSum;

  // Pass 2: Basic Component
  let basicAmount = 0;
  const basicComp = earningComps.find(c => (c.name || '').toLowerCase().includes('basic'));
  if (basicComp) {
    const bFormula = (basicComp.formula || '').trim();
    const bAmt = Number(basicComp.amount || 0);
    if (bFormula) {
      basicAmount = evaluateFormula(bFormula, formulaCtx);
    } else if (bAmt > 0) {
      basicAmount = bAmt;
    }
  }
  formulaCtx['basic'] = basicAmount;
  formulaCtx['basic_salary'] = basicAmount;

  // Pass 3: All other Earnings
  const earnings = [];
  let specialIdx = -1;
  let allocatedEarnings = 0;

  for (const comp of earningComps) {
    const name = comp.name || 'Component';
    const nameLower = name.toLowerCase();
    const formula = (comp.formula || '').trim();
    const configuredAmt = Number(comp.amount || 0);
    const compType = comp.component_type || comp.componentType || comp.type || 'Derived';

    let amt = 0;
    if (nameLower.includes('basic')) {
      amt = basicAmount;
    } else if (nameLower.includes('special') && (formula.includes('ctc -') || formula.includes('gross -') || nameLower.includes('allowance'))) {
      amt = -1; // residual placeholder
    } else if (formula) {
      amt = evaluateFormula(formula, formulaCtx);
    } else if (configuredAmt > 0) {
      amt = configuredAmt;
    }

    const minBound = Number(comp.min_amount || comp.minAmount || 0);
    const maxBound = Number(comp.max_amount || comp.maxAmount || 0);
    const hasBoundary = (comp.boundary_type && comp.boundary_type !== 'Choose') || (comp.boundaryType && comp.boundaryType !== 'Choose');
    if (hasBoundary && minBound > 0) amt = Math.max(minBound, amt);
    if (hasBoundary && maxBound > 0) amt = Math.min(maxBound, amt);

    const normKey = nameLower.replace(/[^a-z0-9]/g, '_');
    if (amt > 0) {
      formulaCtx[normKey] = amt;
      if (nameLower.includes('hra')) formulaCtx['hra'] = amt;
    }

    if (amt !== -1) allocatedEarnings += amt;

    earnings.push({
      id: comp.id,
      name,
      category: 'Earning',
      type: compType,
      formula,
      amount: amt
    });

    if (amt === -1) specialIdx = earnings.length - 1;
  }

  if (specialIdx >= 0) {
    const sa = Math.max(0, monthlyGross - allocatedEarnings);
    earnings[specialIdx].amount = sa;
    formulaCtx['special_allowance'] = sa;
  }

  // Pass 4: Deductions
  const deductions = [];
  for (const comp of deductionComps) {
    const name = comp.name || 'Deduction';
    const formula = (comp.formula || '').trim();
    const configuredAmt = Number(comp.amount || 0);
    const compType = comp.component_type || comp.componentType || comp.type || 'Derived';

    let amt = 0;
    if (formula) {
      amt = evaluateFormula(formula, formulaCtx);
    } else if (configuredAmt > 0) {
      amt = configuredAmt;
    }

    const minBound = Number(comp.min_amount || comp.minAmount || 0);
    const maxBound = Number(comp.max_amount || comp.maxAmount || 0);
    const hasBoundary = (comp.boundary_type && comp.boundary_type !== 'Choose') || (comp.boundaryType && comp.boundaryType !== 'Choose');
    if (hasBoundary && minBound > 0) amt = Math.max(minBound, amt);
    if (hasBoundary && maxBound > 0) amt = Math.min(maxBound, amt);

    deductions.push({
      id: comp.id,
      name,
      category: 'Deduction',
      type: compType,
      formula,
      amount: amt
    });
  }

  return { earnings, deductions };
};

Promise.all([
  db('payroll_slabs').whereNull('deleted_at'),
  db('payroll_components').whereNull('deleted_at')
]).then(([slabs, comps]) => {
  console.log('=== TEST RESULT FOR SLAB 2 ("Monthly") CTC = 400000 ===');
  const res = calculateSalaryBreakdown(400000, 2, slabs, comps);
  console.log('EARNINGS:', JSON.stringify(res.earnings, null, 2));
  console.log('DEDUCTIONS:', JSON.stringify(res.deductions, null, 2));
  process.exit(0);
});
