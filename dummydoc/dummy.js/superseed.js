const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  console.log('🚀 RUNNING SUPERSEED: DATABASE SCHEMA MIGRATIONS (SCHEMA CHANGES ONLY)...\n');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('✅ Connected to MySQL Database');

    console.log('\n========================================');
    console.log('🛠️ APPLYING DATABASE SCHEMA CHANGES');
    console.log('========================================');

    // 1. CREATE super_admins TABLE IF NOT EXISTS
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        user_id BIGINT UNSIGNED NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL DEFAULT 'Super',
        last_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
        phone VARCHAR(20) NULL,
        avatar_url TEXT NULL,
        access_level ENUM('owner', 'superadmin', 'auditor') DEFAULT 'superadmin',
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX (email),
        INDEX (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ super_admins table schema verified');

    // 2. ENSURE ORGANIZATIONS COLUMNS EXIST
    const orgColumns = [
      { name: 'code', type: 'VARCHAR(50) NULL' },
      { name: 'owner_name', type: 'VARCHAR(255) NULL' },
      { name: 'location', type: 'VARCHAR(255) NULL' },
      { name: 'email', type: 'VARCHAR(255) NULL' },
      { name: 'phone', type: 'VARCHAR(50) NULL' },
      { name: 'website_url', type: 'VARCHAR(512) NULL' }
    ];

    for (const col of orgColumns) {
      try {
        await conn.execute(`ALTER TABLE organizations ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  ✅ Added column '${col.name}' to organizations table`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
          // Column already exists
        } else {
          console.log(`  ℹ️ Note on organizations column '${col.name}':`, err.message);
        }
      }
    }
    console.log('  ✅ organizations table schema verified');

    // 3. ENSURE EMPLOYEES COLUMNS EXIST
    try {
      await conn.execute('ALTER TABLE employees ADD COLUMN avatar_url TEXT NULL AFTER email');
      console.log('  ✅ Added avatar_url column to employees table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        // Column already exists
      } else {
        console.log('  ℹ️ Note on employees avatar_url column:', err.message);
      }
    }

    // 4. ENSURE AUDIT LOGS HAS updated_at COLUMN
    try {
      await conn.execute('ALTER TABLE audit_logs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
      console.log('  ✅ Added updated_at column to audit_logs table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        // Column already exists
      } else {
        console.log('  ℹ️ Note on audit_logs updated_at column:', err.message);
      }
    }

    // 5. CREATE leave_applications TABLE IF NOT EXISTS
    await conn.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ leave_applications table schema verified');

    // 6. CREATE leave_approvals TABLE IF NOT EXISTS
    await conn.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ leave_approvals table schema verified');

    // 7. CREATE payroll_runs TABLE IF NOT EXISTS
    await conn.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ payroll_runs table schema verified');

    // 8. CREATE subscription_plans TABLE IF NOT EXISTS
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        price VARCHAR(50) NOT NULL,
        billing_cycle VARCHAR(50) DEFAULT 'monthly',
        start_date DATE NULL,
        end_date DATE NULL,
        description TEXT NULL,
        status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
        modules JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ subscription_plans table schema verified');

    // 9. CREATE helpdesk_queries TABLE IF NOT EXISTS
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS helpdesk_queries (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        client_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        plan_interest VARCHAR(100) DEFAULT 'Enterprise',
        message TEXT NULL,
        status ENUM('new', 'in_progress', 'resolved', 'closed') DEFAULT 'new',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (status),
        INDEX (is_read),
        INDEX (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('  ✅ helpdesk_queries table schema verified');

    console.log('\n========================================');
    console.log('🎉 ALL DATABASE SCHEMA MIGRATIONS APPLIED SUCCESSFULLY!');
    console.log('========================================\n');

    await conn.end();
  } catch (err) {
    console.error('❌ Error executing superseed schema migrations:', err);
    if (conn) await conn.end();
  }
})();
