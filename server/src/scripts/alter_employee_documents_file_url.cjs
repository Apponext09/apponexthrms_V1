'use strict';
require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Harsh11@',
      database: process.env.DB_NAME || 'hrms',
    });

    console.log(`[DB Migration] Connected to MySQL database (${process.env.DB_NAME || 'hrms'})...`);

    console.log('[DB Migration] Altering column file_url in employee_documents to LONGTEXT...');
    await conn.query('ALTER TABLE employee_documents MODIFY COLUMN file_url LONGTEXT NOT NULL;');

    console.log('[DB Migration] SUCCESS: employee_documents.file_url expanded to LONGTEXT successfully!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[DB Migration] ERROR:', err.message);
    process.exit(1);
  }
}

run();
