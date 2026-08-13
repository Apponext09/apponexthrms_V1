require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function main() {
  console.log('Starting break schema migration...');

  // 1. Alter break_type from ENUM to VARCHAR(100)
  await k.raw("ALTER TABLE attendance_breaks MODIFY COLUMN break_type VARCHAR(100) NULL DEFAULT NULL");
  console.log('✓ Altered break_type to VARCHAR(100)');

  // 2. Add break_setting_id column if not exists
  const hasSettingId = await k.schema.hasColumn('attendance_breaks', 'break_setting_id');
  if (!hasSettingId) {
    await k.schema.table('attendance_breaks', (t) => {
      t.integer('break_setting_id').unsigned().nullable().defaultTo(null)
        .comment('References breaks.id from settings table');
    });
    console.log('✓ Added break_setting_id column');
  } else {
    console.log('- break_setting_id already exists, skipping');
  }

  // Verify
  const cols = await k.raw("SHOW COLUMNS FROM attendance_breaks WHERE Field IN ('break_type', 'break_setting_id')");
  console.log('Verified columns:', JSON.stringify(cols[0]));

  await k.destroy();
  console.log('Migration complete.');
}
main().catch(e => { console.error('MIGRATION ERROR:', e.message); k.destroy(); process.exit(1); });
