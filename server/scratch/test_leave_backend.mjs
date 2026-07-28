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

    console.log('Database Connection Successful!');

    // Fetch users and their mapped employee_ids
    const [users] = await conn.execute('SELECT id, email, employee_id FROM users LIMIT 10');
    console.log('Users:', users);

    // Fetch employees
    const [employees] = await conn.execute('SELECT id, first_name, last_name, email FROM employees LIMIT 10');
    console.log('Employees:', employees);

    // Fetch leave applications
    const [apps] = await conn.execute(`
      SELECT la.*, lt.leave_name, lt.leave_code 
      FROM leave_applications la 
      LEFT JOIN leave_types lt ON la.leave_type_id = lt.id 
      LIMIT 10
    `);
    console.log('Leave Applications in DB:', apps);

    // Fetch leave balances
    const [balances] = await conn.execute(`
      SELECT lb.*, lt.leave_name, lt.leave_code 
      FROM leave_balances lb 
      LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id 
      LIMIT 10
    `);
    console.log('Leave Balances count:', balances.length);

    await conn.end();
  } catch (err) {
    console.error('Error in Leave Backend Test:', err);
  }
})();
