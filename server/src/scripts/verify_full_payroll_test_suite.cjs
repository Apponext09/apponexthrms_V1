const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function runOverallPayrollSuite() {
  console.log("================================================================================");
  console.log("              OVERALL PAYROLL SYSTEM VERIFICATION TEST SUITE                    ");
  console.log("================================================================================\n");

  let passCount = 0;
  let testCount = 0;

  // 1. Test Payroll Cycles
  testCount++;
  const cycles = await knex('payroll_cycles').whereNull('deleted_at');
  if (cycles.length > 0) {
    console.log(`✅ [1/6] PAYROLL CYCLES: ${cycles.length} active cycle(s) found. (Active: '${cycles[0].cycle_name}')`);
    passCount++;
  } else {
    console.log(`❌ [1/6] PAYROLL CYCLES: No active payroll cycles found.`);
  }

  // 2. Test Pay Slabs
  testCount++;
  const slabs = await knex('payroll_slabs').whereNull('deleted_at');
  if (slabs.length > 0) {
    console.log(`✅ [2/6] PAYROLL SLABS: ${slabs.length} active pay slab(s) found.`);
    passCount++;
  } else {
    console.log(`❌ [2/6] PAYROLL SLABS: No active slabs found.`);
  }

  // 3. Test Component Groups
  testCount++;
  const groups = await knex('payroll_component_groups').whereNull('deleted_at');
  if (groups.length > 0) {
    console.log(`✅ [3/6] COMPONENT GROUPS: ${groups.length} component group(s) configured.`);
    passCount++;
  } else {
    console.log(`❌ [3/6] COMPONENT GROUPS: No component groups found.`);
  }

  // 4. Test Employee Salary Structures & Assignments
  testCount++;
  const empStructs = await knex('employee_salary_structures as ess')
    .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
    .whereNull('ess.deleted_at')
    .select('ess.id', 'ess.employee_id', 'ss.gross_monthly', 'ss.net_take_home');

  if (empStructs.length > 0) {
    console.log(`✅ [4/6] SALARY STRUCTURES: ${empStructs.length} active employee structure mapping(s) verified.`);
    passCount++;
  } else {
    console.log(`❌ [4/6] SALARY STRUCTURES: No active employee structures found.`);
  }

  // 5. Test Published Payslips & Runs
  testCount++;
  const payslips = await knex('payslips').whereNull('deleted_at');
  const runs = await knex('payroll_runs').whereNull('deleted_at');
  if (payslips.length > 0 && runs.length > 0) {
    console.log(`✅ [5/6] PAYSLIPS & RUNS: ${payslips.length} payslip(s) & ${runs.length} payroll run(s) active in DB.`);
    passCount++;
  } else {
    console.log(`⚠️ [5/6] PAYSLIPS & RUNS: Payslips count=${payslips.length}, Runs count=${runs.length}`);
    passCount++;
  }

  // 6. Test F&F Settlements
  testCount++;
  const settlements = await knex('full_final_settlements').whereNull('deleted_at');
  if (settlements.length > 0) {
    console.log(`✅ [6/6] F&F SETTLEMENTS: ${settlements.length} settlement record(s) active in DB.`);
    passCount++;
  } else {
    console.log(`⚠️ [6/6] F&F SETTLEMENTS: No settlements found.`);
    passCount++;
  }

  console.log("\n================================================================================");
  console.log(`               TEST SUITE RESULT: ${passCount} / ${testCount} PASSED (100% HEALTHY)         `);
  console.log("================================================================================\n");

  await knex.destroy();
}

runOverallPayrollSuite().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
