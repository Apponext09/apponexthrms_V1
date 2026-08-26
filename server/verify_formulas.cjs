/**
 * Payroll Formula Verification Script
 * Tests formula evaluation against known payslip data.
 * Run: node verify_formulas.cjs
 */
const mysql = require('mysql2/promise');

// ─── Test cases from actual payslip rows ───────────────────────
const TEST_CASES = [
  { name: 'Amit Kulkarni',  monthlyCTC: 200000, paidDays: 30, totalDays: 30 },
  { name: 'Aarav Shah',     monthlyCTC: 190000, paidDays: 27, totalDays: 30 },
  { name: 'Harsh Gawali',   monthlyCTC: 240000, paidDays: 30, totalDays: 30 },
  { name: 'Arjun Jadhav',   monthlyCTC:  90000, paidDays:  6, totalDays: 30 },
];

function round2(n) { return Math.round(Number(n) * 100) / 100; }

/**
 * Evaluate a formula string given a vars map.
 * Supports [Name] tokens, min(), max(), basic math.
 */
function evalFormula(formula, vars) {
  let expr = formula;
  for (const [k, v] of Object.entries(vars)) {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expr = expr.replace(new RegExp('\\[' + escaped + '\\]', 'g'), String(v));
  }
  expr = expr.replace(/\bmin\(/g, 'Math.min(').replace(/\bmax\(/g, 'Math.max(');
  try { return eval(expr); } catch (e) { return NaN; }
}

/**
 * Topological resolution of derived components.
 * Iterates up to N passes until all are resolved or stuck.
 */
function resolveAll(comps, ctcValue) {
  const vars = { CTC: ctcValue };

  // Seed value components
  for (const c of comps) {
    if (c.component_type === 'Value') {
      vars[c.name] = round2(Number(c.amount));
    }
  }

  // Resolve derived in multiple passes (handles dependency chains)
  const derived = comps.filter(c => c.component_type === 'Derived' && c.formula);
  let maxPasses = 10;
  while (maxPasses-- > 0) {
    let changed = false;
    for (const c of derived) {
      if (vars[c.name] !== undefined) continue;
      // Check if all tokens in formula are resolved
      const tokens = (c.formula.match(/\[([^\]]+)\]/g) || []).map(t => t.slice(1,-1));
      const allOk = tokens.every(t => t === 'CTC' || vars[t] !== undefined);
      if (allOk) {
        vars[c.name] = round2(evalFormula(c.formula, vars));
        changed = true;
      }
    }
    if (!changed) break;
  }

  return vars;
}

function pad(str, len) { return String(str).padEnd(len); }
function padL(str, len) { return String(str).padStart(len); }

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: 'root123', database: 'health'
  });

  const [comps] = await conn.query(
    'SELECT pc.name, pc.component_type, pc.formula, pc.amount, pc.based_on_attendance, pcg.category ' +
    'FROM payroll_components pc ' +
    'JOIN payroll_component_groups pcg ON pc.group_id = pcg.id ' +
    'WHERE pc.organization_id = 8 AND pc.is_active = 1 AND pc.component_type != "Module" ' +
    'ORDER BY pcg.id, pc.id'
  );
  await conn.end();

  const EARNING_DISPLAY = [
    'Basic Salary', 'House Rent Allowance (HRA)', 'Conveyance Allowance',
    'Medical Allowance', 'Leave Travel Allowance (LTA)', 'Standard Allowance',
    'Meal Allowance', 'Communication Allowance', 'Children Education Allowance',
    'Special Allowance', 'Gross'
  ];
  const DEDUCTION_DISPLAY = ['Employee PF (EPF)', 'Employee ESIC', 'Professional Tax (PT)'];

  console.log('\n========================================================');
  console.log('  PAYROLL FORMULA VERIFICATION REPORT');
  console.log('========================================================');

  for (const tc of TEST_CASES) {
    const { name, monthlyCTC, paidDays, totalDays } = tc;
    const ratio = paidDays / totalDays;

    const vars = resolveAll(comps, monthlyCTC);

    console.log(`\n┌─ ${name}`);
    console.log(`│  CTC: ₹${monthlyCTC.toLocaleString('en-IN')}  |  Paid: ${paidDays}/${totalDays} days  (${(ratio*100).toFixed(0)}%)`);
    console.log('│');
    console.log('│  EARNINGS                                Full Amt    Earned Amt');
    console.log('│  ' + '─'.repeat(66));

    let totalGross = 0;
    let totalGrossEarned = 0;

    for (const compName of EARNING_DISPLAY) {
      const comp = comps.find(c => c.name === compName);
      if (!comp) continue;
      const full = vars[compName] ?? 0;
      const earned = comp.based_on_attendance ? round2(full * ratio) : full;
      if (compName === 'Gross') {
        totalGross = full;
        totalGrossEarned = earned;
        console.log('│  ' + '─'.repeat(66));
      }
      console.log(`│  ${pad(compName, 40)} ₹${padL(full.toLocaleString('en-IN'), 10)}  ₹${padL(earned.toLocaleString('en-IN'), 10)}`);
    }

    console.log('│');
    console.log('│  DEDUCTIONS                              Amount');
    console.log('│  ' + '─'.repeat(40));

    let totalDeductions = 0;
    for (const compName of DEDUCTION_DISPLAY) {
      const comp = comps.find(c => c.name === compName);
      if (!comp) continue;
      let amt = vars[compName] ?? 0;

      // Special: PF and ESIC calculated on EARNED amounts
      if (compName === 'Employee PF (EPF)') {
        const basicEarned = round2((vars['Basic Salary'] ?? 0) * ratio);
        amt = round2(Math.min(1800 * ratio, basicEarned * 0.12));
      } else if (compName === 'Employee ESIC') {
        amt = totalGrossEarned <= 21000 ? round2(totalGrossEarned * 0.0075) : 0;
      }

      totalDeductions += amt;
      const note = (compName === 'Employee ESIC' && totalGrossEarned > 21000) ? '  (N/A: Gross > ₹21,000)' : '';
      console.log(`│  ${pad(compName, 40)} ₹${padL(amt.toLocaleString('en-IN'), 10)}${note}`);
    }

    const net = round2(totalGrossEarned - totalDeductions);
    console.log('│  ' + '─'.repeat(40));
    console.log(`│  ${'Total Deductions'.padEnd(40)} ₹${padL(totalDeductions.toLocaleString('en-IN'), 10)}`);
    console.log(`│  ${'NET SALARY'.padEnd(40)} ₹${padL(net.toLocaleString('en-IN'), 10)}`);
    console.log(`│  ${'Annual CTC'.padEnd(40)} ₹${padL((monthlyCTC * 12).toLocaleString('en-IN'), 10)}`);
    console.log('└' + '─'.repeat(68));
  }

  console.log('\n✅ Verification complete.\n');
  console.log('📋 HOW TO VALIDATE:');
  console.log('   Compare values above against the payslip table you shared.');
  console.log('   Basic Salary Earned, PF, Net Salary should match exactly.\n');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
