import { getKnex } from '../src/db/knex';

async function checkEmpDates() {
  const db = getKnex();
  const rows = await db('employees').select('id', 'first_name', 'last_name', 'date_of_joining', 'created_at').limit(10);
  console.log('Employee Dates in DB:', rows);
  process.exit(0);
}

checkEmpDates();
