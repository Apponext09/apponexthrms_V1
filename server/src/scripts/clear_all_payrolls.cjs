const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function clearAllGeneratedPayrolls() {
  console.log('--- Clearing ALL Generated Payroll Runs & Related Child Tables ---');
  
  // 1. Delete all advance recoveries linked to runs
  await db('advance_recoveries').whereNotNull('payroll_run_id').del().catch(() => {});
  
  // 2. Delete all payslips
  const payslipsCount = await db('payslips').del();
  console.log(`Deleted ${payslipsCount} payslips.`);

  // 3. Delete payroll adjustments, deductions, earnings
  const adjCount = await db('payroll_adjustments').del();
  const dedCount = await db('payroll_deductions').del();
  const earnCount = await db('payroll_earnings').del();
  console.log(`Deleted adjustments (${adjCount}), deductions (${dedCount}), earnings (${earnCount}).`);

  // 4. Delete run employees
  const empCount = await db('payroll_run_employees').del();
  console.log(`Deleted ${empCount} run employee entries.`);

  // 5. Delete all payroll runs
  const runsCount = await db('payroll_runs').del();
  console.log(`Deleted ${runsCount} payroll runs.`);

  // 6. Delete all stale register overrides
  const overridesCount = await db('payroll_register_overrides').del();
  console.log(`Deleted ${overridesCount} payroll register overrides.`);

  console.log('\n--- ALL GENERATED PAYROLLS CLEARED SUCCESSFULLY ---');
  await db.destroy();
}

clearAllGeneratedPayrolls().catch(console.error);
