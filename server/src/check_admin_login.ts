import { initializeKnex } from './db/knex';
import { hash } from 'argon2';
import axios from 'axios';

const db = initializeKnex();

async function run() {
  try {
    console.log('\n========== CHECKING ADMIN USERS ==========\n');

    const users = await db('users')
      .where('email', 'like', '%samarth%')
      .orWhere('email', 'like', '%admin%');

    for (const u of users) {
      const roles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', u.id)
        .select('roles.code', 'roles.name');

      console.log(`User ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Status: ${u.status}`);
      console.log(`  Locked Until: ${u.lockedUntil || u.locked_until || 'NOT LOCKED'}`);
      console.log(`  Failed Attempts: ${u.failedLoginAttempts ?? u.failed_login_attempts ?? 0}`);
      console.log(`  Roles: [${roles.map(r => r.code).join(', ')}]`);
    }

    // Reset samarth@gmail.com password to Admin@123, ensure organization_admin role
    const targetUser = await db('users').where({ email: 'samarth@gmail.com' }).first();
    if (targetUser) {
      const newHash = await hash('Admin@123', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      await db('users').where({ id: targetUser.id }).update({
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
        status: 'active',
      });
      console.log('\n✅ Reset samarth@gmail.com password to Admin@123, unlocked status');

      // Ensure user has organization_admin role
      let adminRole = await db('roles').where({ code: 'organization_admin' }).first();
      if (adminRole) {
        const hasAdminRole = await db('user_roles')
          .where({ user_id: targetUser.id, role_id: adminRole.id })
          .first();
        if (!hasAdminRole) {
          await db('user_roles').insert({
            organization_id: targetUser.organization_id || targetUser.organizationId,
            user_id: targetUser.id,
            role_id: adminRole.id,
            assigned_by: targetUser.id,
            assigned_at: new Date(),
          });
          console.log('✅ Added organization_admin role to samarth@gmail.com');
        }
      }
    }

    // Test API login
    console.log('\n========== TESTING API LOGIN ==========\n');
    try {
      const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
        email: 'samarth@gmail.com',
        password: 'Admin@123',
      });
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('   User:', loginRes.data?.data?.user?.email);
      console.log('   Roles:', loginRes.data?.data?.roles || loginRes.data?.data?.user?.roles);
    } catch (e: any) {
      console.error('❌ LOGIN FAILED:', e.response?.data || e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
