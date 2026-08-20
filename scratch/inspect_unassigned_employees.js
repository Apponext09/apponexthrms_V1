const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function inspectEmployees() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    console.log('=== INSPECTING EMPLOYEES & SALARY STRUCTURE ASSIGNMENTS ===\n');

    // 1. Get all employees
    const [employees] = await connection.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.status, e.organization_id
      FROM employees e
      WHERE e.deleted_at IS NULL
    `);

    // 2. Check each employee's salary structure
    const results = [];
    for (const emp of employees) {
      const [structs] = await connection.query(`
        SELECT ss.id, ss.slab_id, ps.name as slab_name, ss.annual_ctc, ss.gross_monthly
        FROM salary_structures ss
        LEFT JOIN payroll_slabs ps ON ss.slab_id = ps.id
        WHERE ss.employee_id = ? AND ss.deleted_at IS NULL
      `, [emp.id]);

      const [ess] = await connection.query(`
        SELECT ess.id, ess.salary_structure_id, ess.is_current, ess.effective_from
        FROM employee_salary_structures ess
        WHERE ess.employee_id = ? AND ess.deleted_at IS NULL
      `, [emp.id]);

      const hasStructure = structs.length > 0 || ess.length > 0;
      results.push({
        ID: emp.id,
        Code: emp.employee_code,
        Name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        Status: emp.status,
        HasSalaryStructure: hasStructure ? '✅ YES' : '❌ NO (Missing Salary Structure)',
        AssignedSlab: structs[0]?.slab_name || 'None',
        AnnualCTC: structs[0]?.annual_ctc ? `₹${Number(structs[0].annual_ctc).toLocaleString('en-IN')}` : '₹0'
      });
    }

    console.table(results);

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await connection.end();
  }
}

inspectEmployees();
