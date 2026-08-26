const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function testFilterQuery() {
  const targetOrgId = 8;
  const activeCompanyId = 4; // Kosqu ORG
  const cycleId = 13;
  const generateOnMode = 'Attendance';
  const month = '2026-08';

  console.log('Testing employee query for Kosqu (company_id: 4):');
  let empQuery = db('employees as e')
    .select(
      'e.*',
      'd.name as department_name',
      'des.name as designation_name',
      'l.name as location_name',
      'mgr.first_name as mgr_first',
      'mgr.last_name as mgr_last',
      'ec.bank_name',
      'ec.account_number',
      'ec.ifsc_code'
    )
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

  // If company filter is All Companies or company 4
  const employeesAll = await empQuery.clone();
  console.log(`Total employees across all companies in Org 8: ${employeesAll.length}`);

  const employeesComp4 = await empQuery.clone().where('e.company_id', 4);
  console.log(`Employees with company_id = 4: ${employeesComp4.length}`);

  // Now check how many employees have salary structure in company 4
  for (const emp of employeesComp4) {
    const struct = await db('salary_structures').where('employee_id', emp.id).whereNull('deleted_at').first();
    const ess = await db('employee_salary_structures').where('employee_id', emp.id).first();
    console.log(`Emp ${emp.id} (${emp.first_name} ${emp.last_name}): struct=${!!struct}, ess=${!!ess}`);
  }

  await db.destroy();
}

testFilterQuery().catch(console.error);
