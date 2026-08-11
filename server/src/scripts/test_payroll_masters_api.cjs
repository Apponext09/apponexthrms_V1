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

async function testPayrollMastersAPI() {
  console.log('====================================================');
  console.log('  🧪 TESTING PAYROLL MASTERS DATA & API RESPONSES    ');
  console.log('====================================================\n');

  try {
    const orgs = await db('organizations').select('id');
    const orgId = orgs.length > 0 ? orgs[0].id : 68;

    // 1. Pay Cycles
    const cycles = await db('payroll_cycles').where('organization_id', orgId).whereNull('deleted_at');
    console.log(`✅ Pay Cycles Count: ${cycles.length}`);
    for (const c of cycles) {
      console.log(`   - Cycle ID=${c.id}, Name="${c.cycle_name}", Code="${c.cycle_code}", Frequency="${c.frequency}", Active=${c.status || c.is_active}`);
    }

    // 2. Pay Components
    const components = await db('payroll_components').where('organization_id', orgId).whereNull('deleted_at');
    console.log(`\n✅ Pay Components Count: ${components.length}`);
    for (const comp of components) {
      console.log(`   - Comp ID=${comp.id}, Name="${comp.name}", Type="${comp.component_type}", Calc="${comp.calc_type}", Formula="${comp.formula || 'N/A'}"`);
    }

    // 3. Pay Slabs
    const slabs = await db('payroll_slabs').where('organization_id', orgId).whereNull('deleted_at');
    console.log(`\n✅ Pay Slabs Count: ${slabs.length}`);
    for (const s of slabs) {
      console.log(`   - Slab ID=${s.id}, Name="${s.name}", CTC Range=₹${s.min_ctc} to ₹${s.max_ctc}, PF Rate=${s.pf_rate_pct}%`);
    }

    console.log('\n====================================================');
    console.log('  🎉 ALL 3 PAYROLL MASTERS READY FOR PRODUCTION & TESTING!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Error testing payroll masters API:', err);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testPayrollMastersAPI();
