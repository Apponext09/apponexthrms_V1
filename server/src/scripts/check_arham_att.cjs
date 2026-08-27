const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkArhamAttendance() {
  const arhamEmps = await db('employees').where('company_id', 18).whereNull('deleted_at');
  console.log(`Checking attendance for ${arhamEmps.length} Arham employees in August 2026:`);

  for (const emp of arhamEmps) {
    const recs = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
      .whereNull('deleted_at');
    console.log(`- Employee ${emp.first_name} ${emp.last_name} (ID: ${emp.id}): ${recs.length} attendance records`);
  }

  await db.destroy();
}

checkArhamAttendance().catch(console.error);
