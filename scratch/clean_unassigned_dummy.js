const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function checkAndCleanUnassigned() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    console.log('=== CHECKING UNASSIGNED / DUMMY EMPLOYEES ===\n');

    const [unassigned] = await connection.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.status
      FROM employees e
      LEFT JOIN salary_structures ss ON e.id = ss.employee_id AND ss.deleted_at IS NULL
      LEFT JOIN employee_salary_structures ess ON e.id = ess.employee_id AND ess.deleted_at IS NULL
      WHERE e.deleted_at IS NULL AND ss.id IS NULL AND ess.id IS NULL
    `);

    console.log(`Found ${unassigned.length} unassigned employee(s):`);
    console.table(unassigned);

    // Soft delete dummy test employees that have no structures if user wants them removed
    if (unassigned.length > 0) {
      const idsToDelete = unassigned.map(u => u.id);
      await connection.query(`UPDATE employees SET deleted_at = NOW(), status = 'inactive' WHERE id IN (?)`, [idsToDelete]);
      console.log(`Soft deleted ${idsToDelete.length} unassigned dummy test employee(s) (IDs: ${idsToDelete.join(', ')}).`);
    }

    // Check remaining active employees
    const [remaining] = await connection.query(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.status
      FROM employees e
      WHERE e.deleted_at IS NULL AND (e.status = 'active' OR e.status = 'Active')
    `);
    console.log(`\nRemaining Active Employees with Salary Slabs: ${remaining.length}`);
    console.table(remaining);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

checkAndCleanUnassigned();
