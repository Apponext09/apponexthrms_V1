//npx knex migrate:latest
//npx knex seed:run --specific=new_leaves_data.ts

import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log('Seeding new advanced leave data...');

  // Get first organization and admin user
  const org = await knex('organizations').first();
  if (!org) {
    console.log('No organization found to seed new leaves data.');
    return;
  }

  const user = await knex('users').where('organization_id', org.id).first();
  if (!user) {
    console.log('No user found to seed new leaves data.');
    return;
  }

  // 1. Update existing leave_policy_assignments with advanced policy columns
  const assignments = await knex('leave_policy_assignments').where('organization_id', org.id);
  if (assignments.length > 0) {
    console.log(`Updating ${assignments.length} leave_policy_assignments with new columns...`);
    await knex('leave_policy_assignments')
      .where('organization_id', org.id)
      .update({
        max_backdated_days: 7,
        max_future_days: 60,
        max_consecutive_days: 14,
        notice_period_excluded: false,
        prefix_suffix_rule_enabled: true,
        floating_holiday_quota: 2,
        updated_at: new Date()
      });
  }

  // Get or create standard leave policy to map
  let policy = await knex('leave_policies').where({ organization_id: org.id }).first();
  if (!policy) {
    const [policyId] = await knex('leave_policies').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      name: 'Advanced Leave Policy',
      code: 'ADV_POLICY',
      is_default: false,
      status: 'active',
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    policy = await knex('leave_policies').where('id', policyId).first();
  }

  // 2. Seed leave_policy_mappings
  const mappingExists = await knex('leave_policy_mappings').where({ leave_policy_id: policy.id }).first();
  if (!mappingExists) {
    console.log('Seeding leave_policy_mappings...');
    await knex('leave_policy_mappings').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      leave_policy_id: policy.id,
      priority: 10,
      employment_type: 'Full-Time',
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // 3. Seed leave_blackout_periods
  const blackoutExists = await knex('leave_blackout_periods').where({ organization_id: org.id }).first();
  if (!blackoutExists) {
    console.log('Seeding leave_blackout_periods...');
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endNextMonth = new Date(nextMonth);
    endNextMonth.setDate(endNextMonth.getDate() + 5);

    await knex('leave_blackout_periods').insert([
      {
        uuid: uuidv4(),
        organization_id: org.id,
        start_date: nextMonth,
        end_date: endNextMonth,
        reason: 'Annual Audit Period',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        uuid: uuidv4(),
        organization_id: org.id,
        start_date: new Date(new Date().getFullYear(), 11, 25), // Dec 25
        end_date: new Date(new Date().getFullYear(), 11, 31),   // Dec 31
        reason: 'Year End Freeze',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  }

  // 4. Seed leave_report_schedules
  const scheduleExists = await knex('leave_report_schedules').where({ organization_id: org.id }).first();
  if (!scheduleExists) {
    console.log('Seeding leave_report_schedules...');
    await knex('leave_report_schedules').insert([
      {
        uuid: uuidv4(),
        organization_id: org.id,
        user_id: user.id,
        schedule_name: 'Weekly Leave Balances',
        frequency: 'weekly',
        entity: 'LEAVE_BALANCES',
        fields: JSON.stringify(['employee_id', 'leave_type_id', 'balance']),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        uuid: uuidv4(),
        organization_id: org.id,
        user_id: user.id,
        schedule_name: 'Monthly Approved Leaves',
        frequency: 'monthly',
        entity: 'LEAVE_APPLICATIONS',
        fields: JSON.stringify(['employee_id', 'start_date', 'end_date', 'status']),
        filters: JSON.stringify({ status: 'approved' }),
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  }

  console.log('Advanced leave data seeding completed.');
}
