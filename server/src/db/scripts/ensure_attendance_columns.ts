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

  // 3. Check attendance_regularizations
  const hasTableReg = await db.schema.hasTable('attendance_regularizations');
  if (hasTableReg) {
    console.log('🔍 Checking attendance_regularizations columns...');
    
    const checkAndAddCol = async (colName: string, addFn: (t: any) => void) => {
      if (!(await db.schema.hasColumn('attendance_regularizations', colName))) {
        console.log(`  Adding ${colName} to attendance_regularizations...`);
        await db.schema.alterTable('attendance_regularizations', addFn);
        console.log(`  ✓ ${colName} added!`);
      } else {
        console.log(`  ✓ ${colName} already exists`);
      }
    };

    await checkAndAddCol('company_id', t => t.bigInteger('company_id').unsigned().nullable());
    await checkAndAddCol('is_date_range', t => t.boolean('is_date_range').defaultTo(false));
    await checkAndAddCol('end_date', t => t.date('end_date').nullable());
    await checkAndAddCol('requested_check_in_time', t => t.dateTime('requested_check_in_time').nullable());
    await checkAndAddCol('requested_check_out_time', t => t.dateTime('requested_check_out_time').nullable());
    await checkAndAddCol('actual_check_in_time', t => t.dateTime('actual_check_in_time').nullable());
    await checkAndAddCol('actual_check_out_time', t => t.dateTime('actual_check_out_time').nullable());
    await checkAndAddCol('reason', t => t.text('reason').nullable());
    await checkAndAddCol('day_type', t => t.string('day_type', 50).nullable());
    await checkAndAddCol('comment', t => t.text('comment').nullable());
    await checkAndAddCol('manager_id', t => t.bigInteger('manager_id').unsigned().nullable());
    await checkAndAddCol('manager_approved_by', t => t.bigInteger('manager_approved_by').unsigned().nullable());
    await checkAndAddCol('manager_approved_at', t => t.dateTime('manager_approved_at').nullable());
    await checkAndAddCol('manager_comments', t => t.text('manager_comments').nullable());
    await checkAndAddCol('hr_approved_by', t => t.bigInteger('hr_approved_by').unsigned().nullable());
    await checkAndAddCol('hr_approved_at', t => t.dateTime('hr_approved_at').nullable());
    await checkAndAddCol('hr_comments', t => t.text('hr_comments').nullable());
    await checkAndAddCol('created_by', t => t.bigInteger('created_by').unsigned().nullable());
    await checkAndAddCol('updated_by', t => t.bigInteger('updated_by').unsigned().nullable());
  }

  console.log('✅ All attendance & tracking columns are ready!');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
