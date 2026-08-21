const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function inspectNames() {
  console.log('=== INSPECTING ALL NAMES IN DATABASE FOR SLABS, COMPONENTS & GROUPS ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Inspect Slabs
    console.log('[1] PAYROLL SLABS (`payroll_slabs`):');
    const [slabs] = await connection.query(`
      SELECT id, name, min_ctc, max_ctc, selected_component_ids, is_active, organization_id
      FROM payroll_slabs
      WHERE deleted_at IS NULL
    `);
    console.table(slabs);

    // 2. Inspect Pay Components
    console.log('\n[2] PAY COMPONENTS (`payroll_components`):');
    const [components] = await connection.query(`
      SELECT pc.id, pc.name, pc.group_id, pc.component_type, pc.calc_type, pc.formula, pc.amount, pc.is_active
      FROM payroll_components pc
      WHERE pc.deleted_at IS NULL
      ORDER BY pc.id ASC
    `);
    console.table(components);

    // 3. Inspect Component Groups
    console.log('\n[3] COMPONENT GROUPS (`payroll_component_groups`):');
    const [groups] = await connection.query(`
      SELECT id, name, category, group_function, round_format, group_for_payslip, is_active
      FROM payroll_component_groups
      WHERE deleted_at IS NULL
      ORDER BY id ASC
    `);
    console.table(groups);

    // 4. Inspect pay_component_definitions if any
    console.log('\n[4] PAY COMPONENT DEFINITIONS (`pay_component_definitions`):');
    try {
      const [pcd] = await connection.query(`
        SELECT id, component_name, component_code, component_type, calculation_type, formula_expression, is_active
        FROM pay_component_definitions
        WHERE deleted_at IS NULL
        LIMIT 20
      `);
      console.table(pcd);
    } catch (e) {
      console.log('No pay_component_definitions table or query failed:', e.message);
    }

  } catch (err) {
    console.error('Inspection Error:', err);
  } finally {
    await connection.end();
  }
}

inspectNames();
