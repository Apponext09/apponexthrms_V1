const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'health',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  console.log('=== RUNNING SALARY_STRUCTURES REFACTOR MIGRATION ===');

  const [cols] = await conn.query('DESCRIBE salary_structures');
  const existingColNames = cols.map(c => c.Field);

  // 1. Drop obsolete legacy columns
  const toDrop = ['applicable_to_designation_id', 'applicable_to_location_id', 'grade_code', 'description'];
  for (const col of toDrop) {
    if (existingColNames.includes(col)) {
      console.log(`Dropping unused column: ${col}...`);
      await conn.query(`ALTER TABLE salary_structures DROP COLUMN ${col}`).catch(err => console.log('Drop err:', err.message));
    }
  }

  // 2. Add total_deductions, earnings_breakup, deductions_breakup
  if (!existingColNames.includes('total_deductions')) {
    console.log('Adding column total_deductions...');
    await conn.query('ALTER TABLE salary_structures ADD COLUMN total_deductions DECIMAL(15,2) DEFAULT 0.00 AFTER gross_monthly');
  }

  if (!existingColNames.includes('earnings_breakup')) {
    console.log('Adding column earnings_breakup...');
    await conn.query('ALTER TABLE salary_structures ADD COLUMN earnings_breakup JSON NULL AFTER net_take_home');
  }

  if (!existingColNames.includes('deductions_breakup')) {
    console.log('Adding column deductions_breakup...');
    await conn.query('ALTER TABLE salary_structures ADD COLUMN deductions_breakup JSON NULL AFTER earnings_breakup');
  }

  const [newCols] = await conn.query('DESCRIBE salary_structures');
  console.log('\n✅ UPDATED SALARY_STRUCTURES COLUMNS:');
  console.table(newCols.map(c => ({ Field: c.Field, Type: c.Type, Default: c.Default })));

  await conn.end();
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
