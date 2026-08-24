const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function debugRegisterController() {
  const targetOrgId = 8;
  const cycleId = 13;
  const targetMonth = '2026-08';
  
  let empQuery = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

  // With company_id = 4
  const emps = await empQuery.where('e.company_id', 4).select('e.id', 'e.first_name', 'e.last_name', 'e.employee_code', 'e.status');
  console.log(`Testing with ${emps.length} employees:`);

  const allSlabs = await db('payroll_slabs').where('organization_id', targetOrgId).where('is_active', 1);
  console.log(`Loaded ${allSlabs.length} slabs:`, allSlabs.map(s => ({ id: s.id, name: s.name })));

  const allComponents = await db('payroll_components').where('organization_id', targetOrgId).where('is_active', 1);
  console.log(`Loaded ${allComponents.length} components.`);

  const resultRows = [];
  for (const emp of emps) {
    let struct = await db('salary_structures').where('employee_id', emp.id).whereNull('deleted_at').first().catch(() => null);
    if (!struct) {
      const ess = await db('employee_salary_structures as ess')
        .leftJoin('salary_structures as ss', 'ess.salary_structure_id', 'ss.id')
        .where({ 'ess.employee_id': emp.id, 'ess.is_current': true })
        .whereNull('ess.deleted_at')
        .select('ss.*')
        .first()
        .catch(() => null);
      if (ess) struct = ess;
    }
    
    // Attendance count
    const attRecs = await db('attendance_records').where('employee_id', emp.id).whereBetween('check_in_date', ['2026-08-01', '2026-08-28']);
    
    resultRows.push({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      hasStruct: !!struct,
      attCount: attRecs.length
    });
  }

  console.log(`Total resultRows created: ${resultRows.length}`);
  console.log('Sample rows:', resultRows.slice(0, 5));

  await db.destroy();
}

debugRegisterController().catch(console.error);
