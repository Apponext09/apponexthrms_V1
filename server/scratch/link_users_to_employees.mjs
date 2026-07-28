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

    console.log('Database Connected Successfully!');

    // Link users to employees where employee_id is NULL
    const [users] = await conn.execute('SELECT id, email FROM users');
    const [employees] = await conn.execute('SELECT id, email FROM employees');

    let updatedCount = 0;
    for (const u of users) {
      const match = employees.find(e => e.email && e.email.toLowerCase() === u.email.toLowerCase());
      const empId = match ? match.id : 1; // Fallback to employee #1

      await conn.execute('UPDATE users SET employee_id = ? WHERE id = ?', [empId, u.id]);
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} users with valid employee_id!`);

    await conn.end();
  } catch (err) {
    console.error('Error linking users to employees:', err);
  }
})();
