/**
 * Debug login flow for a specific email.
 * Run: tsx ./src/db/scripts/debug_login.ts
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

const EMAIL    = 'abc@gmail.com';
const PASSWORD = 'abc@gmail.com';
const cleanEmail = EMAIL.trim().toLowerCase();

console.log(`\n🔍 Debugging login for: ${EMAIL}\n`);

// Step 1: super_admins
const superAdmin = await db('super_admins').where('email', EMAIL).where('status', 'active').first();
console.log(`Step 1 - super_admins match: ${superAdmin ? `✅ YES (id=${superAdmin.id})` : '❌ None'}`);

// Step 2: organizations
const orgAdmin = await db('organizations').whereRaw('LOWER(email) = ?', [cleanEmail]).first();
console.log(`Step 2 - organizations match: ${orgAdmin ? `⚠️  YES (id=${orgAdmin.id}, name="${orgAdmin.name}")` : '❌ None'}`);
if (orgAdmin) {
  console.log(`         → has password_hash: ${orgAdmin.password_hash ? 'YES' : 'NO'}`);
  if (orgAdmin.password_hash) {
    try {
      const valid = await argon2.verify(orgAdmin.password_hash, PASSWORD);
      console.log(`         → password valid: ${valid ? '✅ YES' : '❌ NO'}`);
    } catch {
      console.log(`         → password verify threw error`);
    }
  }
  console.log(`\n  ⚠️  The org admin check is INTERCEPTING this email before reaching Step 2.5!`);
  console.log(`     Since org password doesn't match, it falls to Step 3 (users table) → 401\n`);
}

// Step 2.5: company
const companyRow = await db('company')
  .whereRaw('LOWER(login_email) = ?', [cleanEmail])
  .where('has_credentials', 1)
  .whereNull('deleted_at')
  .first();
console.log(`Step 2.5 - company match: ${companyRow ? `✅ YES (company_id=${companyRow.company_id}, name="${companyRow.name}")` : '❌ None'}`);
if (companyRow && companyRow.password_hash) {
  try {
    const valid = await argon2.verify(companyRow.password_hash, PASSWORD);
    console.log(`          → password valid: ${valid ? '✅ YES' : '❌ NO'}`);
  } catch (e) {
    console.log(`          → password verify error:`, e);
  }
}

// Step 3: users
const userRow = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).first();
console.log(`Step 3 - users match: ${userRow ? `found (id=${userRow.id})` : '❌ None'}`);

await db.destroy();
