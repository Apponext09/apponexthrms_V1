import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

console.log('\n=== Altering employee_loans status column to VARCHAR(50) ===');
await db.raw("ALTER TABLE employee_loans MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
console.log('✅ Altered employee_loans.status to VARCHAR(50)');

const cols = await db.raw("SHOW COLUMNS FROM employee_loans");
const statusCol = cols[0].find((c: any) => c.Field === 'status');
console.log('Updated status column:', statusCol);

process.exit(0);
