const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}

async function safeInsert(connection, tableName, record) {
  try {
    const [cols] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const existingCols = new Set(cols.map(c => c.Field));

    const validData = {};
    for (const [key, val] of Object.entries(record)) {
      if (existingCols.has(key)) {
        validData[key] = val;
      }
    }

    const keys = Object.keys(validData);
    if (keys.length === 0) return;

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders})`;
    const values = Object.values(validData);

    await connection.query(sql, values);
  } catch (err) {
    console.warn(`   ⚠️ Warning seeding ${tableName}:`, err.message);
  }
}

async function seedIshaPayroll() {
  console.log('🚀 Seeding full payroll data for isha@gmail.com...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const [empRows] = await connection.query('SELECT id, organization_id, employee_code FROM employees WHERE email = ?', ['isha@gmail.com']);
    if (empRows.length === 0) {
      console.error('❌ Employee isha@gmail.com not found!');
      return;
    }

    const emp = empRows[0];
    const orgId = emp.organization_id;
    const empId = emp.id;
    const empCode = emp.employee_code || `EMP-${empId}`;

    const [userRows] = await connection.query('SELECT id FROM users LIMIT 1');
    const userId = userRows.length > 0 ? userRows[0].id : 1;

    const [runRows] = await connection.query('SELECT id FROM payroll_runs LIMIT 1');
    const runId = runRows.length > 0 ? runRows[0].id : 1;

    console.log(`Found Employee #${empId} (${empCode}) for isha@gmail.com.`);

    const gross = 62850, basic = 37500, hra = 15000, special = 7500, pf = 1800, esi = 0, tds = 3143, net = 57207;

    // 1. Seed Salary Structure
    await safeInsert(connection, 'salary_structures', {
      uuid: generateUuid(),
      organization_id: orgId,
      employee_id: empId,
      structure_name: 'Senior Software Engineer CTC Grade-A',
      structure_code: 'GRADE-A1',
      grade_code: 'GRADE-A1',
      effective_from: '2026-01-01',
      annual_ctc: gross * 12,
      basic_monthly: basic,
      hra_monthly: hra,
      special_allowance_monthly: special,
      gross_monthly: gross,
      pf_deduction: pf,
      esi_deduction: esi,
      tds_deduction: tds,
      net_take_home: net,
      status: 'active',
      created_by: userId,
      updated_by: userId
    });

    // 2. Seed Monthly Payslips (July 2026 & June 2026)
    const months = ['2026-07', '2026-06'];
    for (const m of months) {
      const psNum = `PS-${m.replace('-', '')}-${empCode}`;
      await safeInsert(connection, 'payslips', {
        uuid: generateUuid(),
        organization_id: orgId,
        employee_id: empId,
        payroll_run_id: runId,
        payslip_month: `${m}-01`,
        payslip_number: psNum,
        ctc: gross * 12,
        basic_salary: basic,
        gross_salary: gross,
        total_deductions: (pf + esi + tds + 700),
        net_salary: net,
        is_locked: 1,
        created_by: userId,
        updated_by: userId
      });
    }

    // 3. Seed Tax Declaration
    await safeInsert(connection, 'tax_declarations', {
      uuid: generateUuid(),
      organization_id: orgId,
      employee_id: empId,
      financial_year: '2026-2027',
      regime: 'new',
      section_80c: 150000.00,
      section_80d: 25000.00,
      hra_rent_paid_annual: 180000.00,
      status: 'submitted'
    });

    console.log('🎉 Successfully seeded full payroll structure, July/June payslips, and tax declarations for isha@gmail.com!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

seedIshaPayroll();
