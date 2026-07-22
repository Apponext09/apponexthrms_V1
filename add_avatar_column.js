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

    console.log('Connected to MySQL. Checking employees table columns...');

    try {
      await conn.execute('ALTER TABLE employees ADD COLUMN avatar_url TEXT NULL AFTER email');
      console.log('✅ Added avatar_url column to employees table.');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('ℹ️ avatar_url column already exists in employees table.');
      } else {
        console.log('Note:', err.message);
      }
    }

    await conn.end();
  } catch (err) {
    console.error('Database connection note:', err.message);
  }
})();
