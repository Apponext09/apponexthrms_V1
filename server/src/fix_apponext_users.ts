import { initializeKnex } from './db/knex';
import { hash } from 'argon2';

const db = initializeKnex();

async function run() {
  try {
    // Find all test/diag users
    const testUsers = await db('users')
      .where('email', 'like', '%apponext.com%')
      .orWhere('email', 'like', '%diag%')
      .select('id', 'email', 'status', 'employee_id', 'organization_id', 'failed_login_attempts', 'locked_until');

    console.log('\n========== ALL @apponext.com USERS ==========');
    for (const u of testUsers) {
      const roles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', u.id)
        .select('roles.code', 'roles.name');

      const emp = u.employee_id ? await db('employees').where('id', u.employee_id).select('id', 'first_name', 'last_name', 'status').first() : null;

      console.log(`\n  Email: ${u.email}`);
      console.log(`  Status: ${u.status} | Locked: ${u.locked_until ? '⛔ YES' : '✓ NO'} | Failed: ${u.failed_login_attempts}`);
      console.log(`  Roles: [${roles.map(r => r.code).join(', ') || 'NONE'}]`);
      console.log(`  Employee: ${emp ? `[${emp.id}] ${emp.first_name} ${emp.last_name} (${emp.status})` : 'NOT LINKED'}`);
    }

    // Fix all apponext.com users: reset password, unlock, ensure they have employee role
    const newHash = await hash('Admin@123', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    
    for (const u of testUsers) {
      // Reset password + unlock
      await db('users').where({ id: u.id }).update({
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
        status: 'active',
      });

      // Ensure at least employee role exists
      const roles = await db('user_roles').where({ user_id: u.id }).count('id as cnt').first();
      if ((roles as any)?.cnt === 0) {
        // Find or create employee role
        let empRole = await db('roles').where({ organization_id: u.organization_id, code: 'employee' }).first();
        if (!empRole) {
          empRole = await db('roles').where({ code: 'employee' }).first();
        }
        if (empRole) {
          await db('user_roles').insert({
            organization_id: u.organization_id,
            user_id: u.id,
            role_id: empRole.id,
            assigned_by: u.id,
            assigned_at: new Date(),
          });
          console.log(`  → Assigned 'employee' role to ${u.email}`);
        }
      }
    }

    console.log('\n✅ All @apponext.com accounts reset to password: Admin@123 and unlocked');

    // Quick login test
    console.log('\n========== LOGIN TEST ==========');
    const axios = (await import('axios')).default;
    for (const email of testUsers.map(u => u.email)) {
      try {
        const r = await axios.post('http://localhost:5000/api/v1/auth/login', { email, password: 'Admin@123' });
        const roles = r.data?.data?.roles || [];
        console.log(`✅ ${email} → Login OK | Roles: [${roles.join(', ')}]`);
      } catch (e: any) {
        console.error(`❌ ${email} → Login FAILED: ${e.response?.data?.message || e.message}`);
      }
    }

    console.log('\n========== DONE ==========\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
