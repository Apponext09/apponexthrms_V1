import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Clearing ALL fake/test loan requests ===');
await db('loan_repayments').del();
await db('employee_loans').del();

console.log('✅ Cleared all loan requests and repayment schedules from database.');

const count = await db('employee_loans').count('id as total').first();
console.log('Current employee_loans count:', count);

process.exit(0);
