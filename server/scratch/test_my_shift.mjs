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

    const [rows] = await conn.execute(
      "SELECT * FROM employee_shift_assignments WHERE employee_id = 47"
    );
    console.log('Employee shift assignments:', rows);

    const [shifts] = await conn.execute("SELECT * FROM shift_templates");
    console.log('Shift templates:', shifts);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
