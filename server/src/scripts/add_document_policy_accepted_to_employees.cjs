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

    // Check if column already exists
    const [cols] = await conn.query("SHOW COLUMNS FROM employees LIKE 'document_policy_accepted'");
    if (cols.length === 0) {
      console.log('[DB Migration] Adding document_policy_accepted and document_policy_accepted_at columns to employees table...');
      await conn.query(`
        ALTER TABLE employees 
        ADD COLUMN document_policy_accepted BOOLEAN DEFAULT FALSE,
        ADD COLUMN document_policy_accepted_at TIMESTAMP NULL;
      `);
      console.log('[DB Migration] SUCCESS: Added document_policy_accepted and document_policy_accepted_at columns successfully!');
    } else {
      console.log('[DB Migration] Columns document_policy_accepted already exist in employees table.');
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[DB Migration] ERROR:', err.message);
    process.exit(1);
  }
}

run();
