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

    console.log('🔧 Updating organizations table schema in MySQL...');

    const columnsToAdd = [
      { name: 'code', type: 'VARCHAR(50) NULL' },
      { name: 'owner_name', type: 'VARCHAR(255) NULL' },
      { name: 'location', type: 'VARCHAR(255) NULL' },
      { name: 'email', type: 'VARCHAR(255) NULL' },
      { name: 'phone', type: 'VARCHAR(50) NULL' },
      { name: 'website_url', type: 'VARCHAR(512) NULL' }
    ];

    for (const col of columnsToAdd) {
      try {
        await conn.execute(`ALTER TABLE organizations ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added column '${col.name}' to organizations table`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Column '${col.name}' already exists in organizations table`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      }
    }

    console.log('\n🎉 ORGANIZATIONS SCHEMA UPDATE COMPLETED!');
    await conn.end();
  } catch (err) {
    console.error('Error updating organizations table:', err);
  }
})();
