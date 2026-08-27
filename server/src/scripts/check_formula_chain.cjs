const mysql = require('mysql2/promise');

async function checkFormulas() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',password:'root123',database:'health'});
  const orgId = 8;

  const [derived] = await conn.query(
    "SELECT id, name, formula FROM payroll_components WHERE organization_id = ? AND component_type = 'Derived' AND is_active = 1 AND deleted_at IS NULL ORDER BY id",
    [orgId]
  );

  console.log('\n=== ALL ACTIVE DERIVED FORMULAS ===');
  derived.forEach(c => console.log(`  ID ${c.id}: ${c.name}\n         -> ${c.formula}\n`));

  // Check ESIC specifically
  const [esic] = await conn.query(
    "SELECT id, name, formula, module_source, component_type, based_on_attendance FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL AND (name LIKE '%ESIC%' OR name LIKE '%ESI%')",
    [orgId]
  );
  console.log('\n=== ESIC COMPONENTS ===');
  esic.forEach(c => console.log(`  ID ${c.id}: ${c.name} | type:${c.component_type} | formula:${c.formula} | module:${c.module_source} | att:${c.based_on_attendance}`));

  // Check PF components
  const [pf] = await conn.query(
    "SELECT id, name, formula, module_source, component_type, based_on_attendance FROM payroll_components WHERE organization_id = ? AND is_active = 1 AND deleted_at IS NULL AND (name LIKE '%PF%' OR name LIKE '%Provident%' OR name LIKE '%EPS%' OR name LIKE '%EPF%')",
    [orgId]
  );
  console.log('\n=== PF/EPF/EPS COMPONENTS ===');
  pf.forEach(c => console.log(`  ID ${c.id}: ${c.name} | type:${c.component_type} | formula:${c.formula} | module:${c.module_source}`));

  // Check groups with display_order
  const [groups] = await conn.query(
    'SELECT id, name, category, display_order FROM payroll_component_groups WHERE organization_id = ? AND deleted_at IS NULL ORDER BY display_order ASC, id ASC',
    [orgId]
  );
  console.log('\n=== GROUP DISPLAY ORDER ===');
  groups.forEach(g => console.log(`  order:${g.display_order} | ID:${g.id} | ${g.category} - ${g.name}`));

  await conn.end();
  process.exit(0);
}

checkFormulas().catch(e => { console.error(e); process.exit(1); });
