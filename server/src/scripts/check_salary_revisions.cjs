const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkSalaryRevisions() {
  const count = await db('salary_revisions').where('organization_id', 8).whereNull('deleted_at').count('* as c');
  console.log(`Total salary_revisions in DB for Org 8: ${count[0].c}`);

  const rows = await db('salary_revisions').where('organization_id', 8).whereNull('deleted_at').limit(5);
  console.log('Sample rows:', rows);

  await db.destroy();
}

checkSalaryRevisions().catch(console.error);
