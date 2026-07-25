import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Checking users table for employees ===');
const users = await db('users').select('id', 'email', 'employee_id', 'organization_id');
console.log('users:', users);

console.log('\n=== Checking employees table ===');
const emps = await db('employees').select('id', 'first_name', 'last_name', 'email', 'organization_id');
console.log('employees:', emps);

process.exit(0);
