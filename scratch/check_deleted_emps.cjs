require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function checkDeletedAt() {
  const empIds = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const emps = await k('employees').whereIn('id', empIds).select('id', 'email', 'first_name', 'last_name', 'status', 'deleted_at');
  console.log(JSON.stringify(emps, null, 2));
  await k.destroy();
}

checkDeletedAt().catch(e => { console.error(e); k.destroy(); });
