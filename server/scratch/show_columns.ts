import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function main() {
  try {
    const res = await db.raw('SHOW COLUMNS FROM notification_templates');
    console.log('Columns:', res[0]);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    db.destroy();
  }
}
main();
