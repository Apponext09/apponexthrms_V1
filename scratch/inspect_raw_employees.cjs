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

async function inspectRawEmployees() {
  const targetOrgId = 3;
  
  console.log('Querying employees for organization_id = 3...');
  const emps = await db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId)
    .select('e.id', 'e.employee_code', 'e.first_name', 'e.last_name', 'e.status', 'e.organization_id', 'e.company_id');

  console.log('Found Employees:', emps.length);
  console.table(emps);

  console.log('\nQuerying payroll_components for organization_id = 3...');
  const comps = await db('payroll_components')
    .where('organization_id', targetOrgId)
    .where('is_active', 1)
    .whereNull('deleted_at');
  console.log('Found Components:', comps.length);
  console.table(comps.map(c => ({ id: c.id, name: c.name, type: c.component_type, formula: c.formula })));

  console.log('\nQuerying salary_structures for organization_id = 3...');
  const ss = await db('salary_structures')
    .where('organization_id', targetOrgId)
    .whereNull('deleted_at');
  console.log('Found Salary Structures:', ss.length);
  console.table(ss.map(s => ({ id: s.id, emp_id: s.employee_id, ctc: s.annual_ctc, slab_id: s.slab_id, eff_from: s.effective_from })));

  console.log('\nQuerying employee_salary_structures links...');
  const ess = await db('employee_salary_structures')
    .where('organization_id', targetOrgId)
    .whereNull('deleted_at');
  console.log('Found Structure Links:', ess.length);
  console.table(ess.map(l => ({ id: l.id, emp_id: l.employee_id, struct_id: l.salary_structure_id, is_current: l.is_current })));

  await db.destroy();
}

inspectRawEmployees().catch(console.error);
