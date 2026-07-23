import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    const emps = await db('employees').where('email', 'like', '%apponext%');
    console.log('--- EMPLOYEES MATCHING apponext ---');
    console.log(emps);

    const users = await db('users').where('email', 'like', '%apponext%');
    console.log('\n--- USERS MATCHING apponext ---');
    console.log(users);

    const allEmps = await db('employees').select('id', 'employee_code', 'first_name', 'last_name', 'email');
    console.log('\n--- ALL EMPLOYEES COUNT:', allEmps.length, '---');
    allEmps.forEach(e => console.log(`Emp ID:${e.id} | Code:${e.employeeCode} | Name:${e.firstName} ${e.lastName} | Email:${e.email}`));

    const allUsers = await db('users').select('id', 'email', 'employee_id', 'status');
    console.log('\n--- ALL USERS COUNT:', allUsers.length, '---');
    allUsers.forEach(u => console.log(`User ID:${u.id} | Email:${u.email} | EmpID:${u.employeeId} | Status:${u.status}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
