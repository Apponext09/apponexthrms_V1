const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkOldPayslipsInDb() {
  const slips = await db('payslips').select('*');
  console.log(`Found ${slips.length} payslips in database:`);
  for (const s of slips) {
    console.log(`Payslip #${s.id}: Emp ${s.employee_id}, Month ${s.month}, Gross ${s.gross_salary}, Net ${s.net_salary}, RunId ${s.payroll_run_id}`);
  }
  await db.destroy();
}

checkOldPayslipsInDb().catch(console.error);
