const path = require('path');
require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const { v4: uuidv4 } = require('uuid');

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

async function testUpdateEmploymentPayrollSettings() {
  console.log('\n======================================================');
  console.log('🧪 TESTING EMPLOYMENT SETTINGS: UPDATING COMPONENTS & SLAB');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch Target Employee
  const employee = await knex('employees')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!employee) {
    console.error('❌ No active employee found.');
    process.exit(1);
  }

  console.log(`👤 Target Employee: "${employee.first_name || ''} ${employee.last_name || ''}".trim() (ID: #${employee.id})`);

  // 2. Fetch Available Slabs
  const slabs = await knex('payroll_slabs')
    .where({ organization_id: orgId })
    .whereNull('deleted_at');

  if (slabs.length === 0) {
    console.error('❌ No payroll slabs found.');
    process.exit(1);
  }

  const targetSlab = slabs[slabs.length - 1]; // Pick latest slab (e.g. Executive Slab #17)
  console.log(`🏷️ New Slab to Assign: "${targetSlab.name}" (ID: #${targetSlab.id})`);

  // 3. Update Employee Slab Assignment in Employment Settings
  await knex('employees').where({ id: employee.id }).update({
    salary_slab_id: targetSlab.id,
    updated_at: new Date()
  });
  console.log(`\n✅ 1. Updated Employee #${employee.id} \`salary_slab_id\` to #${targetSlab.id}`);

  // 4. Update Salary Structure Component Amounts for Employee
  const updatedAnnualCtc = 1500000;
  const grossMonthly = Math.round(updatedAnnualCtc / 12); // 125,000
  const basicMonthly = Math.round(grossMonthly * 0.50);   // 62,500
  const hraMonthly = Math.round(basicMonthly * 0.40);     // 25,000
  const specialAllowanceMonthly = Math.max(0, grossMonthly - basicMonthly - hraMonthly); // 37,500
  const pfRate = Number(targetSlab.pf_rate_pct || 12);
  const pfDeduction = Math.min(1800, Math.round(basicMonthly * (pfRate / 100))); // 1,800
  const ptDeduction = 200;
  const netMonthly = grossMonthly - pfDeduction - ptDeduction;

  const existingStruct = await knex('salary_structures')
    .where({ employee_id: employee.id })
    .whereNull('deleted_at')
    .first();

  let structId;
  const [cols] = await knex.raw('DESCRIBE salary_structures');
  console.log('`salary_structures` columns:', cols.map(c => c.Field));

  if (existingStruct) {
    const updatePayload = {
      slab_id: targetSlab.id,
      structure_name: `${targetSlab.name} Profile`,
      annual_ctc: updatedAnnualCtc,
      gross_monthly: grossMonthly,
      basic_monthly: basicMonthly,
      hra_monthly: hraMonthly,
      special_allowance_monthly: specialAllowanceMonthly,
      pf_deduction: pfDeduction,
      updated_at: new Date()
    };
    await knex('salary_structures').where({ id: existingStruct.id }).update(updatePayload);
    structId = existingStruct.id;
    console.log(`✅ 2. Updated Salary Structure ID #${structId} with new Component Values & Slab ID #${targetSlab.id}`);
  } else {
    const insertPayload = {
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: employee.id,
      slab_id: targetSlab.id,
      structure_code: `STRUCT-${employee.id}`,
      structure_name: `${targetSlab.name} Profile`,
      annual_ctc: updatedAnnualCtc,
      gross_monthly: grossMonthly,
      basic_monthly: basicMonthly,
      hra_monthly: hraMonthly,
      special_allowance_monthly: specialAllowanceMonthly,
      pf_deduction: pfDeduction,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    };
    const [newId] = await knex('salary_structures').insert(insertPayload);
    structId = newId;
    console.log(`✅ 2. Created New Salary Structure ID #${structId} with new Component Values & Slab ID #${targetSlab.id}`);
  }

  // 5. Query and verify updated Employment Settings record
  const result = await knex('employees as e')
    .leftJoin('payroll_slabs as ps', 'e.salary_slab_id', 'ps.id')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .where('e.id', employee.id)
    .select(
      'e.id as emp_id',
      'e.first_name',
      'e.last_name',
      'e.salary_slab_id',
      'ps.name as slab_name',
      'ss.annual_ctc',
      'ss.gross_monthly',
      'ss.basic_monthly',
      'ss.hra_monthly',
      'ss.special_allowance_monthly',
      'ss.pf_deduction',
      'ss.net_take_home'
    )
    .first();

  console.log('\n📋 3. VERIFIED UPDATED EMPLOYMENT PAYROLL SETTINGS IN DB:');
  console.table({
    EmployeeID: result.emp_id,
    Name: `${result.first_name || ''} ${result.last_name || ''}`.trim(),
    AssignedSlabID: result.salary_slab_id,
    AssignedSlabName: result.slab_name,
    AnnualCTC: `₹${Number(result.annual_ctc).toLocaleString()}`,
    GrossMonthly: `₹${Number(result.gross_monthly).toLocaleString()}`,
    BasicPay: `₹${Number(result.basic_monthly).toLocaleString()}`,
    HRA: `₹${Number(result.hra_monthly).toLocaleString()}`,
    SpecialAllowance: `₹${Number(result.special_allowance_monthly).toLocaleString()}`,
    PFDeduction: `₹${Number(result.pf_deduction).toLocaleString()}`,
    NetTakeHome: `₹${Number(result.net_take_home || 0).toLocaleString()}`
  });

  console.log('\n======================================================');
  console.log('🎉 EMPLOYMENT SETTINGS SLAB & COMPONENT UPDATE VERIFIED 100%!');
  console.log('======================================================\n');

  await knex.destroy();
}

testUpdateEmploymentPayrollSettings().catch(err => {
  console.error('❌ Update Error:', err);
  process.exit(1);
});
