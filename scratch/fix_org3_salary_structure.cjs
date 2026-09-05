const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function fixOrg3Structure() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'happy'
  });

  console.log('Ensuring clean salary structure for Org 3 employee 9...');

  // 1. Create or update salary structure for Org 3
  const [ssRes] = await conn.query(`
    INSERT INTO salary_structures 
      (uuid, organization_id, company_id, structure_name, structure_code, effective_from, status, created_by, updated_by, employee_id, annual_ctc, basic_monthly, gross_monthly, net_take_home, slab_id)
    VALUES
      (UUID(), 3, 5, 'Engineering Pay Structure', 'STR-ENG-001', '2026-01-01', 'active', 7, 7, 9, 600000.00, 25000.00, 50000.00, 46800.00, 1)
    ON DUPLICATE KEY UPDATE annual_ctc=600000.00, slab_id=1, organization_id=3
  `);

  const ssId = ssRes.insertId || 1;

  // 2. Link in employee_salary_structures
  await conn.query('DELETE FROM employee_salary_structures WHERE employee_id=9');
  await conn.query(`
    INSERT INTO employee_salary_structures
      (uuid, organization_id, company_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by)
    VALUES
      (UUID(), 3, 5, 9, ?, '2026-01-01', 1, 7, 7)
  `, [ssId]);

  console.log(`Success! Linked Employee 9 to Salary Structure #${ssId} for Org 3.`);

  await conn.end();
}

fixOrg3Structure().catch(console.error);
