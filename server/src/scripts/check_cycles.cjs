const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkCycles() {
  const cycles = await db('payroll_cycles').whereNull('deleted_at');
  console.log('Payroll cycles in DB:');
  console.log(JSON.stringify(cycles, null, 2));
  await db.destroy();
}

checkCycles().catch(console.error);
