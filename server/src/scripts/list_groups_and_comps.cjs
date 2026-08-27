const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function listCurrentGroupsAndComps() {
  console.log('=== CURRENT COMPONENT GROUPS ===');
  const groups = await db('payroll_component_groups').select('*');
  console.log(groups);

  console.log('\n=== CURRENT COMPONENT DEFINITIONS ===');
  const comps = await db('payroll_component_definitions').select('*');
  for (const c of comps) {
    console.log(`ID: ${c.id}, GroupId: ${c.group_id}, Name: "${c.name}", Type: ${c.component_type}, Amount: ${c.amount}, Formula: "${c.formula}"`);
  }
  await db.destroy();
}

listCurrentGroupsAndComps().catch(console.error);
