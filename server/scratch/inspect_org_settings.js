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

    const [rows] = await conn.execute('SELECT id, location_id, leave_application_start_month, holiday_year_start_month, default_week_day FROM org_leave_settings');
    console.log('\n--- ORG LEAVE SETTINGS ---');
    console.log(JSON.stringify(rows, null, 2));

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
