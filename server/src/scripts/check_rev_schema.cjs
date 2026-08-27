const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkRevisionTable() {
  const cols = await db('information_schema.columns')
    .where('table_schema', 'health')
    .where('table_name', 'salary_revisions')
    .select('column_name', 'data_type', 'is_nullable');

  console.log('Columns of salary_revisions table:');
  console.log(cols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  const recent = await db('salary_revisions').orderBy('id', 'desc').limit(5);
  console.log('Recent salary_revisions records:', recent);

  await db.destroy();
}

checkRevisionTable().catch(console.error);
