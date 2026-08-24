const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function listAllTables() {
  const tables = await db.raw('SHOW TABLES');
  console.log('Tables in database health:');
  console.log(tables[0]);
  await db.destroy();
}

listAllTables().catch(console.error);
