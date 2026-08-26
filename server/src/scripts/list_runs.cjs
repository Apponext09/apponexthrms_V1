const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function listPayrollRuns() {
  const runs = await db('payroll_runs').select('id', 'organization_id', 'company_id', 'payroll_cycle_id', 'run_month', 'status', 'created_at');
  console.log('Current Payroll Runs in DB:');
  console.log(JSON.stringify(runs, null, 2));
  await db.destroy();
}

listPayrollRuns().catch(console.error);
