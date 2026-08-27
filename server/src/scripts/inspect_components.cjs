const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function inspectPayrollComponents() {
  const groups = await db('payroll_component_groups')
    .where('organization_id', 8)
    .whereNull('deleted_at')
    .orderBy('display_order', 'asc');

  console.log(`=== COMPONENT GROUPS IN ORG 8 (${groups.length}) ===`);
  for (const g of groups) {
    console.log(`[Group #${g.id}] "${g.name}" | Category: ${g.category} | GroupForPayslip: ${g.group_for_payslip} | Order: ${g.display_order}`);
  }

  const components = await db('payroll_components')
    .where('organization_id', 8)
    .whereNull('deleted_at')
    .orderBy('id', 'asc');

  console.log(`\n=== COMPONENTS IN ORG 8 (${components.length}) ===`);
  for (const c of components) {
    console.log(`[Comp #${c.id}] "${c.name}" (Code: ${c.code}) | GroupId: ${c.group_id} | Type: ${c.type} | Amount: ${c.amount} | Formula: "${c.formula}" | ModuleSource: ${c.module_source} | Active: ${c.is_active}`);
  }

  const slabs = await db('payroll_slabs')
    .where('organization_id', 8)
    .whereNull('deleted_at');

  console.log(`\n=== PAY SLABS IN ORG 8 (${slabs.length}) ===`);
  for (const s of slabs) {
    console.log(`[Slab #${s.id}] "${s.name}" | Min: ₹${s.min_ctc} | Max: ₹${s.max_ctc} | Selected Components: ${s.selected_component_ids}`);
  }

  await db.destroy();
}

inspectPayrollComponents().catch(console.error);
