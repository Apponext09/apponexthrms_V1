require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function checkActiveEmployeesLogin() {
  console.log('=== ACTIVE EMPLOYEES & LOGIN STATUS ===');

  const activeEmployees = await k('employees')
    .whereNull('deleted_at')
    .select('id', 'email', 'first_name', 'last_name', 'status', 'company_id', 'organization_id');

  console.log(`Total Active Non-Deleted Employees: ${activeEmployees.length}\n`);

  const users = await k('users').whereNull('deleted_at').select('*');
  const userRoles = await k('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .select('user_roles.user_id', 'roles.name as roleName', 'roles.code as roleCode');

  let activeWithoutUser = 0;
  let activeWithUser = 0;

  for (const emp of activeEmployees) {
    const u = users.find(usr => 
      usr.employee_id === emp.id || 
      (usr.email && emp.email && usr.email.toLowerCase() === emp.email.toLowerCase())
    );

    const rolesForUser = u ? userRoles.filter(ur => ur.user_id === u.id).map(r => r.roleCode) : [];

    if (u) {
      activeWithUser++;
      console.log(`✓ EMP #${emp.id} [${emp.first_name} ${emp.last_name}] (${emp.email})`);
      console.log(`   User ID: ${u.id} | Login Email: "${u.email}" | Status: ${u.status} | Locked: ${u.locked_until ? 'YES' : 'NO'} | Roles: [${rolesForUser.join(', ')}]`);
    } else {
      activeWithoutUser++;
      console.log(`❌ EMP #${emp.id} [${emp.first_name} ${emp.last_name}] (${emp.email}) -> NO USER RECORD!`);
    }
  }

  console.log(`\nSummary: ${activeWithUser} active employees have user login accounts. ${activeWithoutUser} active employees do NOT have user login accounts.`);

  await k.destroy();
}

checkActiveEmployeesLogin().catch(e => { console.error(e); k.destroy(); });
