const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔧 FIXING DATABASE SCHEMA...\n');

    // Create leave_applications
    const createLeaveApps = `
      CREATE TABLE IF NOT EXISTS leave_applications (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        leave_type_id BIGINT UNSIGNED NOT NULL,
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        duration_days DECIMAL(5,2),
        half_day BOOLEAN DEFAULT FALSE,
        reason LONGTEXT,
        status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        approval_notes LONGTEXT,
        created_by BIGINT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
        INDEX (organization_id),
        INDEX (employee_id),
        INDEX (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await conn.execute(createLeaveApps);
    console.log('✅ leave_applications table ready');

    // Create leave_approvals
    const createLeaveApprovals = `
      CREATE TABLE IF NOT EXISTS leave_approvals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        leave_application_id BIGINT UNSIGNED NOT NULL,
        approver_id BIGINT UNSIGNED NOT NULL,
        approval_level INT DEFAULT 1,
        status ENUM('pending', 'approved', 'rejected', 'delegated') DEFAULT 'pending',
        approval_date TIMESTAMP NULL,
        rejection_reason LONGTEXT,
        comments LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (approver_id) REFERENCES employees(id) ON DELETE CASCADE,
        INDEX (organization_id),
        INDEX (leave_application_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await conn.execute(createLeaveApprovals);
    console.log('✅ leave_approvals table ready');

    // Add updated_at to audit_logs if missing
    try {
      await conn.execute('ALTER TABLE audit_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('✅ added updated_at to audit_logs');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('✅ audit_logs already has updated_at');
      } else {
        throw err;
      }
    }

    // Create payroll_runs
    const createPayrollRuns = `
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        payroll_month VARCHAR(10),
        start_date DATE,
        end_date DATE,
        status ENUM('draft', 'processing', 'completed', 'approved', 'published') DEFAULT 'draft',
        total_employees INT DEFAULT 0,
        total_gross DECIMAL(18,2),
        total_deductions DECIMAL(18,2),
        total_net DECIMAL(18,2),
        created_by BIGINT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX (organization_id),
        INDEX (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await conn.execute(createPayrollRuns);
    console.log('✅ payroll_runs table ready');

    console.log('\n✅ SCHEMA FIXED SUCCESSFULLY');
  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
