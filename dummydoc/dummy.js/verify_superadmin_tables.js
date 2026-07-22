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

    console.log('--- SUPER_ADMINS TABLE ---');
    const [admins] = await conn.execute('SELECT id, uuid, email, first_name, last_name, access_level, status FROM super_admins');
    console.log(admins);

    console.log('\n--- ADMIN_ORGANIZATIONS TABLE ---');
    const [adminOrgs] = await conn.execute('SELECT id, super_admin_id, organization_id, admin_role, status FROM admin_organizations');
    console.log(adminOrgs);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
