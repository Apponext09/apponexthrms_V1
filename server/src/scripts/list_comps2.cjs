const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function listAndSeedComponents() {
  const existing = await db('payroll_components').select('*');
  console.log('=== EXISTING COMPONENTS ===');
  console.log('Total:', existing.length);
  existing.forEach(c => {
    console.log(`ID:${c.id} GrpId:${c.group_id} OrgId:${c.organization_id} Name:"${c.name}" Type:${c.component_type} Amt:${c.amount} Formula:"${c.formula || ''}"`);
  });

  // Find Org 8's groups (IDs 1-5)
  const org8Groups = await db('payroll_component_groups').where('organization_id', 8).select('*');
  console.log('\n=== ORG 8 GROUPS ===');
  org8Groups.forEach(g => console.log(`ID:${g.id} Name:"${g.name}" Category:"${g.category}"`));

  await db.destroy();
}

listAndSeedComponents().catch(e => { console.error(e.message); process.exit(1); });
