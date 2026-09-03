const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function fixCycle13Days() {
  await db('payroll_cycles').where('id', 13).update({ total_days_calc: '28' });
  console.log('Updated payroll_cycles ID 13 total_days_calc to 28.');
  await db.destroy();
}

fixCycle13Days().catch(console.error);
