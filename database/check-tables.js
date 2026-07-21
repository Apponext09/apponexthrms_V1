const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../.env' });

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:');
    console.log(tables.length + ' tables found');
    tables.forEach(t => {
      const tableName = Object.values(t)[0];
      console.log('  - ' + tableName);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();
