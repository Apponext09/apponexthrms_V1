const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function inspectLeavePoliciesTable() {
  const cols = await db.raw('DESCRIBE leave_policies');
  console.log('leave_policies columns:', cols[0].map(c => c.Field));
  await db.destroy();
  process.exit(0);
}

inspectLeavePoliciesTable();
