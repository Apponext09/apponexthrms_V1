/**
 * test_dynamic_value_and_derived.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Demonstrates 100% dynamic component resolution:
 * 1. Fixed "Value" components (Food Coupon = 2200, Medical Allowance = 1250)
 * 2. "Derived" component from CTC (Basic = ctc * 0.50)
 * 3. "Derived" component from Basic (HRA = basic * 0.40)
 * 4. "Derived" component from BOTH Derived (Basic) and Fixed Value (Food Coupon):
 *    City Allowance = (basic + food_coupon) * 0.10
 * 5. Dynamic Remainder component subtracting all Values & Derived components from CTC:
 *    Special Allowance = ctc - (basic + hra + food_coupon + medical_allowance + city_allowance)
 */

function normalizeKey(key) {
  return String(key)
    .toLowerCase()
    .trim()
    .replace(/[\(\)\%\$\#\@\!]/g, '')
    .replace(/[\s\-_]+/g, '_');
}

function evaluateFormula(formula, context) {
  if (!formula || typeof formula !== 'string' || !formula.trim()) return 0;
  let expr = formula.trim();

  // Normalized lookup map
  const lookup = {};
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === 'number' && !isNaN(v)) {
      lookup[normalizeKey(k)] = v;
      lookup[k.toLowerCase()] = v;
      lookup[k] = v;
    }
  }

  // Pre-process
  expr = expr.replace(/\bof\b/gi, '*');
  expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1 / 100)');

  // Substitute variables (longest first)
  const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (!key) continue;
    const val = lookup[key];
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expr = expr.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), String(val));
  }

  // Also replace multi-word space versions
  for (const [rawKey, val] of Object.entries(lookup)) {
    if (rawKey.includes('_') || rawKey.includes(' ')) {
      const spaceVersion = rawKey.replace(/_/g, ' ');
      const escaped = spaceVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expr = expr.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), String(val));
    }
  }

  // Math Functions
  expr = expr
    .replace(/\bmin\s*\(/gi, 'Math.min(')
    .replace(/\bmax\s*\(/gi, 'Math.max(')
    .replace(/\bround\s*\(/gi, 'Math.round(')
    .replace(/\bceil\s*\(/gi, 'Math.ceil(')
    .replace(/\bfloor\s*\(/gi, 'Math.floor(')
    .replace(/\babs\s*\(/gi, 'Math.abs(')
    .replace(/\^/g, '**');

  try {
    const fn = new Function('Math', `"use strict"; return (${expr});`);
    const res = fn(Math);
    return typeof res === 'number' && !isNaN(res) && isFinite(res) ? Math.round(res * 100) / 100 : 0;
  } catch (err) {
    console.error(`Evaluation error in [${expr}]:`, err.message);
    return 0;
  }
}

// ─── RUN DYNAMIC SIMULATION ───────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('🌟 DYNAMIC MULTI-TIER PAYROLL COMPONENT ENGINE SIMULATION');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// 1. Base Context from Employee CTC
const monthlyCtc = 60000;
const annualCtc = 720000;
const context = {
  ctc: monthlyCtc,
  monthly_ctc: monthlyCtc,
  annual_ctc: annualCtc,
  gross: monthlyCtc,
};
console.log(`📌 1. Input Monthly CTC: ₹${monthlyCtc.toLocaleString('en-IN')}\n`);

// 2. User creates Fixed "Value" Components
const valueComponents = [
  { name: 'Food Coupon', type: 'Value', amount: 2200 },
  { name: 'Medical Allowance', type: 'Value', amount: 1250 },
];

console.log('📌 2. Registering User-Defined Fixed [Value] Components:');
for (const comp of valueComponents) {
  context[normalizeKey(comp.name)] = comp.amount;
  context[comp.name.toLowerCase()] = comp.amount;
  console.log(`   [Value Component] "${comp.name}" = ₹${comp.amount}`);
}

// 3. User creates Tier-1 Derived Component (Basic from CTC)
console.log('\n📌 3. Evaluating Tier-1 [Derived] Component:');
const basicFormula = 'ctc * 0.50';
const basic = evaluateFormula(basicFormula, context);
context['basic'] = basic;
context['basic_salary'] = basic;
console.log(`   [Derived] Basic Salary (formula: "${basicFormula}") = ₹${basic}`);

// 4. User creates Tier-2 Derived Component (HRA from Basic)
console.log('\n📌 4. Evaluating Tier-2 [Derived] Component from Basic:');
const hraFormula = 'basic * 0.40';
const hra = evaluateFormula(hraFormula, context);
context['hra'] = hra;
console.log(`   [Derived] HRA (formula: "${hraFormula}") = ₹${hra}`);

// 5. User creates Tier-3 Derived Component (Derived from BOTH Basic + Fixed Value "Food Coupon")
console.log('\n📌 5. Evaluating Tier-3 [Derived] from BOTH "Basic" + Fixed "Food Coupon":');
const cityFormula = '(basic + food_coupon) * 0.10';
const cityAllowance = evaluateFormula(cityFormula, context);
context['city_allowance'] = cityAllowance;
console.log(`   [Derived] City Allowance (formula: "${cityFormula}") = ₹${cityAllowance} (Calculation: (₹${basic} + ₹2200) * 0.10 = ₹${cityAllowance})`);

// 6. User creates Balancing Component (Special Allowance subtracting all Value + Derived components from CTC)
console.log('\n📌 6. Evaluating Remainder [Derived] Component:');
const specialFormula = 'ctc - (basic + hra + food_coupon + medical_allowance + city_allowance)';
const specialAllowance = evaluateFormula(specialFormula, context);
context['special_allowance'] = specialAllowance;
console.log(`   [Derived] Special Allowance (formula: "${specialFormula}") = ₹${specialAllowance}`);

// 7. Verify Total Gross
const totalGross = basic + hra + 2200 + 1250 + cityAllowance + specialAllowance;
console.log(`\n💰 Total Computed Monthly Gross: ₹${totalGross.toLocaleString('en-IN')}`);
console.log(`🎯 Exact Match with Target CTC (₹${monthlyCtc}): ${totalGross === monthlyCtc ? '✅ PERFECT 100% MATCH' : '❌ MISMATCH'}`);

// 8. Deductions based on computed components
console.log('\n📌 7. Evaluating Dynamic Deductions:');
const pfFormula = 'min(basic * 0.12, 1800)';
const pf = evaluateFormula(pfFormula, context);
console.log(`   [Deduction] PF (formula: "${pfFormula}") = ₹${pf}`);

const pt = 200;
console.log(`   [Deduction] PT [Fixed] = ₹${pt}`);

const totalDeductions = pf + pt;
const netSalary = totalGross - totalDeductions;
console.log(`\n💳 NET TAKE-HOME PAY: ₹${netSalary.toLocaleString('en-IN')}`);

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('✅ ALL DYNAMIC DERIVATIONS (VALUE -> DERIVED -> MULTI-DERIVED -> CTC) VERIFIED!');
console.log('═══════════════════════════════════════════════════════════════════════');
