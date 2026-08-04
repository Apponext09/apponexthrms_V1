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
      database: process.env.DB_NAME || 'apponext'
    });

    console.log('🔧 Creating companies table in MySQL database...');

    // 1. Create companies table
    const createCompaniesSql = `
      CREATE TABLE IF NOT EXISTS companies (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        UNIQUE KEY uq_company_code_org (code, organization_id),
        INDEX idx_company_name (name),
        INDEX idx_company_code (code),
        INDEX idx_company_status (status),
        INDEX idx_company_org (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.execute(createCompaniesSql);
    console.log('✅ companies table created successfully!');

    // 2. Get default organization
    const [orgs] = await conn.execute('SELECT id FROM organizations LIMIT 1');
    const orgId = orgs[0]?.id || 1;

    // 3. Seed initial company records
    const seedCompanies = [
      {
        code: 'HQ-MAIN',
        name: 'Apponext Technolabs Pvt Ltd',
        description: 'Primary Headquarters Entity',
        status: 'Active'
      },
      {
        code: 'GLOBAL-US',
        name: 'Apponext Global Inc',
        description: 'US Subsidiary Operations',
        status: 'Active'
      },
      {
        code: 'COM-213',
        name: 'Demo Company Branch',
        description: 'Sample demo company for testing',
        status: 'Active'
      }
    ];

    for (const company of seedCompanies) {
      const [existing] = await conn.execute(
        'SELECT id FROM companies WHERE code = ? AND organization_id = ?',
        [company.code, orgId]
      );

      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO companies (uuid, organization_id, code, name, description, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uuidv4(), orgId, company.code, company.name, company.description, company.status]
        );
        console.log(`✅ Seeded company: ${company.name} (${company.code})`);
      } else {
        console.log(`⏭️  Company already exists: ${company.name} (${company.code})`);
      }
    }

    console.log('\n🎉 COMPANIES TABLE CREATED AND SEEDED SUCCESSFULLY!');
    await conn.end();
  } catch (err) {
    console.error('Error creating companies table:', err);
    process.exit(1);
  }
})();
