const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function seedAttendanceAndSlab() {
  console.log('--- Step 1: Updating Pay Slab with all 19 active components ---');
  const allComps = await db('payroll_components').where('is_active', 1).whereNull('deleted_at');
  const allCompIds = allComps.map(c => c.id);
  console.log(`Found ${allComps.length} active components:`, allCompIds);

  await db('payroll_slabs')
    .where('id', 2)
    .update({
      selected_component_ids: JSON.stringify(allCompIds),
      updated_at: new Date()
    });
  console.log('Updated Slab ID: 2 with all component IDs');

  console.log('\n--- Step 2: Populating August 2026 Attendance Records for Arham Employees ---');
  const arhamEmps = await db('employees').where('company_id', 18).whereNull('deleted_at');
  
  // Clean existing attendance for these 10 emps in Aug 2026
  const empIds = arhamEmps.map(e => e.id);
  await db('attendance_records')
    .whereIn('employee_id', empIds)
    .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
    .del();

  const newRecords = [];
  const pad = n => String(n).padStart(2, '0');

  // Days from 1 to 28 of August 2026
  for (let day = 1; day <= 28; day++) {
    const dateStr = `2026-08-${pad(day)}`;
    const d = new Date(2026, 7, day); // month 7 is August
    const dayOfWeek = d.getDay(); // 0 is Sunday

    for (const emp of arhamEmps) {
      let status = 'present';
      let workMins = 540;
      let checkInTime = `${dateStr} 09:30:00`;
      let checkOutTime = `${dateStr} 18:30:00`;

      if (dayOfWeek === 0) {
        // Sunday
        status = 'weekly_off';
        workMins = 0;
        checkInTime = null;
        checkOutTime = null;
      } else if (emp.id === 115 && day === 12) {
        // Half day for Aarav
        status = 'half_day';
        workMins = 270;
        checkInTime = `${dateStr} 09:30:00`;
        checkOutTime = `${dateStr} 14:00:00`;
      } else if (emp.id === 115 && day === 20) {
        // 1 absent day
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
        check_in_location_id: 33,
        check_out_location_id: 33,
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

  // Insert in chunks of 50
  for (let i = 0; i < newRecords.length; i += 50) {
    await db('attendance_records').insert(newRecords.slice(i, i + 50));
  }

  console.log(`Successfully inserted ${newRecords.length} attendance records for ${arhamEmps.length} employees (Aug 1 to Aug 28).`);

  await db.destroy();
}

seedAttendanceAndSlab().catch(console.error);
