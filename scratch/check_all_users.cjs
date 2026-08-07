require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function checkAll() {
  const employees = await k('employees').select('id', 'email', 'first_name', 'last_name', 'status');
  const users = await k('users').select('id', 'email', 'employee_id', 'role', 'status', 'password_hash');
  
  console.log('=== USERS IN DB ===');
  for (const u of users) {
    console.log(`User ID: ${u.id} | Email: ${u.email} | Emp ID: ${u.employee_id} | Role: ${u.role} | HasPW: ${!!u.password_hash}`);
  }

  let missingUserCount = 0;
  console.log('\n=== EMPLOYEES MISSING USERS ===');
  for (const emp of employees) {
    const hasUser = users.some(u => u.employee_id === emp.id || (u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase()));
    if (!hasUser) {
      missingUserCount++;
      console.log(`Emp ID: ${emp.id} | Email: ${emp.email} | Name: ${emp.first_name} ${emp.last_name}`);
    }
  }
  console.log(`Total employees without user login records: ${missingUserCount} / ${employees.length}`);

  await k.destroy();
}

checkAll().catch(e => { console.error('Error:', e); k.destroy(); });
