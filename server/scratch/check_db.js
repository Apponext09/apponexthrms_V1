const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

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

    const [users] = await conn.execute('SELECT id, email, employee_id FROM users');
    console.log('\n--- USERS ---');
    console.table(users);

    const [employees] = await conn.execute('SELECT id, employee_code, first_name, last_name, email FROM employees');
    console.log('\n--- EMPLOYEES ---');
    console.table(employees);

    const [attendance] = await conn.execute('SELECT id, employee_id, check_in_date, check_in_time, check_out_time, status FROM attendance_records LIMIT 10');
    console.log('\n--- ATTENDANCE RECORDS (LIMIT 10) ---');
    console.table(attendance);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
