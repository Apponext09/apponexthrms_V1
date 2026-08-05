const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hrms'
    });

    console.log('🔧 Ensuring employee_statuses table exists...');

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS employee_statuses (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NULL,
        name VARCHAR(255) NOT NULL,
        probation_status TINYINT(1) NOT NULL DEFAULT 0,
        probation_period_unit VARCHAR(50) NULL,
        probation_period_value INT UNSIGNED NULL,
        notify_on_completion TINYINT(1) NOT NULL DEFAULT 0,
        confirmation_status TINYINT(1) NOT NULL DEFAULT 0,
        resignation_status TINYINT(1) NOT NULL DEFAULT 0,
        inactive_on_status_change TINYINT(1) NOT NULL DEFAULT 0,
        status_color VARCHAR(50) DEFAULT '#00b4d8',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX (organization_id),
        INDEX (is_active),
        INDEX (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await conn.execute(createTableSql);
    console.log('✅ employee_statuses table verified/created successfully!');

    // Check count of existing records
    const [countRows] = await conn.execute('SELECT COUNT(*) as count FROM employee_statuses WHERE deleted_at IS NULL');
    const totalCount = countRows[0].count;

    if (totalCount === 0) {
      console.log('🌱 Seeding initial 15 Employee Status records...');

      const defaultStatuses = [
        { name: 'Abandoned', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#00b4d8', active: 1 },
        { name: 'Absconding', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#00b4d8', active: 1 },
        { name: 'Confirmed', probation: 0, confirmation: 1, resignation: 0, inactive: 0, color: '#00b4d8', active: 1 },
        { name: 'Contractual', probation: 0, confirmation: 0, resignation: 0, inactive: 0, color: '#00b4d8', active: 1 },
        { name: 'Deceased', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#00b4d8', active: 1 },
        { name: 'Did Not Join', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#00b4d8', active: 1 },
        { name: 'Maternity', probation: 0, confirmation: 0, resignation: 0, inactive: 0, color: '#00b4d8', active: 1 },
        { name: 'Probation', probation: 1, confirmation: 0, resignation: 0, inactive: 0, color: '#00b4d8', active: 1 },
        { name: 'Serving Notice', probation: 0, confirmation: 0, resignation: 1, inactive: 0, color: '#00b4d8', active: 1 },
        { name: 'Active', probation: 0, confirmation: 0, resignation: 0, inactive: 0, color: '#10b981', active: 1 },
        { name: 'Suspended', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#f59e0b', active: 1 },
        { name: 'Retrenchment', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#00b4d8', active: 1 },
        { name: 'Terminated', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#ef4444', active: 1 },
        { name: 'Resigned', probation: 0, confirmation: 0, resignation: 1, inactive: 1, color: '#6b7280', active: 1 },
        { name: 'Retired', probation: 0, confirmation: 0, resignation: 0, inactive: 1, color: '#6b7280', active: 1 },
      ];

      for (const item of defaultStatuses) {
        await conn.execute(
          `INSERT INTO employee_statuses 
           (uuid, name, probation_status, confirmation_status, resignation_status, inactive_on_status_change, status_color, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), item.name, item.probation, item.confirmation, item.resignation, item.inactive, item.color, item.active]
        );
      }
      console.log(`✅ Successfully seeded ${defaultStatuses.length} initial employee statuses.`);
    } else {
      console.log(`ℹ️ employee_statuses table already contains ${totalCount} records.`);
    }

    await conn.end();
    console.log('🎉 Setup finished cleanly!');
  } catch (err) {
    console.error('❌ Error initializing employee_statuses table:', err);
    process.exit(1);
  }
})();
