const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkUsers() {
  const users = await db('users').select('id', 'email', 'organization_id', 'company_id', 'role');
  console.log('Users in DB:', users);
  await db.destroy();
}

checkUsers().catch(console.error);
