const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkAugustAttendance() {
  const records = await db('attendance_records')
    .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
    .whereNull('deleted_at');

  console.log(`August 2026 Attendance Records Found: ${records.length}`);
  if (records.length > 0) {
    const summary = {};
    records.forEach(r => {
      summary[r.status] = (summary[r.status] || 0) + 1;
    });
    console.log('Status breakdown:', summary);
    console.log('Sample record:', records[0]);
  } else {
    const anyRecs = await db('attendance_records').whereNull('deleted_at').limit(5);
    console.log(`No records in Aug 2026. Total records overall: ${anyRecs.length}`);
    if (anyRecs.length > 0) {
      console.log('Latest record dates:', anyRecs.map(r => r.check_in_date));
    }
  }

  await db.destroy();
}

checkAugustAttendance().catch(console.error);
