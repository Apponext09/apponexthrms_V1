const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function verifyEmptyRuns() {
  const runs = await db('payroll_runs').count('* as c');
  const slips = await db('payslips').count('* as c');
  const emps = await db('payroll_run_employees').count('* as c');
  console.log(`Runs remaining: ${runs[0].c}, Payslips: ${slips[0].c}, Run Employees: ${emps[0].c}`);
  await db.destroy();
}

verifyEmptyRuns().catch(console.error);
