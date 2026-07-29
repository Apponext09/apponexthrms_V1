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

    // Check user 14
    const [users] = await conn.execute("SELECT id, email, employee_id, organization_id FROM users WHERE email = 'narendragaikwad1419@gmail.com'");
    console.log('User:', users[0]);

    // Check employee record
    const [employees] = await conn.execute("SELECT id, user_id, organization_id, email FROM employees WHERE id = 47 OR email = 'narendragaikwad1419@gmail.com'");
    console.log('Employees:', employees);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
