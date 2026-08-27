const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkCompTableColumns() {
  const cols = await db.raw('DESCRIBE payroll_components');
  console.log('payroll_components columns:', cols[0].map(c => `${c.Field} (${c.Type})`));

  const gCols = await db.raw('DESCRIBE payroll_component_groups');
  console.log('payroll_component_groups columns:', gCols[0].map(c => `${c.Field} (${c.Type})`));

  await db.destroy();
}

checkCompTableColumns().catch(console.error);
