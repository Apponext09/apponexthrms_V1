import { initializeKnex, getKnex } from '../src/db/knex';

async function diagnose() {
  initializeKnex();
  const db = getKnex();

  try {
    console.log('--- EMPLOYEE BY ID 1 ---');
    const employee = await db('employees').where('id', 1).first();
    if (!employee) {
      console.log('❌ Employee with ID=1 not found.');
    } else {
      console.log('Employee ID=1 JSON:', JSON.stringify(employee, null, 2));

      // Also check policy assignments for employee ID 1
      const assignments = await db('leave_policy_assignments')
        .where('employee_id', 1);
      console.log(`Assignments count for employee ID=1: ${assignments.length}`);
      console.log('Assignments JSON:', JSON.stringify(assignments, null, 2));

      // Also check balances for employee ID 1
      const balances = await db('leave_balances')
        .where('employee_id', 1);
      console.log(`Balances count for employee ID=1: ${balances.length}`);
      console.log('Balances JSON:', JSON.stringify(balances, null, 2));
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await db.destroy();
  }
}

diagnose();
