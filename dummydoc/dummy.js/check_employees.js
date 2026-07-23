const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'server/.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('✅ Connected successfully!');

    const targetEmails = ['narendragaikwad1419@gmail.com', 'narendra.test@gmail.com'];

    // 1. Get employee IDs
    const [employees] = await conn.execute(
      'SELECT id, employee_code, email FROM employees WHERE email IN (?, ?)',
      targetEmails
    );

    if (employees.length === 0) {
      console.log('No employees found with the target emails.');
      await conn.end();
      return;
    }

    const employeeIds = employees.map(emp => emp.id);
    console.log('Target Employee IDs:', employeeIds);

    // 2. Get user IDs linked to these employees
    const [users] = await conn.execute(
      `SELECT id, email FROM users WHERE employee_id IN (${employeeIds.map(() => '?').join(',')})`,
      employeeIds
    );

    const userIds = users.map(u => u.id);

    // Start cleanup
    if (userIds.length > 0) {
      console.log('Target User IDs:', userIds);
      
      // Delete from user_roles
      await conn.execute(
        `DELETE FROM user_roles WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      );
      console.log('✅ Cleaned up user roles');

      // Delete from users
      await conn.execute(
        `DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
        userIds
      );
      console.log('✅ Cleaned up user records');
    }

    // 3. Delete from employees
    await conn.execute(
      `DELETE FROM employees WHERE id IN (${employeeIds.map(() => '?').join(',')})`,
      employeeIds
    );
    console.log('✅ Cleaned up employee records');

    await conn.end();
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
})();
