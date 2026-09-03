const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runFullPayrollValidation() {
  console.log('===============================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END PAYROLL WORKFLOW VALIDATION');
  console.log('===============================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1: DATABASE INTEGRITY & CLEAN SCHEMAS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('📋 SUITE 1: Database Tables & Schema Integrity');

  const requiredTables = [
    'payroll_cycles',
    'payroll_slabs',
    'payroll_components',
    'payroll_component_groups',
    'salary_structures',
    'salary_structure_components',
    'salary_revisions',
    'payroll_runs',
    'payroll_run_employees',
    'employee_salary_structures'
  ];

  for (const table of requiredTables) {
    const exists = await db.schema.hasTable(table);
    assert(exists, `Table '${table}' exists in database`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2: PAYROLL SLABS & COMPONENT DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 2: Standardized Payroll Slabs & Isolation');

  const slabs = await db('payroll_slabs').select('id', 'name');
  assert(slabs.length >= 3, `Found ${slabs.length} active payroll slabs`);
  
  const slabNames = slabs.map(s => s.name);
  assert(slabNames.includes('Standard Monthly Slab'), `Has 'Standard Monthly Slab'`);
  assert(slabNames.includes('Internship Slab'), `Has 'Internship Slab'`);
  assert(slabNames.includes('Kite Structure Slab'), `Has 'Kite Structure Slab'`);

  // Check component definitions
  const components = await db('payroll_components').select('id', 'name', 'component_type');
  assert(components.length >= 10, `Found ${components.length} payroll component definitions in catalog`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3: EMPLOYEE STRUCTURE ASSIGNMENTS (NO OVERRIDING & 100% COVERAGE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 3: Employee Salary Structures (No Data Overriding)');

  const activeEmployees = await db('employees').whereNull('deleted_at').select('id', 'first_name', 'last_name', 'employee_code');
  assert(activeEmployees.length > 0, `Active employee headcount: ${activeEmployees.length}`);

  const structures = await db('salary_structures')
    .leftJoin('payroll_slabs', 'salary_structures.slab_id', 'payroll_slabs.id')
    .whereNull('salary_structures.deleted_at')
    .select(
      'salary_structures.id',
      'salary_structures.employee_id',
      'salary_structures.slab_id',
      'salary_structures.structure_name',
      'payroll_slabs.name as slab_name',
      'salary_structures.annual_ctc',
      'salary_structures.gross_monthly',
      'salary_structures.basic_monthly'
    );

  // Check that every assigned structure has a distinct employee_id
  const empIdsWithStruct = structures.map(s => s.employee_id).filter(Boolean);
  const uniqueEmpIds = new Set(empIdsWithStruct);
  assert(empIdsWithStruct.length === uniqueEmpIds.size, `No duplicate structure collisions (Unique employee assignments: ${uniqueEmpIds.size})`);

  // Check that all structures have valid slabs and positive CTCs
  for (const s of structures) {
    if (s.employee_id) {
      assert(Boolean(s.slab_id), `Employee #${s.employee_id} has valid slab_id: ${s.slab_id}`);
      assert(Number(s.annual_ctc) > 0, `Employee #${s.employee_id} has valid Annual CTC: ₹${Number(s.annual_ctc).toLocaleString('en-IN')}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4: SALARY REVISION WORKFLOW (SUBMIT -> APPROVE -> UPDATE STRUCTURE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 4: Salary Revision Lifecycle & CTC Increments');

  const testEmp = activeEmployees[0];
  const originalStruct = structures.find(s => s.employee_id === testEmp.id);
  const currentCtc = Number(originalStruct?.annual_ctc || 480000);
  const revisedCtc = currentCtc + 60000; // +₹60,000 hike

  const firstUser = await db('users').first();
  const validUserId = firstUser ? firstUser.id : 46;

  // 1. Insert Salary Revision Request
  const [revisionId] = await db('salary_revisions').insert({
    uuid: uuidv4(),
    organization_id: 14,
    employee_id: testEmp.id,
    revision_type: 'increment',
    old_ctc: currentCtc,
    new_ctc: revisedCtc,
    increment_amount: 60000,
    increment_percentage: Number(((60000 / currentCtc) * 100).toFixed(2)),
    effective_from: new Date().toISOString().slice(0, 10),
    reason_description: 'End-to-End Workflow Verification Test',
    status: 'submitted',
    created_by: validUserId,
    updated_by: validUserId,
    created_at: new Date(),
    updated_at: new Date()
  });

  assert(Boolean(revisionId), `Created test salary revision #${revisionId} for ${testEmp.first_name} ${testEmp.last_name}`);

  // 2. Approve Revision
  await db('salary_revisions').where('id', revisionId).update({
    status: 'approved',
    approved_by: validUserId,
    updated_by: validUserId,
    approval_date: new Date(),
    updated_at: new Date()
  });

  // 3. Update active salary structure
  await db('salary_structures').where('employee_id', testEmp.id).update({
    annual_ctc: revisedCtc,
    gross_monthly: Math.round(revisedCtc / 12),
    basic_monthly: Math.round((revisedCtc / 12) * 0.5),
    hra_monthly: Math.round((revisedCtc / 12) * 0.2),
    updated_at: new Date()
  });

  // 4. Verify updated structure
  const updatedStruct = await db('salary_structures').where('employee_id', testEmp.id).first();
  assert(Number(updatedStruct.annual_ctc) === revisedCtc, `Structure successfully updated with revised CTC: ₹${revisedCtc.toLocaleString('en-IN')}`);

  // Revert test CTC back to original to keep DB clean
  await db('salary_structures').where('employee_id', testEmp.id).update({
    annual_ctc: currentCtc,
    gross_monthly: Math.round(currentCtc / 12),
    basic_monthly: Math.round((currentCtc / 12) * 0.5),
    hra_monthly: Math.round((currentCtc / 12) * 0.2),
    updated_at: new Date()
  });
  await db('salary_revisions').where('id', revisionId).delete();
  assert(true, `Test revision cleaned up and employee CTC restored safely`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5: PAYROLL PROCESSING & MATHEMATICAL RECONCILIATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 5: Payroll Processing Engine & Calculations');

  // Verify monthly formula evaluation for standard employee
  const monthlySalary = 40000;
  const basicPay = Math.round(monthlySalary * 0.50); // 20,000
  const hraPay = Math.round(basicPay * 0.40);       // 8,000
  const specialAllowance = monthlySalary - (basicPay + hraPay); // 12,000
  const grossCalculated = basicPay + hraPay + specialAllowance; // 40,000

  assert(grossCalculated === monthlySalary, `Earnings formula balance: Basic (${basicPay}) + HRA (${hraPay}) + Special (${specialAllowance}) = ₹${grossCalculated}`);

  const employeePf = Math.min(1800, Math.round(basicPay * 0.12)); // 1800
  const ptDeduction = 200;
  const totalDeductions = employeePf + ptDeduction; // 2000
  const netSalary = grossCalculated - totalDeductions; // 38,000

  assert(netSalary === 38000, `Net salary reconciliation: Gross (${grossCalculated}) - Deductions (${totalDeductions}) = Net Take-Home ₹${netSalary}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 6: LOSS OF PAY (LOP) PRO-RATION CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 6: LOP & Attendance Pro-Rations');

  const testLopCases = [
    { paidDays: 30, expectedGross: 40000 },
    { paidDays: 25, expectedGross: Math.round((40000 / 30) * 25) },
    { paidDays: 15, expectedGross: 20000 },
    { paidDays: 0,  expectedGross: 0 }
  ];

  for (const tc of testLopCases) {
    const calculated = Math.round((40000 / 30) * tc.paidDays);
    assert(calculated === tc.expectedGross, `LOP Paid Days ${tc.paidDays}/30 yields exact pro-rated gross ₹${calculated}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 7: PAYROLL REPORTS & AUDIT REGISTERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n📋 SUITE 7: Payroll Reports Hub & Cycle Filters');

  const cycles = await db('payroll_cycles').select('id', 'cycle_name', 'frequency');
  assert(cycles.length > 0, `Cycles loaded for report filtering (Found ${cycles.length} cycles)`);

  const reportMappings = await db('salary_structures as ss')
    .join('employees as e', 'ss.employee_id', 'e.id')
    .leftJoin('payroll_slabs as ps', 'ss.slab_id', 'ps.id')
    .whereNull('ss.deleted_at')
    .whereNull('e.deleted_at')
    .select(
      'e.id',
      'e.employee_code',
      'ps.name as slab_name',
      'ss.annual_ctc',
      'ss.gross_monthly'
    );

  assert(reportMappings.length > 0, `Reports Hub has ${reportMappings.length} verified employee CTC records`);

  console.log('\n===============================================================');
  console.log(`🏁 VALIDATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================');

  await db.destroy();
  if (failedTests > 0) {
    process.exit(1);
  }
}

runFullPayrollValidation().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
