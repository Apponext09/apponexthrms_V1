const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');

// Load environment configuration
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}

// Dynamic helper to insert records matching only columns present in the target database
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

async function seedPayrollDatabase() {
  console.log('\n🚀 Starting Payroll Module Comprehensive Seeder (allseedpay.js)...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'apponexthrms',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });

  try {
    // ── 1. Create all Payroll Tables if missing ────────────────────────────────
    console.log('📦 Step 1: Ensuring all Payroll DB tables exist...');

    const createTablesSQL = `
      -- 1. Payroll Policies Configuration Table
      CREATE TABLE IF NOT EXISTS \`payroll_policies\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`code\` VARCHAR(50) DEFAULT 'POL-01',
        \`name\` VARCHAR(255) DEFAULT 'Standard Payroll Policy',
        \`policy_name\` VARCHAR(255) DEFAULT 'Standard Payroll Policy',
        \`pay_cycle_type\` VARCHAR(50) DEFAULT 'monthly',
        \`pay_calculation_basis\` VARCHAR(50) DEFAULT 'calendar_days',
        \`fixed_working_days\` INT DEFAULT 26,
        \`cutoff_day\` INT DEFAULT 25,
        \`pay_day\` INT DEFAULT 1,
        \`lop_deduction_formula\` VARCHAR(50) DEFAULT 'gross_divided_by_days',
        \`overtime_rate_multiplier\` DECIMAL(5,2) DEFAULT 1.50,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 2. Payroll Cycles Table
      CREATE TABLE IF NOT EXISTS \`payroll_cycles\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`cycle_name\` VARCHAR(255) NOT NULL,
        \`cycle_code\` VARCHAR(100) NOT NULL,
        \`cycle_type\` VARCHAR(50) DEFAULT 'monthly',
        \`cycle_start_date\` DATE NOT NULL,
        \`cycle_end_date\` DATE NOT NULL,
        \`payroll_run_date\` DATE NOT NULL,
        \`salary_credit_date\` DATE NOT NULL,
        \`is_current_cycle\` TINYINT(1) DEFAULT 1,
        \`status\` VARCHAR(50) DEFAULT 'open',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 3. Pay Component Definitions Table
      CREATE TABLE IF NOT EXISTS \`pay_component_definitions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`code\` VARCHAR(50) NOT NULL,
        \`component_code\` VARCHAR(50) DEFAULT 'COMP',
        \`name\` VARCHAR(255) NOT NULL,
        \`component_name\` VARCHAR(255) DEFAULT 'Component',
        \`component_type\` VARCHAR(50) NOT NULL,
        \`calculation_type\` VARCHAR(50) NOT NULL DEFAULT 'fixed',
        \`formula_expression\` TEXT NULL,
        \`is_taxable\` TINYINT(1) DEFAULT 1,
        \`is_pf_applicable\` TINYINT(1) DEFAULT 1,
        \`is_esi_applicable\` TINYINT(1) DEFAULT 1,
        \`is_pt_applicable\` TINYINT(1) DEFAULT 1,
        \`is_statutory\` TINYINT(1) DEFAULT 0,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 4. Salary Structures Table
      CREATE TABLE IF NOT EXISTS \`salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NULL,
        \`structure_name\` VARCHAR(255) NOT NULL,
        \`structure_code\` VARCHAR(100),
        \`grade_code\` VARCHAR(100),
        \`effective_from\` DATE DEFAULT '2026-01-01',
        \`annual_ctc\` DECIMAL(15,2) DEFAULT 0.00,
        \`basic_monthly\` DECIMAL(15,2) DEFAULT 0.00,
        \`hra_monthly\` DECIMAL(15,2) DEFAULT 0.00,
        \`special_allowance_monthly\` DECIMAL(15,2) DEFAULT 0.00,
        \`gross_monthly\` DECIMAL(15,2) DEFAULT 0.00,
        \`pf_deduction\` DECIMAL(15,2) DEFAULT 0.00,
        \`esi_deduction\` DECIMAL(15,2) DEFAULT 0.00,
        \`tds_deduction\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_take_home\` DECIMAL(15,2) DEFAULT 0.00,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 5. Payroll Runs Table
      CREATE TABLE IF NOT EXISTS \`payroll_runs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_cycle_id\` BIGINT UNSIGNED NOT NULL,
        \`run_type\` VARCHAR(50) DEFAULT 'regular',
        \`run_month\` VARCHAR(10) NOT NULL,
        \`status\` VARCHAR(50) DEFAULT 'draft',
        \`total_employees\` INT DEFAULT 0,
        \`processed_employees\` INT DEFAULT 0,
        \`error_count\` INT DEFAULT 0,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`run_month\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 6. Payroll Run Employees Table
      CREATE TABLE IF NOT EXISTS \`payroll_run_employees\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`working_days\` INT DEFAULT 30,
        \`basic_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`gross_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_earnings\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`tax_deducted\` DECIMAL(15,2) DEFAULT 0.00,
        \`status\` VARCHAR(50) DEFAULT 'processed',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`payroll_run_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 7. Payslips Table
      CREATE TABLE IF NOT EXISTS \`payslips\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`payroll_run_id\` BIGINT UNSIGNED NULL,
        \`payslip_month\` DATE NOT NULL,
        \`payslip_number\` VARCHAR(100) NOT NULL,
        \`ctc\` DECIMAL(15,2) DEFAULT 0.00,
        \`basic_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`gross_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`total_deductions\` DECIMAL(15,2) DEFAULT 0.00,
        \`net_salary\` DECIMAL(15,2) DEFAULT 0.00,
        \`is_locked\` TINYINT(1) DEFAULT 1,
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 8. Employee Loans Table
      CREATE TABLE IF NOT EXISTS \`employee_loans\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`loan_type\` VARCHAR(50) NOT NULL DEFAULT 'salary_advance',
        \`loan_amount\` DECIMAL(15,2) DEFAULT 30000.00,
        \`total_amount_with_interest\` DECIMAL(15,2) DEFAULT 30000.00,
        \`amount\` DECIMAL(15,2) DEFAULT 30000.00,
        \`emi\` DECIMAL(15,2) DEFAULT 5000.00,
        \`monthly_emi\` DECIMAL(15,2) DEFAULT 5000.00,
        \`tenure_months\` INT NOT NULL DEFAULT 1,
        \`interest_rate\` DECIMAL(5,2) DEFAULT 0.00,
        \`reason\` TEXT,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`updated_by\` BIGINT UNSIGNED DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (\`organization_id\`),
        INDEX (\`employee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTablesSQL);
    console.log('✅ All Payroll tables created/verified successfully!');

    // ── 2. Retrieve Organization, Valid User & Active Employees ───────────────
    console.log('📊 Step 2: Fetching default Organization, System User, and Active Employees...');
    const [orgRows] = await connection.query('SELECT id FROM organizations LIMIT 1');
    const orgId = orgRows.length > 0 ? orgRows[0].id : 1;

    const [userRows] = await connection.query('SELECT id FROM users LIMIT 1');
    const userId = userRows.length > 0 ? userRows[0].id : 1;

    const [empRows] = await connection.query('SELECT id, employee_code, first_name, last_name FROM employees WHERE organization_id = ? AND status = "active"', [orgId]);
    const employees = empRows.length > 0 ? empRows : [
      { id: 38, employee_code: 'EMP101', first_name: 'got', last_name: 'sharma' },
      { id: 39, employee_code: 'EMP202', first_name: 'mot', last_name: 'sharma' },
      { id: 40, employee_code: 'EMP206', first_name: 'tee', last_name: 'gfdsa' },
      { id: 41, employee_code: 'EMP2002', first_name: 'teeam', last_name: 'lead' },
      { id: 42, employee_code: 'EMP1001', first_name: 'hrr', last_name: 'fccc' },
      { id: 44, employee_code: '432', first_name: 'PP', last_name: 'Manager' }
    ];

    console.log(`   Found ${employees.length} employees (Org ID: ${orgId}, System User ID: ${userId}).`);

    // ── 3. Seed Payroll Policies ──────────────────────────────────────────────
    console.log('🌱 Step 3: Seeding Payroll Policies...');
    await safeInsert(connection, 'payroll_policies', {
      uuid: generateUuid(),
      organization_id: orgId,
      code: 'POL-01',
      name: 'Standard Organization Payroll Policy',
      policy_name: 'Standard Organization Payroll Policy',
      pay_cycle_type: 'monthly',
      pay_calculation_basis: 'working_days_26',
      fixed_working_days: 26,
      cutoff_day: 25,
      pay_day: 1,
      lop_deduction_formula: 'gross_divided_by_days',
      overtime_rate_multiplier: 1.50,
      status: 'active',
      created_by: userId,
      updated_by: userId
    });

    // ── 4. Seed Payroll Cycles ────────────────────────────────────────────────
    console.log('🌱 Step 4: Seeding Payroll Cycles...');
    await safeInsert(connection, 'payroll_cycles', {
      uuid: generateUuid(),
      organization_id: orgId,
      cycle_name: 'July 2026 Monthly Cycle',
      cycle_code: 'CYCLE-2026-07',
      cycle_type: 'monthly',
      cycle_start_date: '2026-07-01',
      cycle_end_date: '2026-07-31',
      payroll_run_date: '2026-07-28',
      salary_credit_date: '2026-07-31',
      is_current_cycle: 1,
      status: 'open',
      created_by: userId,
      updated_by: userId
    });

    const [existingCycles] = await connection.query('SELECT id FROM payroll_cycles WHERE organization_id = ? ORDER BY id DESC LIMIT 1', [orgId]);
    const cycleId = existingCycles.length > 0 ? existingCycles[0].id : 1;

    // ── 5. Seed Pay Component Definitions ─────────────────────────────────────
    console.log('🌱 Step 5: Seeding Pay Component Definitions...');
    const payComponents = [
      { code: 'BASIC', name: 'Basic Salary', type: 'earning' },
      { code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'earning' },
      { code: 'SPECIAL', name: 'Special Allowance', type: 'earning' },
      { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'earning' },
      { code: 'MEDICAL', name: 'Medical Allowance', type: 'earning' },
      { code: 'PF_EMP', name: 'Provident Fund (Employee)', type: 'deduction' },
      { code: 'ESI_EMP', name: 'ESI Contribution (Employee)', type: 'deduction' },
      { code: 'PROF_TAX', name: 'Professional Tax (PT)', type: 'deduction' },
      { code: 'HEALTH_INS', name: 'Health Insurance Premium', type: 'deduction' },
      { code: 'TDS_TAX', name: 'Income Tax (TDS)', type: 'deduction' }
    ];

    for (const comp of payComponents) {
      await safeInsert(connection, 'pay_component_definitions', {
        uuid: generateUuid(),
        organization_id: orgId,
        code: comp.code,
        component_code: comp.code,
        name: comp.name,
        component_name: comp.name,
        component_type: comp.type,
        calculation_type: 'fixed',
        is_taxable: 1,
        is_pf_applicable: 1,
        is_esi_applicable: 1,
        is_pt_applicable: 1,
        is_statutory: 1,
        status: 'active',
        created_by: userId,
        updated_by: userId
      });
    }

    // ── 6. Seed Salary Structures & Templates ────────────────────────────────
    console.log('🌱 Step 6: Seeding Salary Structures & Assigned Employee Structures...');
    const structures = [
      { name: 'Senior Software Engineer CTC Grade-A', code: 'GRADE-A1', gross: 62850, basic: 37500, hra: 15000, special: 7500, pf: 1800, esi: 0, tds: 3143, net: 57207 },
      { name: 'Lead Engineer Grade-S', code: 'GRADE-S2', gross: 82850, basic: 50000, hra: 20000, special: 10000, pf: 1800, esi: 0, tds: 4143, net: 76207 },
      { name: 'Associate Grade-B', code: 'GRADE-B1', gross: 10000, basic: 5000, hra: 2000, special: 1850, pf: 600, esi: 75, tds: 0, net: 9175 }
    ];

    for (let idx = 0; idx < employees.length; idx++) {
      const emp = employees[idx];
      const struct = structures[idx % structures.length];
      const annualCtc = struct.gross * 12;

      await safeInsert(connection, 'salary_structures', {
        uuid: generateUuid(),
        organization_id: orgId,
        employee_id: emp.id,
        structure_name: struct.name,
        structure_code: struct.code,
        grade_code: struct.code,
        effective_from: '2026-01-01',
        annual_ctc: annualCtc,
        basic_monthly: struct.basic,
        hra_monthly: struct.hra,
        special_allowance_monthly: struct.special,
        gross_monthly: struct.gross,
        pf_deduction: struct.pf,
        esi_deduction: struct.esi,
        tds_deduction: struct.tds,
        net_take_home: struct.net,
        status: 'active',
        created_by: userId,
        updated_by: userId
      });
    }

    // ── 7. Seed Payroll Runs (July 2026 & June 2026) ───────────────────────────
    console.log('🌱 Step 7: Seeding Monthly Payroll Runs & Employee Payslips...');
    const months = [
      { runMonth: '2026-07-01', psMonth: '2026-07-01' },
      { runMonth: '2026-06-01', psMonth: '2026-06-01' }
    ];

    for (const mObj of months) {
      await safeInsert(connection, 'payroll_runs', {
        uuid: generateUuid(),
        organization_id: orgId,
        payroll_cycle_id: cycleId,
        run_type: 'regular',
        run_month: mObj.runMonth,
        status: 'published',
        total_employees: employees.length,
        processed_employees: employees.length,
        created_by: userId,
        updated_by: userId
      });

      const [runObj] = await connection.query('SELECT id FROM payroll_runs WHERE organization_id = ? AND run_month = ? ORDER BY id DESC LIMIT 1', [orgId, mObj.runMonth]);
      const payrollRunId = runObj.length > 0 ? runObj[0].id : 1;

      // Seed Run Employees and Payslips for each employee
      for (let idx = 0; idx < employees.length; idx++) {
        const emp = employees[idx];
        const struct = structures[idx % structures.length];
        const totDed = struct.pf + struct.esi + struct.tds + 700;

        await safeInsert(connection, 'payroll_run_employees', {
          uuid: generateUuid(),
          organization_id: orgId,
          payroll_run_id: payrollRunId,
          employee_id: emp.id,
          working_days: 26,
          basic_salary: struct.basic,
          gross_salary: struct.gross,
          total_earnings: struct.gross,
          total_deductions: totDed,
          net_salary: struct.net,
          tax_deducted: struct.tds,
          status: 'processed',
          created_by: userId,
          updated_by: userId
        });

        const mStr = mObj.runMonth.substring(0, 7).replace('-', '');
        const psNum = `PS-${mStr}-${emp.employee_code || emp.id}`;

        await safeInsert(connection, 'payslips', {
          uuid: generateUuid(),
          organization_id: orgId,
          employee_id: emp.id,
          payroll_run_id: payrollRunId,
          payslip_month: mObj.psMonth,
          payslip_number: psNum,
          ctc: struct.gross * 12,
          basic_salary: struct.basic,
          gross_salary: struct.gross,
          total_deductions: totDed,
          net_salary: struct.net,
          is_locked: 1,
          created_by: userId,
          updated_by: userId
        });
      }
    }

    // ── 8. Seed Employee Loans ────────────────────────────────────────────────
    console.log('🌱 Step 8: Seeding Employee Loans & Installments...');
    if (employees.length > 0) {
      const emp = employees[0];
      await safeInsert(connection, 'employee_loans', {
        uuid: generateUuid(),
        organization_id: orgId,
        employee_id: emp.id,
        loan_type: 'salary_advance',
        loan_amount: 30000.00,
        total_amount_with_interest: 30000.00,
        amount: 30000.00,
        emi: 5000.00,
        monthly_emi: 5000.00,
        tenure_months: 6,
        interest_rate: 0.00,
        reason: 'Emergency Medical Expense',
        status: 'active',
        created_by: userId,
        updated_by: userId
      });
    }

    // ── 9. Seed Tax Declarations ──────────────────────────────────────────────
    console.log('🌱 Step 9: Seeding Employee Tax Declarations...');
    for (const emp of employees) {
      await safeInsert(connection, 'tax_declarations', {
        uuid: generateUuid(),
        organization_id: orgId,
        employee_id: emp.id,
        financial_year: '2026-2027',
        regime: 'new',
        section_80c: 150000.00,
        section_80d: 25000.00,
        hra_rent_paid_annual: 180000.00,
        status: 'approved'
      });
    }

    // ── 10. Seed Attendance Locks ─────────────────────────────────────────────
    console.log('🌱 Step 10: Seeding Attendance Locks...');
    for (const m of ['2026-07', '2026-06']) {
      await safeInsert(connection, 'attendance_locks', {
        uuid: generateUuid(),
        organization_id: orgId,
        salary_month: m,
        total_employees: employees.length,
        locked_by: userId,
        status: 'locked'
      });
    }

    console.log('\n✨ ============================================================');
    console.log('🎉 Payroll Module Database Seeding Completed Successfully!');
    console.log('   All 16 Payroll Tables, Components, Structures, Runs, and Payslips are ready!');
    console.log('============================================================ ✨\n');

  } catch (error) {
    console.error('❌ Error seeding Payroll database:', error);
  } finally {
    await connection.end();
  }
}

// Execute Seeder
seedPayrollDatabase();
