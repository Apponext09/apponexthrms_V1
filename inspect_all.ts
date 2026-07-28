import { getKnex } from './server/src/db/knex';

async function inspect() {
  try {
    const db = getKnex();
    const depts = await db('departments').select('id', 'name', 'code', 'organization_id');
    const orgs = await db('organizations').select('id', 'name', 'code', 'email');
    const users = await db('users').select('id', 'email', 'organization_id', 'first_name', 'last_name');
    const employees = await db('employees').select('id', 'first_name', 'last_name', 'email', 'organization_id', 'current_department_id');

    console.log('=== ALL DEPARTMENTS IN DB ===\n', depts);
    console.log('=== ALL ORGANIZATIONS IN DB ===\n', orgs);
    console.log('=== ALL USERS IN DB ===\n', users);
    console.log('=== ALL EMPLOYEES IN DB ===\n', employees);
  } catch (err) {
    console.error('Inspection error:', err);
  }
  process.exit(0);
}

inspect();
