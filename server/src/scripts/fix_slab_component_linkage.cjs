require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const { v4: uuidv4 } = require('uuid');
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  }
});

async function fixSlabComponents() {
  console.log('\n======================================================');
  console.log('🔧 FIXING SLAB → COMPONENT LINKAGE');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch all slabs
  const slabs = await knex('payroll_slabs').where({ organization_id: orgId }).whereNull('deleted_at');
  console.log(`📌 Found ${slabs.length} slab(s):`);
  slabs.forEach(s => console.log(`   - #${s.id}: "${s.name}" | cycle_id=${s.cycle_id} | selected_component_ids=${s.selected_component_ids}`));

  // 2. Fetch all active components
  const components = await knex('payroll_components').where({ organization_id: orgId, is_active: 1 }).whereNull('deleted_at');
  console.log(`\n📌 Found ${components.length} active components:`);
  components.forEach(c => console.log(`   - #${c.id}: "${c.name}" (${c.component_type}, ${c.gender_filter || 'All'})`));

  // 3. Inspect payroll_slab_components columns
  const [cols] = await knex.raw('DESCRIBE payroll_slab_components');
  console.log('\n📌 payroll_slab_components columns:', cols.map(c => c.Field));

  // 4. Check existing entries
  const existing = await knex('payroll_slab_components');
  console.log(`\n📌 Existing payroll_slab_components rows: ${existing.length}`);
  if (existing.length > 0) {
    console.table(existing.slice(0, 5));
  }

  // 5. For each slab, link all components (or use selected_component_ids if set)
  let totalInserted = 0;
  for (const slab of slabs) {
    // Parse selected_component_ids if available
    let compIds = components.map(c => c.id);
    if (slab.selected_component_ids) {
      try {
        const parsed = JSON.parse(slab.selected_component_ids);
        if (Array.isArray(parsed) && parsed.length > 0) {
          compIds = parsed.map(Number).filter(id => components.some(c => c.id === id));
        }
      } catch {}
    }

    // Check what's already linked
    const already = await knex('payroll_slab_components').where({ slab_id: slab.id }).select('component_id');
    const alreadyIds = new Set(already.map(r => r.component_id));

    const toInsert = [];
    for (const comp of components.filter(c => compIds.includes(c.id))) {
      if (alreadyIds.has(comp.id)) continue;

      // Build insert row based on columns
      const row = { slab_id: slab.id, component_id: comp.id };
      // Add optional columns if they exist
      if (cols.some(c => c.Field === 'organization_id')) row.organization_id = orgId;
      if (cols.some(c => c.Field === 'is_active')) row.is_active = 1;
      if (cols.some(c => c.Field === 'created_at')) row.created_at = new Date();
      if (cols.some(c => c.Field === 'updated_at')) row.updated_at = new Date();

      toInsert.push(row);
    }

    if (toInsert.length > 0) {
      await knex('payroll_slab_components').insert(toInsert);
      totalInserted += toInsert.length;
      console.log(`\n✅ Slab "${slab.name}" (#${slab.id}): Linked ${toInsert.length} component(s)`);
    } else {
      console.log(`\n  ℹ️  Slab "${slab.name}" (#${slab.id}): All ${alreadyIds.size} component(s) already linked.`);
    }
  }

  // 6. Also ensure employees have salary_slab_id set
  const empsWithoutSlab = await knex('employees')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .where(function() { this.whereNull('salary_slab_id').orWhere('salary_slab_id', 0); });

  console.log(`\n📌 Employees without slab: ${empsWithoutSlab.length}`);

  if (empsWithoutSlab.length > 0 && slabs.length > 0) {
    // Assign the first slab as default
    const defaultSlab = slabs[0];
    for (const emp of empsWithoutSlab) {
      await knex('employees').where({ id: emp.id }).update({ salary_slab_id: defaultSlab.id, updated_at: new Date() });
      console.log(`   ✅ Assigned slab "${defaultSlab.name}" to ${emp.first_name} ${emp.last_name || ''} (#${emp.id})`);
    }
  }

  // 7. Ensure cycles are linked to slabs
  const cycles = await knex('payroll_cycles').where({ organization_id: orgId, is_active: 1 }).whereNull('deleted_at');
  console.log(`\n📌 Payroll Cycles: ${cycles.length}`);
  const defaultCycle = cycles[0];
  for (const slab of slabs) {
    if (!slab.cycle_id && defaultCycle) {
      await knex('payroll_slabs').where({ id: slab.id }).update({ cycle_id: defaultCycle.id, updated_at: new Date() });
      console.log(`   ✅ Linked slab "${slab.name}" to cycle "${defaultCycle.cycle_name || defaultCycle.name}"`);
    } else {
      console.log(`   ✅ Slab "${slab.name}" already linked to cycle #${slab.cycle_id}`);
    }
  }

  console.log(`\n\n======================================================`);
  console.log(`🎉 FIX COMPLETE! Inserted ${totalInserted} slab-component link(s).`);
  console.log(`======================================================\n`);

  await knex.destroy();
}

fixSlabComponents().catch(err => {
  console.error('❌ Fix Error:', err.message);
  process.exit(1);
});
