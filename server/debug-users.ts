import knex from 'knex';
import { verify as verifyHash } from 'argon2';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
});

async function debugUsers() {
  try {
    const users = await db('users').where('email', 'like', '%apponexthrms.com%');

    console.log('Users in database:');
    console.log('─'.repeat(80));

    for (const user of users) {
      console.log(`\nEmail: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`Status: ${user.status}`);
      console.log(`Password Hash: ${user.password_hash?.substring(0, 80)}...`);
      console.log(`Hash Length: ${user.password_hash?.length}`);

      // Test password verification
      const testPasswords: Record<string, string> = {
        admin: 'Admin@123',
        hr: 'Hr@123',
        employee: 'Employee@123',
      };

      for (const [role, password] of Object.entries(testPasswords)) {
        try {
          const isValid = await verifyHash(user.password_hash, password);
          const status = isValid ? '✓' : '✗';
          console.log(`  ${status} Password test (${password}): ${isValid}`);
        } catch (e) {
          console.log(`  ✗ Error testing password: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    console.log('\n' + '─'.repeat(80));

    // Check roles
    console.log('\nUser Roles:');
    const userRoles = await db('user_roles')
      .join('users', 'user_roles.user_id', 'users.id')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .whereIn('users.email', ['admin@apponexthrms.com', 'hr@apponexthrms.com', 'employee@apponexthrms.com'])
      .select('users.email', 'roles.code', 'roles.name');

    for (const ur of userRoles) {
      console.log(`  ${ur.email} -> ${ur.code} (${ur.name})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

debugUsers();
