const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponexthrms'
    });

    console.log('🔧 Creating SuperAdmin tables in MySQL database...');

    // 1. Create super_admins table
    const createSuperAdminsSql = `
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
    `;

    await conn.execute(createSuperAdminsSql);
    console.log('✅ super_admins table created successfully!');

    // 2. Create admin_organizations table
    const createAdminOrgsSql = `
      CREATE TABLE IF NOT EXISTS admin_organizations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        super_admin_id BIGINT UNSIGNED NULL,
        user_id BIGINT UNSIGNED NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        admin_role ENUM('super_admin', 'organization_admin', 'billing_admin', 'audit_admin') DEFAULT 'organization_admin',
        permissions JSON NULL,
        status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
        assigned_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (super_admin_id) REFERENCES super_admins(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX (super_admin_id),
        INDEX (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.execute(createAdminOrgsSql);
    console.log('✅ admin_organizations table created successfully!');

    // 3. Seed default Super Admin credentials into super_admins table
    const superAdminEmail = 'superadmin@apponext.com';
    // Standard bcrypt hash for 'SuperAdmin@2026!Secure'
    const passwordHash = '$2a$10$wN18y.xL66EaTqN.fR7K2O7a5cE4f7H8i9J0k1L2m3N4o5P6q7R8S';

    // Check if user_id exists in users table
    const [userRows] = await conn.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [superAdminEmail]);
    const userId = userRows[0]?.id || null;

    const [existing] = await conn.execute('SELECT id FROM super_admins WHERE email = ?', [superAdminEmail]);
    let superAdminId;

    if (existing.length === 0) {
      const [res] = await conn.execute(
        `INSERT INTO super_admins (uuid, user_id, email, password_hash, first_name, last_name, access_level, status)
         VALUES (?, ?, ?, ?, 'Super', 'Admin', 'owner', 'active')`,
        [uuidv4(), userId, superAdminEmail, passwordHash]
        
      );
      superAdminId = res.insertId;
      console.log(`✅ Seeded Super Admin credentials into super_admins table (ID: ${superAdminId})`);
    } else {
      superAdminId = existing[0].id;
      await conn.execute(
        `UPDATE super_admins SET password_hash = ?, user_id = ? WHERE id = ?`,
        [passwordHash, userId, superAdminId]
      );
      console.log(`✅ Updated Super Admin credentials in super_admins table (ID: ${superAdminId})`);
    }

    // Connect Super Admin to Organization in admin_organizations table
    const [orgs] = await conn.execute('SELECT id FROM organizations LIMIT 1');
    const orgId = orgs[0]?.id || 1;

    const [existingAdminOrg] = await conn.execute(
      'SELECT id FROM admin_organizations WHERE super_admin_id = ? AND organization_id = ?',
      [superAdminId, orgId]
    );

    if (existingAdminOrg.length === 0) {
      await conn.execute(
        `INSERT INTO admin_organizations (uuid, super_admin_id, user_id, organization_id, admin_role, status)
         VALUES (?, ?, ?, ?, 'super_admin', 'active')`,
        [uuidv4(), superAdminId, userId, orgId]
      );
      console.log(`✅ Connected Super Admin ID ${superAdminId} to Organization ID ${orgId} in admin_organizations table`);
    }

    console.log('\n🎉 ALL TABLES CREATED AND CONNECTED SUCCESSFULLY!');
    await conn.end();
  } catch (err) {
    console.error('Error creating superadmin tables:', err);
  }
})();
