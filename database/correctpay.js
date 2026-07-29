/**
 * ApponextHRMS - Correct Payroll Database Initialization & Seeding Script
 * File: database/correctpay.js
 * Database Password: root123
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'apponexthrms',
  port: 3306,
  multipleStatements: true
};

async function initializeCorrectPayroll() {
  console.log('⚡ Starting ApponextHRMS Payroll DB Sync & Setup...');

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL database "apponexthrms".');

    // 1. Create / Alter salary_structures
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_structures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        structure_name VARCHAR(100) NOT NULL,
        grade_code VARCHAR(50) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        annual_ctc DECIMAL(12,2) DEFAULT 0.00,
        basic_monthly DECIMAL(12,2) DEFAULT 0.00,
        hra_monthly DECIMAL(12,2) DEFAULT 0.00,
        special_allowance_monthly DECIMAL(12,2) DEFAULT 0.00,
        gross_monthly DECIMAL(12,2) DEFAULT 0.00,
        pf_deduction DECIMAL(12,2) DEFAULT 0.00,
        esi_deduction DECIMAL(12,2) DEFAULT 0.00,
        tds_deduction DECIMAL(12,2) DEFAULT 0.00,
        net_take_home DECIMAL(12,2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'INR',
        is_active TINYINT(1) DEFAULT 1,
        created_by INT DEFAULT 47,
        updated_by INT DEFAULT 47,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure all financial columns exist in salary_structures
    const columnsToAdd = [
      ['annual_ctc', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['basic_monthly', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['hra_monthly', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['special_allowance_monthly', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['gross_monthly', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['pf_deduction', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['esi_deduction', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['tds_deduction', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['net_take_home', 'DECIMAL(12,2) DEFAULT 0.00'],
      ['grade_code', 'VARCHAR(50) DEFAULT NULL']
    ];

    for (const [col, colType] of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE salary_structures ADD COLUMN ${col} ${colType};`);
      } catch (err) {
        // Ignore duplicate column error
      }
    }
    console.log('✅ Table "salary_structures" verified.');

    // 2. Create employee_salary_structures
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_salary_structures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        employee_id INT NOT NULL,
        salary_structure_id INT NOT NULL,
        effective_from DATE DEFAULT '2026-01-01',
        effective_to DATE DEFAULT NULL,
        is_current TINYINT(1) DEFAULT 1,
        created_by INT DEFAULT 47,
        updated_by INT DEFAULT 47,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        INDEX idx_emp_id (employee_id),
        INDEX idx_struct_id (salary_structure_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "employee_salary_structures" verified.');

    // 3. Create salary_structure_components
    await connection.query(`
      CREATE TABLE IF NOT EXISTS salary_structure_components (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        structure_id INT NOT NULL,
        component_id INT DEFAULT 101,
        employee_id INT DEFAULT NULL,
        grade_code VARCHAR(50) DEFAULT NULL,
        annual_ctc DECIMAL(12,2) DEFAULT 0.00,
        basic_monthly DECIMAL(12,2) DEFAULT 0.00,
        hra_monthly DECIMAL(12,2) DEFAULT 0.00,
        special_allowance_monthly DECIMAL(12,2) DEFAULT 0.00,
        gross_monthly DECIMAL(12,2) DEFAULT 0.00,
        pf_deduction DECIMAL(12,2) DEFAULT 0.00,
        esi_deduction DECIMAL(12,2) DEFAULT 0.00,
        tds_deduction DECIMAL(12,2) DEFAULT 0.00,
        net_take_home DECIMAL(12,2) DEFAULT 0.00,
        sort_order INT DEFAULT 1,
        created_by INT DEFAULT 47,
        updated_by INT DEFAULT 47,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comp_struct (structure_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    for (const [col, colType] of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE salary_structure_components ADD COLUMN ${col} ${colType};`);
      } catch (err) {}
    }
    console.log('✅ Table "salary_structure_components" verified.');

    // 4. Create payroll_runs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        payroll_cycle_id INT DEFAULT 101,
        run_type ENUM('regular','off_cycle','final_settlement') DEFAULT 'regular',
        run_month DATE NOT NULL,
        status ENUM('draft','processing','calculated','locked','approved','published') DEFAULT 'published',
        locked_by INT DEFAULT NULL,
        locked_at DATETIME DEFAULT NULL,
        approved_by INT DEFAULT 47,
        approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_employees INT DEFAULT 0,
        processed_employees INT DEFAULT 0,
        error_count INT DEFAULT 0,
        created_by INT DEFAULT 47,
        updated_by INT DEFAULT 47,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payroll_runs" verified.');

    // 5. Create payslips
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        employee_id INT NOT NULL,
        payroll_run_id INT DEFAULT 101,
        payslip_month DATE NOT NULL,
        payslip_number VARCHAR(100) NOT NULL,
        ctc DECIMAL(12,2) DEFAULT 0.00,
        basic_salary DECIMAL(12,2) DEFAULT 0.00,
        gross_salary DECIMAL(12,2) DEFAULT 0.00,
        total_deductions DECIMAL(12,2) DEFAULT 0.00,
        net_salary DECIMAL(12,2) DEFAULT 0.00,
        days_worked INT DEFAULT 30,
        payment_mode VARCHAR(50) DEFAULT 'bank_transfer',
        is_locked TINYINT(1) DEFAULT 1,
        created_by INT DEFAULT 47,
        updated_by INT DEFAULT 47,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        INDEX idx_ps_emp (employee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payslips" verified.');

    // 6. Create payslip_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payslip_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        payslip_id INT NOT NULL,
        component_type ENUM('earning','deduction') NOT NULL,
        component_name VARCHAR(100) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pi_ps (payslip_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "payslip_items" verified.');

    // 7. Create employee_loans
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employee_loans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE DEFAULT (UUID()),
        organization_id INT NOT NULL DEFAULT 68,
        employee_id INT NOT NULL,
        loan_type VARCHAR(50) DEFAULT 'Personal Loan',
        principal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        monthly_emi DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        remaining_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending','approved','active','closed','rejected') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table "employee_loans" verified.');

    // 8. Seed / Sync Master Salary Structure "start"
    const [existingStructs] = await connection.query(`SELECT id FROM salary_structures WHERE structure_name = 'start' LIMIT 1;`);
    let structId;

    if (existingStructs.length > 0) {
      structId = existingStructs[0].id;
      await connection.query(`
        UPDATE salary_structures SET
          annual_ctc = 120000.00,
          basic_monthly = 5000.00,
          hra_monthly = 2000.00,
          special_allowance_monthly = 1000.00,
          gross_monthly = 9850.00,
          pf_deduction = 600.00,
          esi_deduction = 74.00,
          tds_deduction = 493.00,
          net_take_home = 7983.00,
          grade_code = 'GRADE-STA'
        WHERE id = ?;
      `, [structId]);
      console.log(`✅ Master structure "start" (ID ${structId}) updated.`);
    } else {
      const [insertRes] = await connection.query(`
        INSERT INTO salary_structures (organization_id, structure_name, grade_code, annual_ctc, basic_monthly, hra_monthly, special_allowance_monthly, gross_monthly, pf_deduction, esi_deduction, tds_deduction, net_take_home, created_by, updated_by)
        VALUES (68, 'start', 'GRADE-STA', 120000.00, 5000.00, 2000.00, 1000.00, 9850.00, 600.00, 74.00, 493.00, 7983.00, 47, 47);
      `);
      structId = insertRes.insertId;
      console.log(`✅ Master structure "start" created with ID ${structId}.`);
    }

    // 9. Assign structure "start" to active employees
    const [employees] = await connection.query(`SELECT id, first_name, last_name FROM employees WHERE deleted_at IS NULL;`);
    console.log(`ℹ️ Assigning structure "start" (ID ${structId}) to ${employees.length} employees...`);

    for (const emp of employees) {
      const [existingMap] = await connection.query(`SELECT id FROM employee_salary_structures WHERE employee_id = ? AND is_current = 1 LIMIT 1;`, [emp.id]);
      if (existingMap.length > 0) {
        await connection.query(`UPDATE employee_salary_structures SET salary_structure_id = ? WHERE id = ?;`, [structId, existingMap[0].id]);
      } else {
        await connection.query(`
          INSERT INTO employee_salary_structures (organization_id, employee_id, salary_structure_id, effective_from, is_current, created_by, updated_by)
          VALUES (68, ?, ?, '2026-01-01', 1, 47, 47);
        `, [emp.id, structId]);
      }
      console.log(`   ➜ ${emp.first_name} ${emp.last_name} (ID ${emp.id}) mapped to structure "start".`);
    }

    console.log('\n🎉 ALL PAYROLL DB TABLES INITIALIZED & SYNCED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Payroll DB Initialization Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

initializeCorrectPayroll();
