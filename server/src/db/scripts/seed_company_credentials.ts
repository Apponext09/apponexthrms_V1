/**
 * Seed company credentials for a specific company.
 * Run: tsx ./src/db/scripts/seed_company_credentials.ts
 */
import knex from 'knex';
import argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  },
});

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LOGIN_EMAIL = 'abc@gmail.com';
const PASSWORD    = 'abc@gmail.com';
const FULL_NAME   = 'Apponext Admin';
// ─────────────────────────────────────────────────────────────────────────────

try {
  // List all companies so user can confirm
  const all = await db('company').whereNull('deleted_at').select('company_id', 'name', 'login_email', 'has_credentials');
  console.log('\n📋 All companies in DB:');
  console.table(all);

  // Try to find Apponext (case-insensitive)
  const company = await db('company')
    .whereNull('deleted_at')
    .whereRaw("LOWER(name) LIKE ?", ['%apponext%'])
    .first();

  if (!company) {
    console.error('❌ No company with name containing "apponext" found. Showing all above — update the name filter in the script.');
    process.exit(1);
  }

  console.log(`\n✅ Found company: "${company.name}" (company_id=${company.company_id})`);

  const passwordHash = await argon2.hash(PASSWORD);

  await db('company')
    .where('company_id', company.company_id)
    .update({
      has_credentials: 1,
      full_name:       FULL_NAME,
      login_email:     LOGIN_EMAIL,
      password_hash:   passwordHash,
      updated_at:      new Date(),
    });

  console.log(`\n🔐 Credentials set successfully!`);
  console.log(`   Company    : ${company.name} (ID: ${company.company_id})`);
  console.log(`   Login Email: ${LOGIN_EMAIL}`);
  console.log(`   Password   : ${PASSWORD}`);
  console.log(`   Hash type  : Argon2id`);
  console.log(`\n👉 You can now log in at the login page using the above credentials.`);

} catch (err) {
  console.error('✗ Error:', err);
  process.exit(1);
} finally {
  await db.destroy();
}
