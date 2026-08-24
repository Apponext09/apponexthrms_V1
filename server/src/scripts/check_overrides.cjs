const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkAllOverrides() {
  const overrides = await db('payroll_register_overrides');
  console.log('All Payroll Register Overrides in DB:');
  console.log(JSON.stringify(overrides, null, 2));
  await db.destroy();
}

checkAllOverrides().catch(console.error);
