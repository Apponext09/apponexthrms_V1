const knex = require('knex');
const crypto = require('crypto');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function seedOrgAttendanceAndStructures() {
  console.log('--- Synchronizing Live Attendance & Salary Structures for ALL Employees in Org 8 ---');

  const u = await db('users').where('organization_id', 8).first();
  const userId = u ? u.id : 32;

  const emps = await db('employees').where('organization_id', 8).whereNull('deleted_at');
  console.log(`Processing ${emps.length} employees across all companies in Org 8 with userId ${userId}.`);

  // 1. Ensure Pay Slab 2 has all 19 active components
  const allComps = await db('payroll_components').where('organization_id', 8).where('is_active', 1).select('id');
  const compIds = allComps.map(c => c.id);
  await db('payroll_slabs').where('id', 2).update({
    selected_component_ids: JSON.stringify(compIds),
    is_active: 1
  });

  // 2. Ensure each employee has an active salary structure linked to Slab 2
  for (const emp of emps) {
    const existing = await db('salary_structures').where('employee_id', emp.id).whereNull('deleted_at').first();
    if (!existing) {
      const gross = emp.id % 2 === 0 ? 50000 : 45000;
      await db('salary_structures').insert({
        uuid: crypto.randomUUID(),
        organization_id: 8,
        company_id: emp.company_id || 4,
        employee_id: emp.id,
        slab_id: 2,
        cycle_id: 13,
        structure_code: `SS-${emp.id}`,
        structure_name: 'Monthly Structure',
        gross_monthly: gross,
        annual_ctc: gross * 12,
        effective_from: '2026-01-01',
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`Created active salary structure for Emp ${emp.id} (${emp.first_name} ${emp.last_name}): Gross ₹${gross}`);
    }
  }

  // 3. Populate 28-day dynamic attendance for all employees between 2026-08-01 and 2026-08-28
  const loc = await db('attendance_locations').first();
  const locId = loc ? loc.id : 1;

  for (const emp of emps) {
    const existingCount = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
      .count('* as c');
    
    if (Number(existingCount[0].c) < 28) {
      await db('attendance_records')
        .where('employee_id', emp.id)
        .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
        .del();

      const recordsToInsert = [];
      for (let day = 1; day <= 28; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `2026-08-${dayStr}`;
        const dayOfWeek = new Date(`2026-08-${dayStr}`).getDay(); // 0 = Sunday

        let status = 'present';
        let checkIn = '09:30:00';
        let checkOut = '18:30:00';
        let workDuration = 540;

        if (dayOfWeek === 0) {
          status = 'weekly_off';
          checkIn = null;
          checkOut = null;
          workDuration = 0;
        } else if (day === 12 && emp.id % 2 === 1) {
          status = 'half_day';
          checkIn = '09:30:00';
          checkOut = '14:00:00';
          workDuration = 270;
        } else if (day === 20 && emp.id % 3 === 0) {
          status = 'absent';
          checkIn = null;
          checkOut = null;
          workDuration = 0;
        }

        recordsToInsert.push({
          organization_id: 8,
          company_id: emp.company_id || 4,
          employee_id: emp.id,
          check_in_date: dateStr,
          check_in_time: checkIn,
          check_out_time: checkOut,
          status: status,
          duration_minutes: workDuration,
          work_duration_minutes: workDuration,
          check_in_location_id: locId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      await db('attendance_records').insert(recordsToInsert);
      console.log(`Seeded 28 attendance records for Emp ${emp.id} (${emp.first_name} ${emp.last_name})`);
    }
  }

  console.log('--- ALL ATTENDANCE & STRUCTURES SYNCHRONIZED SUCCESSFULLY ---');
  await db.destroy();
}

seedOrgAttendanceAndStructures().catch(console.error);
