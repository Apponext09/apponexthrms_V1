const mysql = require('mysql2/promise');
const fs = require('fs');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: 'root123', database: 'health',
    multipleStatements: true
  });

  const sql = fs.readFileSync(
    'C:/Users/Samarth/OneDrive/Documents/Desktop/apponexthrms/database/patch_payroll_restructure.sql',
    'utf8'
  );

  await conn.query(sql);
  console.log('Restructure applied!');

  const [rows] = await conn.query(
    'SELECT pcg.display_order as ord, pcg.category, pcg.name as grp, pc.name as comp, pc.component_type, pc.formula, pc.amount ' +
    'FROM payroll_components pc ' +
    'JOIN payroll_component_groups pcg ON pc.group_id = pcg.id ' +
    'WHERE pc.organization_id = 8 ORDER BY pcg.display_order, pc.id'
  );

  console.log('\n--- FINAL STRUCTURE ---');
  let lastCat = '';
  rows.forEach(function(r) {
    if (r.category !== lastCat) {
      console.log('\n  [' + r.category.toUpperCase() + 'S]');
      lastCat = r.category;
    }
    const val = r.formula ? 'formula: ' + r.formula : 'amount: ' + r.amount;
    console.log('  ' + String(r.ord).padEnd(3) + r.grp.padEnd(36) + r.component_type.padEnd(10) + val);
  });

  const [slabs] = await conn.query(
    'SELECT id, name, selected_component_ids FROM payroll_slabs WHERE organization_id = 8'
  );
  console.log('\n--- SLABS LINKED ---');
  slabs.forEach(function(s) {
    const ids = JSON.parse(s.selected_component_ids || '[]');
    console.log('  Slab: ' + s.name + ' → ' + ids.length + ' components linked');
  });

  await conn.end();
  console.log('\n✅ Done.');
}

main().catch(function(e) { console.error('ERROR:', e.message); process.exit(1); });
