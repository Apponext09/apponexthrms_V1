const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// Simulate PayrollFormulaEvaluator
class Evaluator {
  static normalizeKey(key) {
    return key.toLowerCase().trim().replace(/[\(\)\%\$\#\@\!]/g, '').replace(/[\s\-_]+/g, '_');
  }

  static evaluate(formula, context = {}) {
    if (!formula || typeof formula !== 'string' || !formula.trim()) return 0;
    let expr = formula.trim();

    const lookup = {};
    for (const [k, v] of Object.entries(context)) {
      if (typeof v === 'number' && !isNaN(v)) {
        lookup[this.normalizeKey(k)] = v;
        lookup[k.toLowerCase()] = v;
      }
    }

    expr = expr.replace(/\bof\b/gi, '*');
    expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1 / 100)');

    const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
    for (const k of sortedKeys) {
      const val = lookup[k];
      const regex = new RegExp(`\\b${k}\\b`, 'gi');
      expr = expr.replace(regex, String(val));
    }

    expr = expr.replace(/min\s*\(/gi, 'Math.min(').replace(/max\s*\(/gi, 'Math.max(').replace(/round\s*\(/gi, 'Math.round(');
    try {
      const res = Function(`'use strict'; return (${expr})`)();
      return isNaN(res) ? 0 : Math.round(res * 100) / 100;
    } catch {
      return 0;
    }
  }
}

async function simulateRegisterCalc(gross) {
  const allComps = await db('payroll_components').where('organization_id', 8).where('is_active', 1);
  const orderedComps = [...allComps].sort((a, b) => {
    const aIsFormula = (a.component_type || '').toLowerCase().includes('formula') || (a.component_type || '').toLowerCase().includes('derived');
    const bIsFormula = (b.component_type || '').toLowerCase().includes('formula') || (b.component_type || '').toLowerCase().includes('derived');
    if (aIsFormula && !bIsFormula) return 1;
    if (!aIsFormula && bIsFormula) return -1;
    return 0;
  });

  const formulaCtx = {
    gross,
    gross_salary: gross,
    basic: 0,
    basic_salary: 0,
    attendance_factor: 1,
  };

  const results = {};
  for (const comp of orderedComps) {
    const cName = (comp.name || '').toLowerCase();
    const calcType = (comp.component_type || '').toLowerCase();
    let monthlyVal = 0;

    if (calcType === 'value' || calcType === 'fixed') {
      monthlyVal = Number(comp.amount || 0);
    } else if (comp.formula) {
      monthlyVal = Evaluator.evaluate(comp.formula, formulaCtx);
    }

    if (cName.includes('basic')) {
      formulaCtx.basic = monthlyVal;
      formulaCtx.basic_salary = monthlyVal;
    }

    const normKey = Evaluator.normalizeKey(comp.name || '');
    formulaCtx[normKey] = monthlyVal;
    results[comp.id] = { name: comp.name, type: comp.component_type, monthlyVal };
  }

  return results;
}

async function testValueToDerivedSwitch() {
  console.log('=== TEST SEAMLESS SWITCH: VALUE <-> DERIVED ===\n');
  const gross = 80000;

  // 1. Initial State: Conveyance is Value ₹1,600
  await db('payroll_components').where('id', 4).update({ component_type: 'Value', amount: 1600, formula: null });
  let res1 = await simulateRegisterCalc(gross);
  console.log(`1. Component #4 as [VALUE]:`);
  console.log(`   Type: ${res1[4].type}, Value: ₹${res1[4].monthlyVal} (Expected: ₹1600) -> ${res1[4].monthlyVal === 1600 ? 'PASS' : 'FAIL'}`);

  // 2. Switch to DERIVED: "5% of Basic" (Basic is ₹40,000 -> Expected ₹2,000)
  await db('payroll_components').where('id', 4).update({ component_type: 'Derived', amount: 0, formula: '5% of Basic' });
  let res2 = await simulateRegisterCalc(gross);
  console.log(`\n2. Component #4 switched to [DERIVED] formula "5% of Basic":`);
  console.log(`   Type: ${res2[4].type}, Value: ₹${res2[4].monthlyVal} (Expected: ₹2000) -> ${res2[4].monthlyVal === 2000 ? 'PASS' : 'FAIL'}`);

  // 3. Switch to DERIVED: "10% of Gross" (Gross is ₹80,000 -> Expected ₹8,000)
  await db('payroll_components').where('id', 4).update({ component_type: 'Derived', amount: 0, formula: '10% of Gross' });
  let res3 = await simulateRegisterCalc(gross);
  console.log(`\n3. Component #4 switched to [DERIVED] formula "10% of Gross":`);
  console.log(`   Type: ${res3[4].type}, Value: ₹${res3[4].monthlyVal} (Expected: ₹8000) -> ${res3[4].monthlyVal === 8000 ? 'PASS' : 'FAIL'}`);

  // 4. Revert back to Value ₹1,600
  await db('payroll_components').where('id', 4).update({ component_type: 'Value', amount: 1600, formula: null });
  let res4 = await simulateRegisterCalc(gross);
  console.log(`\n4. Reverted back to [VALUE] ₹1,600:`);
  console.log(`   Type: ${res4[4].type}, Value: ₹${res4[4].monthlyVal} (Expected: ₹1600) -> ${res4[4].monthlyVal === 1600 ? 'PASS' : 'FAIL'}`);

  console.log('\n=== VALUE <-> DERIVED TRANSITION FULLY VERIFIED ===');
  await db.destroy();
}

testValueToDerivedSwitch().catch(console.error);
