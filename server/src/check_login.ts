import { initializeKnex } from './db/knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';

const db = initializeKnex();

async function run() {
  try {
    // Check exact email
    const existing = await db('users').where('email', 'test@apponext.com').first();
    
    if (existing) {
      console.log('\n⚠️  test@apponext.com already exists:');
      console.log('  Status:', existing.status);
      console.log('  Locked until:', existing.locked_until || 'NOT LOCKED');
      console.log('  Failed attempts:', existing.failed_login_attempts);
    } else {
      console.log('\n❌ test@apponext.com does NOT exist in the users table.');
    }

    // Show all users clearly
    console.log('\n========== ALL USERS IN DATABASE ==========');
    const allUsers = await db('users').select('id', 'email', 'status', 'organization_id');
    for (const u of allUsers) {
      const roles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', u.id)
        .pluck('roles.code');
      console.log(`  [${u.id}] ${u.email} | ${u.status} | org:${u.organization_id} | roles:[${roles.join(',')}]`);
    }

    // Reset ALL users password to Admin@123
    const newHash = await hash('Admin@123', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await db('users').update({
      password_hash: newHash,
      failed_login_attempts: 0,
      locked_until: null,
      status: 'active',
    });
    console.log('\n✅ ALL users reset to password: Admin@123');
    console.log('\n📋 Use one of the emails above to login with password: Admin@123');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
