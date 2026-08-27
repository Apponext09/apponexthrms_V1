const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkAttendanceData() {
  console.log('--- Checking Attendance Records for 2026-08 ---');
  const records = await db('attendance_records')
    .whereBetween('date', ['2026-08-01', '2026-08-28']);
  console.log(`Total attendance records found in 2026-08: ${records.length}`);
  if (records.length > 0) {
    console.log('Sample record:', records[0]);
  }

  // Check attendance for employee 115 (Aarav Shah) and others
  const emp115Recs = await db('attendance_records').where('employee_id', 115);
  console.log(`Attendance records for employee 115 (Aarav Shah): ${emp115Recs.length}`);

  // Check all employees in company 18
  const arhamEmps = await db('employees').where('company_id', 18).whereNull('deleted_at');
  console.log(`Arham Employees (${arhamEmps.length}):`, arhamEmps.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })));

  // Check leaves in 2026-08
  const leaves = await db('leave_applications')
    .where('application_start_date', '<=', '2026-08-28')
    .where('application_end_date', '>=', '2026-08-01');
  console.log(`Total leave applications in Aug 2026: ${leaves.length}`);

  await db.destroy();
}

checkAttendanceData().catch(console.error);
