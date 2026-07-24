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

    const [rows] = await conn.execute('SELECT id, employee_id, check_in_date, check_in_time, check_out_time, work_duration_minutes, status FROM attendance_records WHERE employee_id = 47 ORDER BY id ASC');
    console.log('\n--- ATTENDANCE RECORDS FOR EMP 47 ---');
    console.table(rows);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
