const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function fixAllSalaryStructureSlabs() {
  console.log('=== STANDARDIZING ALL SALARY STRUCTURES TO MONTHLY SLAB 2 ===');

  const updated = await db('salary_structures')
    .whereNull('deleted_at')
    .update({
      slab_id: 2,
      structure_name: 'Monthly'
    });

  console.log(`Updated ${updated} salary structures in database to slab_id: 2, structure_name: 'Monthly'.`);

  // Verify
  const structs = await db('salary_structures').select('id', 'employee_id', 'slab_id', 'structure_name', 'gross_monthly');
  for (const s of structs) {
    console.log(`Structure ID: ${s.id} -> EmpId: ${s.employee_id}, Slab ID: ${s.slab_id}, Slab Name: ${s.structure_name}, Gross: ₹${s.gross_monthly}`);
  }

  await db.destroy();
}

fixAllSalaryStructureSlabs().catch(console.error);
