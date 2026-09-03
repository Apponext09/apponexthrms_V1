const mysql = require('mysql2/promise');

async function audit() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'health'
  });
  const orgId = 8;

  // ── 1. Duplicate Component Groups ──────────────────────────────────────────
  console.log('\n=== 1. DUPLICATE COMPONENT GROUPS ===');
  const [dupGroups] = await conn.query(
    'SELECT name, COUNT(*) as cnt FROM payroll_component_groups WHERE organization_id = ? AND deleted_at IS NULL GROUP BY name HAVING cnt > 1',
    [orgId]
  );
  console.log(dupGroups.length ? dupGroups : 'No duplicates found');

  // ── 2. Duplicate Components (same name + same group) ───────────────────────
  console.log('\n=== 2. DUPLICATE COMPONENTS (same name + group) ===');
  const [dupComps] = await conn.query(
    'SELECT name, group_id, COUNT(*) as cnt FROM payroll_components WHERE organization_id = ? AND deleted_at IS NULL GROUP BY name, group_id HAVING cnt > 1',
    [orgId]
  );
  if (dupComps.length) {
    for (const d of dupComps) {
      const [rows] = await conn.query(
        'SELECT id, name, is_active, component_type FROM payroll_components WHERE organization_id = ? AND group_id = ? AND name = ? AND deleted_at IS NULL',
        [orgId, d.group_id, d.name]
      );
      console.log('DUPLICATE:', d.name, '-> IDs:', rows.map(r => r.id), rows);
    }
  } else {
    console.log('No duplicates found');
  }

  // ── 3. Orphan Components (group deleted/missing) ────────────────────────────
  console.log('\n=== 3. ORPHAN COMPONENTS (group deleted/missing) ===');
  const [orphan] = await conn.query(
    'SELECT c.id, c.name FROM payroll_components c LEFT JOIN payroll_component_groups g ON c.group_id = g.id WHERE c.organization_id = ? AND c.deleted_at IS NULL AND (g.id IS NULL OR g.deleted_at IS NOT NULL)',
    [orgId]
  );
  console.log(orphan.length ? orphan : 'No orphan components');

  // ── 4. Active Derived components with empty formula ─────────────────────────
  console.log('\n=== 4. DERIVED COMPONENTS WITH EMPTY FORMULA ===');
  const [emptyFormula] = await conn.query(
    "SELECT id, name, component_type FROM payroll_components WHERE organization_id = ? AND component_type = 'Derived' AND (formula IS NULL OR formula = '') AND deleted_at IS NULL AND is_active = 1",
    [orgId]
  );
  console.log(emptyFormula.length ? emptyFormula : 'All active Derived components have formulas');

  // ── 5. Active Module components with empty/Choose module_source ────────────
  console.log('\n=== 5. MODULE COMPONENTS WITH EMPTY/CHOOSE MODULE SOURCE ===');
  const [emptyModule] = await conn.query(
    "SELECT id, name FROM payroll_components WHERE organization_id = ? AND component_type = 'Module' AND (module_source IS NULL OR module_source = '' OR module_source = 'Choose') AND deleted_at IS NULL AND is_active = 1",
    [orgId]
  );
  console.log(emptyModule.length ? emptyModule : 'All active Module components have module sources');

  // ── 6. Slab: inactive or deleted component IDs ─────────────────────────────
  console.log('\n=== 6. SLAB COMPONENT VALIDITY CHECK ===');
  const [slabs] = await conn.query(
    'SELECT id, name, selected_component_ids FROM payroll_slabs WHERE organization_id = ? AND is_active = 1',
    [orgId]
  );
  for (const s of slabs) {
    let ids = [];
    try { ids = JSON.parse(s.selected_component_ids || '[]'); } catch { ids = []; }
    if (ids.length > 0) {
      const [inactive] = await conn.query(
        'SELECT id, name FROM payroll_components WHERE id IN (?) AND is_active = 0 AND deleted_at IS NULL',
        [ids]
      );
      const [deleted] = await conn.query(
        'SELECT id, name FROM payroll_components WHERE id IN (?) AND deleted_at IS NOT NULL',
        [ids]
      );
      const allIds = ids;
      const [existing] = await conn.query(
        'SELECT id FROM payroll_components WHERE id IN (?)',
        [allIds]
      );
      const existingIds = existing.map(r => r.id);
      const missingIds = allIds.filter(id => !existingIds.includes(id));

      console.log(`\nSlab: "${s.name}" (ID: ${s.id}) - Total component IDs: ${ids.length}`);
      console.log(`  Inactive in slab:`, inactive.length ? inactive.map(r => `${r.id}:${r.name}`) : 'None');
      console.log(`  Deleted in slab: `, deleted.length ? deleted.map(r => `${r.id}:${r.name}`) : 'None');
      console.log(`  Missing (not in DB):`, missingIds.length ? missingIds : 'None');
    }
  }

  // ── 7. Duplicate component IDs in slab ─────────────────────────────────────
  console.log('\n=== 7. DUPLICATE COMPONENT IDs IN SLAB ===');
  for (const s of slabs) {
    let ids = [];
    try { ids = JSON.parse(s.selected_component_ids || '[]'); } catch { ids = []; }
    const idSet = new Set();
    const dups = [];
    for (const id of ids) {
      if (idSet.has(id)) dups.push(id);
      idSet.add(id);
    }
    console.log(`Slab "${s.name}": Duplicate IDs = ${dups.length ? dups : 'None'}`);
  }

  // ── 8. Payroll Cycles ───────────────────────────────────────────────────────
  console.log('\n=== 8. PAYROLL CYCLES STATUS ===');
  const [cycles] = await conn.query(
    'SELECT id, cycle_name, frequency, status, company_id FROM payroll_cycles WHERE organization_id = ? AND deleted_at IS NULL ORDER BY id',
    [orgId]
  );
  console.table(cycles);

  // ── 9. All formulas — potential issues ─────────────────────────────────────
  console.log('\n=== 9. FORMULA AUDIT (Potential Bad References) ===');
  const [allDerived] = await conn.query(
    "SELECT id, name, formula FROM payroll_components WHERE organization_id = ? AND component_type = 'Derived' AND is_active = 1 AND deleted_at IS NULL",
    [orgId]
  );
  // Check for bracket mismatch
  const badFormulas = [];
  for (const c of allDerived) {
    const f = (c.formula || '').trim();
    const open = (f.match(/\[/g) || []).length;
    const close = (f.match(/\]/g) || []).length;
    if (open !== close) {
      badFormulas.push({ id: c.id, name: c.name, formula: f, issue: `Bracket mismatch: ${open} [ vs ${close} ]` });
    }
    const openP = (f.match(/\(/g) || []).length;
    const closeP = (f.match(/\)/g) || []).length;
    if (openP !== closeP) {
      badFormulas.push({ id: c.id, name: c.name, formula: f, issue: `Paren mismatch: ${openP} ( vs ${closeP} )` });
    }
  }
  console.log(badFormulas.length ? badFormulas : 'All formulas have balanced brackets & parentheses');

  // ── 10. Recent payroll runs ─────────────────────────────────────────────────
  console.log('\n=== 10. RECENT PAYROLL RUNS ===');
  const [runs] = await conn.query(
    'SELECT id, status, total_employees, processed_employees, error_count, run_month, company_id FROM payroll_runs WHERE organization_id = ? ORDER BY id DESC LIMIT 5',
    [orgId]
  );
  console.table(runs);

  await conn.end();
  console.log('\n=== AUDIT COMPLETE ===');
  process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
