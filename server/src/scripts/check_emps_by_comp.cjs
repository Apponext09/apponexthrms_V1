const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkEmpByCompany() {
  const emps = await db('employees')
    .where('organization_id', 8)
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'company_id', 'status');
  
  console.log('Employees grouped by company_id:');
  const grouped = {};
  for (const e of emps) {
    grouped[e.company_id] = grouped[e.company_id] || [];
    grouped[e.company_id].push({ id: e.id, name: `${e.first_name} ${e.last_name}`, status: e.status });
  }
  console.log(JSON.stringify(grouped, null, 2));

  await db.destroy();
}

checkEmpByCompany().catch(console.error);
