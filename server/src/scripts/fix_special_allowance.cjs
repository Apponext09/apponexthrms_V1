/**
 * fix_special_allowance.cjs
 * Fixes the Special Allowance formula to be:
 *   CTC - (Basic + HRA + DA + Fixed Allowances)
 * This ensures Special Allowance absorbs the true residual.
 * Also ensures ESIC uses `[CTC]` instead of `[Gross]` so it doesn't
 * get confused by sequential context rewriting.
 */
const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function fix() {
  // Special Allowance — residual after all fixed components
  // Formula: CTC minus all fixed earning components (except variable ones)
  const specialFormula = '[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Dearness Allowance (DA)] + [Conveyance Allowance] + [Medical Allowance] + [Children Education Allowance])';

  await db('payroll_components').where({ id: 3, organization_id: 8 }).update({
    formula: specialFormula,
    updated_at: new Date(),
  });
  console.log('✓ Special Allowance formula updated to:', specialFormula);

  // ESIC — should be based on monthly gross (= CTC for most cases)
  // The [Gross] in formula context = monthly_ctc, which is correct in real service
  // Keep as is — in actual PayrollService, gross = resolvedGross (monthly CTC), not basic
  const esicFormula = '[CTC] * (0.75 / 100)';
  await db('payroll_components').where({ id: 15, organization_id: 8 }).update({
    formula: esicFormula,
    updated_at: new Date(),
  });
  console.log('✓ ESIC formula updated to:', esicFormula);

  // Employer ESIC — 3.25% of CTC
  const employerEsicFormula = '[CTC] * (3.25 / 100)';
  await db('payroll_components').where({ id: 31, organization_id: 8 }).update({
    formula: employerEsicFormula,
    updated_at: new Date(),
  });
  console.log('✓ Employer ESIC formula updated to:', employerEsicFormula);

  // ── Run quick verification ────────────────────────────────────────────────
  console.log('\n=== Quick Calculation Check for ₹6 LPA (Monthly CTC: ₹50,000) ===');
  const ctc = 50000;
  const basic = ctc * 0.50;           // 25,000
  const hra = basic * 0.40;           // 10,000
  const da = basic * 0.17;            //  4,250
  const conv = 1600;
  const med = 1250;
  const cea = 200;
  const special = ctc - (basic + hra + da + conv + med + cea); // 7,700
  const lta = basic * (8.33 / 100);   //  2,082
  const perfBonus = basic * 0.10;     //  2,500
  const statBonus = Math.min(7000, basic) * 0.0833; // 2,082
  const pf = Math.min(1800, basic * 0.12); // 1,800
  const esic = ctc * (0.75 / 100);   //    375
  const pt = 200;
  const lwf = 25;

  const totalEarning = basic + hra + da + special + conv + med + cea + lta + perfBonus + statBonus;
  const totalDeduction = pf + esic + pt + lwf;
  const netPay = totalEarning - totalDeduction;

  console.log(`  Basic:          ₹${basic.toLocaleString()}`);
  console.log(`  HRA:            ₹${hra.toLocaleString()}`);
  console.log(`  DA:             ₹${da.toLocaleString()}`);
  console.log(`  Special Allow:  ₹${special.toLocaleString()}`);
  console.log(`  Conveyance:     ₹${conv.toLocaleString()}`);
  console.log(`  Medical:        ₹${med.toLocaleString()}`);
  console.log(`  CEA:            ₹${cea.toLocaleString()}`);
  console.log(`  LTA:            ₹${Math.round(lta).toLocaleString()}`);
  console.log(`  Perf Bonus:     ₹${Math.round(perfBonus).toLocaleString()}`);
  console.log(`  Stat Bonus:     ₹${Math.round(statBonus).toLocaleString()}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Total Earning:  ₹${Math.round(totalEarning).toLocaleString()}`);
  console.log(`\n  EPF:            ₹${pf.toLocaleString()}`);
  console.log(`  ESIC:           ₹${Math.round(esic).toLocaleString()}`);
  console.log(`  PT:             ₹${pt.toLocaleString()}`);
  console.log(`  LWF:            ₹${lwf.toLocaleString()}`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Total Deduct:   ₹${Math.round(totalDeduction).toLocaleString()}`);
  console.log(`  Net Pay:        ₹${Math.round(netPay).toLocaleString()}`);
  console.log(`  CTC Check:      ${Math.abs(Math.round(totalEarning) - ctc) < 100 ? '✅ MATCHES CTC' : `⚠ Diff: ₹${Math.abs(Math.round(totalEarning) - ctc)}`}`);

  await db.destroy();
  console.log('\n=== FIX COMPLETE ===');
}

fix().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
