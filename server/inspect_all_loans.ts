import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== All rows in employee_loans table ===');
const rows = await db('employee_loans').select('*');
console.log(JSON.stringify(rows, null, 2));

process.exit(0);
