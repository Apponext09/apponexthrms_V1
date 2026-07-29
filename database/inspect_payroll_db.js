const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function inspectDB() {
  console.log('🔍 Connecting to Database to inspect exact Payroll Schema...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log(`\nFound ${tableNames.length} total tables in database "${process.env.DB_NAME || 'apponexthrms'}".\n`);

  const payrollTables = tableNames.filter(t =>
    t.includes('salary') || t.includes('pay') || t.includes('loan') || t.includes('tax') || t.includes('attendance_lock')
  );

  console.log(`=== PAYROLL MODULE TABLES (${payrollTables.length} tables) ===`);

  for (const tableName of payrollTables) {
    const [cols] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    console.log(`\n📋 TABLE: ${tableName} (${cols.length} columns)`);
    cols.forEach(c => {
      console.log(`   - ${c.Field.padEnd(30)} ${c.Type.padEnd(25)} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }

  await connection.end();
}

inspectDB().catch(console.error);
