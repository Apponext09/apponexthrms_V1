import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    const [colsEmployees] = await db.raw('DESCRIBE employees');
    console.log('--- EMPLOYEES COLUMNS ---');
    colsEmployees.forEach((c: any) => console.log(`${c.Field} (${c.Type}) Null:${c.Null}`));

    const [colsUsers] = await db.raw('DESCRIBE users');
    console.log('\n--- USERS COLUMNS ---');
    colsUsers.forEach((c: any) => console.log(`${c.Field} (${c.Type}) Null:${c.Null}`));

    const [empRows] = await db.raw('SELECT id, employee_code, first_name, last_name, email, organization_id FROM employees LIMIT 5');
    console.log('\n--- SAMPLE EMPLOYEES ---', empRows);

    const [userRows] = await db.raw('SELECT id, email, employee_id, organization_id FROM users LIMIT 5');
    console.log('\n--- SAMPLE USERS ---', userRows);

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await db.destroy();
  }
}

run();
