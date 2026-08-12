import { db } from '../server/src/db/knex';

async function checkEmpCols() {
  const sample = await db('employees').first();
  console.log('Employees sample keys:', Object.keys(sample || {}));
  process.exit(0);
}

checkEmpCols();
