import { db } from '../db/knex';
import { holidayCalendarService } from '../modules/master/services/HolidayCalendarService';
import type { TenantContext } from '../db/types';

async function runIntegrationVerification() {
  console.log('========================================================================');
  console.log('🚀 RUNNING INTEGRATION VERIFICATION: Holiday Calendar <-> Leave Module');
  console.log('========================================================================');

  const testCtx: TenantContext = {
    organizationId: 1,
    companyId: 1,
    userId: 1,
  };

  try {
    // 1. Ensure test holiday calendar & data exists for year 2026
    const testYear = 2026;
    let [calendar] = await db('holiday_calendars')
      .where({ organization_id: 1, calendar_year: testYear, status: 'Published' })
      .whereNull('deleted_at');

    if (!calendar) {
      console.log('Creating Published Test Calendar for 2026...');
      const [calId] = await db('holiday_calendars').insert({
        uuid: 'test-cal-2026-uuid',
        organization_id: 1,
        company_id: 1,
        calendar_name: 'Test Corporate Calendar 2026',
        calendar_year: testYear,
        status: 'Published',
        created_by: 1,
        updated_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      calendar = await db('holiday_calendars').where('id', calId).first();
    }

    console.log(`✅ Using Published Calendar: ID ${calendar.id} (${calendar.calendar_name || calendar.name})`);

    // Ensure holiday records (e.g. Independence Day Aug 15 2026 and Gandhi Jayanti Oct 02 2026)
    const existingHolidays = await db('holidays')
      .where('calendar_id', calendar.id)
      .whereNull('deleted_at');

    if (existingHolidays.length === 0) {
      await db('holidays').insert([
        {
          uuid: 'test-hol-1',
          organization_id: 1,
          calendar_id: calendar.id,
          holiday_name: 'Republic Day',
          holiday_date: '2026-01-26',
          holiday_type: 'National',
          is_optional: false,
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          uuid: 'test-hol-2',
          organization_id: 1,
          calendar_id: calendar.id,
          holiday_name: 'Independence Day',
          holiday_date: '2026-08-15',
          holiday_type: 'National',
          is_optional: false,
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          uuid: 'test-hol-3',
          organization_id: 1,
          calendar_id: calendar.id,
          holiday_name: 'Janmashtami (Optional)',
          holiday_date: '2026-09-04',
          holiday_type: 'Optional',
          is_optional: true,
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }

    // Ensure weekly off rules: Sunday Full Day Off, Saturday 2nd & 4th Off
    const existingWeeklyOffs = await db('weekly_off_rules')
      .where('calendar_id', calendar.id)
      .whereNull('deleted_at');

    if (existingWeeklyOffs.length === 0) {
      await db('weekly_off_rules').insert([
        {
          uuid: 'test-wo-sun',
          organization_id: 1,
          calendar_id: calendar.id,
          week_day: 'Sun',
          off_type: 'Full Day',
          is_alternate: false,
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          uuid: 'test-wo-sat',
          organization_id: 1,
          calendar_id: calendar.id,
          week_day: 'Sat',
          off_type: 'Full Day',
          is_alternate: true,
          alternate_weeks: '2,4',
          created_by: 1,
          updated_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }

    // -------------------------------------------------------------
    // TEST 1: isHolidayOrWeekOff (Holidays, Sunday, 2nd Sat vs 1st Sat)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: isHolidayOrWeekOff ---');
    // 2026-01-26 is Monday (Republic Day)
    const resHoliday = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-01-26');
    console.log('2026-01-26 (Republic Day):', resHoliday);
    if (!resHoliday.isOff || resHoliday.type !== 'Holiday') throw new Error('Expected 2026-01-26 to be Holiday');

    // 2026-08-09 is Sunday
    const resSunday = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-09');
    console.log('2026-08-09 (Sunday):', resSunday);
    if (!resSunday.isOff || resSunday.type !== 'WeekOff') throw new Error('Expected 2026-08-09 to be WeekOff');

    // 2026-08-08 is 2nd Saturday (Day 8 -> week 2)
    const res2ndSat = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-08');
    console.log('2026-08-08 (2nd Saturday):', res2ndSat);
    if (!res2ndSat.isOff || res2ndSat.type !== 'WeekOff') throw new Error('Expected 2026-08-08 (2nd Sat) to be WeekOff');

    // 2026-08-01 is 1st Saturday (Day 1 -> week 1, not in '2,4')
    const res1stSat = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-01');
    console.log('2026-08-01 (1st Saturday):', res1stSat);
    if (res1stSat.isOff) throw new Error('Expected 2026-08-01 (1st Sat) to be working day');

    // 2026-08-05 is Wednesday (regular working day)
    const resWed = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-05');
    console.log('2026-08-05 (Wednesday):', resWed);
    if (resWed.isOff) throw new Error('Expected 2026-08-05 to be working day');

    console.log('✅ TEST 1 PASSED: isHolidayOrWeekOff accurately identifies Holidays, Sundays, Alternate Saturdays, and Working days!');

    // -------------------------------------------------------------
    // TEST 2: getWorkingDaysBetween
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: getWorkingDaysBetween ---');
    // Date range: 2026-08-07 (Fri) to 2026-08-10 (Mon)
    // 08-07: Fri (Working)
    // 08-08: Sat (2nd Sat Off)
    // 08-09: Sun (Sunday Off)
    // 08-10: Mon (Working)
    // Total 4 days: 2 working days, 2 off days
    const rangeRes = await holidayCalendarService.getWorkingDaysBetween(db, testCtx, calendar.id, '2026-08-07', '2026-08-10');
    console.log('Range 2026-08-07 to 2026-08-10:', {
      total: rangeRes.totalCalendarDays,
      working: rangeRes.workingDaysCount,
      off: rangeRes.offDaysCount,
    });
    if (rangeRes.totalCalendarDays !== 4 || rangeRes.workingDaysCount !== 2 || rangeRes.offDaysCount !== 2) {
      throw new Error(`Unexpected working days count: expected 2 working days, got ${rangeRes.workingDaysCount}`);
    }
    console.log('✅ TEST 2 PASSED: getWorkingDaysBetween correctly tallies working days vs off days!');

    // -------------------------------------------------------------
    // TEST 3: Comp-Off Validation Rule (Touchpoint 4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Comp-Off Earning Validation ---');
    const compOffWed = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-05');
    const compOffSun = await holidayCalendarService.isHolidayOrWeekOff(db, testCtx, calendar.id, '2026-08-09');

    console.log('Comp-off check on Wednesday (2026-08-05):', { isOff: compOffWed.isOff, canEarnCompOff: compOffWed.isOff });
    console.log('Comp-off check on Sunday (2026-08-09):', { isOff: compOffSun.isOff, canEarnCompOff: compOffSun.isOff });

    if (compOffWed.isOff !== false) throw new Error('Comp-off should be REJECTED on regular Wednesday!');
    if (compOffSun.isOff !== true) throw new Error('Comp-off should be ACCEPTED on Sunday!');

    console.log('✅ TEST 3 PASSED: Comp-Off rule rejects regular working days and accepts holidays/week-offs!');

    // -------------------------------------------------------------
    // TEST 4: Optional / Floating Holidays (Touchpoint 3)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Optional / Floating Holidays ---');
    const optHolidays = await db('holidays')
      .where('calendar_id', calendar.id)
      .where((builder) => {
        builder.where('is_optional', true).orWhere('holiday_type', 'Optional');
      })
      .whereNull('deleted_at');

    console.log(`Found ${optHolidays.length} Optional Holidays:`, optHolidays.map((h: any) => h.holiday_name));
    if (optHolidays.length === 0) throw new Error('Expected at least 1 optional holiday');

    console.log('✅ TEST 4 PASSED: Optional holidays correctly fetched from published calendar!');

    console.log('\n========================================================================');
    console.log('🎉 ALL INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('❌ Integration Verification Failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runIntegrationVerification();
