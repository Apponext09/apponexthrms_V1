const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function verifyLiveAttendanceInRegister() {
  console.log('--- Testing Attendance & Dynamic Calculation for Arham Employees (2026-08-01 to 2026-08-28) ---');
  
  const arhamEmps = await db('employees as e')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .where('e.company_id', 18)
    .whereNull('e.deleted_at')
    .select('e.id', 'e.first_name', 'e.last_name', 'ss.annual_ctc', 'ss.gross_monthly');

  for (const emp of arhamEmps) {
    const attRecs = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', ['2026-08-01', '2026-08-28'])
      .whereNull('deleted_at');

    let present = 0, half = 0, absent = 0, weeklyOff = 0;
    for (const r of attRecs) {
      if (r.status === 'present') present++;
      else if (r.status === 'half_day') half++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'weekly_off') weeklyOff++;
    }

    const paidDays = Math.round(present + (half * 0.5) + weeklyOff);
    const unpaidDays = 28 - paidDays;
    const ratio = paidDays / 28;
    const monthlyGross = Number(emp.gross_monthly || 0);
    const earnedGross = Math.round(monthlyGross * ratio);

    console.log(`- ${emp.first_name} ${emp.last_name} (ID: ${emp.id}):`);
    console.log(`  * Records: ${attRecs.length} | Present: ${present} | Half: ${half} | WeeklyOff: ${weeklyOff} | Absent: ${absent}`);
    console.log(`  * Paid Days: ${paidDays} / 28 | Unpaid: ${unpaidDays}`);
    console.log(`  * Monthly Gross: ₹${monthlyGross.toLocaleString()} | Earned Gross (Prorated): ₹${earnedGross.toLocaleString()}`);
  }

  await db.destroy();
}

verifyLiveAttendanceInRegister().catch(console.error);
