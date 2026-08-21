const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function runDiagnostic() {
  console.log('=== EMPLOYEES COLUMNS ===');
  const empCols = await db('employees').columnInfo();
  console.log(Object.keys(empCols));

  console.log('\n=== EMPLOYEES SAMPLE DATA ===');
  const emps = await db('employees')
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'employee_code', 'current_department_id', 'current_designation_id', 'salary_slab_id', 'payroll_slab_id', 'annual_ctc')
    .limit(20);
  console.log(emps);

  console.log('\n=== SALARY STRUCTURES ===');
  const structs = await db('salary_structures').select('*');
  console.log(structs);

  await db.destroy();
}

runDiagnostic().catch(err => {
  console.error(err);
  process.exit(1);
});
