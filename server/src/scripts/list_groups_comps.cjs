const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function run() {
  const groups = await db('payroll_component_groups').select('*');
  console.log('=== GROUPS ===');
  for (const g of groups) {
    console.log(`ID:${g.id} Name:"${g.name}" Category:"${g.category}" OrgId:${g.organization_id}`);
  }

  // Try different possible table names
  let comps = [];
  for (const tbl of ['pay_component_definitions', 'payroll_components', 'salary_components']) {
    try {
      comps = await db(tbl).select('*');
      console.log(`\n=== COMPONENTS (from ${tbl}) ===`);
      break;
    } catch (e) { continue; }
  }

  for (const c of comps) {
    console.log(`ID:${c.id} GrpId:${c.group_id} Name:"${c.name}" Type:${c.component_type || c.type} Amt:${c.amount} Formula:"${c.formula || ''}"`);
  }

  await db.destroy();
}

run().catch(e => { console.error(e.message); process.exit(1); });
