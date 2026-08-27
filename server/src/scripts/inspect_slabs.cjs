const mysql = require('mysql2/promise');

async function inspectSlabs() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  console.log('=== INSPECTING PAYROLL SLABS FOR ORG 8 ===\n');

  const [slabs] = await conn.query('SELECT * FROM payroll_slabs WHERE organization_id = ? AND deleted_at IS NULL', [orgId]);
  console.log('Total Slabs:', slabs.length);

  const [allComps] = await conn.query(
    'SELECT c.id, c.name, c.component_type, c.amount, c.formula, c.is_active, g.name as group_name, g.category, g.contributed_by ' +
    'FROM payroll_components c ' +
    'JOIN payroll_component_groups g ON c.group_id = g.id ' +
    'WHERE c.organization_id = ? AND c.deleted_at IS NULL ' +
    'ORDER BY g.category ASC, g.id ASC, c.id ASC',
    [orgId]
  );

  const compMap = new Map();
  allComps.forEach(c => compMap.set(c.id, c));

  for (const s of slabs) {
    console.log('\n--------------------------------------------------');
    console.log(`📌 Slab ID: ${s.id} | Name: "${s.name}" | Active: ${s.is_active}`);
    console.log(`   Min CTC: ₹${s.min_ctc || 0} | Max CTC: ₹${s.max_ctc || 0}`);
    let compIds = [];
    try {
      compIds = typeof s.selected_component_ids === 'string' ? JSON.parse(s.selected_component_ids) : (s.selected_component_ids || []);
    } catch(e) {
      compIds = [];
    }
    console.log(`   Attached Components Count: ${compIds.length}`);
    
    console.log('   Attached Component Details:');
    compIds.forEach(id => {
      const c = compMap.get(id);
      if (c) {
        console.log(`     [${c.category.toUpperCase()}] ID ${c.id}: ${c.name} (${c.group_name}) | Type: ${c.component_type} | Active: ${c.is_active}`);
      } else {
        console.log(`     [UNKNOWN / REMOVED] ID ${id}`);
      }
    });
  }

  await conn.end();
  process.exit(0);
}

inspectSlabs().catch(err => {
  console.error(err);
  process.exit(1);
});
