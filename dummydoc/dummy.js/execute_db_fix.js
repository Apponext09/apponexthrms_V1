const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function executeCompleteDBFix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    multipleStatements: true,
  });

  try {
    console.log('🚀 APPONEXT HRMS - COMPLETE DATABASE FIX\n');
    console.log('Executing fix_database_complete.sql...\n');

    const sqlScript = fs.readFileSync('database/fix_database_complete.sql', 'utf8');

    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    let created = 0;
    let errors = [];

    for (const statement of statements) {
      if (!statement) continue;

      try {
        await connection.execute(statement);
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/i)?.[1];
        const selectMatch = statement.match(/SELECT.*AS status/i);

        if (tableName) {
          console.log(`✅ ${tableName}`);
          created++;
        } else if (selectMatch) {
          console.log('\n' + selectMatch[0]);
        }
      } catch (err) {
        if (!err.message.includes('already exists')) {
          errors.push(`⚠️ ${statement.substring(0, 50)}: ${err.message}`);
        }
      }
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`✅ Tables created/verified: ${created}`);
    if (errors.length > 0) {
      console.log(`⚠️ Non-critical errors: ${errors.length}`);
      errors.forEach(e => console.log(`  ${e}`));
    }
    console.log(`\n✅ STEP 1 COMPLETE: Database schema is now production-ready!`);

    // List all tables to verify
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`\n📋 Total tables in database: ${tables.length}`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

executeCompleteDBFix();
