import { AuthService } from './src/modules/auth/auth.service';
import { initializeKnex, getKnex } from './src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugAuth() {
  try {
    console.log('Initializing database connection...');
    initializeKnex();

    const db = getKnex();

    // Test login for admin user
    const email = 'admin@apponexthrms.com';
    const password = 'Admin@123';

    console.log(`\nTesting login: ${email}`);
    console.log('─'.repeat(70));

    // Check user exists
    const user = await db('users').where('email', email).first();
    console.log(`\nUser lookup result:`);
    console.log(`  Email: ${user?.email}`);
    console.log(`  ID: ${user?.id}`);
    console.log(`  Organization ID: ${user?.organization_id}`);
    console.log(`  Status: ${user?.status}`);
    console.log(`  Password Hash exists: ${!!user?.password_hash}`);

    // Try to use AuthService
    const authService = new AuthService();

    console.log(`\nAttempting login via AuthService...`);
    try {
      const result = await authService.login(email, password);
      console.log(`\n✅ LOGIN SUCCESS!`);
      console.log(`\nLogin Response:`);
      console.log(`  User ID: ${result.user.id}`);
      console.log(`  User Email: ${result.user.email}`);
      console.log(`  Organization: ${result.organization.name}`);
      console.log(`  Access Token (first 50): ${result.accessToken.substring(0, 50)}...`);
      console.log(`  Roles: ${result.roles.map((r) => r.code).join(', ')}`);
      console.log(`  Permissions: ${result.permissions.length} total`);
    } catch (error) {
      console.log(`\n❌ LOGIN FAILED`);
      console.log(`\nError:`);
      console.log(`  Message: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`  Code: ${(error as any)?.code}`);

      // Try direct password verification
      console.log(`\nDirect password verification:`);
      const { verify: verifyHash } = await import('argon2');
      try {
        const isValid = await verifyHash(user?.password_hash, password);
        console.log(`  Hash verification result: ${isValid}`);
      } catch (e) {
        console.log(`  Error during verification: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Debug error:', error);
    process.exit(1);
  }
}

debugAuth();
