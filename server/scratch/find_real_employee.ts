import { getKnex } from '../src/db/knex';

async function check() {
  const db = getKnex();
  const employees = await db('employees').select('id', 'first_name', 'last_name', 'email', 'organization_id');
  console.log('Employees found:', employees);
  process.exit(0);
}

check();
