require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });
const crypto = require('crypto');

async function testPasswordHash() {
  console.log('--- CHECKING PASSWORDS FOR USERS ---');
  const users = await k('users')
    .leftJoin('employees', 'users.employee_id', 'employees.id')
    .select(
      'users.id as userId',
      'users.email as userEmail',
      'users.password_hash',
      'users.status as userStatus',
      'users.employee_id',
      'employees.id as empId',
      'employees.email as empEmail',
      'employees.first_name',
      'employees.last_name'
    );

  console.log(`Found ${users.length} users in DB:\n`);

  for (const u of users) {
    const isEmployee = !!u.employee_id;
    const hashStart = u.password_hash ? u.password_hash.substring(0, 20) : 'NULL';
    console.log(`User ID: ${u.userId} | Email: ${u.userEmail} | IsEmp: ${isEmployee} (EmpID: ${u.employee_id}) | Hash: ${hashStart}...`);
  }

  await k.destroy();
}

testPasswordHash().catch(e => { console.error(e); k.destroy(); });
