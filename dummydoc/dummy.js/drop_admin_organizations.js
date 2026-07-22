const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

    console.log('🗑️ Dropping admin_organizations table from MySQL...');
    await conn.execute('DROP TABLE IF EXISTS admin_organizations');
    console.log('✅ admin_organizations table dropped from MySQL successfully!');

    await conn.end();

    // Delete Knex migration file if present
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20260722000002_create_admin_organizations.ts');
    if (fs.existsSync(migrationPath)) {
      fs.unlinkSync(migrationPath);
      console.log('✅ Deleted migration file: 20260722000002_create_admin_organizations.ts');
    }
  } catch (err) {
    console.error('Error dropping admin_organizations:', err.message);
  }
})();
