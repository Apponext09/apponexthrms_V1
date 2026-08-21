const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const knex = require('knex');
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  }
});

async function testQuery() {
  const rawEmployees = await db('employees as e')
    .leftJoin('departments as d', 'e.current_department_id', 'd.id')
    .leftJoin('locations as l', 'e.current_location_id', 'l.id')
    .leftJoin('employees as mgr', 'e.reporting_manager_id', 'mgr.id')
    .leftJoin('employee_compensation as ec', 'e.id', 'ec.employee_id')
    .whereNull('e.deleted_at')
    .select(
      'e.id',
      'e.employee_code',
      'e.first_name',
      'e.last_name',
      db.raw("COALESCE(NULLIF(TRIM(e.bank_name), ''), NULLIF(TRIM(ec.bank_name), '')) as bank_name"),
      db.raw("COALESCE(NULLIF(TRIM(e.account_no), ''), NULLIF(TRIM(ec.account_number), '')) as account_number"),
      db.raw("COALESCE(NULLIF(TRIM(e.ifsc_code), ''), NULLIF(TRIM(ec.ifsc_code), '')) as ifsc_code")
    );

  console.log('SIMULATED PROCESS REGISTER BANK DETAILS (ALL EMPLOYEES WITH BANK INFO):');
  rawEmployees.forEach(emp => {
    if (emp.bank_name || emp.account_number || emp.ifsc_code) {
      console.log(`Emp #${emp.id} | ${emp.first_name} ${emp.last_name} (${emp.employee_code}) -> Bank: ${emp.bank_name || 'N/A'}, Acc: ${emp.account_number || 'N/A'}, IFSC: ${emp.ifsc_code || 'N/A'}`);
    }
  });

  process.exit(0);
}

testQuery().catch(err => {
  console.error(err);
  process.exit(1);
});
