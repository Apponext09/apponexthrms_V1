import { initializeKnex, getKnex } from '../src/db/knex';
import { v4 as uuidv4 } from 'uuid';

async function restore() {
  initializeKnex();
  const db = getKnex();

  try {
    // 1. Set deleted_at to null and status to active in employees
    console.log('🚀 Restoring employee Narendra Gaikwad (ID=1)...');
    const restoredCount = await db('employees')
      .where('id', 1)
      .update({
        deleted_at: null,
        status: 'active'
      });
    console.log(`✅ Restored ${restoredCount} employee row(s).`);

    // 2. Fetch leave types
    const leaveTypes = await db('leave_types').select('*');
    console.log(`ℹ️  Found ${leaveTypes.length} leave types.`);

    // 3. Fetch default policy
    let policy = await db('leave_policies').first();
    if (!policy) {
      console.log('ℹ️  Policy not found, creating default...');
      const [policyId] = await db('leave_policies').insert({
        uuid: uuidv4(),
        organization_id: 3,
        name: 'Standard Leave Policy',
        description: 'Standard entitlement rules for all employees',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      policy = { id: policyId };
    }
    console.log(`✅ Using Leave Policy ID=${policy.id}`);

    // 4. Seed policy assignments for employee ID 1
    console.log('🚀 Seeding policy assignments for Employee ID=1...');
    for (const lt of leaveTypes) {
      // Check if assignment already exists
      const existing = await db('leave_policy_assignments')
        .where('employee_id', 1)
        .where('leave_type_id', lt.id)
        .first();

      if (!existing) {
        await db('leave_policy_assignments').insert({
          uuid: uuidv4(),
          organization_id: 3,
          employee_id: 1,
          leave_type_id: lt.id,
          leave_policy_id: policy.id,
          annual_quota: lt.default_allowance_days || lt.defaultAllowanceDays || 12,
          carry_forward_enabled: true,
          carry_forward_limit: 5,
          encashment_enabled: false,
          sandwich_policy_enabled: lt.leave_code === 'SL' ? 1 : 0,
          probation_excluded: 0,
          can_take_negative: lt.leave_code === 'LOP' ? 1 : 0,
          assignment_start_date: new Date('2026-04-01'),
          is_active: true,
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        } as any);
        console.log(`   - Assigned policy for ${lt.leave_name} (${lt.leave_code})`);
      } else {
        await db('leave_policy_assignments')
          .where('id', existing.id)
          .update({
            is_active: true,
            deleted_at: null
          });
        console.log(`   - Reactivated existing assignment for ${lt.leave_name} (${lt.leave_code})`);
      }
    }

    console.log('🎉 Restoration and seeding completed successfully!');

  } catch (err: any) {
    console.error('❌ Error restoring database constraints:', err.message);
  } finally {
    await db.destroy();
  }
}

restore();
