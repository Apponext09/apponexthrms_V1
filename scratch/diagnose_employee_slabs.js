const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponext_hrms',
  }
});

async function runDiagnostic() {
  console.log('=== 1. PAYROLL SLABS IN DATABASE ===');
  const slabs = await db('payroll_slabs').select('id', 'name', 'organization_id');
  console.log(slabs);

  console.log('\n=== 2. EMPLOYEES AND SLAB COLUMNS ===');
  const employees = await db('employees')
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'employee_code', 'department_id', 'designation_id', 'annual_ctc')
    .limit(20);
  console.log(`Found ${employees.length} active employees:`);
  console.log(employees);

  console.log('\n=== 3. SALARY STRUCTURES IN DATABASE ===');
  const structures = await db('salary_structures')
    .select('id', 'employee_id', 'slab_id', 'structure_name', 'annual_ctc', 'gross_monthly', 'is_active');
  console.log(structures);

  console.log('\n=== 4. CHECK IF employee_salary_structures TABLE EXISTS ===');
  const hasEmpSalaryStruct = await db.schema.hasTable('employee_salary_structures');
  console.log('employee_salary_structures exists:', hasEmpSalaryStruct);
  if (hasEmpSalaryStruct) {
    const empStructs = await db('employee_salary_structures').select('*').limit(20);
    console.log(empStructs);
  }

  console.log('\n=== 5. CHECK COLUMNS IN employees TABLE ===');
  const empColumns = await db('employees').columnInfo();
  console.log('Slab/salary related columns in employees:', Object.keys(empColumns).filter(c => c.includes('slab') || c.includes('ctc') || c.includes('salary') || c.includes('payroll')));

  console.log('\n=== 6. CHECK COLUMNS IN salary_structures TABLE ===');
  const structColumns = await db('salary_structures').columnInfo();
  console.log('Columns in salary_structures:', Object.keys(structColumns));

  await db.destroy();
}

runDiagnostic().catch(err => {
  console.error(err);
  process.exit(1);
});
