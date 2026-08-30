import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

import { getKnex } from '../../server/src/db/knex';
import { v4 as uuidv4 } from 'uuid';

async function seedAttendanceRecords() {
  console.log('🚀 Starting Attendance Records Seeder...');

  const db = getKnex();

  try {
    // Get default admin user to satisfy created_by FK constraint
    const defaultUser = await db('users').first();
    if (!defaultUser) {
      console.error('❌ No user found in users table for foreign key constraint.');
      process.exit(1);
    }
    const adminUserId = defaultUser.id;

    // 1. Get all active employees in DB
    const employees = await db('employees').whereNull('deleted_at');
    console.log(`📋 Found ${employees.length} active employees to seed attendance for.`);

    if (employees.length === 0) {
      console.log('⚠️ No employees found in database. Please seed employees first.');
      process.exit(0);
    }

    // 2. Define Date Range (e.g. 2026-07-01 to 2026-08-15)
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-08-15');

    const dateList = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
      dateList.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    console.log(`📅 Seeding records across ${dateList.length} days (${dateList[0]} to ${dateList[dateList.length - 1]})...`);

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const emp of employees) {
      const empId = Number(emp.id);
      const orgId = Number(emp.organization_id || emp.organizationId || 14);
      const companyId = emp.company_id || emp.companyId || null;

      // Find user matching this employee if possible, otherwise use adminUserId
      const empUser = await db('users').where('employee_id', empId).first();
      const createdById = empUser?.id || adminUserId;

      for (const dateStr of dateList) {
        const parts = dateStr.split('-').map(Number);
        const dObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
        const dayOfWeek = dObj.getDay(); // 0 = Sunday, 6 = Saturday

        let status = 'present';
        let checkInTime = null;
        let checkOutTime = null;
        let durationMins = 0;
        let breakMins = 0;
        let workMins = 0;
        let isLate = 0;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Weekend
          status = 'weekly_off';
        } else {
          // Weekday - vary status randomly per employee & date
          const seedRand = (empId * 31 + parts[2] * 7 + parts[1] * 3) % 100;
          if (seedRand < 75) {
            status = 'present';
            const checkInHour = 9;
            const checkInMin = seedRand % 3 === 0 ? 45 : (seedRand % 20); // 15% chance of being late
            isLate = checkInMin >= 30 ? 1 : 0;

            checkInTime = `${dateStr} ${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00`;
            checkOutTime = `${dateStr} 18:30:00`;

            durationMins = (18 - checkInHour) * 60 + (30 - checkInMin);
            breakMins = 60;
            workMins = Math.max(0, durationMins - breakMins);
          } else if (seedRand < 85) {
            status = 'half_day';
            checkInTime = `${dateStr} 09:30:00`;
            checkOutTime = `${dateStr} 14:00:00`;
            durationMins = 270;
            breakMins = 30;
            workMins = 240;
          } else if (seedRand < 92) {
            status = 'on_leave';
          } else {
            status = 'absent';
          }
        }

        // Check if record exists for (employee_id, check_in_date)
        const existing = await db('attendance_records')
          .where({
            employee_id: empId,
            check_in_date: dateStr,
          })
          .first();

        if (existing) {
          await db('attendance_records')
            .where('id', existing.id)
            .update({
              organization_id: orgId,
              company_id: companyId,
              check_in_time: checkInTime,
              check_out_time: checkOutTime,
              duration_minutes: durationMins,
              break_time_minutes: breakMins,
              work_duration_minutes: workMins,
              status: status,
              is_late: isLate,
              updated_at: new Date(),
            });
          totalUpdated++;
        } else {
          await db('attendance_records').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            company_id: companyId,
            employee_id: empId,
            check_in_date: dateStr,
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            duration_minutes: durationMins,
            break_time_minutes: breakMins,
            work_duration_minutes: workMins,
            status: status,
            check_in_method: 'face_recognition',
            check_out_method: 'web_portal',
            is_late: isLate,
            is_early_departure: 0,
            is_regularized: 0,
            created_by: createdById,
            updated_by: createdById,
            created_at: new Date(),
            updated_at: new Date(),
          });
          totalCreated++;
        }
      }
    }

    console.log(`✅ Attendance Seeding Completed Successfully!`);
    console.log(`📊 Statistics: ${totalCreated} records created, ${totalUpdated} records updated.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during attendance seeding:', error);
    process.exit(1);
  }
}

seedAttendanceRecords();
