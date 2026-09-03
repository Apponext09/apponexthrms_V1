/**
 * verify_payroll_pipeline.cjs
 * Simulates what PayrollService does when computing salary for an Org 8 employee.
 * Shows exactly what components are picked, what formula values resolve to,
 * and what the final salary breakdown looks like.
 */

const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// ─── Inline mini formula evaluator (mirrors PayrollFormulaEvaluator) ─────────
function normalizeKey(key) {
  return key.toLowerCase().trim().replace(/[()%$#@!]/g, '').replace(/[\s\-_]+/g, '_');
}

function evaluate(formula, context) {
  if (!formula || !formula.trim()) return 0;
  let expr = formula.trim();

  // Build lookup
  const monthly_ctc = context.ctc || context.monthly_ctc || 0;
  const lookup = {
    ctc: monthly_ctc, monthly_ctc, ctc_monthly: monthly_ctc,
    annual_ctc: monthly_ctc * 12,
    gross: context.gross || monthly_ctc,
    gross_salary: context.gross || monthly_ctc,
    basic: context.basic || context.basic_salary || 0,
    basic_salary: context.basic || context.basic_salary || 0,
  };
  // Add all custom context entries
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === 'number') {
      lookup[normalizeKey(k)] = v;
      lookup[k.toLowerCase()] = v;
    }
  }

  // Replace bracket tokens [CTC], [Basic Salary], etc.
  expr = expr.replace(/\[\s*([^\]]+?)\s*\]/g, (match, inner) => {
    const norm = normalizeKey(inner);
    return lookup[norm] !== undefined ? lookup[norm] : (lookup[inner.toLowerCase().trim()] !== undefined ? lookup[inner.toLowerCase().trim()] : inner);
  });

  // Replace "of" with *
  expr = expr.replace(/\bof\b/gi, '*');
  // Replace percentage: "50%" -> "(50/100)"
  expr = expr.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, '($1/100)');
  // Replace math functions
  expr = expr.replace(/\bmin\s*\(/gi, 'Math.min(').replace(/\bmax\s*\(/gi, 'Math.max(');

  // Replace variable names
  const sortedKeys = Object.keys(lookup).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (!key) continue;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    expr = expr.replace(regex, String(lookup[key]));
  }

  try {
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch { return 0; }
}

// ─── Main simulation ─────────────────────────────────────────────────────────
async function simulate(annualCTC) {
  const monthly_ctc = Math.round(annualCTC / 12);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PAYROLL SIMULATION — Annual CTC: ₹${annualCTC.toLocaleString()} | Monthly: ₹${monthly_ctc.toLocaleString()}`);
  console.log('='.repeat(60));

  // Load all active components for org 8 in group order
  const components = await db('payroll_components as pc')
    .join('payroll_component_groups as pcg', 'pc.group_id', 'pcg.id')
    .where('pc.organization_id', 8)
    .where('pc.is_active', 1)
    .whereNull('pc.deleted_at')
    .orderBy('pcg.display_order', 'asc')
    .orderBy('pc.id', 'asc')
    .select('pc.*', 'pcg.name as group_name', 'pcg.category as group_category', 'pcg.display_order');

  // Build context iteratively (derived components can reference earlier results)
  const ctx = { ctc: monthly_ctc, monthly_ctc, gross: monthly_ctc };
  const earnings = [];
  const deductions = [];
  let currentGroup = '';

  for (const comp of components) {
    const type = comp.component_type;
    let amount = 0;

    if (type === 'Value') {
      amount = Number(comp.amount || 0);
    } else if (type === 'Derived') {
      amount = evaluate(comp.formula || '', ctx);
    } else if (type === 'Module') {
      amount = 0; // Module computed at runtime (attendance/loans/TDS)
    }

    amount = Math.max(0, Math.round(amount));

    // Update context so downstream components can reference this one
    const normName = normalizeKey(comp.name);
    ctx[normName] = amount;
    // Also add common aliases
    if (comp.name.toLowerCase().includes('basic')) {
      ctx.basic = amount; ctx.basic_salary = amount;
    }
    if (comp.name.toLowerCase().includes('gross') || comp.name.toLowerCase().includes('special')) {
      ctx.gross = amount; ctx.gross_salary = amount;
    }

    const groupCategory = (comp.group_category || '').toLowerCase();
    if (currentGroup !== comp.group_name) {
      currentGroup = comp.group_name;
      console.log(`\n  📁 ${comp.group_category === 'Earning' ? '💚 EARNING' : '🔴 DEDUCTION'} — ${comp.group_name}`);
    }

    const typeIcon = type === 'Derived' ? '⚙' : type === 'Module' ? '🔌' : '💰';
    const skipLabel = amount === 0 && type === 'Value' ? ' (inactive/₹0)' : '';
    const nonCash = comp.non_cashable ? ' [Non-Cash]' : '';
    console.log(`     ${typeIcon} ${comp.name.padEnd(38)} ₹${amount.toLocaleString().padStart(8)}${nonCash}${skipLabel}`);

    if (groupCategory === 'earning' && amount > 0 && !comp.non_cashable) {
      earnings.push({ name: comp.name, amount, group: comp.group_name });
    } else if (groupCategory === 'deduction' && amount > 0 && !comp.non_cashable) {
      deductions.push({ name: comp.name, amount });
    }
  }

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  💚 Total Earnings (cashable):     ₹${totalEarnings.toLocaleString().padStart(10)}`);
  console.log(`  🔴 Total Deductions:               ₹${totalDeductions.toLocaleString().padStart(10)}`);
  console.log(`  💵 Net Pay:                        ₹${netPay.toLocaleString().padStart(10)}`);
  console.log(`  📊 Monthly CTC:                   ₹${monthly_ctc.toLocaleString().padStart(10)}`);
  console.log('='.repeat(60));

  if (Math.abs(totalEarnings - monthly_ctc) > 500) {
    console.log(`\n  ⚠ WARNING: Earnings (₹${totalEarnings.toLocaleString()}) differ from Monthly CTC (₹${monthly_ctc.toLocaleString()}) by ₹${Math.abs(totalEarnings - monthly_ctc).toLocaleString()}`);
    console.log('    → Ensure Special Allowance formula covers the residual correctly.');
  } else {
    console.log('\n  ✅ Earnings closely match Monthly CTC — calculation looks correct!');
  }
}

async function main() {
  // Test with common CTC values
  await simulate(600000);   // ₹6 LPA
  await simulate(1200000);  // ₹12 LPA
  await simulate(2400000);  // ₹24 LPA

  await db.destroy();
  console.log('\n=== PIPELINE VERIFICATION COMPLETE ===');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
