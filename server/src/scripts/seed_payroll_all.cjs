'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           PAYROLL MODULE — COMPLETE SEED SCRIPT                        ║
 * ║  Covers: Salary Structures, Payroll Runs, Payslips, Salary Revisions,  ║
 * ║          F&F Settlements, Loan Types, Employee Loans, Loan Repayments  ║
 * ║  Safe to run multiple times — uses INSERT IGNORE / upsert patterns     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// ── CONFIG ─────────────────────────────────────────────────────────────────
const DB = { host: 'localhost', port: 3306, user: 'root', password: 'root123', database: 'apponexthrms' };
const ORG_ID    = 68;
const CYCLE_ID  = 126;   // Monthly cycle for org 68
const SLAB_ID_JR = 14;  // Junior slab
const SLAB_ID_SR = 15;  // Senior slab
const ADMIN_USER = 55;   // ajay (org admin)

// Employees in org 68 (from live DB)
const EMPLOYEES = [
  { id: 48, name: 'Amisha Shinde',  code: 'EMP001',      ctc: 480000,  bank: 'HDFC Bank',  account: '501002345678', ifsc: 'HDFC0000123', pan: 'ABCPA1234C', pf: 'MH/48001/01', uan: '100912345678', esic: '4101234567' },
  { id: 49, name: 'Isha Shinde',    code: 'EMP002',      ctc: 360000,  bank: 'ICICI Bank', account: '623401234567', ifsc: 'ICIC0001234', pan: 'BCDPB5678D', pf: 'MH/48001/02', uan: '100912345679', esic: '4101234568' },
  { id: 50, name: 'Isha Shinde',    code: 'EMP0033',     ctc: 360000,  bank: 'SBI',        account: '31234567890',  ifsc: 'SBIN0001234', pan: 'CDEPB9012E', pf: 'MH/48001/03', uan: '100912345680', esic: '4101234569' },
  { id: 51, name: 'Man Shinde',     code: 'EMP00111',    ctc: 420000,  bank: 'Axis Bank',  account: '911010012345', ifsc: 'UTIB0001234', pan: 'DEFPC3456F', pf: 'MH/48001/04', uan: '100912345681', esic: '4101234570' },
  { id: 53, name: 'Vikram Singh',   code: 'EMP-MGR-01',  ctc: 900000,  bank: 'HDFC Bank',  account: '501009876543', ifsc: 'HDFC0000456', pan: 'EFGPD7890G', pf: 'MH/48001/05', uan: '100912345682', esic: null },
  { id: 54, name: 'Rahul Sharma',   code: 'EMP-102',     ctc: 660000,  bank: 'Kotak Bank', account: '1234567890',   ifsc: 'KKBK0001234', pan: 'FGHPE2345H', pf: 'MH/48001/06', uan: '100912345683', esic: null },
  { id: 55, name: 'Ajay User',      code: 'EMP-47',      ctc: 1200000, bank: 'HDFC Bank',  account: '501001234567', ifsc: 'HDFC0000789', pan: 'GHIPF6789I', pf: 'MH/48001/07', uan: '100912345684', esic: null },
  { id: 56, name: 'Priya Verma',    code: 'EMP-HR-001',  ctc: 540000,  bank: 'SBI',        account: '32109876543',  ifsc: 'SBIN0005678', pan: 'HIJPG1234J', pf: 'MH/48001/08', uan: '100912345685', esic: '4101234571' },
  { id: 57, name: 'Rohan Mehta',    code: 'EMP-MGR-002', ctc: 780000,  bank: 'ICICI Bank', account: '623409876543', ifsc: 'ICIC0005678', pan: 'IJKPH5678K', pf: 'MH/48001/09', uan: '100912345686', esic: null },
  { id: 58, name: 'Siddharth Rao',  code: 'EMP-DEV-501', ctc: 720000,  bank: 'Axis Bank',  account: '911010087654', ifsc: 'UTIB0005678', pan: 'JKLPI9012L', pf: 'MH/48001/10', uan: '100912345687', esic: null },
];

function calcBreakdown(annualCtc) {
  const monthly    = annualCtc / 12;
  const basic      = Math.round(monthly * 0.4);
  const hra        = Math.round(monthly * 0.2);
  const special    = Math.round(monthly * 0.25);
  const pf         = Math.round(basic * 0.12);
  const esi        = annualCtc <= 252000 ? Math.round(monthly * 0.0075) : 0;
  const tds        = annualCtc > 500000 ? Math.round((annualCtc - 250000) * 0.05 / 12) : 0;
  const gross      = basic + hra + special;
  const net        = gross - pf - esi - tds;
  return { monthly, basic, hra, special, pf, esi, tds, gross, net };
}

async function clearOldSeedData(conn) {
  console.log('\n  Clearing old seed data (keeping production rows)...');
  // Only remove rows created by this seed (identified by processing_notes or reason)
  await conn.query("DELETE FROM payroll_run_employees WHERE processing_notes LIKE '%[SEED]%'").catch(() => {});
  await conn.query("DELETE FROM payslips WHERE payslip_number LIKE 'SEED%'").catch(() => {});
  await conn.query("DELETE FROM payroll_runs WHERE processing_notes LIKE '%[SEED]%'").catch(() => {});
  await conn.query("DELETE FROM salary_structures WHERE structure_code LIKE 'SEED-%'").catch(() => {});
  await conn.query("DELETE FROM employee_salary_structures WHERE created_by = 9999").catch(() => {});
  await conn.query("DELETE FROM salary_revisions WHERE reason_description LIKE '%[SEED]%'").catch(() => {});
  await conn.query("DELETE FROM full_final_settlements WHERE settlement_notes LIKE '%[SEED]%'").catch(() => {});
  await conn.query("DELETE FROM loan_repayments WHERE loan_id IN (SELECT id FROM employee_loans WHERE reason LIKE '%[SEED]%')").catch(() => {});
  await conn.query("DELETE FROM employee_loans WHERE reason LIKE '%[SEED]%'").catch(() => {});
  await conn.query("DELETE FROM loan_types WHERE created_by = 9999 AND organization_id = ?", [ORG_ID]).catch(() => {});
  console.log('  Done clearing.');
}

// ══════════════════════════════════════════════════════════════════════════
async function seedLoanTypes(conn) {
  console.log('\n[1/8] LOAN TYPES...');
  const types = [
    { name: 'Personal Loan',    max_amount: 200000,  interest_rate: 10.0, is_taxable: 0, max_tenure_months: 36 },
    { name: 'Home Loan',        max_amount: 5000000, interest_rate: 7.5,  is_taxable: 0, max_tenure_months: 240 },
    { name: 'Vehicle Loan',     max_amount: 500000,  interest_rate: 9.0,  is_taxable: 0, max_tenure_months: 60 },
    { name: 'Emergency Loan',   max_amount: 100000,  interest_rate: 0.0,  is_taxable: 0, max_tenure_months: 12 },
    { name: 'Education Loan',   max_amount: 300000,  interest_rate: 6.0,  is_taxable: 0, max_tenure_months: 48 },
    { name: 'Salary Advance',   max_amount: 50000,   interest_rate: 0.0,  is_taxable: 0, max_tenure_months: 3  },
    { name: 'Medical Loan',     max_amount: 150000,  interest_rate: 4.0,  is_taxable: 0, max_tenure_months: 24 },
  ];
  const ids = {};
  for (const t of types) {
    const [ex] = await conn.query('SELECT id FROM loan_types WHERE organization_id=? AND name=? AND deleted_at IS NULL', [ORG_ID, t.name]);
    if (ex.length === 0) {
      const [r] = await conn.query(
        'INSERT INTO loan_types (uuid,organization_id,name,max_amount,interest_rate,is_taxable,max_tenure_months,created_by) VALUES (?,?,?,?,?,?,?,9999)',
        [uuidv4(), ORG_ID, t.name, t.max_amount, t.interest_rate, t.is_taxable, t.max_tenure_months]
      );
      ids[t.name] = r.insertId;
      console.log('  + Loan type: ' + t.name + ' (id=' + r.insertId + ')');
    } else {
      ids[t.name] = ex[0].id;
      console.log('  ~ Exists: ' + t.name);
    }
  }
  return ids;
}

// ══════════════════════════════════════════════════════════════════════════
async function seedSalaryStructures(conn) {
  console.log('\n[2/8] SALARY STRUCTURES...');
  const ssIds = {};
  for (const emp of EMPLOYEES) {
    const code = 'SEED-' + emp.code;
    const [ex] = await conn.query('SELECT id FROM salary_structures WHERE structure_code=? AND organization_id=?', [code, ORG_ID]);
    if (ex.length > 0) { ssIds[emp.id] = ex[0].id; console.log('  ~ Exists for ' + emp.name); continue; }

    const b = calcBreakdown(emp.ctc);
    const slabId = emp.ctc >= 600000 ? SLAB_ID_SR : SLAB_ID_JR;
    const [r] = await conn.query(`INSERT INTO salary_structures
      (uuid,organization_id,structure_name,structure_code,description,employee_id,
       annual_ctc,basic_monthly,hra_monthly,special_allowance_monthly,
       gross_monthly,pf_deduction,esi_deduction,tds_deduction,net_take_home,
       effective_from,status,cycle_id,slab_id,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), ORG_ID,
       emp.name + ' Salary Structure', code,
       'Auto-generated by payroll seed [SEED]',
       emp.id, emp.ctc,
       b.basic, b.hra, b.special,
       b.gross, b.pf, b.esi, b.tds, b.net,
       '2026-04-01', 'active', CYCLE_ID, slabId, ADMIN_USER, ADMIN_USER]);
    ssIds[emp.id] = r.insertId;
    console.log('  + Structure for ' + emp.name + ' — CTC ₹' + emp.ctc.toLocaleString() + ' net ₹' + b.net.toLocaleString() + '/mo (id=' + r.insertId + ')');
  }
  return ssIds;
}

// ══════════════════════════════════════════════════════════════════════════
async function seedPayrollRuns(conn) {
  console.log('\n[3/8] PAYROLL RUNS (Apr–Aug 2026)...');
  const months = [
    { month: '2026-04-01', label: 'April 2026',  status: 'published' },
    { month: '2026-05-01', label: 'May 2026',    status: 'published' },
    { month: '2026-06-01', label: 'June 2026',   status: 'published' },
    { month: '2026-07-01', label: 'July 2026',   status: 'published' },
    { month: '2026-08-01', label: 'August 2026', status: 'draft'     },
  ];
  const runIds = {};
  for (const m of months) {
    const [ex] = await conn.query(
      "SELECT id FROM payroll_runs WHERE organization_id=? AND payroll_cycle_id=? AND run_month=? AND processing_notes LIKE '%[SEED]%'",
      [ORG_ID, CYCLE_ID, m.month]
    );
    if (ex.length > 0) { runIds[m.month] = ex[0].id; console.log('  ~ Exists: ' + m.label); continue; }

    const [r] = await conn.query(`INSERT INTO payroll_runs
      (uuid,organization_id,payroll_cycle_id,run_type,run_month,status,
       total_employees,processed_employees,processing_notes,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), ORG_ID, CYCLE_ID, 'regular', m.month, m.status,
       EMPLOYEES.length, m.status === 'published' ? EMPLOYEES.length : 0,
       '[SEED] Auto-generated by payroll seed script', ADMIN_USER, ADMIN_USER]);
    runIds[m.month] = r.insertId;
    if (m.status === 'published') {
      await conn.query("UPDATE payroll_runs SET published_at=NOW(),approved_by=?,approved_at=NOW() WHERE id=?", [ADMIN_USER, r.insertId]);
    }
    console.log('  + ' + m.label + ' run (id=' + r.insertId + ') — ' + m.status);
  }
  return runIds;
}

// ══════════════════════════════════════════════════════════════════════════
async function seedPayrollRunEmployees(conn, runIds) {
  console.log('\n[4/8] PAYROLL RUN EMPLOYEES & PAYSLIPS...');
  const publishedMonths = [
    '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01'
  ];
  let preCount = 0, psCount = 0;

  for (const month of publishedMonths) {
    const runId = runIds[month];
    if (!runId) continue;
    const monthDate = new Date(month);
    const monthStr  = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    for (const emp of EMPLOYEES) {
      // Skip if already exists
      const [ex] = await conn.query(
        "SELECT id FROM payroll_run_employees WHERE payroll_run_id=? AND employee_id=? AND processing_notes LIKE '%[SEED]%'",
        [runId, emp.id]
      );
      if (ex.length > 0) continue;

      const b           = calcBreakdown(emp.ctc);
      const workingDays = 26;
      const leaveDays   = Math.floor(Math.random() * 2);
      const unpaidDays  = 0;

      // payroll_run_employees
      await conn.query(`INSERT INTO payroll_run_employees
        (uuid,organization_id,payroll_run_id,employee_id,status,
         working_days,leave_days,paid_leave_days,unpaid_leave_days,
         total_earnings,total_deductions,net_salary,tax_deducted,
         processing_notes,processed_at,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,?)`,
        [uuidv4(), ORG_ID, runId, emp.id, 'processed',
         workingDays, leaveDays, leaveDays, unpaidDays,
         b.gross, b.pf + b.esi + b.tds, b.net, b.tds,
         '[SEED] Auto-generated by payroll seed', ADMIN_USER, ADMIN_USER]);
      preCount++;

      // payslip
      const psNum = 'SEED-' + emp.code + '-' + month.substring(0, 7).replace('-', '');
      const [exPs] = await conn.query('SELECT id FROM payslips WHERE payslip_number=?', [psNum]);
      if (exPs.length === 0) {
        await conn.query(`INSERT INTO payslips
          (uuid,organization_id,employee_id,payroll_run_id,
           payslip_month,salary_month,payslip_number,
           ctc,base_salary,basic_salary,gross_salary,
           total_allowances,total_deductions,net_salary,
           pf_contribution,esi_contribution,tax_deduction,
           ytd_gross,ytd_tax,ytd_net,days_worked,
           payment_mode,payment_date,is_locked,
           bank_name,account_no,ifsc_code,pf_no,uan_no,esic_no,pan,
           created_by,updated_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), ORG_ID, emp.id, runId,
           month, month, psNum,
           emp.ctc, b.monthly, b.basic, b.gross,
           b.hra + b.special, b.pf + b.esi + b.tds, b.net,
           b.pf, b.esi, b.tds,
           b.gross * (publishedMonths.indexOf(month) + 1),
           b.tds  * (publishedMonths.indexOf(month) + 1),
           b.net  * (publishedMonths.indexOf(month) + 1),
           workingDays - leaveDays,
           'bank_transfer',
           new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).toISOString().split('T')[0],
           1,
           emp.bank, emp.account, emp.ifsc, emp.pf, emp.uan, emp.esic || null, emp.pan,
           ADMIN_USER, ADMIN_USER]);
        psCount++;
      }
    }
    console.log('  + ' + monthStr + ' — ' + EMPLOYEES.length + ' employees processed');
  }
  console.log('  Total new payroll_run_employees: ' + preCount + ', payslips: ' + psCount);
}

// ══════════════════════════════════════════════════════════════════════════
async function seedSalaryRevisions(conn) {
  console.log('\n[5/8] SALARY REVISIONS...');
  const revisions = [
    { empId: 48, empName: 'Amisha Shinde',  oldCtc: 420000, newCtc: 480000, type: 'increment', reason: 'Annual appraisal FY2026 [SEED]', status: 'approved', fromDate: '2026-04-01' },
    { empId: 49, empName: 'Isha Shinde',    oldCtc: 300000, newCtc: 360000, type: 'increment', reason: 'Performance bonus revision [SEED]', status: 'approved', fromDate: '2026-04-01' },
    { empId: 51, empName: 'Man Shinde',     oldCtc: 360000, newCtc: 420000, type: 'increment', reason: 'Annual appraisal FY2026 [SEED]', status: 'approved', fromDate: '2026-04-01' },
    { empId: 53, empName: 'Vikram Singh',   oldCtc: 800000, newCtc: 900000, type: 'promotion', reason: 'Promoted to Senior Manager [SEED]', status: 'approved', fromDate: '2026-04-01' },
    { empId: 54, empName: 'Rahul Sharma',   oldCtc: 600000, newCtc: 660000, type: 'increment', reason: 'Annual appraisal FY2026 [SEED]', status: 'approved', fromDate: '2026-04-01' },
    { empId: 58, empName: 'Siddharth Rao',  oldCtc: 600000, newCtc: 720000, type: 'promotion', reason: 'Promoted to Senior Dev [SEED]', status: 'submitted', fromDate: '2026-08-01' },
    { empId: 56, empName: 'Priya Verma',    oldCtc: 480000, newCtc: 540000, type: 'increment', reason: 'Annual appraisal FY2026 [SEED]', status: 'approved',  fromDate: '2026-04-01' },
    { empId: 57, empName: 'Rohan Mehta',    oldCtc: 720000, newCtc: 780000, type: 'increment', reason: 'Annual appraisal FY2026 [SEED]', status: 'submitted', fromDate: '2026-08-01' },
  ];

  let count = 0;
  for (const rev of revisions) {
    const [ex] = await conn.query(
      "SELECT id FROM salary_revisions WHERE employee_id=? AND organization_id=? AND reason_description LIKE '%[SEED]%' AND effective_from=?",
      [rev.empId, ORG_ID, rev.fromDate]
    );
    if (ex.length > 0) { console.log('  ~ Exists for ' + rev.empName); continue; }

    const incPct  = (((rev.newCtc - rev.oldCtc) / rev.oldCtc) * 100).toFixed(2);
    const incAmt  = rev.newCtc - rev.oldCtc;
    await conn.query(`INSERT INTO salary_revisions
      (uuid,organization_id,employee_id,revision_type,effective_from,
       old_ctc,new_ctc,increment_percentage,increment_amount,
       reason_description,status,approved_by,approval_date,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), ORG_ID, rev.empId, rev.type, rev.fromDate,
       rev.oldCtc, rev.newCtc, incPct, incAmt,
       rev.reason, rev.status,
       rev.status === 'approved' ? ADMIN_USER : null,
       rev.status === 'approved' ? '2026-03-25' : null,
       ADMIN_USER, ADMIN_USER]);
    console.log('  + Revision: ' + rev.empName + ' ₹' + rev.oldCtc.toLocaleString() + ' → ₹' + rev.newCtc.toLocaleString() + ' (+' + incPct + '%) [' + rev.status + ']');
    count++;
  }
  console.log('  Total new revisions: ' + count);
}

// ══════════════════════════════════════════════════════════════════════════
async function seedLoans(conn, loanTypeIds) {
  console.log('\n[6/8] EMPLOYEE LOANS...');

  const personalId  = loanTypeIds['Personal Loan']  || null;
  const homeId      = loanTypeIds['Home Loan']       || null;
  const vehicleId   = loanTypeIds['Vehicle Loan']    || null;
  const emergencyId = loanTypeIds['Emergency Loan']  || null;
  const advanceId   = loanTypeIds['Salary Advance']  || null;
  const educId      = loanTypeIds['Education Loan']  || null;
  const medId       = loanTypeIds['Medical Loan']    || null;

  const loans = [
    // emp 48 — Personal Loan active
    { empId: 48, empName: 'Amisha Shinde',  typeId: personalId,  typeName: 'personal',       amount: 150000, tenure: 24, rate: 10, startDate: '2026-01-15', status: 'active'   },
    // emp 49 — Home Loan active
    { empId: 49, empName: 'Isha Shinde',    typeId: homeId,      typeName: 'home',            amount: 2500000,tenure: 120,rate: 7.5,startDate: '2025-09-01', status: 'active'   },
    // emp 50 — Vehicle Loan active
    { empId: 50, empName: 'Isha Shinde 2',  typeId: vehicleId,   typeName: 'vehicle',         amount: 300000, tenure: 36, rate: 9,  startDate: '2026-03-01', status: 'active'   },
    // emp 51 — Education Loan approved
    { empId: 51, empName: 'Man Shinde',     typeId: educId,      typeName: 'education',       amount: 200000, tenure: 24, rate: 6,  startDate: '2026-04-01', status: 'approved' },
    // emp 53 — Emergency Loan completed
    { empId: 53, empName: 'Vikram Singh',   typeId: emergencyId, typeName: 'emergency',       amount: 50000,  tenure: 6,  rate: 0,  startDate: '2025-06-01', status: 'completed'},
    // emp 54 — Personal Loan pending approval
    { empId: 54, empName: 'Rahul Sharma',   typeId: personalId,  typeName: 'personal',       amount: 100000, tenure: 12, rate: 10, startDate: '2026-08-01', status: 'pending'  },
    // emp 56 — Salary Advance active
    { empId: 56, empName: 'Priya Verma',    typeId: advanceId,   typeName: 'salary_advance',  amount: 30000,  tenure: 3,  rate: 0,  startDate: '2026-07-01', status: 'active'   },
    // emp 57 — Vehicle Loan active
    { empId: 57, empName: 'Rohan Mehta',    typeId: vehicleId,   typeName: 'vehicle',         amount: 450000, tenure: 48, rate: 9,  startDate: '2026-02-01', status: 'active'   },
    // emp 58 — Medical Loan pending
    { empId: 58, empName: 'Siddharth Rao',  typeId: medId,       typeName: 'medical',         amount: 80000,  tenure: 12, rate: 4,  startDate: '2026-08-01', status: 'pending'  },
  ];

  const loanIds = [];
  for (const loan of loans) {
    const [ex] = await conn.query(
      "SELECT id FROM employee_loans WHERE employee_id=? AND organization_id=? AND reason LIKE '%[SEED]%' AND loan_amount=?",
      [loan.empId, ORG_ID, loan.amount]
    );
    if (ex.length > 0) { loanIds.push({ id: ex[0].id, ...loan }); console.log('  ~ Exists for ' + loan.empName); continue; }

    const monthlyRate = loan.rate / 12 / 100;
    let emi;
    if (loan.rate === 0) {
      emi = Math.round(loan.amount / loan.tenure);
    } else {
      emi = Math.round(loan.amount * monthlyRate * Math.pow(1 + monthlyRate, loan.tenure) / (Math.pow(1 + monthlyRate, loan.tenure) - 1));
    }
    const total = emi * loan.tenure;

    // Calculate repaid amount for active/completed
    let repaidMonths = 0;
    if (loan.status === 'active' || loan.status === 'completed') {
      const start = new Date(loan.startDate);
      const now   = new Date('2026-08-11');
      repaidMonths = Math.min(loan.tenure, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30)));
      if (loan.status === 'completed') repaidMonths = loan.tenure;
    }
    const repaid      = emi * repaidMonths;
    const outstanding = Math.max(0, total - repaid);

    const [r] = await conn.query(`INSERT INTO employee_loans
      (uuid,organization_id,employee_id,loan_type,loan_type_id,loan_amount,amount,
       loan_date,tenure_months,interest_rate,emi,monthly_emi,
       total_amount_with_interest,repaid_amount,outstanding_amount,
       status,reason,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), ORG_ID, loan.empId, loan.typeName, loan.typeId,
       loan.amount, loan.amount, loan.startDate, loan.tenure, loan.rate,
       emi, emi, total, repaid, outstanding,
       loan.status, '[SEED] ' + loan.typeName + ' loan application for ' + loan.empName, ADMIN_USER, ADMIN_USER]);
    loanIds.push({ id: r.insertId, ...loan, emi, repaidMonths, total });
    console.log('  + Loan for ' + loan.empName + ' ₹' + loan.amount.toLocaleString() + ' @ ' + loan.rate + '% EMI=₹' + emi + ' [' + loan.status + ']');
  }
  return loanIds;
}

// ══════════════════════════════════════════════════════════════════════════
async function seedLoanRepayments(conn, loans) {
  console.log('\n[7/8] LOAN REPAYMENTS (EMI schedule)...');
  let repayCount = 0;

  for (const loan of loans) {
    if (!loan.id || !['active', 'completed', 'approved'].includes(loan.status)) continue;
    if (loan.status === 'approved') continue; // not disbursed yet

    // Check if repayments already exist for this loan
    const [ex] = await conn.query('SELECT COUNT(*) as cnt FROM loan_repayments WHERE loan_id=?', [loan.id]);
    if (ex[0].cnt > 0) { console.log('  ~ Repayments exist for loan_id=' + loan.id); continue; }

    const monthlyRate = (loan.rate || 0) / 12 / 100;
    const startDate   = new Date(loan.startDate);
    let   balance     = loan.amount;

    for (let i = 1; i <= loan.tenure; i++) {
      const dueDate       = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      const dueDateStr    = dueDate.toISOString().split('T')[0];
      const interestAmt   = loan.rate > 0 ? Math.round(balance * monthlyRate) : 0;
      const principalAmt  = loan.emi - interestAmt;
      balance             = Math.max(0, balance - principalAmt);

      const now       = new Date('2026-08-11');
      const isPast    = dueDate < now;
      const status    = loan.status === 'completed' ? 'paid' : (isPast ? 'paid' : 'pending');
      const paidDate  = status === 'paid' ? dueDate.toISOString().split('T')[0] : null;

      await conn.query(`INSERT INTO loan_repayments
        (uuid,organization_id,loan_id,emi_number,emi_amount,
         interest_amount,principal_amount,due_date,paid_date,status,created_by,updated_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), ORG_ID, loan.id, i, loan.emi,
         interestAmt, principalAmt, dueDateStr, paidDate, status, ADMIN_USER, ADMIN_USER]);
      repayCount++;
    }
    console.log('  + ' + loan.tenure + ' EMI rows for loan_id=' + loan.id + ' (' + loan.empName + ')');
  }
  console.log('  Total new repayment rows: ' + repayCount);
}

// ══════════════════════════════════════════════════════════════════════════
async function seedSettlements(conn) {
  console.log('\n[8/8] F&F SETTLEMENTS...');
  const settlements = [
    {
      empId: 50, empName: 'Isha Shinde (EMP0033)',
      exitDate: '2026-07-31', noticeDays: 30, noticeRecovery: 0,
      leaveEnc: 15000, gratuity: 32000, bonus: 10000,
      assetRecovery: 0, otherDeductions: 0, notes: '[SEED] Resigned by mutual consent',
      status: 'approved'
    },
    {
      empId: 51, empName: 'Man Shinde',
      exitDate: '2026-08-31', noticeDays: 30, noticeRecovery: 0,
      leaveEnc: 8000, gratuity: 0, bonus: 5000,
      assetRecovery: 5000, otherDeductions: 0, notes: '[SEED] Contract completion',
      status: 'draft'
    },
  ];

  let count = 0;
  for (const s of settlements) {
    const [ex] = await conn.query(
      "SELECT id FROM full_final_settlements WHERE employee_id=? AND organization_id=? AND settlement_notes LIKE '%[SEED]%'",
      [s.empId, ORG_ID]
    );
    if (ex.length > 0) { console.log('  ~ Exists for ' + s.empName); continue; }

    const total = s.leaveEnc + s.gratuity + s.bonus - s.assetRecovery - s.otherDeductions - s.noticeRecovery;
    await conn.query(`INSERT INTO full_final_settlements
      (uuid,organization_id,employee_id,exit_date,notice_period_days,notice_period_recovery,
       leave_encashment_amount,gratuity_amount,bonus_settlement,
       asset_recovery_amount,other_deductions,total_settlement_amount,
       status,settlement_notes,approved_by,approval_date,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), ORG_ID, s.empId, s.exitDate, s.noticeDays, s.noticeRecovery,
       s.leaveEnc, s.gratuity, s.bonus,
       s.assetRecovery, s.otherDeductions, total,
       s.status, s.notes,
       s.status === 'approved' ? ADMIN_USER : null,
       s.status === 'approved' ? '2026-08-05' : null,
       ADMIN_USER, ADMIN_USER]);
    console.log('  + Settlement for ' + s.empName + ' total=₹' + total.toLocaleString() + ' [' + s.status + ']');
    count++;
  }
  console.log('  Total new settlements: ' + count);
}

// ══════════════════════════════════════════════════════════════════════════
async function printSummary(conn) {
  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              PAYROLL SEED SUMMARY                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  const tables = [
    'loan_types', 'salary_structures', 'employee_salary_structures',
    'payroll_runs', 'payroll_run_employees', 'payslips',
    'salary_revisions', 'employee_loans', 'loan_repayments',
    'full_final_settlements'
  ];
  for (const t of tables) {
    try {
      const [r]   = await conn.query('SELECT COUNT(*) as cnt FROM ' + t + ' WHERE organization_id=?', [ORG_ID]);
      const [all] = await conn.query('SELECT COUNT(*) as cnt FROM ' + t);
      console.log('  ' + t.padEnd(34) + r[0].cnt + ' (org) / ' + all[0].cnt + ' (total)');
    } catch(e) { console.log('  ' + t + ': N/A'); }
  }
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        PAYROLL MODULE — COMPLETE SEED SCRIPT            ║');
  console.log('║  Organization: ' + String('aa org (id=' + ORG_ID + ')').padEnd(39) + '  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const conn = await mysql.createConnection(DB);

  await clearOldSeedData(conn);

  const loanTypeIds = await seedLoanTypes(conn);
  await seedSalaryStructures(conn);
  const runIds      = await seedPayrollRuns(conn);
  await seedPayrollRunEmployees(conn, runIds);
  await seedSalaryRevisions(conn);
  const loans       = await seedLoans(conn, loanTypeIds);
  await seedLoanRepayments(conn, loans);
  await seedSettlements(conn);
  await printSummary(conn);

  await conn.end();
  console.log('✅  SEED COMPLETE — All payroll data is now in the database.\n');
}

main().catch(function(e) { console.error('\n❌ SEED FAILED:', e.message); process.exit(1); });
