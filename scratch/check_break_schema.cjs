require('dotenv').config({ path: './server/.env' });
const k = require('knex')({ client: 'mysql2', connection: { host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME } });

async function main() {
  const cols = await k.raw("SHOW COLUMNS FROM attendance_breaks LIKE 'break_type'");
  console.log('break_type column:', JSON.stringify(cols[0]));
  const hasSettingId = await k.schema.hasColumn('attendance_breaks', 'break_setting_id');
  console.log('has break_setting_id:', hasSettingId);
  await k.destroy();
}
main().catch(e => { console.error(e.message); k.destroy(); });
