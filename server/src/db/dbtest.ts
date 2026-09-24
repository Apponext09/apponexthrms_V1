import knex from 'knex';
import { getEnv } from '../config/env.js';

const env = getEnv();
const db = knex({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4',
  },
});

async function main() {
  console.log('\n===== LMS TOGGLE DB DIAGNOSTIC =====\n');

  const hasTable = await db.schema.hasTable('lms_integration_settings');
  console.log('[1] Table lms_integration_settings exists:', hasTable);

  if (!hasTable) {
    console.error('❌ TABLE DOES NOT EXIST — run npm run migrate');
    await db.destroy(); process.exit(1);
  }

  const cols: any = await db.raw('DESCRIBE lms_integration_settings');
  console.log('\n[2] Columns:', cols[0].map((c: any) => `${c.Field}:${c.Type}`).join(', '));

  const rows = await db('lms_integration_settings').select('*');
  console.log('\n[3] Existing rows:', JSON.stringify(rows, null, 2));

  console.log('\n[4] Inserting (is_enabled=true)...');
  const [insertId] = await db('lms_integration_settings').insert({
    organization_id: 9999,
    company_id: 9999,
    platform: 'diag_test',
    is_enabled: true,
    config_json: null,
    last_synced_at: null,
  });
  console.log('    Inserted id:', insertId);

  const raw: any = await db('lms_integration_settings').where('id', insertId).first();
  console.log('\n[5] Read-back raw row:', JSON.stringify(raw));
  console.log('    raw.is_enabled =', raw?.is_enabled, '| typeof =', typeof raw?.is_enabled);

  await db('lms_integration_settings').where('id', insertId).delete();
  console.log('\n[6] Cleanup done. ✅');
  await db.destroy(); process.exit(0);
}

main().catch((e) => { console.error('ERR:', e.message); db.destroy().catch(() => {}); process.exit(1); });
