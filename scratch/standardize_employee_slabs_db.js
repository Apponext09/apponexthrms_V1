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

async function standardize() {
  const slabs = await db('payroll_slabs').select('id', 'name');
  console.log('Available slabs:', slabs);

  // Standardize structure_name according to slab_id
  for (const slab of slabs) {
    const updated = await db('salary_structures')
      .where('slab_id', slab.id)
      .update({ structure_name: slab.name });
    console.log(`Updated ${updated} rows for slab ${slab.name} (ID: ${slab.id})`);
  }

  // Update rows where slab_id is null or 0 to default to slab 1 (Standard Monthly Slab)
  const defaultSlab = slabs.find(s => s.id === 1) || slabs[0];
  if (defaultSlab) {
    const updatedNull = await db('salary_structures')
      .whereNull('slab_id')
      .orWhere('slab_id', 0)
      .update({ slab_id: defaultSlab.id, structure_name: defaultSlab.name });
    console.log(`Updated ${updatedNull} rows with null slab to ${defaultSlab.name}`);
  }

  // Update any 0 CTC employees to have a valid standard CTC
  const zeroCtc = await db('salary_structures')
    .where('annual_ctc', '<=', 0)
    .update({ annual_ctc: 480000, gross_monthly: 40000, basic_monthly: 20000, hra_monthly: 8000 });
  console.log(`Updated ${zeroCtc} rows with 0 CTC to standard CTC`);

  // Verify all structures
  const finalStructs = await db('salary_structures')
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
  console.log('\nFINAL STANDARDIZED STRUCTURES:');
  console.table(finalStructs);

  await db.destroy();
}

standardize().catch(console.error);
