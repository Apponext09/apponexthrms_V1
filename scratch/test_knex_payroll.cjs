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

async function runDirectQuery() {
  const targetOrgId = 3;
  const cycleId = 5;
  const month = '2026-09';

  console.log('Testing Knex employee query for Org 3...');

  let empQuery = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

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

  console.log('Raw Employees found:', rawEmployees.length);
  console.table(rawEmployees);

  // Check salary structure lookup for employee 9
  const emp = rawEmployees.find(r => r.id === 9) || rawEmployees[0];
  if (emp) {
    console.log(`Checking salary structure for employee ${emp.id}...`);
    const struct = await db('employee_salary_structures as ess')
      .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where('ess.employee_id', emp.id)
      .where('ess.is_current', 1)
      .whereNull('ess.deleted_at')
      .whereNull('ss.deleted_at')
      .select('ss.*');
    console.log('Structure found:', struct);
  }

  await db.destroy();
}

runDirectQuery().catch(console.error);
