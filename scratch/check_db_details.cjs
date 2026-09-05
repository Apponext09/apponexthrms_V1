const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  console.log('=== PAYROLL SLABS ===');
  const [slabs] = await conn.query('SELECT * FROM payroll_slabs');
  console.log(slabs);

  console.log('=== PAYROLL SLAB ENTRIES / DETAILS ===');
  const [slabTables] = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'happy' AND (table_name LIKE '%slab%' OR table_name LIKE '%pt%' OR table_name LIKE '%tax%')");
  console.log(slabTables);

  for (const t of slabTables) {
    const tableName = t.TABLE_NAME || t.table_name;
    const [rows] = await conn.query(`SELECT * FROM ${tableName}`);
    console.log(`\nTable: ${tableName} (${rows.length} rows)`);
    if (rows.length > 0) console.log(rows.slice(0, 3));
  }

  await conn.end();
}

check().catch(console.error);
