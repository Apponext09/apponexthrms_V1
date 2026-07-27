import { initializeKnex, getKnex } from '../src/db/knex';
import { v4 as uuidv4 } from 'uuid';

async function repair() {
  initializeKnex();
  const db = getKnex();

  try {
    console.log('🚀 Running database scan for missing leave assignments and balances...');

    // 1. Fetch all active employees
    const employees = await db('employees').whereNull('deleted_at');
    console.log(`ℹ️  Found ${employees.length} active employee(s) in database.`);

    // 2. Fetch default policy
    const policy = await db('leave_policies').first();
    if (!policy) {
      console.log('❌ No standard leave policy exists in database. Cannot seed assignments.');
      return;
    }
    console.log(`✅ Using Leave Policy ID=${policy.id}`);

    // 3. Fetch active leave types
    const leaveTypes = await db('leave_types').select('*');
    console.log(`ℹ️  Found ${leaveTypes.length} leave types.`);

    const currentYear = new Date().getFullYear();
    const fyStart = `${currentYear}-04-01`;
    const fyEnd = `${currentYear + 1}-03-31`;

    for (const emp of employees) {
      console.log(`⚙️  Checking Employee: ID=${emp.id}, Name=${emp.first_name} ${emp.last_name || ''}...`);
      let seededCount = 0;

      for (const lt of leaveTypes) {
        // Check assignment
        const existingAssignment = await db('leave_policy_assignments')
          .where('employee_id', emp.id)
          .where('leave_type_id', lt.id)
          .first();

        if (!existingAssignment) {
          await db('leave_policy_assignments').insert({
            uuid: uuidv4(),
            organization_id: emp.organization_id || 3,
            employee_id: emp.id,
            leave_type_id: lt.id,
            leave_policy_id: policy.id,
            annual_quota: lt.default_allowance_days || lt.defaultAllowanceDays || 12,
            carry_forward_enabled: 1,
            carry_forward_limit: 5,
            encashment_enabled: 0,
            sandwich_policy_enabled: lt.leave_code === 'SL' ? 1 : 0,
            probation_excluded: 0,
            can_take_negative: lt.leave_code === 'LOP' ? 1 : 0,
            assignment_start_date: emp.date_of_joining || emp.dateOfJoining || new Date(),
            is_active: true,
            created_by: 1,
            updated_by: 1,
            created_at: new Date(),
            updated_at: new Date()
          } as any);
          seededCount++;
        }

        // Check balance
        const existingBalance = await db('leave_balances')
          .where('employee_id', emp.id)
          .where('leave_type_id', lt.id)
          .where('financial_year_start', fyStart)
          .first();

        if (!existingBalance) {
          const quota = lt.default_allowance_days || lt.defaultAllowanceDays || 12;
          await db('leave_balances').insert({
            uuid: uuidv4(),
            organization_id: emp.organization_id || 3,
            employee_id: emp.id,
            leave_type_id: lt.id,
            financial_year_start: fyStart,
            financial_year_end: fyEnd,
            opening_balance: quota,
            credited_balance: 0,
            consumed_balance: 0,
            available_balance: quota,
            carry_forward_balance: 0,
            encashed_balance: 0,
            expired_balance: 0,
            pending_approval_balance: 0,
            created_by: 1,
            updated_by: 1,
            created_at: new Date(),
            updated_at: new Date()
          } as any);
        }
      }

      console.log(`   - Seeded ${seededCount} new policy assignment(s) and balance(s) for this employee.`);
    }

    console.log('🎉 Database scan and repair completed successfully!');

  } catch (err: any) {
    console.error('❌ Error during scan:', err.message);
  } finally {
    await db.destroy();
  }
}

repair();
