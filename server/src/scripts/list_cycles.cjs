const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function listCycles() {
  const cycles = await db('payroll_cycles');
  console.log('All payroll cycles in DB:', cycles);
  await db.destroy();
}

listCycles().catch(console.error);
