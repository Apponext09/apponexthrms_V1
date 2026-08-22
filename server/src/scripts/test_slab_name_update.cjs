const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms'
  }
});

async function testSlabNameDynamicUpdate() {
  console.log('===========================================================');
  console.log('🧪 TESTING DYNAMIC SLAB NAME UPDATE');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Fetch first active slab
    const slab = await db('payroll_slabs')
      .where({ organization_id: orgId })
      .whereNull('deleted_at')
      .first();

    if (!slab) {
      console.log('No slabs found in DB. Creating a sample slab...');
      const [id] = await db('payroll_slabs').insert({
        uuid: 'test-slab-dynamic-001',
        organization_id: orgId,
        name: 'Standard Tech Slab',
        departments: JSON.stringify(['Engineering']),
        min_ctc: 300000,
        max_ctc: 1200000,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Created slab with ID: ${id} and Name: "Standard Tech Slab"`);
    } else {
      console.log(`Found existing slab ID: ${slab.id}, Current Name: "${slab.name}"`);
      
      const newName = slab.name.includes('(Updated)') 
        ? slab.name.replace(' (Updated)', '') 
        : `${slab.name} (Updated)`;

      // 2. Perform Update
      await db('payroll_slabs')
        .where({ id: slab.id, organization_id: orgId })
        .update({
          name: newName,
          updated_at: new Date()
        });

      // 3. Verify in DB
      const updated = await db('payroll_slabs').where('id', slab.id).first();
      console.log(`✅ Successfully updated slab ID ${slab.id} name to: "${updated.name}"`);
    }

    console.log('\n===========================================================');
    console.log('🎉 SLAB DYNAMIC UPDATE TEST COMPLETED CLEANLY 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error testing slab update:', err);
  } finally {
    await db.destroy();
  }
}

testSlabNameDynamicUpdate();
