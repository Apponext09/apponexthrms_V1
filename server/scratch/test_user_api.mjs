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

    // Query employee for email 'narendragaikwad1419@gmail.com'
    const [users] = await conn.execute("SELECT * FROM users WHERE email = 'narendragaikwad1419@gmail.com'");
    console.log('USER RECORD:', users);

    const [employees] = await conn.execute("SELECT * FROM employees WHERE email = 'narendragaikwad1419@gmail.com' OR id = 47");
    console.log('EMPLOYEE RECORD:', employees);

    const empId = employees[0]?.id || 47;

    const [records] = await conn.execute(
      "SELECT * FROM attendance_records WHERE employee_id = ? AND check_in_date >= '2026-07-01' AND check_in_date <= '2026-07-31'",
      [empId]
    );

    console.log(`\nAttendance records for employee_id=${empId} count:`, records.length);
    console.log('Sample record:', records[0]);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
