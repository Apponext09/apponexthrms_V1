const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function check() {
  const compCols = await db.raw(`DESCRIBE employee_compensation`);
  console.log('employee_compensation columns:');
  console.log(compCols[0].map(c => c.Field));

  const compRows = await db('employee_compensation').select('*').limit(5);
  console.log('\nSample employee_compensation rows:');
  console.log(compRows);

  const empRows = await db('employees')
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'employee_code', 'bank_name', 'account_no', 'ifsc_code', 'pan', 'pan_number', 'uan_no', 'pf_no', 'esic_no')
    .limit(10);
  console.log('\nSample employees rows bank/statutory:');
  console.log(empRows);

  await db.destroy();
}

check().catch(console.error);
