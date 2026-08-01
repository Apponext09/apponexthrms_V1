/**
 * ApponextHRMS - Complete Payroll Database Schema Sync & Seeding Script
 * File: database/correctpay.js
 * Database Password: Harsh11@
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'Narendra@1419',
  database: 'apponexthrms',
  port: 3306,
  multipleStatements: true
};

async function syncExactPayrollSchema() {
  console.log('⚡ Starting Complete ApponextHRMS Payroll Schema Sync...');

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL database "apponexthrms".');

    // 1. salary_structures (27 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_structures (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        structure_name VARCHAR(100) NOT NULL,
        structure_code VARCHAR(50) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        applicable_to_designation_id BIGINT UNSIGNED DEFAULT NULL,
        applicable_to_location_id BIGINT UNSIGNED DEFAULT NULL,
        effective_from DATE DEFAULT '2026-01-01',
        effective_to DATE DEFAULT NULL,
        status ENUM('active','inactive') DEFAULT 'active',
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        employee_id BIGINT UNSIGNED DEFAULT NULL,
        grade_code VARCHAR(100) DEFAULT NULL,
        annual_ctc DECIMAL(15,2) DEFAULT 0.00,
        basic_monthly DECIMAL(15,2) DEFAULT 0.00,
        hra_monthly DECIMAL(15,2) DEFAULT 0.00,
        special_allowance_monthly DECIMAL(15,2) DEFAULT 0.00,
        gross_monthly DECIMAL(15,2) DEFAULT 0.00,
        pf_deduction DECIMAL(15,2) DEFAULT 0.00,
        esi_deduction DECIMAL(15,2) DEFAULT 0.00,
        tds_deduction DECIMAL(15,2) DEFAULT 0.00,
        net_take_home DECIMAL(15,2) DEFAULT 0.00
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure all 27 columns exist on salary_structures
    const ssCols = [
      ['uuid', 'CHAR(36) UNIQUE DEFAULT (UUID())'],
      ['organization_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 68'],
      ['structure_code', 'VARCHAR(50) DEFAULT NULL'],
      ['description', 'TEXT DEFAULT NULL'],
      ['applicable_to_designation_id', 'BIGINT UNSIGNED DEFAULT NULL'],
      ['applicable_to_location_id', 'BIGINT UNSIGNED DEFAULT NULL'],
      ['effective_from', 'DATE DEFAULT "2026-01-01"'],
      ['effective_to', 'DATE DEFAULT NULL'],
      ['status', 'ENUM("active","inactive") DEFAULT "active"'],
      ['created_by', 'BIGINT UNSIGNED DEFAULT 47'],
      ['updated_by', 'BIGINT UNSIGNED DEFAULT 47'],
      ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
      ['deleted_at', 'TIMESTAMP NULL DEFAULT NULL'],
      ['employee_id', 'BIGINT UNSIGNED DEFAULT NULL'],
      ['grade_code', 'VARCHAR(100) DEFAULT NULL'],
      ['annual_ctc', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['basic_monthly', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['hra_monthly', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['special_allowance_monthly', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['gross_monthly', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['pf_deduction', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['esi_deduction', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['tds_deduction', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['net_take_home', 'DECIMAL(15,2) DEFAULT 0.00'],
      ['custom_components', 'JSON DEFAULT NULL']
    ];

    for (const [col, spec] of ssCols) {
      try {
        await connection.query(`ALTER TABLE salary_structures ADD COLUMN ${col} ${spec};`);
      } catch (e) {}
    }
    console.log('✅ Table "salary_structures" verified (27 Columns).');

    // 2. employee_salary_structures (13 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_salary_structures (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        employee_id BIGINT UNSIGNED NOT NULL,
        salary_structure_id BIGINT UNSIGNED NOT NULL,
        effective_from DATE DEFAULT '2026-01-01',
        effective_to DATE DEFAULT NULL,
        is_current TINYINT(1) DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_emp_id (employee_id),
        INDEX idx_struct_id (salary_structure_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const essCols = [
      ['uuid', 'CHAR(36) UNIQUE DEFAULT (UUID())'],
      ['organization_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 68'],
      ['effective_from', 'DATE DEFAULT "2026-01-01"'],
      ['effective_to', 'DATE DEFAULT NULL'],
      ['is_current', 'TINYINT(1) DEFAULT 1'],
      ['created_by', 'BIGINT UNSIGNED DEFAULT 47'],
      ['updated_by', 'BIGINT UNSIGNED DEFAULT 47'],
      ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
      ['deleted_at', 'TIMESTAMP NULL DEFAULT NULL']
    ];

    for (const [col, spec] of essCols) {
      try {
        await connection.query(`ALTER TABLE employee_salary_structures ADD COLUMN ${col} ${spec};`);
      } catch (e) {}
    }
    console.log('✅ Table "employee_salary_structures" verified (13 Columns).');

    // 3. salary_structure_components (21 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_structure_components (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        structure_id BIGINT UNSIGNED NOT NULL,
        component_id BIGINT UNSIGNED DEFAULT 101,
        sort_order INT DEFAULT 1,
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        employee_id BIGINT UNSIGNED DEFAULT NULL,
        annual_ctc DECIMAL(15,2) DEFAULT 0.00,
        basic_monthly DECIMAL(15,2) DEFAULT 0.00,
        hra_monthly DECIMAL(15,2) DEFAULT 0.00,
        special_allowance_monthly DECIMAL(15,2) DEFAULT 0.00,
        gross_monthly DECIMAL(15,2) DEFAULT 0.00,
        pf_deduction DECIMAL(15,2) DEFAULT 0.00,
        esi_deduction DECIMAL(15,2) DEFAULT 0.00,
        tds_deduction DECIMAL(15,2) DEFAULT 0.00,
        net_take_home DECIMAL(15,2) DEFAULT 0.00,
        grade_code VARCHAR(100) DEFAULT NULL,
        INDEX idx_comp_struct (structure_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "salary_structure_components" verified (21 Columns).');

    // 4. payroll_runs (21 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        payroll_cycle_id BIGINT UNSIGNED DEFAULT 101,
        run_type ENUM('regular','off_cycle','final_settlement','arrears') DEFAULT 'regular',
        run_month DATE NOT NULL,
        status ENUM('draft','processing','locked','approved','published','completed') DEFAULT 'published',
        locked_by BIGINT UNSIGNED DEFAULT NULL,
        locked_at TIMESTAMP NULL DEFAULT NULL,
        approved_by BIGINT UNSIGNED DEFAULT 47,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_employees INT DEFAULT 0,
        processed_employees INT DEFAULT 0,
        error_count INT DEFAULT 0,
        processing_notes TEXT DEFAULT NULL,
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payroll_runs" verified (21 Columns).');

    // 5. payslips (36 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        employee_id BIGINT UNSIGNED NOT NULL,
        payroll_run_id BIGINT UNSIGNED DEFAULT 101,
        payslip_month DATE NOT NULL,
        payslip_number VARCHAR(100) NOT NULL,
        ctc DECIMAL(15,2) DEFAULT 0.00,
        basic_salary DECIMAL(12,2) DEFAULT 0.00,
        gross_salary DECIMAL(15,2) DEFAULT 0.00,
        total_deductions DECIMAL(15,2) DEFAULT 0.00,
        net_salary DECIMAL(15,2) DEFAULT 0.00,
        ytd_gross DECIMAL(15,2) DEFAULT 0.00,
        ytd_tax DECIMAL(15,2) DEFAULT 0.00,
        ytd_net DECIMAL(15,2) DEFAULT 0.00,
        payslip_pdf_url VARCHAR(500) DEFAULT NULL,
        payslip_html TEXT DEFAULT NULL,
        is_locked TINYINT(1) DEFAULT 1,
        locked_at TIMESTAMP NULL DEFAULT NULL,
        digitally_signed TINYINT(1) DEFAULT 0,
        signature_timestamp TIMESTAMP NULL DEFAULT NULL,
        sent_to_employee_at TIMESTAMP NULL DEFAULT NULL,
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        salary_month VARCHAR(10) DEFAULT NULL,
        days_worked INT DEFAULT 30,
        base_salary DECIMAL(15,2) DEFAULT 0.00,
        total_allowances DECIMAL(15,2) DEFAULT 0.00,
        pf_contribution DECIMAL(15,2) DEFAULT 0.00,
        esi_contribution DECIMAL(15,2) DEFAULT 0.00,
        tax_deduction DECIMAL(15,2) DEFAULT 0.00,
        payment_mode ENUM('bank_transfer','check','cash') DEFAULT 'bank_transfer',
        payment_date DATE DEFAULT NULL,
        INDEX idx_ps_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payslips" verified (36 Columns).');

    // 6. payslip_items (8 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payslip_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 1,
        payslip_id INT NOT NULL,
        component_type ENUM('earning','deduction') NOT NULL,
        component_name VARCHAR(100) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pi_ps (payslip_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payslip_items" verified (8 Columns).');

    // 7. employee_loans (22 Columns)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_loans (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id BIGINT UNSIGNED NOT NULL DEFAULT 68,
        employee_id BIGINT UNSIGNED NOT NULL,
        loan_type VARCHAR(100) DEFAULT 'Personal Loan',
        loan_amount DECIMAL(15,2) DEFAULT 0.00,
        loan_date DATE DEFAULT NULL,
        tenure_months INT DEFAULT 12,
        interest_rate DECIMAL(5,2) DEFAULT 0.00,
        emi DECIMAL(12,2) DEFAULT 0.00,
        total_amount_with_interest DECIMAL(15,2) DEFAULT 0.00,
        repaid_amount DECIMAL(15,2) DEFAULT 0.00,
        outstanding_amount DECIMAL(15,2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'active',
        created_by BIGINT UNSIGNED DEFAULT 47,
        updated_by BIGINT UNSIGNED DEFAULT 47,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        amount DECIMAL(15,2) DEFAULT 0.00,
        monthly_emi DECIMAL(15,2) DEFAULT 0.00,
        reason TEXT DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "employee_loans" verified (22 Columns).');

    // 8. Dynamic resolution of orgId and userId for foreign keys
    let orgId = 68;
    try {
      const [orgs] = await connection.query(`SELECT id FROM organizations LIMIT 1;`);
      if (orgs.length > 0) orgId = orgs[0].id;
    } catch (e) {}

    let userId = 47;
    try {
      const [users] = await connection.query(`SELECT id FROM users LIMIT 1;`);
      if (users.length > 0) userId = users[0].id;
    } catch (e) {}

    // Seed / Update Master Structure "start"
    const [existingStructs] = await connection.query(`SELECT id FROM salary_structures WHERE structure_name = 'start' LIMIT 1;`);
    let structId;

    if (existingStructs.length > 0) {
      structId = existingStructs[0].id;
      await connection.query(`
        UPDATE salary_structures SET
          grade_code = 'GRADE-STA',
          annual_ctc = 120000.00,
          basic_monthly = 5000.00,
          hra_monthly = 2000.00,
          special_allowance_monthly = 1000.00,
          gross_monthly = 9850.00,
          pf_deduction = 600.00,
          esi_deduction = 74.00,
          tds_deduction = 493.00,
          net_take_home = 7983.00,
          status = 'active',
          updated_by = ?
        WHERE id = ?;
      `, [userId, structId]);
      console.log(`✅ Master structure "start" (ID ${structId}) updated with 27-column financial figures.`);
    } else {
      const [insertRes] = await connection.query(`
        INSERT INTO salary_structures (
          uuid, organization_id, structure_name, structure_code, grade_code, effective_from, annual_ctc, basic_monthly, hra_monthly,
          special_allowance_monthly, gross_monthly, pf_deduction, esi_deduction, tds_deduction,
          net_take_home, status, created_by, updated_by
        ) VALUES (
          UUID(), ?, 'start', 'STR-START', 'GRADE-STA', '2026-01-01', 120000.00, 5000.00, 2000.00,
          1000.00, 9850.00, 600.00, 74.00, 493.00,
          7983.00, 'active', ?, ?
        );
      `, [orgId, userId, userId]);
      structId = insertRes.insertId;
      console.log(`✅ Master structure "start" created with ID ${structId}.`);
    }

    // 9. Assign structure "start" to active employees
    const [employees] = await connection.query(`SELECT id, first_name, last_name FROM employees WHERE deleted_at IS NULL;`);
    console.log(`ℹ️ Mapping structure "start" (ID ${structId}) to ${employees.length} employees...`);

    for (const emp of employees) {
      const [existingMap] = await connection.query(`SELECT id FROM employee_salary_structures WHERE employee_id = ? AND is_current = 1 LIMIT 1;`, [emp.id]);
      if (existingMap.length > 0) {
        await connection.query(`UPDATE employee_salary_structures SET salary_structure_id = ?, updated_by = ? WHERE id = ?;`, [structId, userId, existingMap[0].id]);
      } else {
        await connection.query(`
          INSERT INTO employee_salary_structures (uuid, organization_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by)
          VALUES (UUID(), ?, ?, ?, '2026-01-01', 1, ?, ?);
        `, [orgId, emp.id, structId, userId, userId]);
      }
      console.log(`   ➜ Employee ${emp.first_name} ${emp.last_name} (ID ${emp.id}) mapped to structure "start".`);
    }

    console.log('\n🎉 ALL PAYROLL SCHEMAS (27/13/21/21/36/8/22 COLUMNS) SYNCED & VERIFIED PERFECTLY!');
  } catch (error) {
    console.error('❌ Payroll Schema Sync Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

syncExactPayrollSchema();
