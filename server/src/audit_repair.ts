/**
 * Full audit and repair:
 * 1. Show all employees and their data
 * 2. Show all users and their employee links
 * 3. Repair broken employee_id links by matching on email
 * 4. Sync all data from employees → users
 */
import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    console.log('\n========== EMPLOYEES TABLE ==========');
    const employees = await db('employees').select(
      'id', 'employee_code', 'first_name', 'last_name', 'email',
      'status', 'current_department_id', 'date_of_joining', 'organization_id'
    );
    for (const e of employees) {
      console.log(`  [${e.id}] ${e.employee_code} | ${e.first_name} ${e.last_name} | ${e.email} | status:${e.status} | org:${e.organization_id}`);
    }

    console.log('\n========== USERS TABLE ==========');
    const users = await db('users').select('id', 'email', 'employee_id', 'organization_id', 'status');
    for (const u of users) {
      console.log(`  [${u.id}] ${u.email} | emp_id:${u.employee_id ?? 'NULL'} | org:${u.organization_id ?? 'NULL'} | ${u.status}`);
    }

    console.log('\n========== REPAIRING EMPLOYEE_ID LINKS ==========');
    let fixed = 0;
    for (const emp of employees) {
      const matchedUser = users.find(u => u.email === emp.email);
      if (matchedUser) {
        if (matchedUser.employee_id !== emp.id) {
          console.log(`  🔧 Linking user [${matchedUser.id}] ${matchedUser.email} → employee [${emp.id}]`);
          await db('users').where({ id: matchedUser.id }).update({
            employee_id: emp.id,
            organization_id: emp.organization_id,
            updated_at: new Date(),
          });
          fixed++;
        } else {
          console.log(`  ✅ Already linked: ${emp.email} (user:${matchedUser.id} → emp:${emp.id})`);
        }
      } else {
        console.log(`  ⚠️  No user account found for employee: ${emp.email}`);
      }
    }

    if (fixed === 0) console.log('  (no links needed repairing)');
    else console.log(`\n  ✅ Fixed ${fixed} employee_id link(s)`);

    console.log('\n========== FINAL STATE ==========');
    const finalUsers = await db('users as u')
      .leftJoin('employees as e', 'u.employee_id', 'e.id')
      .select(
        'u.id as user_id', 'u.email as login_email', 'u.employee_id',
        'e.first_name', 'e.last_name', 'e.email as emp_email'
      );
    for (const r of finalUsers) {
      const linked = r.employee_id ? `→ emp[${r.employee_id}] ${r.first_name} ${r.last_name}` : '→ NOT LINKED';
      const emailMatch = r.emp_email === r.login_email ? '✅' : (r.emp_email ? '⚠️ MISMATCH' : '');
      console.log(`  user[${r.user_id}] ${r.login_email} ${linked} ${emailMatch}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
