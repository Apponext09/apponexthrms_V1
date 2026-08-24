const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function deleteRun17and18() {
  const runIds = [17, 18];
  console.log('Deleting test payroll runs:', runIds);

  const empRows = await db('payroll_run_employees').whereIn('payroll_run_id', runIds).select('id');
  const runEmpIds = empRows.map(r => r.id);

  if (runEmpIds.length > 0) {
    await db('payroll_earnings').whereIn('payroll_run_employee_id', runEmpIds).del();
    await db('payroll_deductions').whereIn('payroll_run_employee_id', runEmpIds).del();
    await db('payroll_adjustments').whereIn('payroll_run_employee_id', runEmpIds).del();
  }

  await db('advance_recoveries').whereIn('payroll_run_id', runIds).del().catch(() => {});
  await db('payslips').whereIn('payroll_run_id', runIds).del();
  await db('payroll_run_employees').whereIn('payroll_run_id', runIds).del();
  await db('payroll_runs').whereIn('id', runIds).del();

  console.log('Successfully deleted test runs #17 and #18!');
  await db.destroy();
}

deleteRun17and18().catch(console.error);
