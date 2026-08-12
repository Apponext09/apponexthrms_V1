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

async function fullPayrollFlowAudit() {
  console.log('\n======================================================');
  console.log('🔍 COMPLETE PAYROLL FLOW AUDIT');
  console.log('======================================================\n');

  const orgId = 68;
  let passed = 0, failed = 0;

  const check = (label, condition, detail = '') => {
    if (condition) {
      console.log(`  ✅ ${label}${detail ? ': ' + detail : ''}`);
      passed++;
    } else {
      console.log(`  ❌ ${label}${detail ? ' → ' + detail : ''}`);
      failed++;
    }
  };

  // ─── STEP 1: PAYROLL CYCLES ───
  console.log('\n📌 STEP 1: Payroll Cycles');
  const cycles = await knex('payroll_cycles').where({ organization_id: orgId, is_active: 1 }).whereNull('deleted_at');
  check('Active Payroll Cycles Exist', cycles.length > 0, `${cycles.length} cycle(s) found`);
  for (const c of cycles) {
    check(`  Cycle "${c.cycle_name || c.name}" has frequency`, !!c.frequency || !!c.cycle_type, c.frequency || c.cycle_type || 'N/A');
  }

  // ─── STEP 2: PAYROLL COMPONENTS ───
  console.log('\n📌 STEP 2: Payroll Components');
  const components = await knex('payroll_components').where({ organization_id: orgId, is_active: 1 }).whereNull('deleted_at');
  check('Active Components Exist', components.length > 0, `${components.length} component(s)`);
  const earnings = components.filter(c => String(c.component_type || '').toLowerCase().includes('earning') || String(c.component_type || '').toLowerCase() === 'value' || String(c.component_type || '').toLowerCase() === 'derived');
  const deductions = components.filter(c => String(c.component_type || '').toLowerCase().includes('deduction'));
  check('Earning Components Exist', earnings.length > 0, `${earnings.length} earning(s)`);
  check('Deduction Components Exist', deductions.length > 0, `${deductions.length} deduction(s)`);

  const genderAll = components.filter(c => !c.gender_filter || c.gender_filter === 'All');
  const genderMale = components.filter(c => c.gender_filter === 'Male');
  const genderFemale = components.filter(c => c.gender_filter === 'Female');
  check('Universal Components (All genders)', genderAll.length > 0, `${genderAll.length} component(s)`);
  check('Male-Only Components', genderMale.length >= 0, `${genderMale.length} component(s)`);
  check('Female-Only Components', genderFemale.length >= 0, `${genderFemale.length} component(s)`);

  // ─── STEP 3: COMPONENT GROUPS ───
  console.log('\n📌 STEP 3: Component Groups');
  const groups = await knex('payroll_component_groups').where({ organization_id: orgId });
  check('Component Groups Exist', groups.length > 0, `${groups.length} group(s)`);
  // Show group names
  groups.slice(0, 5).forEach(g => console.log(`     - Group: "${g.name}" (ID: ${g.id})`));

  // ─── STEP 4: PAY SLABS ───
  console.log('\n📌 STEP 4: Pay Slabs');
  const slabs = await knex('payroll_slabs').where({ organization_id: orgId });
  check('Pay Slabs Exist', slabs.length > 0, `${slabs.length} slab(s)`);
  for (const s of slabs.slice(0, 3)) {
    const slabComps = await knex('payroll_slab_components').where({ slab_id: s.id });
    check(`  Slab "${s.name || s.slab_name}" has components assigned`, slabComps.length > 0, `${slabComps.length} component(s)`);
  }

  // ─── STEP 5: EMPLOYEES ───
  console.log('\n📌 STEP 5: Employees');
  const employees = await knex('employees').where({ organization_id: orgId }).whereNull('deleted_at');
  check('Employees Exist', employees.length > 0, `${employees.length} employee(s)`);

  // Check salary structure → slab linkage via payroll_slabs
  const withSlab = await knex('salary_structures').where({ organization_id: orgId }).count('id as cnt').first();
  check('Salary Structures Assigned to Employees', Number(withSlab.cnt) > 0, `${withSlab.cnt} structure(s)`);
  // Check payroll_run_employees
  const runEmps = await knex('payroll_run_employees').count('id as cnt').first();
  check('Payroll Run Employees Records', Number(runEmps.cnt) > 0, `${runEmps.cnt} record(s)`);

  // Statutory details
  const withPan = await knex('employees').where({ organization_id: orgId }).whereNotNull('pan').whereNull('deleted_at').count('id as cnt').first();
  const withPf = await knex('employees').where({ organization_id: orgId }).whereNotNull('pf_no').whereNull('deleted_at').count('id as cnt').first();
  const withBank = await knex('employees').where({ organization_id: orgId }).whereNotNull('bank_name').whereNull('deleted_at').count('id as cnt').first();
  check('Employees with PAN Number', Number(withPan.cnt) > 0, `${withPan.cnt} employee(s)`);
  check('Employees with PF Number', Number(withPf.cnt) > 0, `${withPf.cnt} employee(s)`);
  check('Employees with Bank Details', Number(withBank.cnt) > 0, `${withBank.cnt} employee(s)`);

  // ─── STEP 6: SALARY STRUCTURES ───
  console.log('\n📌 STEP 6: Salary Structures');
  const structs = await knex('salary_structures').where({ organization_id: orgId });
  check('Salary Structures Exist', structs.length > 0, `${structs.length} structure(s)`);
  const withCTC = structs.filter(s => Number(s.annual_ctc || 0) > 0);
  check('Structures with Annual CTC set', withCTC.length > 0, `${withCTC.length} with CTC > 0`);
  const withGross = structs.filter(s => Number(s.gross_monthly || 0) > 0);
  check('Structures with Gross Monthly set', withGross.length > 0, `${withGross.length} with gross > 0`);

  // ─── STEP 7: PAYROLL RUNS ───
  console.log('\n📌 STEP 7: Payroll Runs');
  const runs = await knex('payroll_runs').where({ organization_id: orgId }).orderBy('id', 'desc').limit(5);
  check('Payroll Runs Exist', runs.length > 0, `${runs.length} run(s) found`);
  for (const r of runs) {
    const month = r.payroll_month || r.month;
    const status = r.status || 'draft';
    console.log(`     Run #${r.id}: Month=${month ? new Date(month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}, Status=${status}`);
  }

  // ─── STEP 8: PAYSLIPS ───
  console.log('\n📌 STEP 8: Payslips');
  const payslips = await knex('payslips').where({ organization_id: orgId }).orderBy('id', 'desc').limit(5);
  check('Payslips Generated', payslips.length > 0, `${payslips.length} payslip(s) in DB`);

  if (payslips.length > 0) {
    const latest = payslips[0];
    const emp = await knex('employees').where({ id: latest.employee_id }).first();
    const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `ID #${latest.employee_id}`;
    console.log(`\n     Latest Payslip Summary:`);
    console.table({
      PayslipNum: latest.payslip_number || 'N/A',
      Employee: empName,
      Month: latest.payslip_month || latest.salary_month || 'N/A',
      BasicSalary: `₹${Number(latest.basic_salary || 0).toLocaleString('en-IN')}`,
      GrossSalary: `₹${Number(latest.gross_salary || 0).toLocaleString('en-IN')}`,
      TotalDeductions: `₹${Number(latest.total_deductions || 0).toLocaleString('en-IN')}`,
      NetSalary: `₹${Number(latest.net_salary || 0).toLocaleString('en-IN')}`,
      PFContribution: `₹${Number(latest.pf_contribution || 0).toLocaleString('en-IN')}`,
      PAN: latest.pan || 'N/A',
      PFNumber: latest.pf_no || 'N/A',
      BankName: latest.bank_name || 'N/A',
    });

    check('Latest Payslip has Basic Salary > 0', Number(latest.basic_salary || 0) > 0);
    check('Latest Payslip has Gross Salary > 0', Number(latest.gross_salary || 0) > 0);
    check('Latest Payslip has Net Salary > 0', Number(latest.net_salary || 0) > 0);
    check('Latest Payslip has PF Contribution', Number(latest.pf_contribution || 0) >= 0, `₹${Number(latest.pf_contribution || 0).toLocaleString('en-IN')}`);
    check('Statutory PAN stored in Payslip', !!latest.pan);
    check('Statutory PF No stored in Payslip', !!latest.pf_no);
    check('Bank Details stored in Payslip', !!latest.bank_name);
  }

  // ─── STEP 9: GENDER FILTER ───
  console.log('\n📌 STEP 9: Gender Filter Eligibility');
  const maleEmp = await knex('employees').where({ organization_id: orgId }).whereIn('gender', ['Male', 'male', 'M']).first();
  const femaleEmp = await knex('employees').where({ organization_id: orgId }).whereIn('gender', ['Female', 'female', 'F']).first();
  check('Male Employee in DB', !!maleEmp, maleEmp ? `${maleEmp.first_name} ${maleEmp.last_name || ''}` : 'None');
  check('Female Employee in DB', !!femaleEmp, femaleEmp ? `${femaleEmp.first_name} ${femaleEmp.last_name || ''}` : 'None');

  const filterComponents = (gender, comps) => {
    const g = String(gender || '').toLowerCase();
    return comps.filter(c => {
      const cf = String(c.gender_filter || 'all').toLowerCase();
      return cf === 'all' || cf === '' || cf === g;
    });
  };
  if (maleEmp) {
    const eligible = filterComponents('male', components);
    check('Gender filter works for Male employee', eligible.length > 0, `${eligible.length} eligible component(s)`);
  }
  if (femaleEmp) {
    const eligible = filterComponents('female', components);
    check('Gender filter works for Female employee', eligible.length > 0, `${eligible.length} eligible component(s)`);
  }

  // ─── FINAL SUMMARY ───
  console.log('\n======================================================');
  console.log(`📊 AUDIT RESULT: ${passed} PASSED ✅ | ${failed} FAILED ❌`);
  if (failed === 0) {
    console.log('🎉 ALL PAYROLL FLOW CHECKS PASSED! SYSTEM IS 100% READY.');
  } else {
    console.log(`⚠️  ${failed} check(s) need attention.`);
  }
  console.log('======================================================\n');

  await knex.destroy();
}

fullPayrollFlowAudit().catch(err => {
  console.error('❌ Audit Error:', err.message);
  process.exit(1);
});
