const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkRevisionsNow() {
  const rows = await db('salary_revisions').select('*');
  console.log('Current rows in salary_revisions:', rows);
  await db.destroy();
}

checkRevisionsNow().catch(console.error);
