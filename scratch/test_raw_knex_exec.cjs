const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  }
});

async function testExactKnexQuery() {
  const targetOrgId = 3;
  console.log('Target Org ID:', targetOrgId);

  let empQuery = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

  console.log('Executing SQL:', empQuery.toSQL().toNative());

  const rawEmployees = await empQuery.select(
    'e.id',
    'e.uuid',
    'e.company_id',
    'e.employee_code',
    'e.organization_id',
    'e.first_name',
    'e.last_name',
    'e.status'
  );

  console.log('Employees Returned:', rawEmployees.length);
  console.table(rawEmployees);

  await db.destroy();
}

testExactKnexQuery().catch(console.error);
