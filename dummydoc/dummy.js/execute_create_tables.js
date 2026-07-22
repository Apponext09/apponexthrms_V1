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
    console.log('🔧 Creating missing database tables...\n');

    // Read SQL file
    const sqlScript = fs.readFileSync('database/create_missing_tables.sql', 'utf8');

    // Split by statement (simple method)
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    let created = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/i)?.[1];
        if (tableName) {
          console.log(`✅ Created/Verified: ${tableName}`);
          created++;
        }
      } catch (err) {
        if (err.message.includes('already exists')) {
          skipped++;
        } else {
          console.error(`❌ Error: ${err.message}`);
        }
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Tables created/verified: ${created}`);
    console.log(`⏭️ Skipped (already exist): ${skipped}`);
    console.log(`\n✅ Database setup complete!`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

executeSQLScript();
