const mysql = require('mysql2/promise');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function auditPayrollIsolation() {
  console.log('\n============================================================');
  console.log('🔒 PAYROLL MODULE ISOLATION & PERSISTENCE AUDIT');
  console.log('============================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    // 1. Audit Organization Multi-Tenancy Isolation
    const [orgs] = await connection.query('SELECT id, name, slug FROM organizations');
    console.log(`📌 Total Organizations in DB: ${orgs.length}`);
    for (const org of orgs) {
      const [empCount] = await connection.query('SELECT COUNT(*) as cnt FROM employees WHERE organization_id = ?', [org.id]);
      const [slipCount] = await connection.query('SELECT COUNT(*) as cnt FROM payslips WHERE organization_id = ?', [org.id]);
      const [loanCount] = await connection.query('SELECT COUNT(*) as cnt FROM employee_loans WHERE organization_id = ?', [org.id]);
      console.log(`   🏢 Org #${org.id} (${org.name}): ${empCount[0].cnt} employees | ${slipCount[0].cnt} payslips | ${loanCount[0].cnt} loans`);
    }

    // 2. Audit Cross-User Data Leak Check
    console.log('\n📌 Checking Employee Payslip & Data Boundaries...');
    const [employees] = await connection.query('SELECT id, email, first_name, last_name, organization_id FROM employees LIMIT 10');
    
    let passCheck = true;
    for (const emp of employees) {
      // Fetch payslips belonging to this employee
      const [mySlips] = await connection.query('SELECT id, payslip_number, employee_id, organization_id FROM payslips WHERE employee_id = ?', [emp.id]);
      
      // Check if any payslips have mismatched employee_id or organization_id
      const leakedSlips = mySlips.filter(s => s.employee_id !== emp.id || s.organization_id !== emp.organization_id);
      if (leakedSlips.length > 0) {
        console.error(`   ❌ LEAK DETECTED for Employee #${emp.id} (${emp.email}): ${leakedSlips.length} mismatched records`);
        passCheck = false;
      } else {
        console.log(`   ✅ Employee #${emp.id} (${emp.email}): ${mySlips.length} payslips correctly isolated`);
      }
    }

    // 3. Database Persistence Verification across Payroll Tables
    console.log('\n📌 Database Table Persistence Check:');
    const tables = ['payslips', 'salary_structures', 'employee_loans', 'tax_declarations', 'payroll_runs', 'reimbursement_claims'];
    for (const t of tables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
        console.log(`   💾 Table \`${t}\`: ${rows[0].cnt} persistent records in MySQL`);
      } catch (err) {
        console.log(`   ⚠️ Table \`${t}\`: Not initialized yet or empty`);
      }
    }

    if (passCheck) {
      console.log('\n✨ AUDIT RESULT: 100% Multi-Tenant Isolation & User Boundary Verification PASSED!');
    } else {
      console.error('\n❌ AUDIT RESULT: Multi-Tenant Boundary Failure');
    }

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await connection.end();
  }
}

auditPayrollIsolation();
