import { db } from '../server/src/db/knex';

async function check() {
  const orgs = await db('organizations').select('id', 'name');
  console.log('Organizations in DB:', orgs);

  const emps = await db('employees').select('id', 'first_name', 'organization_id', 'company_id').limit(5);
  console.log('Employees in DB:', emps);

  process.exit(0);
}

check();
