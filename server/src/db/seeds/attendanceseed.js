const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function seedAttendanceData() {
  try {
    console.log('🚀 Initializing database connection for attendance seed (JS)...');
    const db = knex({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'apponexthrms',
        charset: 'utf8mb4',
      },
    });

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

    const org = await db('organizations').first();
    const orgId = org ? org.id : 1;

    const emp = await db('users').first();
    const empId = emp ? emp.id : 1;

    console.log(`👤 Seeding attendance for Organization ID: ${orgId}, Employee ID: ${empId}...`);

    const generateMonthRecords = (year, monthZeroIndex) => {
      const records = [];
      const daysInMonth = new Date(year, monthZeroIndex + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, monthZeroIndex, day);
        const dayOfWeek = dateObj.getDay();
        const monthStr = String(monthZeroIndex + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateString = `${year}-${monthStr}-${dayStr}`;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
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

    const julyRecords = generateMonthRecords(2026, 6);
    const juneRecords = generateMonthRecords(2026, 5);
    const allRecords = [...julyRecords, ...juneRecords];

    await db('attendance_records')
      .where('employee_id', empId)
      .whereIn(
        'check_in_date',
        allRecords.map((r) => r.check_in_date)
      )
      .del();

    for (let i = 0; i < allRecords.length; i += 50) {
      const chunk = allRecords.slice(i, i + 50);
      await db('attendance_records').insert(chunk);
    }

    console.log(`✅ Successfully seeded ${allRecords.length} attendance records for July 2026 & June 2026!\n`);
    await db.destroy();
  } catch (error) {
    console.error('❌ Attendance seed JS failed:', error);
  }
}

seedAttendanceData().then(() => process.exit(0));
