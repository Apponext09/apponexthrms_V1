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

    console.log('\n--- USERS ---');
    const [users] = await conn.execute('SELECT id, email, employee_id, organization_id FROM users');
    console.table(users);

    console.log('\n--- EMPLOYEES ---');
    const [employees] = await conn.execute('SELECT id, first_name, last_name, organization_id FROM employees WHERE id IN (1, 2, 47)');
    console.table(employees);

    console.log('\n--- ASSIGNMENTS ---');
    const [assignments] = await conn.execute('SELECT id, employee_id, organization_id, shift_id, assignment_start_date FROM employee_shift_assignments');
    console.table(assignments);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
