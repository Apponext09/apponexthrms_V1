const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkCtc() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'health',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  const [cols] = await conn.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND (COLUMN_NAME LIKE '%ctc%' OR COLUMN_NAME LIKE '%salary%')
  `, [process.env.DB_NAME || 'health']);

  console.table(cols);
  await conn.end();
}

checkCtc().catch(console.error);
