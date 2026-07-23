/**
 * Sync all employees' emails to their linked users table rows.
 * This fixes any employees whose email was changed via the UI but
 * the users.email wasn't updated (old bug, now fixed).
 */
import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    console.log('\n========== SYNCING EMPLOYEE EMAILS TO USERS TABLE ==========\n');

    // Find all employees linked to a user
    const linked = await db('employees as e')
      .join('users as u', 'u.employee_id', 'e.id')
      .whereNotNull('u.employee_id')
      .select(
        'e.id as emp_id',
        'e.email as emp_email',
        'e.first_name',
        'e.last_name',
        'u.id as user_id',
        'u.email as user_email'
      );

    let synced = 0;
    for (const row of linked) {
      if (row.emp_email !== row.user_email) {
        console.log(`  ⚠️  Mismatch: Employee [${row.emp_id}] ${row.first_name} ${row.last_name}`);
        console.log(`     employees.email = "${row.emp_email}"`);
        console.log(`     users.email     = "${row.user_email}"`);
        console.log(`     → Syncing users.email to "${row.emp_email}"`);

        await db('users').where({ id: row.user_id }).update({
          email: row.emp_email,
          updated_at: new Date(),
        });
        synced++;
      }
    }

    if (synced === 0) {
      console.log('  ✅ All employee emails already in sync with users table.');
    } else {
      console.log(`\n✅ Synced ${synced} email(s) from employees → users table.`);
    }

    // Show final state
    console.log('\n========== FINAL USERS TABLE ==========');
    const users = await db('users').select('id', 'email', 'employee_id', 'status');
    for (const u of users) {
      console.log(`  [${u.id}] ${u.email} | emp_id: ${u.employee_id || 'N/A'} | ${u.status}`);
    }

    console.log('\n📋 All above emails can now login with password: Admin@123\n');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
