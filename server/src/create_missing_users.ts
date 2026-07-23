/**
 * Creates a user account for test@apponext.com employee and any other
 * employees that have no user account. Also links all employee IDs properly.
 */
import { initializeKnex } from './db/knex';
import { hash } from 'argon2';
import { v4 as uuidv4 } from 'uuid';

const db = initializeKnex();

async function run() {
  try {
    // Raw query to get all employees properly (bypass ORM camelCase issues)
    const employees = await db.raw(`
      SELECT id, employee_code, first_name, last_name, email, status, organization_id
      FROM employees
      ORDER BY id
    `);
    const emps = employees[0];

    const users = await db.raw(`SELECT id, email, employee_id, organization_id, status FROM users`);
    const usrs = users[0];

    console.log('\n========== EMPLOYEES (raw SQL) ==========');
    for (const e of emps) {
      const linkedUser = usrs.find((u: any) => u.email === e.email || u.employee_id === e.id);
      console.log(`  [${e.id}] ${e.first_name} ${e.last_name} | ${e.email} | user: ${linkedUser ? linkedUser.email : '⚠️ NO USER'}`);
    }

    console.log('\n========== CREATING MISSING USER ACCOUNTS ==========');
    const newHash = await hash('Admin@123', { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    // Get first org_id to use
    const firstOrg = await db.raw(`SELECT id FROM organizations LIMIT 1`);
    const orgId = firstOrg[0][0]?.id;
    
    // Get employee role id
    const empRole = await db.raw(`SELECT id FROM roles WHERE code = 'employee' LIMIT 1`);
    const empRoleId = empRole[0][0]?.id;

    for (const emp of emps) {
      const existingUser = usrs.find((u: any) => u.email === emp.email);
      
      if (!existingUser) {
        console.log(`  📝 Creating user for: ${emp.email}`);
        const [userId] = await db('users').insert({
          uuid: uuidv4(),
          organization_id: emp.organization_id || orgId,
          employee_id: emp.id,
          email: emp.email,
          password_hash: newHash,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`     → Created user [${userId}]`);

        // Assign employee role
        if (empRoleId) {
          const existingUserRole = await db('user_roles').where({ user_id: userId }).first();
          if (!existingUserRole) {
            await db('user_roles').insert({
              organization_id: emp.organization_id || orgId,
              user_id: userId,
              role_id: empRoleId,
              assigned_by: userId,
              assigned_at: new Date(),
            });
            console.log(`     → Assigned employee role`);
          }
        }
      } else {
        // Link the existing user to this employee if not linked
        if (!existingUser.employee_id) {
          await db.raw(
            `UPDATE users SET employee_id = ?, organization_id = ?, updated_at = NOW() WHERE id = ?`,
            [emp.id, emp.organization_id || orgId, existingUser.id]
          );
          console.log(`  🔗 Linked existing user [${existingUser.id}] ${existingUser.email} → employee [${emp.id}]`);
        }
      }
    }

    // Final verification
    console.log('\n========== FINAL VERIFICATION ==========');
    const finalCheck = await db.raw(`
      SELECT u.id, u.email, u.employee_id, u.status,
             e.first_name, e.last_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.id
    `);
    for (const r of finalCheck[0]) {
      const empInfo = r.first_name ? `→ ${r.first_name} ${r.last_name}` : '→ (no employee)';
      console.log(`  user[${r.id}] ${r.email} ${empInfo}`);
    }

    console.log('\n✅ Password for ALL accounts: Admin@123\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
