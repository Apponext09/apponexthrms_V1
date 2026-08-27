const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function clearDraftRuns() {
  await db('payroll_run_employees').del();
  await db('payroll_runs').del();
  console.log('Cleaned all runs from DB.');
  await db.destroy();
}

clearDraftRuns().catch(console.error);
