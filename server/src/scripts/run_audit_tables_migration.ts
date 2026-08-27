import { getKnex } from '../db/knex';

async function runAuditTablesMigration() {
  const db = getKnex();
  console.log('Running audit tables migration on MySQL DB...');

  const table1Sql = `
    CREATE TABLE IF NOT EXISTS \`payroll_component_group_audit_logs\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL,
      \`organization_id\` BIGINT UNSIGNED NOT NULL,
      \`company_id\` BIGINT UNSIGNED NULL,
      \`group_id\` BIGINT UNSIGNED NOT NULL,
      \`group_name\` VARCHAR(100) NOT NULL,
      \`action\` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL DEFAULT 'UPDATE',
      \`description\` TEXT NOT NULL,
      \`before_state\` JSON NULL,
      \`after_state\` JSON NULL,
      \`updated_by_id\` BIGINT UNSIGNED NULL,
      \`updated_by_name\` VARCHAR(150) NOT NULL DEFAULT 'Admin',
      \`ip_address\` VARCHAR(45) NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_group_audit_group_id\` (\`group_id\`),
      INDEX \`idx_group_audit_org_id\` (\`organization_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const table2Sql = `
    CREATE TABLE IF NOT EXISTS \`payroll_component_audit_logs\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL,
      \`organization_id\` BIGINT UNSIGNED NOT NULL,
      \`company_id\` BIGINT UNSIGNED NULL,
      \`component_id\` BIGINT UNSIGNED NOT NULL,
      \`component_name\` VARCHAR(100) NOT NULL,
      \`group_id\` BIGINT UNSIGNED NULL,
      \`action\` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL DEFAULT 'UPDATE',
      \`description\` TEXT NOT NULL,
      \`before_state\` JSON NULL,
      \`after_state\` JSON NULL,
      \`updated_by_id\` BIGINT UNSIGNED NULL,
      \`updated_by_name\` VARCHAR(150) NOT NULL DEFAULT 'Admin',
      \`ip_address\` VARCHAR(45) NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_comp_audit_comp_id\` (\`component_id\`),
      INDEX \`idx_comp_audit_group_id\` (\`group_id\`),
      INDEX \`idx_comp_audit_org_id\` (\`organization_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await db.raw(table1Sql);
  console.log('✅ Created payroll_component_group_audit_logs table successfully!');

  await db.raw(table2Sql);
  console.log('✅ Created payroll_component_audit_logs table successfully!');

  process.exit(0);
}

runAuditTablesMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
