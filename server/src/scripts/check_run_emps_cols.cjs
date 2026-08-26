const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkRunEmpsCols() {
  const cols = await db.raw('DESCRIBE payroll_run_employees');
  console.log('payroll_run_employees columns:', cols[0].map(c => `${c.Field} (${c.Type})`));
  await db.destroy();
}

checkRunEmpsCols().catch(console.error);
