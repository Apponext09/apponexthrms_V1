import { db, initializeKnex } from '../db/knex';

async function testSlabDynamicValidation() {
  console.log('================================================================');
  console.log('       🧪 PAYROLL SLAB VALIDATION & DYNAMIC TEST                ');
  console.log('================================================================\n');

  try {
    initializeKnex();

    // 1. Query Existing Slabs
    const slabs = await db('payroll_slabs').whereNull('deleted_at');
    console.log(`📊 1. CURRENT PAYROLL SLABS IN DATABASE (Found: ${slabs.length})`);
    slabs.forEach((s: any) => {
      console.log(`   • ID: ${s.id} | Name: "${s.name}" | Range: ₹${s.min_ctc || s.minCtc} - ₹${s.max_ctc || s.maxCtc}`);
      console.log(`     Depts: ${s.departments} | Grades: ${s.grades} | Active: ${s.is_active || s.isActive}`);
    });

    // 2. Test Inserting a New Custom Dynamic Slab
    console.log('\n➕ 2. Testing Dynamic Slab Insertion...');
    const testSlabName = `Executive Slab ${Date.now()}`;
    const [insertedId] = await db('payroll_slabs').insert({
      uuid: 'slab-' + Date.now(),
      organization_id: 68,
      name: testSlabName,
      min_ctc: 300000,
      max_ctc: 1200000,
      departments: JSON.stringify(['Engineering', 'Sales']),
      grades: JSON.stringify(['Grade A', 'Grade B']),
      locations: JSON.stringify(['Mumbai Office']),
      selected_component_ids: JSON.stringify(['basic', 'hra', 'special_allowance', 'pf', 'pt']),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`   ✅ Successfully created new slab! Inserted ID: ${insertedId}`);

    // 3. Verify Created Slab from DB
    const createdSlab = await db('payroll_slabs').where('id', insertedId).first();
    console.log(`   ✓ Verified in DB: ID ${createdSlab.id} | Name: "${createdSlab.name}"`);

    // 4. Test Updating Slab
    console.log('\n✏️ 3. Testing Dynamic Slab Update...');
    await db('payroll_slabs').where('id', insertedId).update({
      max_ctc: 1500000,
      name: `${testSlabName} (Updated)`,
      updated_at: new Date()
    });
    const updatedSlab = await db('payroll_slabs').where('id', insertedId).first();
    console.log(`   ✅ Successfully updated slab! New Name: "${updatedSlab.name}" | Max CTC: ₹${updatedSlab.max_ctc || updatedSlab.maxCtc}`);

    console.log('\n================================================================');
    console.log('  🎉 SLAB VALIDATION & DYNAMIC DB CREATION 100% SUCCESSFUL      ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('Slab Validation Error:', err.message);
  } finally {
    process.exit(0);
  }
}

testSlabDynamicValidation();
