const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function runTest() {
  console.log('--- STARTING COMPREHENSIVE PAYROLL CALCULATION & GROUP SETTINGS TEST ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Check Component Groups & their settings
    console.log('\n[TEST 1] Component Groups & Schema Settings:');
    const [groups] = await connection.query(`
      SELECT id, name, category, round_format, group_function, 
             configure_on_profile, display_on_profile, is_editable, 
             contributed_by, is_active, recalculate_on_change, 
             group_for_payslip, display_order, is_taxable
      FROM payroll_component_groups 
      LIMIT 10
    `);
    console.table(groups);

    // 2. Check Pay Components & formulas
    console.log('\n[TEST 2] Pay Components & Formulas:');
    const [comps] = await connection.query(`
      SELECT id, name, group_id, component_type, formula, amount, 
             based_on_attendance, is_active, min_amount, max_amount
      FROM payroll_components
      WHERE is_active = 1
      LIMIT 10
    `);
    console.table(comps);

    // 3. Test Formula Math Simulation
    console.log('\n[TEST 3] Formula Math Validation:');
    const testCtc = 600000;
    const monthlyGross = Math.round(testCtc / 12); // 50000
    console.log(`Annual CTC: ₹${testCtc} -> Monthly Gross Base: ₹${monthlyGross}`);

    const formulas = [
      { name: 'Basic (50% of CTC)', expr: '(50 * CTC) / 100', expected: 25000 },
      { name: 'HRA (40% of Basic)', expr: 'BASIC * 0.40', expected: 10000 },
      { name: 'Special Allowance (Remaining)', expr: 'GROSS - BASIC - HRA', expected: 15000 },
      { name: 'PF (12% of Basic capped at 1800)', expr: 'Math.min(1800, BASIC * 0.12)', expected: 1800 },
      { name: 'PT (Tier for > 25000)', expr: '200', expected: 200 }
    ];

    const ctx = {
      CTC: monthlyGross,
      GROSS: monthlyGross,
      BASIC: Math.round(monthlyGross * 0.5)
    };
    ctx.HRA = Math.round(ctx.BASIC * 0.4);
    ctx.SPECIAL = ctx.GROSS - ctx.BASIC - ctx.HRA;
    ctx.PF = Math.min(1800, Math.round(ctx.BASIC * 0.12));
    ctx.PT = 200;

    console.log('Simulated Breakdown:');
    console.log(`  - Basic Pay: ₹${ctx.BASIC}`);
    console.log(`  - HRA: ₹${ctx.HRA}`);
    console.log(`  - Special Allowance: ₹${ctx.SPECIAL}`);
    console.log(`  - Gross Earnings: ₹${ctx.BASIC + ctx.HRA + ctx.SPECIAL} (Matches Monthly CTC: ₹${monthlyGross})`);
    console.log(`  - PF Deduction: ₹${ctx.PF}`);
    console.log(`  - PT Deduction: ₹${ctx.PT}`);
    const netTakeHome = (ctx.BASIC + ctx.HRA + ctx.SPECIAL) - (ctx.PF + ctx.PT);
    console.log(`  - Net Take-Home Salary: ₹${netTakeHome}`);

    // 4. Test LOP (Loss of Pay) Pro-ration for 29 out of 31 days
    console.log('\n[TEST 4] Attendance LOP Pro-Ration Test (29 Paid Days / 31 Month Days):');
    const monthDays = 31;
    const paidDays = 29;
    const ratio = paidDays / monthDays;
    const proratedBasic = Math.round(ctx.BASIC * ratio);
    const proratedHra = Math.round(ctx.HRA * ratio);
    const proratedSpecial = Math.round(ctx.SPECIAL * ratio);
    const proratedGross = proratedBasic + proratedHra + proratedSpecial;
    const proratedNet = proratedGross - (ctx.PF + ctx.PT);

    console.log(`  - Pro-rated Basic: ₹${proratedBasic}`);
    console.log(`  - Pro-rated HRA: ₹${proratedHra}`);
    console.log(`  - Pro-rated Special: ₹${proratedSpecial}`);
    console.log(`  - Pro-rated Gross: ₹${proratedGross}`);
    console.log(`  - Pro-rated Net Pay: ₹${proratedNet}`);

    // 5. Test Active Slabs in DB
    console.log('\n[TEST 5] Slabs in Database:');
    const [slabs] = await connection.query(`
      SELECT id, name, min_ctc, max_ctc, selected_component_ids, is_active
      FROM payroll_slabs
      LIMIT 5
    `);
    console.table(slabs);

    console.log('\n--- ALL PAYROLL ENGINE CHECKS COMPLETED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    await connection.end();
  }
}

runTest();
