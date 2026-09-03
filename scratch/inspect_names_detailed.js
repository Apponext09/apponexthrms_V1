const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function inspectNamesDetailed() {
  console.log('=== DETAILED INSPECTION OF ALL NAMES IN DATABASE ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Slabs
    console.log('[1] SLABS:');
    const [slabs] = await connection.query(`SELECT id, name, min_ctc, max_ctc, selected_component_ids, is_active FROM payroll_slabs WHERE deleted_at IS NULL`);
    console.table(slabs);

    // 2. Pay Components
    console.log('\n[2] PAY COMPONENTS (All active):');
    const [components] = await connection.query(`SELECT id, name, group_id, component_type, formula, amount, is_active FROM payroll_components WHERE deleted_at IS NULL`);
    console.table(components);

    // 3. Component Groups
    console.log('\n[3] COMPONENT GROUPS (Sample):');
    const [groups] = await connection.query(`SELECT id, name, category, group_function, round_format, group_for_payslip, is_active FROM payroll_component_groups WHERE deleted_at IS NULL LIMIT 25`);
    console.table(groups);

  } catch (err) {
    console.error('Inspection Error:', err);
  } finally {
    await connection.end();
  }
}

inspectNamesDetailed();
