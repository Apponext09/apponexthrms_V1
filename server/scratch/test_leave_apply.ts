import { LeaveService } from '../src/modules/leaves/services/LeaveService';
import { getKnex } from '../src/db/knex';
import type { TenantContext } from '../src/db/types';

async function test() {
  const db = getKnex();

  // Find or create test organization
  let org = await db('organizations').where('slug', 'apponext').first();
  if (!org) {
    const [orgId] = await db('organizations').insert({
      uuid: 'test-org-uuid-12345',
      name: 'Apponext',
      slug: 'apponext',
      status: 'active',
      plan_tier: 'enterprise',
      timezone: 'UTC',
      locale: 'en',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    org = { id: orgId };
  }

  // Create a test location
  let location = await db('locations').where('organization_id', org.id).where('code', 'MUM_OFF').first();
  if (!location) {
    const [locId] = await db('locations').insert({
      uuid: 'test-loc-uuid-12345',
      organization_id: org.id,
      name: 'Mumbai Office',
      code: 'MUM_OFF',
      type: 'office',
      timezone: 'Asia/Kolkata',
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    location = { id: locId };
  }

  // Find or create test employee assigned to Mumbai location
  let employee = await db('employees').where('email', 'test_pto_employee@apponext.com').first();
  if (!employee) {
    const [empId] = await db('employees').insert({
      uuid: 'test-emp-uuid-12345',
      organization_id: org.id,
      employee_code: 'TEST_PTO_001',
      first_name: 'PTO',
      last_name: 'Test',
      email: 'test_pto_employee@apponext.com',
      date_of_joining: '2025-04-15',
      employment_type: 'full_time',
      current_location_id: location.id,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    employee = { id: empId, date_of_joining: '2025-04-15', current_location_id: location.id };
  } else {
    await db('employees').where('id', employee.id).update({
      current_location_id: location.id
    });
  }

  // Set up organization weekly-off days: Saturday (6) and Sunday (0)
  await db('organization_settings').where('organization_id', org.id).where('setting_key', 'weekly_off_days').del();
  await db('organization_settings').insert({
    uuid: 'test-settings-wo-123',
    organization_id: org.id,
    setting_key: 'weekly_off_days',
    setting_value: JSON.stringify([0, 6]),
    setting_type: 'array',
    created_by: 1,
    updated_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Set up Location holiday calendar and a holiday on Monday June 8, 2026
  await db('holidays').del();
  await db('holiday_calendars').del();

  const [calendarId] = await db('holiday_calendars').insert({
    uuid: 'test-cal-uuid-123',
    organization_id: org.id,
    name: 'Mumbai Office 2026 Holiday Calendar',
    year: 2026,
    applicable_location_id: location.id,
    is_default: false,
    status: 'active',
    created_by: 1,
    updated_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await db('holidays').insert({
    uuid: 'test-hol-uuid-123',
    organization_id: org.id,
    holiday_calendar_id: calendarId,
    holiday_name: 'Regional Festival Day',
    holiday_date: '2026-06-08', // Monday
    holiday_type: 'regional',
    is_optional: false,
    created_by: 1,
    updated_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Find or create test leave policy
  let policy = await db('leave_policies').where('organization_id', org.id).first();
  if (!policy) {
    const [policyId] = await db('leave_policies').insert({
      uuid: 'test-policy-uuid-12345',
      organization_id: org.id,
      name: 'Standard Leave Policy',
      code: 'STD_POLICY',
      is_default: true,
      status: 'active',
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    policy = { id: policyId };
  }

  // Find or create Casual Leave (CL) without sandwich rule
  let clLeaveType = await db('leave_types').where('organization_id', org.id).where('leave_code', 'CL').first();
  if (!clLeaveType) {
    const [clId] = await db('leave_types').insert({
      uuid: 'test-lt-uuid-cl',
      organization_id: org.id,
      leave_policy_id: policy.id,
      leave_name: 'Casual Leave',
      leave_code: 'CL',
      annual_quota: 12,
      sandwich_rule_enabled: false,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    clLeaveType = { id: clId };
  } else {
    await db('leave_types').where('id', clLeaveType.id).update({
      sandwich_rule_enabled: false
    });
  }

  // Find or create Sick Leave (SL) with sandwich rule enabled
  let slLeaveType = await db('leave_types').where('organization_id', org.id).where('leave_code', 'SL').first();
  if (!slLeaveType) {
    const [slId] = await db('leave_types').insert({
      uuid: 'test-lt-uuid-sl',
      organization_id: org.id,
      leave_policy_id: policy.id,
      leave_name: 'Sick Leave',
      leave_code: 'SL',
      annual_quota: 12,
      sandwich_rule_enabled: true,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    slLeaveType = { id: slId };
  } else {
    await db('leave_types').where('id', slLeaveType.id).update({
      sandwich_rule_enabled: true
    });
  }

  // Clean existing assignments and balances
  await db('leave_policy_assignments').where('employee_id', employee.id).del();
  await db('employee_leave_locks').where('employee_id', employee.id).del();
  await db('leave_balances').where('employee_id', employee.id).del();
  await db('leave_ledger_entries').where('employee_id', employee.id).del();
  await db('leave_application_days')
    .whereIn('application_id', db('leave_applications').select('id').where('employee_id', employee.id))
    .del();
  await db('leave_applications').where('employee_id', employee.id).del();

  // Create assignments
  await db('leave_policy_assignments').insert([
    {
      uuid: 'test-assign-uuid-cl',
      organization_id: org.id,
      employee_id: employee.id,
      leave_policy_id: policy.id,
      leave_type_id: clLeaveType.id,
      annual_quota: 15,
      can_take_negative: false,
      assignment_start_date: '2026-04-01',
      is_active: true,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      uuid: 'test-assign-uuid-sl',
      organization_id: org.id,
      employee_id: employee.id,
      leave_policy_id: policy.id,
      leave_type_id: slLeaveType.id,
      annual_quota: 15,
      can_take_negative: false,
      assignment_start_date: '2026-04-01',
      is_active: true,
      created_by: 1,
      updated_by: 1,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ]);

  const ctx: TenantContext & { userEmail?: string } = {
    organizationId: org.id,
    userId: 1,
    sessionUuid: 'test-session-uuid',
    userEmail: 'admin@apponext.com',
  };

  const leaveService = new LeaveService();

  // ==========================================
  // TEST 1: Exclude weekend and holiday when sandwich rule is disabled
  // ==========================================
  console.log('\n--- TEST 1: Applying for CL (Friday June 5 to Tuesday June 9, 2026) ---');
  console.log('Sat/Sun are weekends, Monday June 8 is a Holiday. CL does NOT have sandwich rule enabled.');
  const app1: any = await leaveService.applyLeave(ctx, {
    employeeId: employee.id,
    leaveTypeId: clLeaveType.id,
    startDate: '2026-06-05', // Friday
    endDate: '2026-06-09', // Tuesday
    reason: 'Weekend holiday exclusion test',
    isHalfDay: false,
  });

  console.log('TEST 1 - Total Days Calculated:', app1.totalDays);
  // Expected: Friday (1.0) + Tuesday (1.0) = 2.0 days (Sat, Sun, Mon excluded)
  if (parseFloat(app1.totalDays) === 2.0) {
    console.log('✅ TEST 1 PASSED: Correctly calculated 2 days.');
  } else {
    console.error('❌ TEST 1 FAILED: Expected 2.0 days, got', app1.totalDays);
  }

  // Cancel Test 1 application to clean up balance
  await leaveService.cancelLeave(ctx, app1.id);

  // ==========================================
  // TEST 2: Include sandwich days when sandwich rule is enabled
  // ==========================================
  console.log('\n--- TEST 2: Applying for SL (Friday June 5 to Tuesday June 9, 2026) ---');
  console.log('Sat/Sun are weekends, Monday June 8 is a Holiday. SL HAS sandwich rule enabled.');
  const app2: any = await leaveService.applyLeave(ctx, {
    employeeId: employee.id,
    leaveTypeId: slLeaveType.id,
    startDate: '2026-06-05',
    endDate: '2026-06-09',
    reason: 'Sandwich rule test',
    isHalfDay: false,
  });

  console.log('TEST 2 - Total Days Calculated:', app2.totalDays);
  // Expected: Friday (1) + Sat (1 sandwich) + Sun (1 sandwich) + Mon (1 sandwich) + Tuesday (1) = 5.0 days
  if (parseFloat(app2.totalDays) === 5.0) {
    console.log('✅ TEST 2 PASSED: Correctly calculated 5 days.');
  } else {
    console.error('❌ TEST 2 FAILED: Expected 5.0 days, got', app2.totalDays);
  }

  // Check breakdown day flags for Test 2
  const breakdown2 = await db('leave_application_days')
    .where('application_id', app2.id)
    .orderBy('leave_date', 'asc');
  console.log('\n--- TEST 2 BREAKDOWN ROWS ---');
  console.log(JSON.stringify(breakdown2.map(b => ({
    date: toLocalYYYYMMDD(b.leaveDate),
    day_type: b.dayType,
    is_weekend: b.isWeekend,
    is_holiday: b.isHoliday,
  })), null, 2));

  // Cancel Test 2 application
  await leaveService.cancelLeave(ctx, app2.id);

  // ==========================================
  // TEST 3: Cross-application sandwich validation
  // ==========================================
  console.log('\n--- TEST 3: Applying for adjacent leaves separately (SL) ---');
  console.log('Step A: Apply and approve Friday June 5.');
  const app3A: any = await leaveService.applyLeave(ctx, {
    employeeId: employee.id,
    leaveTypeId: slLeaveType.id,
    startDate: '2026-06-05',
    endDate: '2026-06-05',
    reason: 'Friday Leave',
    isHalfDay: false,
  });
  // Approve the Friday request so it acts as active leave
  await db('leave_applications').where('id', app3A.id).update({ status: 'approved' });

  console.log('Step B: Apply for Saturday June 6 to Monday June 8.');
  console.log('Saturday/Sunday/Monday are weekend/holidays. The day after is Tuesday June 9, which is not leave-covered.');
  console.log('Expected: No sandwich since Tuesday is not leave-covered.');
  
  try {
    const app3B = await leaveService.applyLeave(ctx, {
      employeeId: employee.id,
      leaveTypeId: slLeaveType.id,
      startDate: '2026-06-06',
      endDate: '2026-06-08',
      reason: 'Weekend Range Leave without after-day',
      isHalfDay: false,
    });
    console.error('❌ TEST 3 Step B FAILED: Should have thrown validation error for 0 total days.');
  } catch (err: any) {
    console.log('✅ TEST 3 Step B PASSED: Correctly threw validation error:', err.message);
  }

  console.log('Step C: Create approved leave for Tuesday June 9.');
  const app3C = await leaveService.applyLeave(ctx, {
    employeeId: employee.id,
    leaveTypeId: slLeaveType.id,
    startDate: '2026-06-09',
    endDate: '2026-06-09',
    reason: 'Tuesday Leave',
    isHalfDay: false,
  });
  await db('leave_applications').where('id', app3C.id).update({ status: 'approved' });

  console.log('Step D: Apply for Saturday June 6 to Monday June 8 again.');
  console.log('Now, Friday is leave-covered (existing) and Tuesday is leave-covered (existing).');
  console.log('Expected: Saturday, Sunday, and Monday are sandwiched and should count as 3.0 days.');
  
  const app3D: any = await leaveService.applyLeave(ctx, {
    employeeId: employee.id,
    leaveTypeId: slLeaveType.id,
    startDate: '2026-06-06',
    endDate: '2026-06-08',
    reason: 'Weekend Range Leave with both active boundaries',
    isHalfDay: false,
  });

  console.log('TEST 3 Step D - Total Days Calculated:', app3D.totalDays);
  if (parseFloat(app3D.totalDays) === 3.0) {
    console.log('✅ TEST 3 PASSED: Cross-application sandwich correctly charged 3 days.');
  } else {
    console.error('❌ TEST 3 FAILED: Expected 3.0 days, got', app3D.totalDays);
  }

  await db.destroy();
}

// Helper to convert Date to YYYY-MM-DD local timezone string
function toLocalYYYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test().catch(console.error);
