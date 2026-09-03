const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkUserOrg() {
  const u = await db('users').where('email', 'kot@gmail.com').first();
  console.log('User kot@gmail.com:', u ? { id: u.id, email: u.email, org_id: u.organization_id, company_id: u.company_id, role: u.role } : 'Not found');

  const allEmps = await db('employees').whereNull('deleted_at').select('id', 'first_name', 'last_name', 'organization_id', 'company_id');
  console.log(`Total active employees in DB: ${allEmps.length}`);
  const orgMap = {};
  for (const e of allEmps) {
    orgMap[e.organization_id] = (orgMap[e.organization_id] || 0) + 1;
  }
  console.log('Employees by organization_id:', orgMap);

  await db.destroy();
}

checkUserOrg().catch(console.error);
