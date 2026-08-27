const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkColType() {
  const info = await db.raw("SHOW COLUMNS FROM attendance_records WHERE Field = 'check_in_date'");
  console.log('Column Type for check_in_date:');
  console.log(info[0]);

  const rawRecs = await db.raw("SELECT id, employee_id, check_in_date, DATE(check_in_date) as dt, status FROM attendance_records WHERE check_in_date >= '2026-07-01' LIMIT 10");
  console.log('Sample rows:');
  console.log(rawRecs[0]);

  await db.destroy();
}

checkColType().catch(console.error);
