const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../.env' });

async function resetMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    console.log('Dropping knex_migrations table...');
    await connection.query('DROP TABLE IF EXISTS knex_migrations');
    await connection.query('DROP TABLE IF EXISTS knex_migrations_lock');
    console.log('Migrations table dropped');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetMigrations();
