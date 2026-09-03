const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function verifyArhamFilter() {
  const emps = await db('employees as e')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .where('e.organization_id', 8)
    .where('e.company_id', 18)
    .whereNull('e.deleted_at')
    .select('e.id', 'e.first_name', 'e.last_name', 'ss.annual_ctc', 'ss.gross_monthly', 'ss.net_take_home');

  console.log(`Arham Filter Result (Total: ${emps.length} Employees):`);
  emps.forEach(e => {
    console.log(`- ${e.first_name} ${e.last_name} (ID: ${e.id}) | Annual CTC: ₹${Number(e.annual_ctc || 0).toLocaleString()} | Gross: ₹${Number(e.gross_monthly || 0).toLocaleString()} | Net: ₹${Number(e.net_take_home || 0).toLocaleString()}`);
  });

  await db.destroy();
}

verifyArhamFilter().catch(console.error);
