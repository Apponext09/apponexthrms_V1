const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'apponext'
    });

    console.log('🔧 Altering/Creating company table in MySQL database with all form fields...');

    // Drop old companies table if exists
    await conn.execute('DROP TABLE IF EXISTS companies');

    // 1. Create or alter company table with full columns matching form
    const createCompanySql = `
      CREATE TABLE IF NOT EXISTS company (
        company_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        employer_name VARCHAR(255) NULL,
        class_of_establishment VARCHAR(255) NULL,
        address_line_1 TEXT NULL,
        address_line_2 TEXT NULL,
        country VARCHAR(100) NULL,
        zip_code VARCHAR(20) NULL,
        state VARCHAR(100) NULL,
        city VARCHAR(100) NULL,
        pan_tin VARCHAR(50) NULL,
        contact_number VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        logo TEXT NULL,
        company_stamp TEXT NULL,
        signature TEXT NULL,
        is_active_toggle TINYINT(1) DEFAULT 1,
        active_users_toggle TINYINT(1) DEFAULT 1,
        login_page_logo_toggle TINYINT(1) DEFAULT 0,
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

    // Drop company table to apply clean schema changes
    await conn.execute('DROP TABLE IF EXISTS company');
    await conn.execute(createCompanySql);
    console.log('✅ company table created with full column schema successfully!');

    // 2. Get all active organizations
    const [orgs] = await conn.execute('SELECT id FROM organizations');
    const orgIds = orgs.length > 0 ? orgs.map(o => o.id) : [1];

    // 3. Seed initial company records with rich data
    const seedCompanies = [
      {
        code: 'HQ-MAIN',
        name: 'Trial Company',
        employer_name: 'Apponext Admin',
        class_of_establishment: 'Commercial IT Enterprise',
        address_line_1: 'Mindspace, Suite no.3, Bldg. 03, 8th Flr',
        address_line_2: 'Airoli, Navi Mumbai',
        country: 'India',
        zip_code: '400708',
        state: 'Maharashtra',
        city: 'Thane',
        pan_tin: '989898989',
        contact_number: '9898989899',
        email: 'contact@apponext.com',
        description: 'Primary Headquarters Entity',
        status: 'Active'
      },
      {
        code: 'GLOBAL-US',
        name: 'Apponext Global Inc',
        employer_name: 'Global Operations',
        class_of_establishment: 'Subsidiary Tech Entity',
        address_line_1: '100 Tech Plaza, Suite 500',
        address_line_2: 'Silicon Valley',
        country: 'United States',
        zip_code: '94025',
        state: 'California',
        city: 'San Jose',
        pan_tin: 'US-88776655',
        contact_number: '18005550199',
        email: 'info.us@apponext.com',
        description: 'US Subsidiary Operations',
        status: 'Active'
      },
      {
        code: 'COM-213',
        name: 'Demo Company Branch',
        employer_name: 'Branch Manager',
        class_of_establishment: 'Regional Branch Office',
        address_line_1: 'Sector 62, Cyber Park',
        address_line_2: 'Noida Expressway',
        country: 'India',
        zip_code: '201301',
        state: 'Uttar Pradesh',
        city: 'Noida',
        pan_tin: 'AAACD1234F',
        contact_number: '9988776655',
        email: 'noida@apponext.com',
        description: 'Sample demo company for testing',
        status: 'Active'
      }
    ];

    for (const orgId of orgIds) {
      for (const item of seedCompanies) {
        await conn.execute(
          `INSERT INTO company (
             uuid, organization_id, code, name, employer_name, class_of_establishment,
             address_line_1, address_line_2, country, zip_code, state, city,
             pan_tin, contact_number, email, description, status,
             is_active_toggle, active_users_toggle, login_page_logo_toggle
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0)`,
          [
            uuidv4(), orgId, `${item.code}-${orgId}`, item.name, item.employer_name, item.class_of_establishment,
            item.address_line_1, item.address_line_2, item.country, item.zip_code, item.state, item.city,
            item.pan_tin, item.contact_number, item.email, item.description, item.status
          ]
        );
        console.log(`✅ Seeded company for Org ${orgId}: ${item.name} (${item.code}-${orgId})`);
      }
    }

    console.log('\n🎉 COMPANY TABLE RE-CREATED AND SEEDED WITH FULL FIELDS SUCCESSFULLY!');
    await conn.end();
  } catch (err) {
    console.error('Error creating company table:', err);
    process.exit(1);
  }
})();
