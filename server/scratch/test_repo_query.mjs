import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('Database Connected!');

    const employeeId = 47;
    const date = '2026-07-01';
    const orgId = 3;

    console.log('\n--- TESTING REPO QUERY JOINS STEP-BY-STEP ---');

    // 1. Raw Row count
    const [rawRows] = await conn.execute(
      'SELECT id, shift_id, employee_id FROM employee_shift_assignments WHERE employee_id = ?',
      [employeeId]
    );
    console.log('1. Raw Assignment rows:', rawRows);

    // 2. Joining shift_templates (Inner Join)
    const [stRows] = await conn.execute(
      `SELECT a.id, a.shift_id, st.id as st_id, st.shift_name 
       FROM employee_shift_assignments a 
       INNER JOIN shift_templates st ON st.id = a.shift_id 
       WHERE a.employee_id = ?`,
      [employeeId]
    );
    console.log('2. Inner Join shift_templates result:', stRows);

    // 3. Full query
    const [fullRows] = await conn.execute(
      `SELECT a.*, st.shift_name, st.shift_code
       FROM employee_shift_assignments a
       INNER JOIN shift_templates st ON st.id = a.shift_id
       LEFT JOIN employees e ON e.id = a.employee_id
       LEFT JOIN departments d ON d.id = e.current_department_id
       LEFT JOIN designations des ON des.id = e.current_designation_id
       LEFT JOIN locations l ON l.id = e.current_location_id
       WHERE a.organization_id = ?
       AND a.employee_id = ?
       AND a.assignment_start_date <= ?
       AND (a.assignment_end_date IS NULL OR a.assignment_end_date >= ?)`,
      [orgId, employeeId, date, date]
    );
    console.log('3. Full Query Result:', fullRows);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
