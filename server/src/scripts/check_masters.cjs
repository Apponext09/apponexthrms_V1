const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkMasters() {
  const depts = await db('departments').where('organization_id', 8).whereNull('deleted_at');
  console.log('Departments in DB:', depts.map(d => ({ id: d.id, name: d.name, company_id: d.company_id })));

  const locs = await db('locations').where('organization_id', 8).whereNull('deleted_at');
  console.log('Locations in DB:', locs.map(l => ({ id: l.id, name: l.name })));

  const emps = await db('employees').where('organization_id', 8).whereNull('deleted_at').limit(10);
  console.log('Sample Employees in DB:', emps.map(e => ({ id: e.id, first_name: e.first_name, last_name: e.last_name, employee_code: e.employee_code, company_id: e.company_id })));

  await db.destroy();
}

checkMasters().catch(console.error);
