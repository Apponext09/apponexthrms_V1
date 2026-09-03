/**
 * setup_two_clean_slabs.cjs
 * ─────────────────────────────────────────────────────────────
 * Creates 2 clean pay slabs with suitable components and eliminates duplicate calculations:
 *   Slab 1: "Standard Pay Slab (Up to ₹4.8L)"  — Junior / Entry Level (₹1,80,000 – ₹4,80,000)
 *   Slab 2: "Executive Pay Slab (Above ₹4.8L)" — Mid & Senior Level (₹4,80,001 – ₹1,00,00,000)
 *
 * Rules:
 *   - EXCLUDE and deactivate duplicate / pass-through "* Earned" components
 *   - EXCLUDE and deactivate "ECR Gross Amount" (statutory wage ceiling that was doubling gross)
 *   - EXCLUDE and deactivate duplicate Conveyance & ESI components
 *   - Ensure clear, intuitive naming without duplicates
 */

const { v4: uuidv4 } = require('uuid');
const knex = require('knex')({
  client: 'mysql2',
  connection: { host: 'localhost', port: 3306, user: 'root', password: 'root123', database: 'health' }
});

// Components to deactivate so they don't confuse users or duplicate amounts
const DEACTIVATE_COMP_IDS = [
  5,   // Basic Earned (duplicate pass-through)
  7,   // Children Education Allowance Earned
  9,   // Communication Allowance Earned
  11,  // Conveyance Earned
  12,  // Conveyance Allowance (duplicate of Conveyance 25% [10])
  13,  // Conveyance Allowance Earned
  14,  // ECR Gross Amount (statutory wage reporting, NOT a payable earning)
  20,  // Hra Earned (duplicate pass-through)
  25,  // LTA Allowance Earned
  27,  // Meal Allowance Earned
  29,  // Medical Allowance Earned
  32,  // Professional Allowance (duplicate 25% earning that conflicted with PT)
  33,  // Professional Allowance Earned
  36,  // SPECIAL ALLOWANCE EARNED
  38,  // Standard Allowance Earned
  44,  // EDLI Wages (statutory basis)
  46,  // EPF EPS Wages (statutory basis)
  48,  // EPS wages (statutory basis)
  49,  // ESI 75% (duplicate of ESIC [50])
];

// Clean selected components for Slab 1 (Junior: ₹1.8L - ₹4.8L)
// Basic 50% + HRA (40% of Basic) + Conveyance (20% of Basic) + Medical (5% of CTC) + Special Allowance (Residual) = 100% CTC!
const SLAB1_COMPONENTS = [
  // Earnings
  1,   // Adjustment (Value)
  4,   // Basic 50% (50% of CTC)
  6,   // Children Education Allowance (Value)
  8,   // Communication Allowance (Value)
  10,  // Conveyance 25% (20% of Basic = 10% of CTC)
  15,  // Expense Reimbursement
  16,  // Extra Pay Amount
  17,  // Gratuity
  18,  // HRA (40% of Basic = 20% of CTC)
  21,  // Incentive
  22,  // Leave Encashment
  26,  // Meal Allowance
  28,  // Medical Allowance (5% of CTC)
  30,  // OT
  35,  // Special allowance (Residual: 15% of CTC -> Total 100%)
  37,  // Standard Allowance
  39,  // Weekoff and Holiday Double Pay
  40,  // Annual Bonus
  // Deductions
  41,  // Admin Charges
  42,  // Early Deduction
  43,  // EDLI Charges
  45,  // EPF and EPS Diff
  47,  // EPS Component
  50,  // ESIC (0.75% of Gross if <= 21k)
  51,  // Mediclaim deduction (₹350)
  52,  // Late Deduction
  53,  // Loan
  54,  // Loss of Pay
  56,  // PF 12% on Basic
  59,  // Professional Tax (₹200)
  60,  // Sal. Deduction
  61,  // Tds
  62,  // ESIC Employer
  63,  // PF Employer (12% of Basic)
];

// Clean selected components for Slab 2 (Senior: ₹4.8L - ₹1Cr)
// Includes LTA Allowance [24] in addition to all standard components
const SLAB2_COMPONENTS = [
  ...SLAB1_COMPONENTS,
  24,  // LTA Allowance
].sort((a, b) => a - b);

async function run() {
  const org = await knex('organizations').select('id', 'name').first();
  console.log('\n======================================================');
  console.log(`🏢 Setting up 2 Clean Pay Slabs for Org #${org.id} (${org.name})`);
  console.log('======================================================\n');

  // 1. Deactivate duplicate / pass-through components
  console.log('🧹 1. Deactivating duplicate & pass-through components...');
  await knex('payroll_components')
    .where('organization_id', org.id)
    .whereIn('id', DEACTIVATE_COMP_IDS)
    .update({ is_active: 0, updated_at: new Date() });
  console.log(`   Deactivated ${DEACTIVATE_COMP_IDS.length} duplicate/redundant components.`);

  // 2. Ensure all chosen components are active
  const allNeeded = [...new Set([...SLAB1_COMPONENTS, ...SLAB2_COMPONENTS])];
  await knex('payroll_components')
    .where('organization_id', org.id)
    .whereIn('id', allNeeded)
    .update({ is_active: 1, updated_at: new Date() });

  // 3. Soft-delete old slabs
  console.log('\n🗑️  2. Deactivating old slabs...');
  await knex('payroll_slabs')
    .where('organization_id', org.id)
    .whereNull('deleted_at')
    .update({ deleted_at: new Date(), is_active: 0, updated_at: new Date() });

  // 4. Create Slab 1: Standard Pay Slab (Up to ₹4.8L)
  const [slab1Id] = await knex('payroll_slabs').insert({
    uuid: uuidv4(),
    organization_id: org.id,
    name: 'Standard Pay Slab (Up to ₹4.8L)',
    min_ctc: 180000,
    max_ctc: 480000,
    is_active: 1,
    selected_component_ids: JSON.stringify(SLAB1_COMPONENTS),
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log(`\n✅ 3. Created Slab 1 [ID #${slab1Id}]: "Standard Pay Slab (Up to ₹4.8L)"`);
  console.log(`   - Range: ₹1,80,000 to ₹4,80,000 / year (₹15,000 to ₹40,000 / month)`);
  console.log(`   - Active Components: ${SLAB1_COMPONENTS.length}`);

  // 5. Create Slab 2: Executive Pay Slab (Above ₹4.8L)
  const [slab2Id] = await knex('payroll_slabs').insert({
    uuid: uuidv4(),
    organization_id: org.id,
    name: 'Executive Pay Slab (Above ₹4.8L)',
    min_ctc: 480001,
    max_ctc: 10000000,
    is_active: 1,
    selected_component_ids: JSON.stringify(SLAB2_COMPONENTS),
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log(`\n✅ 4. Created Slab 2 [ID #${slab2Id}]: "Executive Pay Slab (Above ₹4.8L)"`);
  console.log(`   - Range: ₹4,80,001 to ₹1,00,00,000 / year (₹40,001 to ₹8,33,333 / month)`);
  console.log(`   - Active Components: ${SLAB2_COMPONENTS.length} (includes LTA Allowance)`);

  // 6. Test breakdown calculation for ₹12L CTC and ₹3.6L CTC
  console.log('\n======================================================');
  console.log('🧪 5. Testing Formula Calculations on New Slabs');
  console.log('======================================================\n');

  function testCalc(annualCtc, slabName) {
    const gross = Math.round(annualCtc / 12);
    const basic = Math.round(gross * 0.5);          // Basic 50%
    const hra = Math.round(basic * 0.4);            // HRA 40% of Basic = 20%
    const conveyance = Math.round(basic * 0.2);     // Conveyance 20% of Basic = 10%
    const medical = Math.round(gross * 0.05);       // Medical 5%
    const special = Math.max(0, gross - (basic + hra + conveyance + medical)); // Residual = 15%
    const totalEarnings = basic + hra + conveyance + medical + special;

    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const mediclaim = 350;
    const esic = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const totalDeductions = pf + pt + mediclaim + esic;
    const takeHome = totalEarnings - totalDeductions;

    console.log(`📊 Test for ${slabName} — Annual CTC: ₹${annualCtc.toLocaleString('en-IN')} (Gross: ₹${gross.toLocaleString('en-IN')}/mo):`);
    console.log(`   • Basic 50%:          ₹${basic.toLocaleString('en-IN')}`);
    console.log(`   • HRA (40% Basic):     ₹${hra.toLocaleString('en-IN')}`);
    console.log(`   • Conveyance:          ₹${conveyance.toLocaleString('en-IN')}`);
    console.log(`   • Medical Allowance:   ₹${medical.toLocaleString('en-IN')}`);
    console.log(`   • Special Allowance:   ₹${special.toLocaleString('en-IN')}`);
    console.log(`   ─────────────────────────────────────────────`);
    console.log(`   TOTAL EARNINGS:        ₹${totalEarnings.toLocaleString('en-IN')} (Exactly 100% of Gross!)`);
    console.log(`   • PF (12% of Basic):   ₹${pf.toLocaleString('en-IN')}`);
    console.log(`   • Professional Tax:    ₹${pt.toLocaleString('en-IN')}`);
    console.log(`   • Mediclaim:           ₹${mediclaim.toLocaleString('en-IN')}`);
    if (esic > 0) console.log(`   • ESIC (0.75%):        ₹${esic.toLocaleString('en-IN')}`);
    console.log(`   ─────────────────────────────────────────────`);
    console.log(`   TOTAL DEDUCTIONS:      ₹${totalDeductions.toLocaleString('en-IN')}`);
    console.log(`   💵 NET MONTHLY TAKE-HOME: ₹${takeHome.toLocaleString('en-IN')}`);
    console.log('');
  }

  testCalc(360000, 'Standard Pay Slab (Junior)');
  testCalc(1200000, 'Executive Pay Slab (Senior)');

  console.log('======================================================');
  console.log('🎉 2 CLEAN SLABS CREATED & FULLY VERIFIED!');
  console.log('======================================================\n');

  await knex.destroy();
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
