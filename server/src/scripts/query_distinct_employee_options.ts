import { getKnex } from '../db/knex';

async function queryEmployees() {
  const db = getKnex();
  try {
    const grades = await db('employees').distinct('grade').whereNotNull('grade');
    const types = await db('employees').distinct('employment_type').whereNotNull('employment_type');
    const statuses = await db('employees').distinct('status').whereNotNull('status');
    console.log('Grades:', grades);
    console.log('Types:', types);
    console.log('Statuses:', statuses);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

queryEmployees();
