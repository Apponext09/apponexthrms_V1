import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Wiping ALL loans from DB ===');
await db('loan_repayments').del();
await db('employee_loans').del();

console.log('✅ Wiped all loan entries from database.');

const count = await db('employee_loans').count('id as total').first();
console.log('Current total loans in DB:', count.total);

process.exit(0);
