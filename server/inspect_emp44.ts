import { initializeKnex, getKnex } from './src/db/knex.js';

initializeKnex();
const db = getKnex();

const emp44 = await db('employees').where('id', 44).first();
console.log('Employee #44 raw columns:', JSON.stringify(emp44, null, 2));

process.exit(0);
