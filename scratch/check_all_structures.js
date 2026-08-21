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

async function checkAllStructures() {
  const slabs = await db('payroll_slabs').select('id', 'name');
  const slabMap = {};
  for (const s of slabs) {
    slabMap[s.id] = s.name;
  }
  console.log('SLAB MAP:', slabMap);

  const structures = await db('salary_structures')
    .leftJoin('employees', 'salary_structures.employee_id', 'employees.id')
    .select(
      'salary_structures.id',
      'salary_structures.employee_id',
      'employees.first_name',
      'employees.last_name',
      'employees.employee_code',
      'salary_structures.structure_name',
      'salary_structures.slab_id',
      'salary_structures.annual_ctc'
    );
  console.log('STRUCTURES:');
  console.table(structures);

  // Check all active employees without a structure
  const activeEmps = await db('employees')
    .whereNull('deleted_at')
    .select('id', 'first_name', 'last_name', 'employee_code');

  const assignedEmpIds = new Set(structures.map(s => s.employee_id).filter(Boolean));
  const unassigned = activeEmps.filter(e => !assignedEmpIds.has(e.id));
  console.log('UNASSIGNED ACTIVE EMPLOYEES:');
  console.table(unassigned);

  await db.destroy();
}

checkAllStructures().catch(console.error);
