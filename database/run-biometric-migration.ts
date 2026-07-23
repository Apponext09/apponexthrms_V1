import knex from 'knex';
import dotenv from 'dotenv';
import { up } from './migrations/20260723000001_create_employee_biometric_profiles';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../.env' });

const connection = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
  },
});

async function main() {
  try {
    await up(connection);
    console.log('Biometric profile schema is ready.');
  } finally {
    await connection.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
