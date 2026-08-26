const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkPayrollRunsCols() {
  const cols = await db.raw('DESCRIBE payroll_runs');
  console.log('payroll_runs columns:', cols[0].map(c => `${c.Field} (${c.Type})`));
  await db.destroy();
}

checkPayrollRunsCols().catch(console.error);
