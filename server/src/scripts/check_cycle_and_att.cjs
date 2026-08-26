const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkCycle13() {
  const cycle = await db('payroll_cycles').where('id', 13).first();
  console.log('Cycle 13:', {
    id: cycle.id,
    cycle_name: cycle.cycle_name,
    calculation_start_day: cycle.calculation_start_day,
    cutoff_day: cycle.cutoff_day,
    total_days_calc: cycle.total_days_calc
  });

  const emps = await db('employees').where('company_id', 18).whereNull('deleted_at');
  console.log(`Found ${emps.length} employees in Company 18 (Arham).`);

  for (const emp of emps) {
    const att = await db('attendance_records')
      .where('employee_id', emp.id)
      .whereBetween('check_in_date', ['2026-08-01', '2026-08-28']);
    console.log(`Emp ${emp.id} (${emp.first_name} ${emp.last_name}): ${att.length} attendance records`);
  }

  await db.destroy();
}

checkCycle13().catch(console.error);
