import { getKnex } from '../db/knex';

async function checkSchema() {
  const db = getKnex();
  try {
    const leaveTypesInfo = await db('leave_types').columnInfo();
    console.log('leave_types columns:', Object.keys(leaveTypesInfo));

    const employeesInfo = await db('employees').columnInfo();
    console.log('employees columns:', Object.keys(employeesInfo));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
