const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function inspectEmployees() {
  const emps = await db('employees as e')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .whereNull('e.deleted_at')
    .whereNull('ss.deleted_at')
    .select('e.id', 'e.first_name', 'e.last_name', 'e.company_id', 'ss.annual_ctc', 'ss.gross_monthly', 'ss.net_take_home')
    .orderBy('e.first_name', 'asc');

  console.log(`Total employees in DB: ${emps.length}`);
  console.log('Sample list of employees and their CTC:');
  emps.slice(0, 10).forEach(e => {
    console.log(`- ID: ${e.id} | Name: ${e.first_name} ${e.last_name} | Company ID: ${e.company_id} | CTC: ₹${Number(e.annual_ctc || 0).toLocaleString()} | Net: ₹${Number(e.net_take_home || 0).toLocaleString()}`);
  });

  const arhamEmps = emps.filter(e => e.company_id === 18);
  console.log(`\nEmployees belonging to Arham (Company 18) [Total: ${arhamEmps.length}]:`);
  arhamEmps.forEach(e => {
    console.log(`- ID: ${e.id} | Name: ${e.first_name} ${e.last_name} | CTC: ₹${Number(e.annual_ctc || 0).toLocaleString()}`);
  });

  await db.destroy();
}

inspectEmployees().catch(console.error);
