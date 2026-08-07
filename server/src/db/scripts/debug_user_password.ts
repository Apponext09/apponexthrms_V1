/**
 * Check user row password for abc@gmail.com
 * Run: tsx ./src/db/scripts/debug_user_password.ts
 */
import knex from 'knex';
import argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

const userRow = await db('users').whereRaw('LOWER(email) = ?', [cleanEmail]).select('id','email','status','password_hash','failed_login_attempts','locked_until').first();
console.log('\n👤 User row:');
console.log('  id:', userRow?.id);
console.log('  email:', userRow?.email);
console.log('  status:', userRow?.status);
console.log('  failed_login_attempts:', userRow?.failed_login_attempts);
console.log('  locked_until:', userRow?.locked_until);
console.log('  has password_hash:', userRow?.password_hash ? 'YES' : 'NO');

if (userRow?.password_hash) {
  try {
    const valid = await argon2.verify(userRow.password_hash, PASSWORD);
    console.log('  password valid:', valid ? '✅ YES' : '❌ NO — user password does NOT match');
  } catch (e) {
    console.log('  verify error — hash may be bcrypt or plain text:', e);
  }
}

// The real issue: if server is running OLD code without Step 2.5,
// it goes straight to the users table which fails the password → 401
console.log('\n⚠️  If you see "password valid: NO" above, the server is hitting Step 3 (users table)');
console.log('   meaning the server has NOT loaded our new Step 2.5 code yet.');
console.log('   → Please RESTART the server (Ctrl+C then npm run dev in server terminal)');

await db.destroy();
