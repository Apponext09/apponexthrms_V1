import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== pp user full row ===');
const user = await db('users').whereRaw('LOWER(email) = ?', ['pp@gmail.com']).first();
console.log(JSON.stringify(user, null, 2));

console.log('\n=== mm org row ===');
const mmOrg = await db('organizations').whereRaw("LOWER(email) = 'mm@gmail.com'").first();
console.log(JSON.stringify({ id: mmOrg?.id, name: mmOrg?.name, email: mmOrg?.email }, null, 2));

console.log('\n=== All orgs ===');
const orgs = await db('organizations').select('id', 'name', 'email').limit(10);
console.log(JSON.stringify(orgs, null, 2));

console.log('\n=== employees with pp email (no org filter) ===');
const ppEmp = await db('employees').whereRaw("LOWER(email) = 'pp@gmail.com'");
console.log(JSON.stringify(ppEmp.map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, org_id: e.organization_id, dept_id: e.current_department_id, reports_to: e.reporting_manager_id })), null, 2));

if (mmOrg) {
  console.log('\n=== All employees in mm org ===');
  const emps = await db('employees').where('organization_id', mmOrg.id).whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'email', 'current_department_id', 'reporting_manager_id');
  console.log(JSON.stringify(emps.map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, email: e.email, dept: e.current_department_id, reports_to: e.reporting_manager_id })), null, 2));

  console.log('\n=== Departments in mm org ===');
  const depts = await db('departments').where('organization_id', mmOrg.id).select('id', 'name', 'department_head_id');
  console.log(JSON.stringify(depts, null, 2));
}

process.exit(0);
