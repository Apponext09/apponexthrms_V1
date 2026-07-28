import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

const cols = await db.raw("SHOW COLUMNS FROM employee_loans");
console.log('employee_loans columns:', JSON.stringify(cols[0], null, 2));

process.exit(0);
