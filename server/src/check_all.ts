import { initializeKnex } from './db/knex';
import { hash } from 'argon2';

const db = initializeKnex();

async function run() {
  try {
    console.log('\n========== DEPARTMENTS ==========');
    const depts = await db('departments').select('id', 'name', 'code', 'department_head_id');
    depts.forEach(d => console.log(`  [${d.id}] ${d.name} (code: ${d.code}, head_id: ${d.department_head_id})`));

    console.log('\n========== ALL USERS ==========');
    const users = await db('users').select('id', 'email', 'organization_id', 'status', 'failed_login_attempts', 'locked_until', 'employee_id');
    
    // Hash new password for all users
    const newPassword = 'Admin@123';
    const newHash = await hash(newPassword, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    for (const u of users) {
      const roles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', u.id)
        .select('roles.code', 'roles.name');

      const locked = u.locked_until && new Date(u.locked_until) > new Date();
      
      console.log(`\n  Email: ${u.email}`);
      console.log(`  Status: ${u.status} | Locked: ${locked ? '⛔ YES until ' + u.locked_until : '✓ NO'} | Failed Attempts: ${u.failed_login_attempts}`);
      console.log(`  Roles: [${roles.map(r => r.code).join(', ')}]`);

      // Reset password and unlock for all users
      await db('users').where({ id: u.id }).update({
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
      });
    }

    console.log(`\n✓ All user passwords reset to: "${newPassword}" and accounts unlocked`);
    console.log('\n========== DONE ==========\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
