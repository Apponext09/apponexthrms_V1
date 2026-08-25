const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../../.env' });

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'hrms';
  const port = Number(process.env.DB_PORT || 3306);

  console.log(`Connecting to MySQL database "${database}" on ${host}:${port}...`);

  const connection = await mysql.createConnection({ host, user, password, database, port });

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS report_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      company_id BIGINT UNSIGNED NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      module VARCHAR(50) NOT NULL,
      selected_fields TEXT NOT NULL,
      filters TEXT NOT NULL,
      column_order TEXT NULL,
      is_shared TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_org (organization_id),
      INDEX idx_user (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableSQL);
  console.log('✅ Verified/Created table: report_templates');

  await connection.end();
  console.log('🎉 Report Engine MySQL migration script completed successfully!');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
