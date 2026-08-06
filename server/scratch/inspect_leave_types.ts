import { initializeKnex, getKnex } from '../src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  initializeKnex();
  const db = getKnex();
  try {
    const leaveTypes = await db('leave_types').select('id', 'leave_name', 'leave_code', 'organization_id', 'status', 'deleted_at');
    console.log('--- LEAVE TYPES ---');
    console.table(leaveTypes);

    const employees = await db('employees').select('id', 'first_name', 'last_name', 'organization_id').limit(10);
    console.log('\n--- EMPLOYEES (LIMIT 10) ---');
    console.table(employees);

    const users = await db('users').select('id', 'email', 'employee_id', 'organization_id').limit(10);
    console.log('\n--- USERS (LIMIT 10) ---');
    console.table(users);

    const organizationCount = await db('leave_types').groupBy('organization_id').select('organization_id').count('* as count');
    console.log('\n--- LEAVE TYPES COUNT BY ORG ---');
    console.table(organizationCount);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
