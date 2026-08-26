const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkAarav() {
  const ss = await db('salary_structures').where('employee_id', 115).first();
  console.log('Aarav Shah (115) Salary Structure:');
  console.log(JSON.stringify(ss, null, 2));
  await db.destroy();
}

checkAarav().catch(console.error);
