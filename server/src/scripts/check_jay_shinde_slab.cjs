const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function checkJayShindeSlab() {
  console.log('=== CHECKING SALARY STRUCTURES AND SLABS ===');
  const slabs = await db('payroll_slabs').select('id', 'name', 'organization_id');
  console.log('Available Slabs in DB:', slabs);

  const structs = await db('salary_structures').where('employee_id', 50).orWhere('id', '>', 0);
  console.log(`Found ${structs.length} salary structure records:`);
  for (const s of structs) {
    console.log(`Structure ID: ${s.id}, EmpId: ${s.employee_id}, slab_id: ${s.slab_id}, structure_name: ${s.structure_name}, template_name: ${s.template_name}, gross: ${s.gross_monthly}`);
  }
  await db.destroy();
}

checkJayShindeSlab().catch(console.error);
