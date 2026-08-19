const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

async function main() {
  try {
    const logs = await db('resume_upload_logs').orderBy('created_at', 'desc').limit(5);
    console.log('=== RECENT RESUME UPLOAD LOGS ===');
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await db.destroy();
  }
}

main();
