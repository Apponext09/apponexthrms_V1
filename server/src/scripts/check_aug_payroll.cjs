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
  try {
    // Check payroll runs for August 2026
    const runs = await knex('payroll_runs')
      .whereRaw("run_month LIKE '2026-08%'")
      .select('id', 'status', 'run_month', 'total_employees', 'processed_employees', 'error_count', 'payroll_cycle_id', 'company_id');

    console.log('\n=== August 2026 Payroll Runs ===');
    console.log(JSON.stringify(runs, null, 2));

    if (runs.length > 0) {
      for (const run of runs) {
        // Check earnings and deductions count for this run
        const empRows = await knex('payroll_run_employees')
          .where('payroll_run_id', run.id)
          .select('id', 'employee_id', 'status', 'total_earnings', 'total_deductions', 'net_salary', 'paid_days');
        console.log(`\n--- Run #${run.id} (${run.status}) ---`);
        console.log(`Employees in run: ${empRows.length}`);
        console.log(JSON.stringify(empRows.slice(0, 5), null, 2));
      }
    } else {
      console.log('No August 2026 payroll run found. Payroll has NOT been processed yet.');

      // Check if there are any payroll runs at all
      const allRuns = await knex('payroll_runs')
        .orderBy('id', 'desc')
        .limit(5)
        .select('id', 'status', 'run_month', 'total_employees', 'processed_employees');
      console.log('\n=== Latest 5 Payroll Runs (any month) ===');
      console.log(JSON.stringify(allRuns, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    knex.destroy();
  }
}

main();
