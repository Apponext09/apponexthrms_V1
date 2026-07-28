import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex, closeKnex } from '../knex';

export async function seedShiftManagementData() {
  try {
    console.log('🚀 Initializing database connection for Shift Management seed...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    console.log('🧹 Clearing existing shift swap requests...');
    await db('shift_swap_requests').delete();

    // 2. Ensure table `employee_shift_assignments` exists
    const hasAssignments = await db.schema.hasTable('employee_shift_assignments');
    if (!hasAssignments) {
      console.log('📦 Table employee_shift_assignments does not exist. Creating schema...');
      await db.schema.createTable('employee_shift_assignments', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().defaultTo(1);
        table.bigInteger('employee_id').unsigned().notNullable();
        table.bigInteger('shift_id').unsigned().nullable();
        table.bigInteger('shift_rotation_id').unsigned().nullable();
        table.date('assignment_start_date').nullable();
        table.date('assignment_end_date').nullable();
        table.boolean('is_current').defaultTo(true);
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table employee_shift_assignments created successfully!\n');
    }

    console.log(`🧹 Clearing existing shift templates...`);
    await db('shift_templates').delete();

    // Get all organizations
    const organizations = await db('organizations').select('id');
    console.log(`🌱 Seeding shifts for ${organizations.length} organization(s):`, JSON.stringify(organizations));

    const defaultShifts = [
      {
        shift_name: 'General Day Shift',
        shift_code: 'GENERAL-DAY',
        shift_type: 'fixed',
        start_time: '09:00:00',
        end_time: '18:00:00',
        duration_hours: 9.00,
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        is_night_shift: false,
        is_flexible: false,
        color: '#10B981',
        description: 'Standard 9 AM to 6 PM general day shift (9h total, 1h break = 8h actual working hours)',
        roster_pattern: JSON.stringify({
          totalTime: '09:00',
          logBreakTime: '01:00',
          actualHours: '08:00',
          daysIncluded: ['mon', 'tue', 'wed', 'thu', 'fri'],
          excludedWorkingPattern: {
            sat: { first: false, second: true, third: false, fourth: true, fifth: false, last: false, halfDay: false, checkInTime: '09:00' }
          },
          globalAttendanceRules: {
            minHoursFullDayExcluded: '08:00',
            minHoursFullDayIncluded: '08:00',
            minHoursHalfDay: '04:00',
            minExcludedDaysWorked: 1,
            shiftCutOffTime: '04:00'
          },
          behaviorToggles: {
            excludeBreakTime: true,
            disableCheckInAfterBuffer: false,
            disableCheckOutBeforeTotalHours: false,
            noLateDeduction: false,
            considerShiftHoursForExcluded: true,
            enableHalfDayRuleForExcluded: true
          }
        }),
        is_default: true,
      },
      {
        shift_name: 'Night Shift',
        shift_code: 'NIGHT-SHIFT',
        shift_type: 'fixed',
        start_time: '22:00:00',
        end_time: '06:00:00',
        duration_hours: 8.00,
        grace_period_minutes: 15,
        break_duration_minutes: 60,
        is_night_shift: true,
        is_flexible: false,
        color: '#6366F1',
        description: 'Night shift operating from 10 PM to 6 AM (8h total, 1h break = 7h actual working hours)',
        roster_pattern: JSON.stringify({
          totalTime: '08:00',
          logBreakTime: '01:00',
          actualHours: '07:00',
          daysIncluded: ['mon', 'tue', 'wed', 'thu', 'fri'],
          globalAttendanceRules: {
            shiftCutOffTime: '04:00'
          },
          behaviorToggles: {
            excludeBreakTime: true,
            considerShiftHoursForExcluded: true
          }
        }),
        is_default: false,
      },
      {
        shift_name: 'Flexible Hours Shift',
        shift_code: 'FLEXI-SHIFT',
        shift_type: 'flexible',
        start_time: null,
        end_time: null,
        duration_hours: 8.00,
        grace_period_minutes: 0,
        break_duration_minutes: 60,
        is_night_shift: false,
        is_flexible: true,
        color: '#F59E0B',
        description: 'Flexible working hours shift allowing clock-in at any time (8h total, 1h break = 7h actual working hours)',
        roster_pattern: JSON.stringify({
          totalTime: '08:00',
          logBreakTime: '01:00',
          actualHours: '07:00',
          daysIncluded: ['mon', 'tue', 'wed', 'thu', 'fri'],
          behaviorToggles: {
            excludeBreakTime: true
          }
        }),
        is_default: false,
      }
    ];

    for (const org of organizations) {
      const orgId = org.id;
      console.log(`  🏢 Seeding shifts for Organization ID: ${orgId}`);

      const templatesToInsert = defaultShifts.map((s) => ({
        uuid: uuidv4(),
        organization_id: orgId,
        shift_name: s.shift_name,
        shift_code: s.shift_code,
        shift_type: s.shift_type,
        start_time: s.start_time,
        end_time: s.end_time,
        duration_hours: s.duration_hours,
        grace_period_minutes: s.grace_period_minutes,
        break_duration_minutes: s.break_duration_minutes,
        is_night_shift: s.is_night_shift,
        is_flexible: s.is_flexible,
        color: s.color,
        description: s.description,
        roster_pattern: s.roster_pattern,
        is_default: s.is_default,
        status: 'active',
        created_by: 1,
        updated_by: 1,
      }));

      await db('shift_templates').insert(templatesToInsert);

      const inserted = await db('shift_templates').where('organization_id', orgId);
      const generalShift = inserted.find((s) => s.shiftCode === 'GENERAL-DAY');
      const nightShift = inserted.find((s) => s.shiftCode === 'NIGHT-SHIFT');

      const empsInOrg = await db('employees').where('organization_id', orgId);
      console.log(`    - Employees in Org ${orgId}:`, JSON.stringify(empsInOrg));

      const assignList = [];

      const hasEmp1 = empsInOrg.find(e => e.id === 1);
      if (hasEmp1 && generalShift) {
        assignList.push({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: 1,
          shift_id: generalShift.id,
          assignment_start_date: '2026-07-01',
          assignment_end_date: null,
          is_current: true,
          created_by: 1,
          updated_by: 1,
        });
      }

      const hasEmp47 = empsInOrg.find(e => e.id === 47);
      if (hasEmp47 && generalShift) {
        assignList.push({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: 47,
          shift_id: generalShift.id,
          assignment_start_date: '2026-07-01',
          assignment_end_date: null,
          is_current: true,
          created_by: 1,
          updated_by: 1,
        });
      }

      const hasEmp2 = empsInOrg.find(e => e.id === 2);
      if (hasEmp2 && nightShift) {
        assignList.push({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: 2,
          shift_id: nightShift.id,
          assignment_start_date: '2026-07-01',
          assignment_end_date: null,
          is_current: true,
          created_by: 1,
          updated_by: 1,
        });
      }

      if (assignList.length > 0) {
        await db('employee_shift_assignments').insert(assignList);
        console.log(`    ✅ Seeded ${assignList.length} assignments`);
      }
    }

    console.log('✅ Shift Management seed data inserted successfully!');
  } catch (err) {
    console.error('❌ Error seeding Shift Management data:', err);
    throw err;
  } finally {
    await closeKnex();
  }
}

// Execute if run directly via tsx / node
if (process.argv[1] && process.argv[1].includes('seed_shift_management')) {
  seedShiftManagementData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
