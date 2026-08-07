require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function diagnose() {
  console.log('--- DB DIAGNOSTIC FOR EMPLOYEE LOGIN ---');
  
  const employees = await k('employees').select('id', 'email', 'first_name', 'last_name', 'status', 'company_id', 'organization_id');
  console.log(`Total employees in DB: ${employees.length}`);
  
  const users = await k('users').select('id', 'email', 'employee_id', 'role', 'status', 'organization_id', 'locked_until', 'failed_login_attempts');
  console.log(`Total users in DB: ${users.length}`);

  const userRoles = await k('user_roles').select('*');
  console.log(`Total user_roles rows: ${userRoles.length}`);

  console.log('\n--- Employee vs User Mapping ---');
  for (const emp of employees.slice(0, 15)) {
    const userByEmpId = users.find(u => u.employee_id === emp.id);
    const userByEmail = users.find(u => u.email && emp.email && u.email.toLowerCase() === emp.email.toLowerCase());
    
    console.log(`Emp ID: ${emp.id} | Email: ${emp.email} | Name: ${emp.first_name} ${emp.last_name} | Status: ${emp.status}`);
    if (userByEmpId) {
      console.log(`  -> User found by employee_id: UserID=${userByEmpId.id}, Role=${userByEmpId.role}, Status=${userByEmpId.status}, LockedUntil=${userByEmpId.locked_until}`);
    } else if (userByEmail) {
      console.log(`  -> User found by email ONLY (employee_id IS NULL in users!): UserID=${userByEmail.id}, Role=${userByEmail.role}, Status=${userByEmail.status}`);
    } else {
      console.log(`  -> NO USER RECORD FOUND FOR THIS EMPLOYEE IN 'users' TABLE!`);
    }
  }

  await k.destroy();
}

diagnose().catch(e => { console.error('Error:', e); k.destroy(); });
