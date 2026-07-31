import { getKnex } from '../db/knex';

async function main() {
  const db = getKnex();
  try {
    const settings = await db('organization_settings').select('*');
    console.log('--- Organization Settings ---');
    console.log(JSON.stringify(settings, null, 2));

    const employees = await db('employees').select('id', 'first_name', 'last_name', 'current_role_id', 'reporting_manager_id').limit(15);
    console.log('--- Employees ---');
    console.log(JSON.stringify(employees, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

main();
