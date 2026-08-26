const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function clearStaleOverrides() {
  const deleted = await db('payroll_register_overrides').del();
  console.log('Cleared stale overrides count:', deleted);
  await db.destroy();
}

clearStaleOverrides().catch(console.error);
