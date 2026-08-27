const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// Simulate exact PayrollRegisterController query
async function testFullRegister() {
  const targetOrgId = 8;
  const activeCompanyId = 4; // Kosqu ORG
  const cycleId = 13;
  const month = '2026-08';

  let empQuery = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

  // In the screenshot, Company dropdown was "All Companies"
  // But req.headers['x-company-id'] is '4' because Kosqu ORG is selected in the topbar!
  // If companyId query param was undefined (All Companies), activeCompanyId was resolved from X-Company-Id!
  console.log('Testing with company_id = 4:');
  const rawEmps = await empQuery.clone().where('e.company_id', 4).select('e.id', 'e.first_name', 'e.last_name', 'e.status');
  console.log(`Found ${rawEmps.length} employees in Kosqu (company 4):`, rawEmps);

  console.log('\nTesting with company_id = 18 (Arham):');
  const arhamEmps = await empQuery.clone().where('e.company_id', 18).select('e.id', 'e.first_name', 'e.last_name', 'e.status');
  console.log(`Found ${arhamEmps.length} employees in Arham (company 18):`, arhamEmps);

  await db.destroy();
}

testFullRegister().catch(console.error);
