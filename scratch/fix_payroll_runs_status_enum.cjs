const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy',
  });

  console.log('Altering payroll_runs status column...');
  await conn.query("ALTER TABLE payroll_runs MODIFY COLUMN status ENUM('draft', 'processing', 'calculated', 'locked', 'approved', 'published', 'completed') DEFAULT 'draft'");
  console.log('✅ Successfully updated status ENUM in payroll_runs table!');

  const [cols] = await conn.query("SHOW COLUMNS FROM payroll_runs LIKE 'status'");
  console.log('New column schema:');
  console.log(cols);

  await conn.end();
}

fix().catch(console.error);
