import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Clearing test loan records ===');
await db('loan_repayments').del();
await db('employee_loans').del();

console.log('✅ Cleared all test loans and repayment schedules from database.');

process.exit(0);
