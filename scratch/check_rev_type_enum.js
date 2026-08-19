const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function run() {
  const [cols] = await db.raw("SHOW COLUMNS FROM salary_revisions LIKE 'revision_type'");
  console.log('REVISION_TYPE column definition:', cols);
  await db.destroy();
}

run().catch(console.error);
