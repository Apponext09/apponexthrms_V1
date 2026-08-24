const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkCompanyTable() {
  const rows = await db('company').limit(5);
  console.log('Sample rows from `company`:');
  console.log(JSON.stringify(rows, null, 2));
  await db.destroy();
}

checkCompanyTable().catch(console.error);
