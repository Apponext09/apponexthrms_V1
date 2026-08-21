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

async function main() {
  const emps = await db('employees').select('id', 'first_name', 'last_name', 'employee_code', 'bank_name', 'account_no', 'ifsc_code');
  console.log('EMPLOYEES TABLE BANK DATA:');
  emps.forEach(e => {
    if (e.bank_name || e.account_no || e.ifsc_code) {
      console.log(`ID ${e.id} | ${e.first_name} ${e.last_name} (${e.employee_code}) -> Bank: "${e.bank_name}", Acc: "${e.account_no}", IFSC: "${e.ifsc_code}"`);
    }
  });

  const comp = await db('employee_compensation').select('employee_id', 'bank_name', 'account_number', 'ifsc_code');
  console.log('\nEMPLOYEE COMPENSATION TABLE BANK DATA:');
  comp.forEach(c => {
    if (c.bank_name || c.account_number || c.ifsc_code) {
      console.log(`Emp ID ${c.employee_id} -> Bank: "${c.bank_name}", Acc: "${c.account_number}", IFSC: "${c.ifsc_code}"`);
    }
  });

  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
