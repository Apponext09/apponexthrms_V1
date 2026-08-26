const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkEmp115() {
  const emp = await db('employees').where('id', 115).first();
  console.log('Employee 115:');
  console.log(JSON.stringify(emp, null, 2));

  const ess = await db('employee_salary_structures').where('employee_id', 115);
  console.log('Employee Salary Structures (ESS):');
  console.log(JSON.stringify(ess, null, 2));

  const ss = await db('salary_structures').where('employee_id', 115);
  console.log('Salary Structures (SS):');
  console.log(JSON.stringify(ss, null, 2));

  const overrides = await db('payroll_register_overrides').where('employee_id', 115);
  console.log('Payroll Register Overrides:');
  console.log(JSON.stringify(overrides, null, 2));

  await db.destroy();
}

checkEmp115().catch(console.error);
