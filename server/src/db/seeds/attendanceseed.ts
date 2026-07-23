import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex } from '../knex';

export async function seedAttendanceData() {
  try {
    console.log('🚀 Initializing database connection for attendance seed...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    // Ensure table attendance_records exists
    const hasTable = await db.schema.hasTable('attendance_records');
    if (!hasTable) {
      console.log('📦 Table attendance_records does not exist. Creating schema...');
      await db.schema.createTable('attendance_records', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').unsigned().notNullable();
        table.integer('employee_id').unsigned().notNullable();
        table.string('check_in_date', 10).notNullable();
        table.string('check_in_time').nullable();
        table.string('check_out_time').nullable();
        table.integer('duration_minutes').nullable();
        table.integer('break_time_minutes').defaultTo(0);
        table.integer('work_duration_minutes').nullable();
        table.string('status', 20).defaultTo('present');
        table.integer('check_in_location_id').nullable();
        table.integer('check_out_location_id').nullable();
        table.string('check_in_method', 50).nullable();
        table.string('check_out_method', 50).nullable();
        table.boolean('is_late').defaultTo(false);
        table.boolean('is_early_departure').defaultTo(false);
        table.boolean('is_regularized').defaultTo(false);
        table.integer('regularization_request_id').nullable();
        table.integer('overtime_minutes').defaultTo(0);
        table.text('notes').nullable();
        table.integer('created_by').nullable();
        table.integer('updated_by').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('deleted_at').nullable();
      });
      console.log('✅ Table attendance_records created successfully!\n');
    }

    // Get default org and employee ID
    const org = await db('organizations').first();
    const orgId = org ? org.id : 1;

    const emp = await db('users').first();
    const empId = emp ? emp.id : 1;

    console.log(`👤 Seeding attendance for Organization ID: ${orgId}, Employee ID: ${empId}...`);

    // Helper to generate seed entries for a given month (YYYY-MM)
    const generateMonthRecords = (year: number, monthZeroIndex: number) => {
      const records: any[] = [];
      const daysInMonth = new Date(year, monthZeroIndex + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthZeroIndex, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
        const monthStr = String(monthZeroIndex + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend
          records.push({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: empId,
            check_in_date: dateString,
            check_in_time: null,
            check_out_time: null,
            duration_minutes: 0,
            break_time_minutes: 0,
            work_duration_minutes: 0,
            status: 'weekly_off',
            check_in_location_id: null,
            check_out_location_id: null,
            check_in_method: null,
            check_out_method: null,
            is_late: false,
            is_early_departure: false,
            is_regularized: false,
            overtime_minutes: 0,
            notes: 'Weekend Weekly Off',
            created_by: empId,
            updated_by: empId,
            created_at: new Date(),
            updated_at: new Date(),
          });
        } else {
          // Weekday pattern
          let status = 'present';
          let checkInHour = 9;
          let checkInMin = 0;
          let durationHours = 8.5;
          let isLate = false;
          let method = 'web';

          if (day % 11 === 0) {
            status = 'absent';
          } else if (day % 7 === 0) {
            status = 'work_from_home';
            method = 'web';
            checkInHour = 9;
            checkInMin = 5;
          } else if (day % 5 === 0) {
            status = 'present';
            isLate = true;
            checkInHour = 9;
            checkInMin = 45;
            method = 'kiosk';
          } else {
            status = 'present';
            checkInHour = 8;
            checkInMin = 55 + (day % 10);
            method = day % 3 === 0 ? 'biometric' : day % 4 === 0 ? 'qr' : 'web';
          }

          if (status === 'absent') {
            records.push({
              uuid: uuidv4(),
              organization_id: orgId,
              employee_id: empId,
              check_in_date: dateString,
              check_in_time: null,
              check_out_time: null,
              duration_minutes: 0,
              break_time_minutes: 0,
              work_duration_minutes: 0,
              status: 'absent',
              check_in_location_id: null,
              check_out_location_id: null,
              check_in_method: null,
              check_out_method: null,
              is_late: false,
              is_early_departure: false,
              is_regularized: false,
              overtime_minutes: 0,
              notes: 'Absent without notice',
              created_by: empId,
              updated_by: empId,
              created_at: new Date(),
              updated_at: new Date(),
            });
          } else {
            const checkInDate = new Date(year, monthZeroIndex, day, checkInHour, checkInMin, 0);
            const checkOutDate = new Date(checkInDate.getTime() + durationHours * 3600 * 1000);
            const totalDurationMin = Math.round(durationHours * 60);

            records.push({
              uuid: uuidv4(),
              organization_id: orgId,
              employee_id: empId,
              check_in_date: dateString,
              check_in_time: checkInDate.toISOString(),
              check_out_time: checkOutDate.toISOString(),
              duration_minutes: totalDurationMin,
              break_time_minutes: 45,
              work_duration_minutes: totalDurationMin - 45,
              status,
              check_in_location_id: day % 2 === 0 ? 1 : 2,
              check_out_location_id: day % 2 === 0 ? 1 : 2,
              check_in_method: method,
              check_out_method: method,
              is_late: isLate,
              is_early_departure: false,
              is_regularized: false,
              overtime_minutes: 0,
              notes: `Marked via ${method.toUpperCase()}`,
              created_by: empId,
              updated_by: empId,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        }
      }
      return records;
    };

    // Generate July 2026 (month index 6) and June 2026 (month index 5) records
    const julyRecords = generateMonthRecords(2026, 6);
    const juneRecords = generateMonthRecords(2026, 5);
    const allRecords = [...julyRecords, ...juneRecords];

    // Clear existing records for test dates to avoid duplicates
    await db('attendance_records')
      .where('employee_id', empId)
      .whereIn(
        'check_in_date',
        allRecords.map((r) => r.check_in_date)
      )
      .del();

    // Insert in chunks of 50
    for (let i = 0; i < allRecords.length; i += 50) {
      const chunk = allRecords.slice(i, i + 50);
      await db('attendance_records').insert(chunk);
    }

    console.log(`✅ Successfully seeded ${allRecords.length} attendance records for July 2026 & June 2026!\n`);
  } catch (error) {
    console.error('❌ Attendance seed failed:', error);
  }
}

seedAttendanceData().then(() => process.exit(0));
