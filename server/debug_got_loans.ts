import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Checking got user ===');
const gotUser = await db('users').whereRaw("LOWER(email) = 'got@gmail.com'").first();
console.log('got user:', gotUser);

if (gotUser) {
  const gotEmp = await db('employees').where('id', gotUser.employeeId || gotUser.employee_id).first();
  console.log('got employee:', gotEmp);

  console.log('\n=== Checking employee_loans for got organization_id ===');
  const orgLoans = await db('employee_loans').where('organization_id', gotUser.organizationId || gotUser.organization_id);
  console.log('Loans in got org:', orgLoans);
}

console.log('\n=== ALL loans in employee_loans table right now ===');
const allLoans = await db('employee_loans').select('*');
console.log('Total loans in DB:', allLoans.length, allLoans);

process.exit(0);
