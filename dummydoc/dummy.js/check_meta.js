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

    const [depts] = await conn.execute('SELECT id, department_name FROM departments LIMIT 20');
    const [desigs] = await conn.execute('SELECT id, designation_name FROM designations LIMIT 20');
    const [orgs] = await conn.execute('SELECT id, organization_name FROM organization_profiles LIMIT 10');

    console.log('Depts:', depts);
    console.log('Desigs:', desigs);
    console.log('Orgs:', orgs);

    await conn.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
