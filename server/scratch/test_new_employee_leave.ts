import { initializeKnex, getKnex } from '../src/db/knex';

async function diagnose() {
  initializeKnex();
  const db = getKnex();

  try {
    const employee = await db('employees').orderBy('id', 'desc').first();
    if (!employee) {
      console.log('❌ No employees.');
      return;
    }
    console.log(`Checking balances for Employee: ID=${employee.id}, Email=${employee.email}`);

    const balances = await db('leave_balances').where('employee_id', employee.id);
    console.log('Balances JSON:', JSON.stringify(balances, null, 2));

  } catch (err: any) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

diagnose();
