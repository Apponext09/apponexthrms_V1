'use strict';
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root123', database: 'apponexthrms'
  });

  // ── 1. Create loan_types table if missing ──────────────────────────────
  const [exists] = await conn.query("SHOW TABLES LIKE 'loan_types'");
  if (exists.length === 0) {
    await conn.query(`
      CREATE TABLE loan_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL DEFAULT (UUID()),
        organization_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        max_amount DECIMAL(15,2) DEFAULT 100000,
        interest_rate DECIMAL(5,2) DEFAULT 0,
        is_taxable TINYINT(1) DEFAULT 0,
        max_tenure_months INT DEFAULT 24,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_org (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ loan_types table CREATED');
  } else {
    console.log('ℹ️  loan_types table already exists');
  }

  // ── 2. Seed default loan types for every organization ─────────────────
  const [orgs] = await conn.query(
    'SELECT DISTINCT organization_id FROM employees WHERE organization_id IS NOT NULL AND deleted_at IS NULL'
  );
  const defaultTypes = [
    { name: 'Personal Loan',   max_amount: 200000,  interest_rate: 10,  is_taxable: 0, max_tenure_months: 36 },
    { name: 'Home Loan',       max_amount: 5000000, interest_rate: 7.5, is_taxable: 0, max_tenure_months: 240 },
    { name: 'Vehicle Loan',    max_amount: 500000,  interest_rate: 9,   is_taxable: 0, max_tenure_months: 60 },
    { name: 'Emergency Loan',  max_amount: 100000,  interest_rate: 0,   is_taxable: 0, max_tenure_months: 12 },
    { name: 'Education Loan',  max_amount: 300000,  interest_rate: 6,   is_taxable: 0, max_tenure_months: 48 },
  ];
  for (const org of orgs) {
    const [existing] = await conn.query(
      'SELECT COUNT(*) as cnt FROM loan_types WHERE organization_id=? AND deleted_at IS NULL',
      [org.organization_id]
    );
    if (existing[0].cnt === 0) {
      for (const t of defaultTypes) {
        await conn.query(
          'INSERT INTO loan_types (organization_id, name, max_amount, interest_rate, is_taxable, max_tenure_months) VALUES (?,?,?,?,?,?)',
          [org.organization_id, t.name, t.max_amount, t.interest_rate, t.is_taxable, t.max_tenure_months]
        );
      }
      console.log('✅ Seeded 5 loan types for org_id=' + org.organization_id);
    } else {
      console.log('ℹ️  Org ' + org.organization_id + ' already has ' + existing[0].cnt + ' loan types');
    }
  }

  // ── 3. Add loan_type_id to employee_loans if missing ──────────────────
  const [loanCols] = await conn.query('SHOW COLUMNS FROM employee_loans');
  const colNames = loanCols.map(c => c.Field);
  if (!colNames.includes('loan_type_id')) {
    await conn.query('ALTER TABLE employee_loans ADD COLUMN loan_type_id INT NULL AFTER loan_type');
    console.log('✅ Added loan_type_id column to employee_loans');
  } else {
    console.log('ℹ️  employee_loans.loan_type_id already exists');
  }

  // ── 4. Final summary ───────────────────────────────────────────────────
  const [ltCount]  = await conn.query('SELECT COUNT(*) as cnt FROM loan_types');
  const [elCount]  = await conn.query('SELECT COUNT(*) as cnt FROM employee_loans');
  const [ffsCount] = await conn.query('SELECT COUNT(*) as cnt FROM full_final_settlements');
  const [prCount]  = await conn.query('SELECT COUNT(*) as cnt FROM payroll_runs');
  const [psCount]  = await conn.query('SELECT COUNT(*) as cnt FROM payslips');
  const [srCount]  = await conn.query('SELECT COUNT(*) as cnt FROM salary_revisions');

  console.log('\n=== DB SUMMARY ===');
  console.log('loan_types:               ', ltCount[0].cnt, 'rows');
  console.log('employee_loans:           ', elCount[0].cnt, 'rows');
  console.log('full_final_settlements:   ', ffsCount[0].cnt, 'rows');
  console.log('payroll_runs:             ', prCount[0].cnt, 'rows');
  console.log('payslips:                 ', psCount[0].cnt, 'rows');
  console.log('salary_revisions:         ', srCount[0].cnt, 'rows');

  await conn.end();
  console.log('\n✅ All done!');
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
