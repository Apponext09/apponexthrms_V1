import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed in development
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // Get first organization and employee
  const org = await knex('organizations').first();
  if (!org) {
    console.log('No organization found to seed leaves.');
    return;
  }

  const employee = await knex('employees').where('organization_id', org.id).first();
  if (!employee) {
    console.log('No employee found to seed leaves.');
    return;
  }

  // Get or create standard leave policy
  let policy = await knex('leave_policies').where({ organization_id: org.id, code: 'TEST_POLICY' }).first();
  if (!policy) {
    const [policyId] = await knex('leave_policies').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      name: 'Test Leave Policy',
      code: 'TEST_POLICY',
      is_default: false,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    policy = await knex('leave_policies').where('id', policyId).first();
  }

  // Get or create Casual Leave Type
  let leaveType = await knex('leave_types').where({ organization_id: org.id, leave_code: 'CL' }).first();
  if (!leaveType) {
    const [typeId] = await knex('leave_types').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      leave_name: 'Casual Leave',
      leave_code: 'CL',
      annual_quota: 12,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    leaveType = await knex('leave_types').where('id', typeId).first();
  }

  // 1. Seed or update a leave policy assignment with advanced rules for the test employee
  const existingAssignment = await knex('leave_policy_assignments')
    .where({ employee_id: employee.id, leave_type_id: leaveType.id })
    .first();

  if (existingAssignment) {
    await knex('leave_policy_assignments')
      .where('id', existingAssignment.id)
      .update({
        max_backdated_days: 3,
        max_future_days: 15,
        max_consecutive_days: 5,
        notice_period_excluded: true,
        prefix_suffix_rule_enabled: true,
        floating_holiday_quota: 2,
        updated_at: new Date(),
      });
  } else {
    await knex('leave_policy_assignments').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      employee_id: employee.id,
      leave_policy_id: policy.id,
      leave_type_id: leaveType.id,
      annual_quota: 12,
      max_backdated_days: 3,
      max_future_days: 15,
      max_consecutive_days: 5,
      notice_period_excluded: true,
      prefix_suffix_rule_enabled: true,
      floating_holiday_quota: 2,
      assignment_start_date: employee.date_of_joining || new Date().toISOString().split('T')[0],
      is_active: true,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // 2. Seed a policy mapping (Bulk Rule Engine)
  const existingMapping = await knex('leave_policy_mappings')
    .where({ organization_id: org.id, leave_policy_id: policy.id })
    .first();

  if (!existingMapping) {
    await knex('leave_policy_mappings').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      leave_policy_id: policy.id,
      designation_id: employee.current_designation_id || null,
      department_id: employee.current_department_id || null,
      employment_type: employee.employment_type || 'full_time',
      priority: 10,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // 3. Seed an optional holiday (Floating holiday selection pool)
  let calendar = await knex('holiday_calendars')
    .where({ organization_id: org.id, is_default: true })
    .first();

  if (!calendar) {
    const [calId] = await knex('holiday_calendars').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      name: 'Default Calendar',
      year: new Date().getFullYear(),
      is_default: true,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    calendar = await knex('holiday_calendars').where('id', calId).first();
  }

  // Check and add optional holiday
  const optionalHolidayDate = new Date();
  optionalHolidayDate.setDate(optionalHolidayDate.getDate() + 5); // 5 days from now
  const optionalHolidayDateStr = optionalHolidayDate.toISOString().split('T')[0];

  const existingHoliday = await knex('holidays')
    .where({ holiday_calendar_id: calendar.id, holiday_date: optionalHolidayDateStr })
    .first();

  if (!existingHoliday) {
    await knex('holidays').insert({
      uuid: uuidv4(),
      organization_id: org.id,
      holiday_calendar_id: calendar.id,
      holiday_name: 'Optional Festival Holiday',
      holiday_date: optionalHolidayDateStr,
      holiday_type: 'regional',
      is_optional: true,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  console.log('Successfully seeded advanced leave policy assignments, mappings, and optional holidays!');
}
