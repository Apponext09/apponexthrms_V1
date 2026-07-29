import { getKnex } from './server/src/db/knex';

async function createSalaryTables() {
  const db = getKnex();
  try {
    console.log('🚀 Creating salary_structures and employee_salary_structures tables in MySQL...');

    await db.raw(`
      CREATE TABLE IF NOT EXISTS \`salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NULL,
        \`structure_name\` VARCHAR(255),
        \`grade_code\` VARCHAR(100),
        \`annual_ctc\` DECIMAL(15,2),
        \`basic_monthly\` DECIMAL(15,2),
        \`hra_monthly\` DECIMAL(15,2),
        \`special_allowance_monthly\` DECIMAL(15,2),
        \`gross_monthly\` DECIMAL(15,2),
        \`pf_deduction\` DECIMAL(15,2),
        \`esi_deduction\` DECIMAL(15,2),
        \`tds_deduction\` DECIMAL(15,2),
        \`net_take_home\` DECIMAL(15,2),
        \`effective_from\` DATE,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`created_by\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await db.raw(`
      CREATE TABLE IF NOT EXISTS \`employee_salary_structures\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`uuid\` CHAR(36) NOT NULL UNIQUE,
        \`organization_id\` BIGINT UNSIGNED NOT NULL,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`salary_structure_id\` BIGINT UNSIGNED NOT NULL,
        \`effective_from\` DATE,
        \`effective_to\` DATE NULL,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tables `salary_structures` and `employee_salary_structures` successfully created in MySQL!');
  } catch (err) {
    console.error('Error creating salary structure tables:', err);
  }
  process.exit(0);
}

createSalaryTables();
