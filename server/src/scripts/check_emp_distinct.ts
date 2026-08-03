import { getKnex } from '../db/knex';

async function checkEmp() {
  const db = getKnex();
  try {
    const grades = await db('employees').distinct('grade');
    const empTypes = await db('employees').distinct('employment_type');
    const statuses = await db('employees').distinct('status');
    console.log('Grades:', grades);
    console.log('Types:', empTypes);
    console.log('Statuses:', statuses);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkEmp();
