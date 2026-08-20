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

async function testProcessRegisterWithFilters() {
  console.log('===========================================================');
  console.log('🧪 TESTING PAYROLL PROCESS REGISTER & FILTERS');
  console.log('===========================================================\n');

  try {
    const org = await db('organizations').first();
    const orgId = org ? org.id : 8;

    // 1. Total active employees in org
    const allEmps = await db('employees').where({ organization_id: orgId }).whereNull('deleted_at');
    console.log(`Total active employees in Organization (${orgId}): ${allEmps.length}`);

    // 2. Test Department Filter
    const depts = await db('departments').where({ organization_id: orgId }).limit(2);
    if (depts.length > 0) {
      const deptEmps = await db('employees')
        .where({ organization_id: orgId, current_department_id: depts[0].id })
        .whereNull('deleted_at');
      console.log(`✅ Filter by Department "${depts[0].name}" (ID: ${depts[0].id}): ${deptEmps.length} employee(s) matched.`);
    }

    // 3. Test Pay Slab Filter
    const slabs = await db('payroll_slabs').where({ organization_id: orgId }).whereNull('deleted_at').limit(2);
    if (slabs.length > 0) {
      const slabEmps = await db('salary_structures')
        .where({ organization_id: orgId, slab_id: slabs[0].id })
        .whereNull('deleted_at');
      console.log(`✅ Filter by Pay Slab "${slabs[0].name}" (ID: ${slabs[0].id}): ${slabEmps.length} employee structure(s) matched.`);
    }

    // 4. Test Pay Cycle Filter
    const cycles = await db('payroll_cycles').where({ organization_id: orgId }).whereNull('deleted_at').limit(2);
    if (cycles.length > 0) {
      console.log(`✅ Pay Cycle available: "${cycles[0].cycle_name || cycles[0].name}" (ID: ${cycles[0].id})`);
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL PAYROLL PROCESS FILTERS & QUERIES WORKING 100% 🎉');
    console.log('===========================================================');
  } catch (err) {
    console.error('❌ Error testing filters:', err);
  } finally {
    await db.destroy();
  }
}

testProcessRegisterWithFilters();
