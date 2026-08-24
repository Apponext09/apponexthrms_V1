const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkEmp115Register() {
  const ss = await db('salary_structures').where('employee_id', 115).first();
  console.log('Active structure for 115:', {
    annual_ctc: ss.annual_ctc,
    gross_monthly: ss.gross_monthly,
    basic_monthly: ss.basic_monthly,
    hra_monthly: ss.hra_monthly,
    special_allowance_monthly: ss.special_allowance_monthly
  });
  await db.destroy();
}

checkEmp115Register().catch(console.error);
