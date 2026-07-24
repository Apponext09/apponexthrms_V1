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

    const [users] = await conn.execute('SELECT * FROM users LIMIT 5');
    console.log('\n--- USERS ---');
    console.table(users);

    const [employees] = await conn.execute('SELECT * FROM employees LIMIT 5');
    console.log('\n--- EMPLOYEES ---');
    console.table(employees);

    const [attendance] = await conn.execute('SELECT * FROM attendance_records ORDER BY id DESC LIMIT 20');
    console.log('\n--- ATTENDANCE RECORDS (LIMIT 20) ---');
    console.table(attendance);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
