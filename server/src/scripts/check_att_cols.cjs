const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkCols() {
  const cols = await db('attendance_records').columnInfo();
  console.log('Columns in attendance_records:', Object.keys(cols));
  await db.destroy();
}

checkCols().catch(console.error);
