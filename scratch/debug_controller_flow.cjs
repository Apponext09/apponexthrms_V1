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

async function runControllerDebug() {
  const targetOrgId = 4;
  console.log('Debugging for targetOrgId:', targetOrgId);

  // 1. Employee query
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
    'e.employment_type',
    'e.date_of_joining',
    'd.name as department_name',
    'des.name as designation_name',
    'l.name as location_name'
  );

  console.log('1. Raw Employees Count:', rawEmployees.length);

  // 2. All components
  const allComponents = await db('payroll_components')
    .where('organization_id', targetOrgId)
    .where('is_active', 1)
    .whereNull('deleted_at');

  console.log('2. Active Components Count:', allComponents.length);

  // 3. Salary structure lookup per employee
  for (const emp of rawEmployees) {
    console.log(`\nChecking Employee #${emp.id} (${emp.first_name} ${emp.last_name}):`);
    const monthStart = '2026-09-01';
    const monthEnd = '2026-09-28';

    const struct = await db('employee_salary_structures as ess')
      .join('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
      .where('ess.employee_id', emp.id)
      .where('ess.is_current', 1)
      .where('ss.effective_from', '<=', monthEnd)
      .where(function () {
        this.whereNull('ss.effective_to').orWhere('ss.effective_to', '>=', monthStart);
      })
      .whereNull('ess.deleted_at')
      .whereNull('ss.deleted_at')
      .orderBy('ss.effective_from', 'desc')
      .orderBy('ss.id', 'desc')
      .first()
      .catch((e) => {
        console.error('Struct lookup error:', e.message);
        return null;
      });

    console.log('   Assigned Structure:', struct ? `Structure ID #${struct.salary_structure_id} (CTC: ₹${struct.annual_ctc})` : 'NONE FOUND');
  }

  await db.destroy();
}

runControllerDebug().catch(console.error);
