const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root123',
    database: 'health'
  }
});

async function main() {
  const runIds = [28, 29];

  try {
    console.log('=== Deleting August 2026 Payroll Runs ===\n');

    for (const runId of runIds) {
      // 1. Get all payroll_run_employees for this run
      const empRows = await knex('payroll_run_employees')
        .where('payroll_run_id', runId)
        .select('id');
      const empIds = empRows.map(r => r.id);
      console.log(`Run #${runId}: Found ${empIds.length} employee rows`);

      // 2. Delete payroll_earnings
      if (empIds.length > 0) {
        const delEarnings = await knex('payroll_earnings').whereIn('payroll_run_employee_id', empIds).del();
        console.log(`  → Deleted ${delEarnings} payroll_earnings rows`);

        const delDeductions = await knex('payroll_deductions').whereIn('payroll_run_employee_id', empIds).del();
        console.log(`  → Deleted ${delDeductions} payroll_deductions rows`);

        const delAdj = await knex('payroll_adjustments').whereIn('payroll_run_employee_id', empIds).del().catch(() => 0);
        console.log(`  → Deleted ${delAdj} payroll_adjustments rows`);
      }

      // 3. Delete advance_recoveries
      const delAdv = await knex('advance_recoveries').where('payroll_run_id', runId).del().catch(() => 0);
      console.log(`  → Deleted ${delAdv} advance_recoveries rows`);

      // 4. Delete payslips
      const delPayslips = await knex('payslips').where('payroll_run_id', runId).del().catch(() => 0);
      console.log(`  → Deleted ${delPayslips} payslips rows`);

      // 5. Delete payroll_run_employees
      const delEmpRows = await knex('payroll_run_employees').where('payroll_run_id', runId).del();
      console.log(`  → Deleted ${delEmpRows} payroll_run_employees rows`);

      // 6. Delete the payroll_run itself
      const delRun = await knex('payroll_runs').where('id', runId).del();
      console.log(`  → Deleted payroll_run #${runId}: ${delRun} row(s)\n`);
    }

    console.log('✅ Done! August payroll runs deleted. You can now test from scratch.');
    console.log('   Go to Process Payroll → Select August 2026 → Click Process Payroll');

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    knex.destroy();
  }
}

main();
