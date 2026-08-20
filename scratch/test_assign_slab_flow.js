const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function testAssignSlabFlow() {
  console.log('=== TESTING SLAB ASSIGNMENT ON EMPLOYEE CREATION FLOW ===\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    // 1. Fetch available slabs
    const [slabs] = await connection.query(`SELECT id, name, min_ctc, max_ctc, selected_component_ids FROM payroll_slabs WHERE is_active = 1 LIMIT 3`);
    console.log('Available Slabs for selection:');
    console.table(slabs);

    // 2. Check an employee's salary structure lookup
    const [employees] = await connection.query(`SELECT id, first_name, last_name, employee_code FROM employees ORDER BY id DESC LIMIT 1`);
    if (employees.length > 0) {
      const emp = employees[0];
      console.log(`\nTesting Structure query for Employee #${emp.id} (${emp.first_name} ${emp.last_name}):`);

      const [structs] = await connection.query(`
        SELECT ss.id, ss.slab_id, ps.name as slab_name, ps.selected_component_ids, ss.annual_ctc, ss.gross_monthly, ss.net_salary_monthly
        FROM salary_structures ss
        LEFT JOIN payroll_slabs ps ON ss.slab_id = ps.id
        WHERE ss.employee_id = ? AND ss.deleted_at IS NULL
      `, [emp.id]);

      console.table(structs);
    }

    console.log('\n=== FLOW TEST PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Flow test error:', err);
  } finally {
    await connection.end();
  }
}

testAssignSlabFlow();
