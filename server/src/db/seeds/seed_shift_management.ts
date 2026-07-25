import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex, closeKnex } from '../knex';

export async function seedShiftManagementData() {
  try {
    console.log('🚀 Initializing database connection for Shift Management seed...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    // 1. Ensure table `shift_templates` exists
    const hasShiftTemplates = await db.schema.hasTable('shift_templates');
    if (!hasShiftTemplates) {
      console.log('📦 Table shift_templates does not exist. Creating schema...');
      await db.schema.createTable('shift_templates', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.string('shift_name', 100).notNullable();
        table.string('shift_code', 50).notNullable();
        table.string('shift_type', 20).defaultTo('fixed');
        table.time('start_time').nullable();
        table.time('end_time').nullable();
        table.decimal('duration_hours', 5, 2).defaultTo(8.00);
        table.integer('grace_period_minutes').defaultTo(15);
        table.integer('break_duration_minutes').defaultTo(60);
        table.boolean('is_night_shift').defaultTo(false);
        table.boolean('is_flexible').defaultTo(false);
        table.time('flexible_start_range_start').nullable();
        table.time('flexible_start_range_end').nullable();
        table.string('color', 20).defaultTo('#10B981');
        table.text('description').nullable();
        table.text('roster_pattern').nullable();
        table.boolean('is_default').defaultTo(false);
        table.string('status', 20).defaultTo('active');
        table.integer('created_by').nullable().defaultTo(1);
        table.integer('updated_by').nullable().defaultTo(1);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table shift_templates created successfully!\n');
    }

    // 2. Ensure table `employee_shift_assignments` exists
    const hasAssignments = await db.schema.hasTable('employee_shift_assignments');
    if (!hasAssignments) {
      console.log('📦 Table employee_shift_assignments does not exist. Creating schema...');
      await db.schema.createTable('employee_shift_assignments', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable().defaultTo(1);
        table.integer('employee_id').unsigned().notNullable();
        table.integer('shift_id').unsigned().notNullable();
        table.date('start_date').notNullable();
        table.date('end_date').nullable();
        table.boolean('is_active').defaultTo(true);
        table.text('notes').nullable();
        table.integer('created_by').nullable().defaultTo(1);
        table.integer('updated_by').nullable().defaultTo(1);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table employee_shift_assignments created successfully!\n');
    }

    // Get organization ID
    const org = await db('organizations').first();
    const orgId = org ? org.id : 1;

    console.log(`🧹 Clearing existing shift templates for Organization ID: ${orgId}...`);
    await db('shift_templates').where('organization_id', orgId).delete();

    console.log('🌱 Inserting standard shift templates...');

    const defaultShifts = [
      {
        uuid: uuidv4(),
        organization_id: orgId,
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
        status: 'active',
        created_by: 1,
        updated_by: 1,
      },
      {
        uuid: uuidv4(),
        organization_id: orgId,
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
        status: 'active',
        created_by: 1,
        updated_by: 1,
      },
      {
        uuid: uuidv4(),
        organization_id: orgId,
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
        status: 'active',
        created_by: 1,
        updated_by: 1,
      }
    ];

    await db('shift_templates').insert(defaultShifts);

    console.log('✅ Shift Management seed data inserted successfully!');
    console.log(`   - Added ${defaultShifts.length} shift templates (General Day, Night Shift, Flexible Shift)`);
  } catch (err) {
    console.error('❌ Error seeding Shift Management data:', err);
    throw err;
  } finally {
    await closeKnex();
  }
}

// Execute if run directly via tsx / node
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedShiftManagementData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
