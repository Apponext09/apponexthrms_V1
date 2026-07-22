const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    const [rows] = await conn.execute('SELECT id, first_name, last_name, email, reporting_manager_id FROM employees LIMIT 20');
    console.log('Existing employees count:', rows.length);
    console.log(JSON.stringify(rows, null, 2));

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
