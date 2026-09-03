const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function testCompanyQueries() {
  const comp = await db('company').where('company_id', 18).whereNull('deleted_at').first();
  console.log('Arham Company in `company` table:');
  console.log(comp?.name, '| ID:', comp?.company_id, '| Code:', comp?.code);

  const allComps = await db('company').where('organization_id', 8).whereNull('deleted_at').select('company_id as id', 'name', 'code');
  console.log('All companies for Org 8:', allComps);

  await db.destroy();
}

testCompanyQueries().catch(console.error);
