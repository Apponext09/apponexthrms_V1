import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Get demo organization
  const organization = await knex('organizations').first();
  const orgId = organization?.id || 8;

  // Get admin user for auditing fields
  const adminUser = await knex('users').where('organization_id', orgId).orderBy('id', 'asc').first() || await knex('users').first();
  const adminUserId = adminUser?.id || 10;

  // Disable FK check during seeding
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  // Clean old leave-related records
  await knex('leave_ledger_entries').where('organization_id', orgId).del();
  await knex('leave_audit_logs').where('organization_id', orgId).del();
  await knex('leave_delegations').where('organization_id', orgId).del();
  await knex('leave_carry_forward').where('organization_id', orgId).del();
  await knex('comp_off_requests').where('organization_id', orgId).del();
  await knex('comp_off_balances').where('organization_id', orgId).del();
  await knex('leave_encashments').where('organization_id', orgId).del();
  await knex('leave_cancellations').where('organization_id', orgId).del();
  await knex('leave_approvals').where('organization_id', orgId).del();
  await knex('leave_application_days').where('organization_id', orgId).del();
  await knex('leave_applications').where('organization_id', orgId).del();
  await knex('leave_accruals').where('organization_id', orgId).del();
  await knex('leave_balances').where('organization_id', orgId).del();
  await knex('leave_policy_mappings').where('organization_id', orgId).del();
  await knex('leave_policy_assignments').where('organization_id', orgId).del();
  await knex('leave_types').where('organization_id', orgId).del();
  await knex('leave_policies').where('organization_id', orgId).del();
  await knex('optional_holiday_selections').where('organization_id', orgId).del();
  await knex('holidays').where('organization_id', orgId).del();
  await knex('holiday_calendars').where('organization_id', orgId).del();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 1. Seed Holiday Calendars
  const [calendarId] = await knex('holiday_calendars').insert({
    uuid: uuidv4(),
    organization_id: orgId,
    name: 'General Holiday Calendar 2026',
    year: 2026,
    is_default: true,
    status: 'active',
    created_by: adminUserId,
    updated_by: adminUserId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // 2. Seed Holidays
  await knex('holidays').insert([
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'New Year Day',
      holiday_date: '2026-01-01',
      holiday_type: 'national',
      is_optional: false,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'Republic Day',
      holiday_date: '2026-01-26',
      holiday_type: 'national',
      is_optional: false,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'Independence Day',
      holiday_date: '2026-08-15',
      holiday_type: 'national',
      is_optional: false,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'Christmas',
      holiday_date: '2026-12-25',
      holiday_type: 'national',
      is_optional: false,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'Diwali Eve (Optional)',
      holiday_date: '2026-11-08',
      holiday_type: 'company',
      is_optional: true,
      created_by: adminUserId,
      updated_by: adminUserId,
    },
    {
      uuid: uuidv4(),
      organization_id: orgId,
      holiday_calendar_id: calendarId,
      holiday_name: 'Employee Birthday (Optional)',
      holiday_date: '2026-06-15',
      holiday_type: 'company',
      is_optional: true,
      created_by: adminUserId,
      updated_by: adminUserId,
    }
  ]);

  // 3. Seed Leave Policies
  const [standardPolicyId] = await knex('leave_policies').insert({
    uuid: uuidv4(),
    organization_id: orgId,
    name: 'Standard Leave Policy',
    code: 'STANDARD',
    is_default: true,
    status: 'active',
    created_by: adminUserId,
    updated_by: adminUserId,
  });

  const [engPolicyId] = await knex('leave_policies').insert({
    uuid: uuidv4(),
    organization_id: orgId,
    name: 'Engineering Leave Policy',
    code: 'ENGINEERING',
    is_default: false,
    status: 'active',
    created_by: adminUserId,
    updated_by: adminUserId,
  });

  // 4. Seed Leave Types
  const leaveTypes = [
    { name: 'Casual Leave', code: 'CL', quota: 12 },
    { name: 'Sick Leave', code: 'SL', quota: 10 },
    { name: 'Earned Leave', code: 'EL', quota: 15 },
    { name: 'Maternity Leave', code: 'ML', quota: 180, gender: 'female' },
    { name: 'Paternity Leave', code: 'PL', quota: 15, gender: 'male' },
    { name: 'Comp Off', code: 'CO', quota: 0 },
  ];

  const typeIds: Record<string, number> = {};
  for (const lt of leaveTypes) {
    const [insertedId] = await knex('leave_types').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      leave_policy_id: standardPolicyId,
      leave_name: lt.name,
      leave_code: lt.code,
      annual_quota: lt.quota,
      carry_forward_enabled: lt.code === 'EL',
      carry_forward_limit: lt.code === 'EL' ? 30 : null,
      encashment_enabled: lt.code === 'EL',
      encashment_limit: lt.code === 'EL' ? 10 : null,
      sandwich_rule_enabled: true,
      gender_applicable: lt.gender || 'all',
      description: `Default category for ${lt.name}`,
      status: 'active',
      created_by: adminUserId,
      updated_by: adminUserId,
    });
    typeIds[lt.code] = insertedId;
  }

  // 5. Seed Leave Policy Assignments for existing employees
  const employees = await knex('employees').where('organization_id', orgId).select('id', 'gender', 'date_of_joining');
  
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      // Respect gender applicability constraints
      if (lt.gender && lt.gender !== emp.gender) {
        continue;
      }

      await knex('leave_policy_assignments').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: emp.id,
        leave_policy_id: standardPolicyId,
        leave_type_id: typeIds[lt.code],
        annual_quota: lt.quota,
        carry_forward_enabled: lt.code === 'EL',
        carry_forward_limit: lt.code === 'EL' ? 30 : null,
        encashment_enabled: lt.code === 'EL',
        encashment_limit: lt.code === 'EL' ? 10 : null,
        maximum_balance: 60,
        can_take_negative: lt.code === 'SL' || lt.code === 'CL',
        sandwich_policy_enabled: true,
        probation_excluded: false,
        assignment_start_date: emp.date_of_joining || '2026-01-01',
        is_active: true,
        created_by: adminUserId,
        updated_by: adminUserId,
        max_backdated_days: 7,
        max_future_days: 90,
        max_consecutive_days: lt.code === 'CL' ? 5 : null,
        notice_period_excluded: lt.code === 'EL',
        prefix_suffix_rule_enabled: false,
        floating_holiday_quota: 2,
      });

      // Initialize leave balance record
      await knex('leave_balances').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        employee_id: emp.id,
        leave_type_id: typeIds[lt.code],
        financial_year_start: '2026-04-01',
        financial_year_end: '2027-03-31',
        opening_balance: lt.quota,
        credited_balance: 0,
        consumed_balance: 0,
        available_balance: lt.quota,
        carry_forward_balance: 0,
        encashed_balance: 0,
        expired_balance: 0,
        pending_approval_balance: 0,
        last_updated_at: new Date(),
        created_by: adminUserId,
        updated_by: adminUserId,
      });
    }
  }

  // 6. Seed Policy Mappings for Engineering Department (example mapping)
  const devDept = await knex('departments').where('organization_id', orgId).first();
  if (devDept) {
    await knex('leave_policy_mappings').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      leave_policy_id: engPolicyId,
      department_id: devDept.id,
      priority: 10,
      created_by: adminUserId,
      updated_by: adminUserId,
    });
  }
}
