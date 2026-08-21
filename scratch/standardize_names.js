const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function standardizeNames() {
  console.log('=== STANDARDIZING SLAB & COMPONENT NAMES ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Clean up Slab names
    await connection.query(`UPDATE payroll_slabs SET name = 'Internship Slab' WHERE id = 3 AND name = 'inter'`);
    await connection.query(`UPDATE payroll_slabs SET name = 'Kite Structure Slab' WHERE id = 4 AND name = 'kite slab'`);
    await connection.query(`UPDATE payroll_slabs SET name = 'Standard Monthly Slab' WHERE id = 1 AND name = 'Monthly'`);

    // 2. Clean up Component names
    const componentUpdates = [
      { id: 20, name: 'Extra Pay Amount' },
      { id: 23, name: 'HRA Earned' },
      { id: 38, name: 'Special Allowance' },
      { id: 51, name: 'EPS Wages' },
      { id: 54, name: 'Mediclaim Deduction' },
      { id: 65, name: 'Intern Stipend' }
    ];

    for (const item of componentUpdates) {
      await connection.query(`UPDATE payroll_components SET name = ? WHERE id = ?`, [item.name, item.id]);
      console.log(`Updated Component ID ${item.id} -> "${item.name}"`);
    }

    // 3. Remove obsolete test records
    await connection.query(`DELETE FROM payroll_slabs WHERE name = 'TEST_VERIFY_SLAB'`);
    await connection.query(`DELETE FROM payroll_components WHERE name = 'TEST_VERIFY_COMPONENT'`);

    console.log('\n=== ALL SLAB & COMPONENT NAMES STANDARDIZED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Update Error:', err);
  } finally {
    await connection.end();
  }
}

standardizeNames();
