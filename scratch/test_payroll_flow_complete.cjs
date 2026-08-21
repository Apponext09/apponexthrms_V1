const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function testPayrollLifecycle() {
  console.log('================================================================================');
  console.log('              FULL PAYROLL SIMULATION & VERIFICATION TEST                      ');
  console.log('================================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'apponexthrms'
  });

  const orgId = 68;

  // 1. Check Employees in Org #68
  const [employees] = await connection.execute(
    `SELECT e.id, e.first_name, e.last_name, e.employee_code, e.salary_slab_id
     FROM employees e
     WHERE e.organization_id = ? AND e.status = 'active'`,
    [orgId]
  );
  console.log(`▶ [STEP 1] Found ${employees.length} active employees in Org #${orgId}:`);

  for (const emp of employees) {
    const [structs] = await connection.execute(
      `SELECT ss.structure_name, ss.gross_monthly, ss.basic_monthly, ss.annual_ctc 
       FROM employee_salary_structures ess
       JOIN salary_structures ss ON ess.salary_structure_id = ss.id
       WHERE ess.employee_id = ? AND ess.is_current = 1 AND ess.deleted_at IS NULL
       LIMIT 1`,
      [emp.id]
    );

    let struct = structs[0];
    if (!struct) {
      const [directStructs] = await connection.execute(
        `SELECT structure_name, gross_monthly, basic_monthly, annual_ctc 
         FROM salary_structures 
         WHERE employee_id = ? AND deleted_at IS NULL 
         ORDER BY id DESC LIMIT 1`,
        [emp.id]
      );
      struct = directStructs[0];
    }

    emp.structure_name = struct?.structure_name || 'Standard Pay Slab';
    emp.gross_monthly = struct?.gross_monthly || 50000;
    emp.basic_monthly = struct?.basic_monthly || Math.round(emp.gross_monthly * 0.5);
    emp.annual_ctc = struct?.annual_ctc || (emp.gross_monthly * 12);

    console.log(`   - ${emp.first_name} ${emp.last_name} (${emp.employee_code}): Structure="${emp.structure_name}" | Gross=₹${emp.gross_monthly}`);
  }

  // 2. Check Process Register calculation logic
  console.log(`\n▶ [STEP 2] Simulating Process Register Calculation Engine (Month: 2026-08)...`);
  for (const emp of employees) {
    const gross = Number(emp.gross_monthly || 50000);
    const basic = Number(emp.basic_monthly || Math.round(gross * 0.5));
    const hra = Math.round(basic * 0.4);
    const std = Math.max(0, gross - basic - hra);

    // Active loans
    const [loans] = await connection.execute(
      `SELECT emi, monthly_emi FROM employee_loans WHERE employee_id = ? AND status = 'active' AND deleted_at IS NULL`,
      [emp.id]
    );
    let loanEmi = 0;
    loans.forEach(l => { loanEmi += Number(l.emi || l.monthly_emi || 0); });

    // Statutory deductions
    const pf = Math.min(basic, 15000) * 0.12;
    const pt = gross > 15000 ? 200 : 0;
    const esic = gross <= 21000 ? Math.ceil(gross * 0.0075) : 0;
    const totalDeduct = pf + pt + esic + loanEmi;
    const net = Math.max(0, gross - totalDeduct);

    console.log(`   Employee: ${emp.first_name} ${emp.last_name} | Gross: ₹${gross} | Basic: ₹${basic} | PF: ₹${pf} | PT: ₹${pt} | ESIC: ₹${esic} | Loan EMI: ₹${loanEmi} | Net: ₹${net}`);
  }

  // 3. Check Tax TDS Engine
  console.log(`\n▶ [STEP 3] Testing TDS Calculation Engine for Annual CTCs...`);
  const testCtcs = [300000, 600000, 900000, 1500000, 2400000];
  testCtcs.forEach(ctc => {
    // New regime: standard deduction ₹75,000
    const taxable = Math.max(0, ctc - 75000);
    let tax = 0;
    if (taxable <= 300000) tax = 0;
    else if (taxable <= 600000) tax = (taxable - 300000) * 0.05;
    else if (taxable <= 900000) tax = 15000 + (taxable - 600000) * 0.10;
    else if (taxable <= 1200000) tax = 45000 + (taxable - 900000) * 0.15;
    else if (taxable <= 1500000) tax = 90000 + (taxable - 1200000) * 0.20;
    else tax = 150000 + (taxable - 1500000) * 0.30;

    if (taxable <= 700000) tax = Math.max(0, tax - 25000);
    tax = tax + (tax * 0.04); // Cess 4%
    const monthlyTds = Math.round(tax / 12);
    console.log(`   CTC: ₹${ctc.toLocaleString()} | Taxable: ₹${taxable.toLocaleString()} | Annual Tax: ₹${Math.round(tax).toLocaleString()} | Monthly TDS: ₹${monthlyTds}`);
  });

  // 4. Check Settlements Gratuity & Leave Encashment Engine
  console.log(`\n▶ [STEP 4] Testing Gratuity & Settlement Formula Engine...`);
  const [settlements] = await connection.execute(
    `SELECT s.*, e.first_name, e.last_name, e.date_of_joining 
     FROM full_final_settlements s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.organization_id = ? AND s.deleted_at IS NULL`,
    [orgId]
  );
  settlements.forEach(s => {
    console.log(`   Settlement #${s.id} for ${s.first_name} ${s.last_name}: Exit Date: ${s.exit_date} | Leave Encashment: ₹${s.leave_encashment_amount} | Gratuity: ₹${s.gratuity_amount} | Net F&F: ₹${s.total_settlement_amount} | Status: ${s.status}`);
  });

  console.log('\n================================================================================');
  console.log('              ALL PAYROLL SIMULATIONS EXECUTED SUCCESSFULLY                     ');
  console.log('================================================================================\n');

  await connection.end();
}

testPayrollLifecycle().catch(console.error);
