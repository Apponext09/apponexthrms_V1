const path = require('path');
require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });

const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

async function explainSlabComponentAssignment() {
  console.log('\n======================================================');
  console.log('🔍 PAYROLL SLAB & COMPONENT ASSIGNMENT AUDIT');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch All Slabs
  const slabs = await knex('payroll_slabs').where({ organization_id: orgId }).whereNull('deleted_at');

  console.log(`📋 Total Slabs Created in System: ${slabs.length}\n`);

  for (const s of slabs) {
    const rawCompIds = typeof s.selected_component_ids === 'string' ? JSON.parse(s.selected_component_ids || '[]') : (s.selected_component_ids || []);
    
    console.log(`🏷️  SLAB ID #${s.id}: "${s.name}"`);
    console.log(`    - CTC Range: ₹${Number(s.min_ctc).toLocaleString()} to ₹${Number(s.max_ctc).toLocaleString()}`);
    console.log(`    - Employment Type: ${s.employment_type || 'Regular'}`);
    console.log(`    - PF Rate: ${s.pf_rate_pct || 12}%`);

    if (rawCompIds.length > 0) {
      const components = await knex('payroll_components')
        .whereIn('id', rawCompIds)
        .whereNull('deleted_at');
      
      console.log(`    - Attached Components (${components.length}):`);
      for (const c of components) {
        console.log(`        • Comp ID #${c.id}: ${c.name} [Type: ${c.component_type || c.type}, Formula: "${c.formula || 'Value/Fixed'}"]`);
      }
    } else {
      console.log(`    - Attached Components: Standard Default Components (Basic, HRA, Special Allowance, PF, PT, TDS)`);
    }
    console.log('------------------------------------------------------');
  }

  await knex.destroy();
}

explainSlabComponentAssignment().catch(err => {
  console.error(err);
  process.exit(1);
});
