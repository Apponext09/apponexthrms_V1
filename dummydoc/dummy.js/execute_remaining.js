const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function executeSQLScript() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    multipleStatements: true,
  });

  try {
    console.log('🔧 Creating remaining database tables...\n');

    const sqlScript = fs.readFileSync('create_remaining_tables.sql', 'utf8');
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    let created = 0;

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/i)?.[1];
        if (tableName) {
          console.log(`✅ ${tableName}`);
          created++;
        }
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  ${statement.substring(0, 50)}: ${err.message.substring(0, 80)}`);
        }
      }
    }

    console.log(`\n✅ Database tables creation complete! (${created} tables)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

executeSQLScript();
