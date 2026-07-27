import knex from 'knex';
import dotenv from 'dotenv';
import { up } from './migrations/20260725000001_alter_shift_templates_roster';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });
dotenv.config({ path: '../server/.env' });

const connection = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  },
});

async function main() {
  try {
    console.log('Running shift roster migration on live database...');
    await up(connection);
    console.log('SUCCESS: shift_templates table altered (shift_type ENUM updated to include roster, roster_pattern JSON column added).');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
