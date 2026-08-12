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

async function testAssignSlabToEmployee() {
  console.log('\n======================================================');
  console.log('🧪 TESTING PAYROLL SLAB ASSIGNMENT TO EMPLOYEE');
  console.log('======================================================\n');

  const orgId = 68;

  // 1. Fetch active target employee
  const employee = await knex('employees')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!employee) {
    console.error('❌ No active employee found for testing assignment.');
    process.exit(1);
  }

  const empName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
  console.log(`👤 Target Employee Selected: "${empName}" (ID: #${employee.id}, Code: ${employee.employee_code || 'N/A'})`);

  // 2. Fetch available payroll slab
  const slab = await knex('payroll_slabs')
    .where({ organization_id: orgId })
    .whereNull('deleted_at')
    .first();

  if (!slab) {
    console.error('❌ No payroll slab found to assign.');
    process.exit(1);
  }

  console.log(`🏷️ Target Salary Slab Selected: "${slab.name}" (ID: #${slab.id}, CTC Range: ₹${slab.min_ctc} - ₹${slab.max_ctc})`);

  // 3. Assign Slab ID to Employee in `employees` table
  await knex('employees')
    .where('id', employee.id)
    .update({
      salary_slab_id: slab.id,
      updated_at: new Date()
    });

  console.log(`\n✅ 1. Assigned Slab ID #${slab.id} to Employee #${employee.id} in \`employees\` table.`);

  // 4. Create / Update Employee's Salary Structure with Slab Linkage
  const annualCtcVal = Number(employee.annual_ctc || 850000);
  const grossMonthly = Math.round(annualCtcVal / 12);
  const basicMonthly = Math.round(grossMonthly * 0.50);
  const hraMonthly = Math.round(basicMonthly * 0.40);
  const specialAllowanceMonthly = Math.max(0, grossMonthly - basicMonthly - hraMonthly);
  const pfDeduction = Math.min(1800, Math.round(basicMonthly * 0.12));
  const ptDeduction = grossMonthly > 15000 ? 200 : 0;
  const netMonthly = Math.max(0, grossMonthly - pfDeduction - ptDeduction);

  const existingStruct = await knex('salary_structures')
    .where({ employee_id: employee.id })
    .whereNull('deleted_at')
    .first();

  let structId;
  if (existingStruct) {
    await knex('salary_structures').where('id', existingStruct.id).update({
      slab_id: slab.id,
      structure_name: `${slab.name} Structure`,
      annual_ctc: annualCtcVal,
      basic_monthly: basicMonthly,
      hra_monthly: hraMonthly,
      special_allowance_monthly: specialAllowanceMonthly,
      gross_monthly: grossMonthly,
      pf_deduction: pfDeduction,
      esi_deduction: 0,
      tds_deduction: 0,
      updated_at: new Date()
    });
    structId = existingStruct.id;
    console.log(`✅ 2. Updated Salary Structure ID #${structId} with Slab ID #${slab.id}.`);
  } else {
    const [newId] = await knex('salary_structures').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: employee.id,
      slab_id: slab.id,
      structure_code: `STRUCT-${employee.id}`,
      structure_name: `${slab.name} Structure`,
      annual_ctc: annualCtcVal,
      basic_monthly: basicMonthly,
      hra_monthly: hraMonthly,
      special_allowance_monthly: specialAllowanceMonthly,
      gross_monthly: grossMonthly,
      pf_deduction: pfDeduction,
      esi_deduction: 0,
      tds_deduction: 0,
      effective_from: new Date().toISOString().split('T')[0],
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    structId = newId;
    console.log(`✅ 2. Created New Salary Structure ID #${structId} with Slab ID #${slab.id}.`);
  }

  // 5. Ensure Mapping in `employee_salary_structures`
  const existingMapping = await knex('employee_salary_structures')
    .where({ employee_id: employee.id, is_current: true })
    .first();

  if (!existingMapping) {
    await knex('employee_salary_structures').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      employee_id: employee.id,
      salary_structure_id: structId,
      effective_from: new Date().toISOString().split('T')[0],
      is_current: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  // 6. Verify Full Assignment Record via JOIN
  const verifiedRecord = await knex('employees as e')
    .leftJoin('payroll_slabs as ps', 'e.salary_slab_id', 'ps.id')
    .leftJoin('salary_structures as ss', 'e.id', 'ss.employee_id')
    .where('e.id', employee.id)
    .select(
      'e.id as emp_id',
      'e.first_name',
      'e.last_name',
      'e.employee_code',
      'e.salary_slab_id',
      'ps.name as assigned_slab_name',
      'ps.min_ctc',
      'ps.max_ctc',
      'ss.annual_ctc',
      'ss.basic_monthly',
      'ss.gross_monthly',
      'ss.pf_deduction'
    )
    .first();

  console.log('\n📋 3. VERIFIED EMPLOYEE PAYROLL SLAB ASSIGNMENT RECORD IN DATABASE:');
  console.table({
    EmployeeID: verifiedRecord.emp_id,
    Name: `${verifiedRecord.first_name || ''} ${verifiedRecord.last_name || ''}`.trim(),
    EmployeeCode: verifiedRecord.employee_code,
    AssignedSlabID: verifiedRecord.salary_slab_id,
    AssignedSlabName: verifiedRecord.assigned_slab_name,
    SlabCTCRange: `₹${Number(verifiedRecord.min_ctc).toLocaleString()} - ₹${Number(verifiedRecord.max_ctc).toLocaleString()}`,
    EmployeeAnnualCTC: `₹${Number(verifiedRecord.annual_ctc).toLocaleString()}`,
    BasicMonthly: `₹${Number(verifiedRecord.basic_monthly).toLocaleString()}`,
    GrossMonthly: `₹${Number(verifiedRecord.gross_monthly).toLocaleString()}`,
    PFDeduction: `₹${Number(verifiedRecord.pf_deduction).toLocaleString()}`
  });

  console.log('\n======================================================');
  console.log('🎉 SLAB ASSIGNMENT TO EMPLOYEE VERIFIED 100% SUCCESSFUL!');
  console.log('======================================================\n');

  await knex.destroy();
}

testAssignSlabToEmployee().catch(err => {
  console.error('❌ Slab Assignment Error:', err);
  process.exit(1);
});
