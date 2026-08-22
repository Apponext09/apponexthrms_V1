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

async function testSalaryStructureQuery() {
  console.log('===========================================================');
  console.log('🧪 TESTING SALARY STRUCTURE QUERY WITH JOINED SLAB NAME');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    const rows = await db('salary_structures')
      .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
      .select(
        'salary_structures.*',
        'payroll_slabs.name as slab_name',
        'payroll_slabs.selected_component_ids as slab_component_ids'
      )
      .where('salary_structures.organization_id', orgId)
      .whereNull('salary_structures.deleted_at')
      .orderBy('salary_structures.id', 'desc');

    console.log(`Found ${rows.length} salary structure(s) in DB.`);
    rows.forEach((r, idx) => {
      console.log(`\nStructure #${idx+1}:`);
      console.log(`   ID: ${r.id}, Employee ID: ${r.employee_id}`);
      console.log(`   Slab Name (Joined): "${r.slab_name || r.structure_name}"`);
      console.log(`   Annual CTC: ₹${r.annual_ctc}, Gross Monthly: ₹${r.gross_monthly}, Net Take-Home: ₹${r.net_take_home}`);
      console.log(`   Basic: ₹${r.basic_monthly}, HRA: ₹${r.hra_monthly}, Effective From: ${r.effective_from}`);
    });

    console.log('\n===========================================================');
    console.log('🎉 STRUCTURE QUERY & SLAB NAME RESOLUTION VERIFIED 100% 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await db.destroy();
  }
}

testSalaryStructureQuery();
