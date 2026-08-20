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
  console.log('=== SALARY STRUCTURES TABLE ===');
  const structs = await db('salary_structures')
    .leftJoin('employees', 'salary_structures.employee_id', 'employees.id')
    .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
    .select(
      'salary_structures.id as structure_id',
      'salary_structures.employee_id',
      'employees.first_name',
      'employees.last_name',
      'employees.employee_code',
      'salary_structures.slab_id',
      'salary_structures.structure_name',
      'payroll_slabs.name as slab_table_name',
      'salary_structures.annual_ctc',
      'salary_structures.gross_monthly',
      'salary_structures.is_active'
    );
  console.log(structs);

  console.log('\n=== ALL ACTIVE EMPLOYEES WITHOUT SALARY STRUCTURE ===');
  const unassignedEmps = await db('employees')
    .leftJoin('salary_structures', 'employees.id', 'salary_structures.employee_id')
    .whereNull('employees.deleted_at')
    .whereNull('salary_structures.id')
    .select('employees.id', 'employees.first_name', 'employees.last_name', 'employees.employee_code');
  console.log('Unassigned count:', unassignedEmps.length);
  console.log(unassignedEmps);

  await db.destroy();
}

runDiagnostic().catch(err => {
  console.error(err);
  process.exit(1);
});
