const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function seedAttendanceSafe() {
  const loc = await db('attendance_locations').where('organization_id', 8).first();
  const validLocId = loc ? loc.id : null;
  console.log('Using valid location ID:', validLocId);

  const arhamEmps = await db('employees').where('company_id', 18).whereNull('deleted_at');
  const empIds = arhamEmps.map(e => e.id);
  
  await db('attendance_records')
    .whereIn('employee_id', empIds)
    .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
    .del();

  const newRecords = [];
  const pad = n => String(n).padStart(2, '0');

  for (let day = 1; day <= 28; day++) {
    const dateStr = `2026-08-${pad(day)}`;
    const d = new Date(2026, 7, day);
    const dayOfWeek = d.getDay(); // 0 is Sunday

    for (const emp of arhamEmps) {
      let status = 'present';
      let workMins = 540;
      let checkInTime = `${dateStr} 09:30:00`;
      let checkOutTime = `${dateStr} 18:30:00`;

      if (dayOfWeek === 0) {
        status = 'weekly_off';
        workMins = 0;
        checkInTime = null;
        checkOutTime = null;
      } else if (emp.id === 115 && day === 12) {
        status = 'half_day';
        workMins = 270;
        checkInTime = `${dateStr} 09:30:00`;
        checkOutTime = `${dateStr} 14:00:00`;
      } else if (emp.id === 115 && day === 20) {
        status = 'absent';
        workMins = 0;
        checkInTime = null;
        checkOutTime = null;
      } else if (emp.id === 116 && day === 14) {
        status = 'half_day';
        workMins = 270;
      } else if (emp.id === 117 && day === 18) {
        status = 'absent';
        workMins = 0;
      }

      newRecords.push({
        uuid: uuidv4(),
        organization_id: 8,
        company_id: 18,
        employee_id: emp.id,
        check_in_date: dateStr,
        check_in_time: checkInTime ? new Date(checkInTime) : null,
        check_out_time: checkOutTime ? new Date(checkOutTime) : null,
        duration_minutes: workMins,
        break_time_minutes: 0,
        work_duration_minutes: workMins,
        status: status,
        check_in_location_id: validLocId,
        check_out_location_id: validLocId,
        check_in_method: 'web',
        check_out_method: 'web',
        is_late: 0,
        is_early_departure: 0,
        is_regularized: 0,
        overtime_minutes: 0,
        created_by: 10,
        updated_by: 10,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  for (let i = 0; i < newRecords.length; i += 50) {
    await db('attendance_records').insert(newRecords.slice(i, i + 50));
  }

  console.log(`Successfully seeded ${newRecords.length} attendance records for ${arhamEmps.length} Arham employees!`);
  await db.destroy();
}

seedAttendanceSafe().catch(console.error);
