import { getKnex } from '../knex';

async function run() {
  const db = getKnex();
  console.log('🔍 Checking and adding missing attendance & livetracking columns...');

  // 1. Check attendance_records
  const hasTableAtt = await db.schema.hasTable('attendance_records');
  if (hasTableAtt) {
    const hasBreak = await db.schema.hasColumn('attendance_records', 'break_time_minutes');
    if (!hasBreak) {
      console.log('  Adding break_time_minutes to attendance_records...');
      await db.schema.alterTable('attendance_records', (table) => {
        table.integer('break_time_minutes').defaultTo(0);
      });
      console.log('  ✓ break_time_minutes added!');
    } else {
      console.log('  ✓ break_time_minutes already exists');
    }

    const hasDuration = await db.schema.hasColumn('attendance_records', 'duration_minutes');
    if (!hasDuration) {
      console.log('  Adding duration_minutes to attendance_records...');
      await db.schema.alterTable('attendance_records', (table) => {
        table.integer('duration_minutes').nullable();
      });
      console.log('  ✓ duration_minutes added!');
    } else {
      console.log('  ✓ duration_minutes already exists');
    }

    const hasWorkDuration = await db.schema.hasColumn('attendance_records', 'work_duration_minutes');
    if (!hasWorkDuration) {
      console.log('  Adding work_duration_minutes to attendance_records...');
      await db.schema.alterTable('attendance_records', (table) => {
        table.integer('work_duration_minutes').nullable();
      });
      console.log('  ✓ work_duration_minutes added!');
    } else {
      console.log('  ✓ work_duration_minutes already exists');
    }
  }

  // 2. Check employee_tracking_sessions
  const hasTableTrack = await db.schema.hasTable('employee_tracking_sessions');
  if (hasTableTrack) {
    const hasWalk = await db.schema.hasColumn('employee_tracking_sessions', 'location_walk');
    if (!hasWalk) {
      console.log('  Adding location_walk to employee_tracking_sessions...');
      await db.schema.alterTable('employee_tracking_sessions', (table) => {
        table.text('location_walk', 'longtext').nullable();
      });
      console.log('  ✓ location_walk added!');
    } else {
      console.log('  ✓ location_walk already exists');
    }
  }

  console.log('✅ All attendance & tracking columns are ready!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
