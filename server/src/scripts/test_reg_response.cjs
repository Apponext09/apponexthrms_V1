const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

// Simulate full PayrollRegisterController execution with the exact parameters from the frontend
async function testRegisterResponse() {
  const targetOrgId = 8;
  const cycleId = 13;
  const month = '2026-08';
  const companyId = 'ALL';

  let empQuery = db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('designations as des', 'e.current_designation_id', 'des.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .where('e.organization_id', targetOrgId);

  const rawEmployees = await empQuery.select(
    'e.id',
    'e.uuid',
    'e.company_id',
    'e.employee_code',
    'e.organization_id',
    'e.first_name',
    'e.middle_name',
    'e.last_name',
    'e.job_title',
    'e.current_department_id',
    'e.current_designation_id',
    'e.current_location_id',
    'e.employment_type',
    'e.date_of_joining',
    'd.name as department_name',
    'des.name as designation_name',
    'l.name as location_name',
    db.raw("COALESCE(NULLIF(TRIM(e.bank_name), ''), NULLIF(TRIM(ec.bank_name), '')) as bank_name"),
    db.raw("COALESCE(NULLIF(TRIM(e.account_no), ''), NULLIF(TRIM(ec.account_number), '')) as account_number"),
    db.raw("COALESCE(NULLIF(TRIM(e.ifsc_code), ''), NULLIF(TRIM(ec.ifsc_code), '')) as ifsc_code"),
    db.raw("TRIM(CONCAT(COALESCE(mgr.first_name,''), ' ', COALESCE(mgr.last_name,''))) as reporting_manager")
  );

  console.log(`Found ${rawEmployees.length} total employees for register calculation.`);

  // Cycle days
  const calendarDays = 31;
  const cycleStartDay = 1;
  const cycleCutoffDay = 28;
  const totalDays = 28;

  const resultRows = [];
  for (const emp of rawEmployees) {
    let struct = await db('salary_structures')
      .where('employee_id', emp.id)
      .whereNull('deleted_at')
      .first()
      .catch(() => null);

    const gross = struct ? Number(struct.gross_monthly) : 45000;

    // Attendance records
    const attRecs = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', ['2026-08-01', '2026-08-28']);

    const presentDays = attRecs.filter(r => r.status === 'present').length;
    const halfDays = attRecs.filter(r => r.status === 'half_day').length;
    const weeklyOffs = attRecs.filter(r => r.status === 'weekly_off').length;
    const absents = attRecs.filter(r => r.status === 'absent').length;
    const paidDays = presentDays + (halfDays * 0.5) + weeklyOffs;
    const unpaidDays = Math.max(0, totalDays - paidDays);

    resultRows.push({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      employeeCode: emp.employee_code,
      gross,
      totalDays,
      paidDays,
      unpaidDays,
      attRecordsCount: attRecs.length
    });
  }

  console.log(`Generated ${resultRows.length} register rows.`);
  console.log('First 3 rows:', resultRows.slice(0, 3));
  console.log('Last 3 rows:', resultRows.slice(-3));

  await db.destroy();
}

testRegisterResponse().catch(console.error);
