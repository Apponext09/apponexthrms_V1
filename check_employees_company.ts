import { getKnex } from './server/src/db/knex';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

async function checkEmployeesCompany() {
  const db = getKnex();

  console.log('\n🔍 Checking all employees in database:');
  const employees = await db('employees').select('id', 'first_name', 'last_name', 'email', 'company_id', 'organization_id', 'created_at');
  console.table(employees);

  await db.destroy();
}

checkEmployeesCompany();
