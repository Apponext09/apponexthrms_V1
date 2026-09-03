const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function runComprehensivePayrollAudit() {
  console.log('================================================================================');
  console.log('       APPONEXT HRMS - COMPREHENSIVE PAYROLL SYSTEM HEALTH & INTEGRITY AUDIT    ');
  console.log('================================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms'
  });

  const issues = [];
  const warnings = [];
  const successes = [];

  // SECTION 1: DATABASE TABLES & SCHEMA INTEGRITY
  console.log('▶ 1. AUDITING DATABASE TABLES & SCHEMAS...');
  const requiredTables = [
    'payroll_cycles',
    'payroll_slabs',
    'payroll_component_groups',
    'payroll_components',
    'salary_structures',
    'employee_salary_structures',
    'salary_revisions',
    'payroll_runs',
    'payroll_run_employees',
    'payroll_earnings',
    'payroll_deductions',
    'payslips',
    'employee_loans',
    'loan_repayments',
    'loan_types',
    'full_final_settlements',
    'tax_declarations',
    'tax_investments',
    'payroll_policies',
    'payroll_register_overrides'
  ];

  for (const table of requiredTables) {
    try {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        const [countRes] = await connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
        const count = countRes[0].count;
        successes.push(`Table '${table}' exists with ${count} total records.`);
      } else {
        issues.push(`CRITICAL: Table '${table}' does NOT exist in database!`);
      }
    } catch (err) {
      issues.push(`Error checking table '${table}': ${err.message}`);
    }
  }

  // SECTION 2: ORGANIZATIONS & ACTIVE EMPLOYEES
  console.log('\n▶ 2. AUDITING EMPLOYEES & SALARY STRUCTURE MAPPINGS...');
  const [orgs] = await connection.execute(`SELECT DISTINCT organization_id FROM employees WHERE status = 'active'`);
  console.log(`Found active employees across orgs:`, orgs.map(o => o.organization_id));

  for (const org of orgs) {
    const orgId = org.organization_id;
    const [employees] = await connection.execute(
      `SELECT id, first_name, last_name, employee_code, email, pan, pf_no, uan_no, esic_no, bank_name, account_no, ifsc_code, salary_slab_id FROM employees WHERE organization_id = ? AND status = 'active'`,
      [orgId]
    );

    console.log(`\n  Org #${orgId}: ${employees.length} active employees`);

    // Check how many have salary structures assigned
    const [assignedStructs] = await connection.execute(
      `SELECT ess.employee_id, ss.structure_name, ss.gross_monthly, ss.basic_monthly, ss.annual_ctc 
       FROM employee_salary_structures ess
       JOIN salary_structures ss ON ess.salary_structure_id = ss.id
       WHERE ess.organization_id = ? AND ess.is_current = 1 AND ess.deleted_at IS NULL`,
      [orgId]
    );

    const assignedEmpIds = new Set(assignedStructs.map(s => s.employee_id));
    const [directStructs] = await connection.execute(
      `SELECT employee_id, structure_name, gross_monthly, basic_monthly, annual_ctc 
       FROM salary_structures 
       WHERE organization_id = ? AND employee_id IS NOT NULL AND deleted_at IS NULL`,
      [orgId]
    );
    directStructs.forEach(s => assignedEmpIds.add(s.employee_id));

    let unassignedCount = 0;
    employees.forEach(emp => {
      if (!assignedEmpIds.has(emp.id)) {
        unassignedCount++;
        warnings.push(`Org #${orgId} Employee ${emp.first_name} ${emp.last_name} (ID: ${emp.id}, Code: ${emp.employee_code}) has NO assigned salary structure!`);
      }
    });

    console.log(`    - Employees with salary structure: ${employees.length - unassignedCount} / ${employees.length}`);
    if (unassignedCount > 0) {
      console.log(`    ⚠️ ${unassignedCount} employees lack a salary structure (payroll calculation will need slab resolution)`);
    }

    // Check statutory details completeness
    let missingBank = 0;
    let missingPan = 0;
    employees.forEach(emp => {
      if (!emp.bank_name || !emp.account_no || !emp.ifsc_code) missingBank++;
      if (!emp.pan) missingPan++;
    });
    console.log(`    - Bank Details Complete: ${employees.length - missingBank} / ${employees.length}`);
    console.log(`    - PAN Details Complete: ${employees.length - missingPan} / ${employees.length}`);
  }

  // SECTION 3: PAYROLL CYCLES & SLABS
  console.log('\n▶ 3. AUDITING PAYROLL CYCLES & SLABS...');
  const [cycles] = await connection.execute(`SELECT id, organization_id, cycle_name, frequency, status, is_active FROM payroll_cycles WHERE deleted_at IS NULL`);
  console.log(`Active Payroll Cycles: ${cycles.length}`);
  cycles.forEach(c => {
    console.log(`  - Cycle #${c.id} (Org #${c.organization_id}): "${c.cycle_name}" | Frequency: ${c.frequency} | Status: ${c.status}`);
  });

  const [slabs] = await connection.execute(`SELECT id, organization_id, name, min_ctc, max_ctc, is_active FROM payroll_slabs WHERE deleted_at IS NULL`);
  console.log(`Active Pay Slabs: ${slabs.length}`);
  slabs.forEach(s => {
    console.log(`  - Slab #${s.id} (Org #${s.organization_id}): "${s.name}" (₹${s.min_ctc} - ₹${s.max_ctc})`);
  });

  // SECTION 4: PAYROLL RUNS & GENERATED PAYSLIPS
  console.log('\n▶ 4. AUDITING RECENT PAYROLL RUNS & PAYSLIPS...');
  const [runs] = await connection.execute(
    `SELECT id, organization_id, run_type, run_month, status, total_employees, processed_employees, error_count, created_at 
     FROM payroll_runs 
     ORDER BY id DESC LIMIT 5`
  );
  console.log(`Recent Payroll Runs:`);
  runs.forEach(r => {
    console.log(`  - Run #${r.id} (Org #${r.organization_id}) Month: ${r.run_month} | Status: ${r.status} | Processed: ${r.processed_employees}/${r.total_employees} | Errors: ${r.error_count}`);
  });

  const [payslips] = await connection.execute(
    `SELECT p.id, p.organization_id, p.employee_id, p.payslip_number, p.payslip_month, p.basic_salary, p.gross_salary, p.total_deductions, p.net_salary, p.is_locked,
            e.first_name, e.last_name
     FROM payslips p
     LEFT JOIN employees e ON p.employee_id = e.id
     WHERE p.deleted_at IS NULL
     ORDER BY p.id DESC LIMIT 5`
  );
  console.log(`\nRecent Payslips:`);
  payslips.forEach(p => {
    console.log(`  - Payslip #${p.id} (${p.payslip_number}) for ${p.first_name} ${p.last_name}: Basic ₹${p.basic_salary} | Gross ₹${p.gross_salary} | Deductions ₹${p.total_deductions} | Net ₹${p.net_salary} | Locked: ${p.is_locked ? 'Yes' : 'No'}`);
  });

  // SECTION 5: LOANS & REPAYMENTS INTEGRATION
  console.log('\n▶ 5. AUDITING EMPLOYEE LOANS & REPAYMENT SCHEDULE...');
  const [loans] = await connection.execute(
    `SELECT id, organization_id, employee_id, loan_type, amount, monthly_emi, repaid_amount, outstanding_amount, status 
     FROM employee_loans 
     WHERE deleted_at IS NULL AND status = 'active'`
  );
  console.log(`Active Employee Loans: ${loans.length}`);
  loans.forEach(l => {
    console.log(`  - Loan #${l.id} (Emp #${l.employee_id}): Type: ${l.loan_type} | Total: ₹${l.amount} | EMI: ₹${l.monthly_emi} | Outstanding: ₹${l.outstanding_amount}`);
  });

  // SECTION 6: FULL & FINAL SETTLEMENTS
  console.log('\n▶ 6. AUDITING FULL & FINAL (F&F) SETTLEMENTS...');
  const [settlements] = await connection.execute(
    `SELECT s.id, s.organization_id, s.employee_id, s.exit_date, s.notice_period_recovery, s.leave_encashment_amount, s.gratuity_amount, s.total_settlement_amount, s.status,
            e.first_name, e.last_name
     FROM full_final_settlements s
     LEFT JOIN employees e ON s.employee_id = e.id
     WHERE s.deleted_at IS NULL
     ORDER BY s.id DESC LIMIT 5`
  );
  console.log(`F&F Settlements Count: ${settlements.length}`);
  settlements.forEach(s => {
    console.log(`  - Settlement #${s.id} for ${s.first_name} ${s.last_name}: Exit Date: ${s.exit_date} | Gratuity: ₹${s.gratuity_amount} | Leave Encashment: ₹${s.leave_encashment_amount} | Total: ₹${s.total_settlement_amount} | Status: ${s.status}`);
  });

  // SECTION 7: SUMMARY & DIAGNOSTIC FINDINGS
  console.log('\n================================================================================');
  console.log('                          PAYROLL AUDIT SUMMARY REPORT                          ');
  console.log('================================================================================');
  console.log(`✅ Successes: ${successes.length}`);
  console.log(`⚠️ Warnings:   ${warnings.length}`);
  console.log(`❌ Issues:     ${issues.length}`);

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
    if (warnings.length > 10) console.log(`  ... and ${warnings.length - 10} more.`);
  }

  if (issues.length > 0) {
    console.log('\nCritical Issues Found:');
    issues.forEach(i => console.log(`  - ${i}`));
  } else {
    console.log('\n🎉 All 20 required payroll tables and active datasets are intact!');
  }

  await connection.end();
}

runComprehensivePayrollAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
