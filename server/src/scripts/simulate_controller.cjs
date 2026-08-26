const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// Simulate full PayrollRegisterController execution for Company 4 and Company 18
async function runFullControllerSimulation() {
  const targetOrgId = 8;
  const cycleId = 13;
  const month = '2026-08';

  // Test 1: Query for Company 18 (Arham)
  let empQuery18 = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId)
    .where('e.company_id', 18)
    .select(
      'e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'e.company_id', 'e.status',
      'd.name as department_name', 'des.name as designation_name', 'l.name as location_name',
      'ec.bank_name', 'ec.account_number'
    );

  const emps18 = await empQuery18;
  console.log(`Query for Arham (Company 18) returned ${emps18.length} employees.`);

  // Test 2: Query for Kosqu (Company 4)
  let empQuery4 = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId)
    .where('e.company_id', 4)
    .select(
      'e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'e.company_id', 'e.status',
      'd.name as department_name', 'des.name as designation_name', 'l.name as location_name',
      'ec.bank_name', 'ec.account_number'
    );

  const emps4 = await empQuery4;
  console.log(`Query for Kosqu (Company 4) returned ${emps4.length} employees.`);

  // Test 3: Query for All Companies
  let empQueryAll = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId)
    .select(
      'e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'e.company_id', 'e.status'
    );

  const empsAll = await empQueryAll;
  console.log(`Query for All Companies returned ${empsAll.length} employees.`);

  await db.destroy();
}

runFullControllerSimulation().catch(console.error);
