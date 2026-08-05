const fs = require('fs');
const path = require('path');

const dumpFile = path.resolve(__dirname, '../../database/migrations/server_schema_dump.sql');
const dumpSql = fs.readFileSync(dumpFile, 'utf8');

let queries = dumpSql.split('\n')
  .map(q => q.trim())
  .filter(q => q && !q.startsWith('(') && !q.startsWith('gen_random') && !q.startsWith('CURRENT_TIMESTAMP'));

// Clean up create tables to include IF NOT EXISTS just to be safer (though try-catch handles it)
queries = queries.map(q => {
  if (q.toLowerCase().startsWith('create table')) {
    return q.replace(/create table/i, 'create table if not exists');
  }
  return q;
});

const finalMigration = `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const ignoreError = (e: any) => {
    if (e.message.includes('ER_TABLE_EXISTS_ERROR') || 
        e.message.includes('ER_DUP_FIELDNAME') || 
        e.message.includes('Duplicate column name') ||
        e.message.includes('already exists') ||
        e.message.includes('Duplicate key name') ||
        e.message.includes('ER_DUP_KEY')) {
      return;
    }
    throw e;
  };

  console.log('--- Consolidating Server Migrations (Raw SQL execution) ---');

  const rawQueries = [
    // --- Extracted from server/src/db/migrations ---
${queries.map(q => `    \`${q.replace(/`/g, '\\`')}\``).join(',\n')},

    // --- Extracted from create_all_remaining_leave_tables.ts ---
    \`CREATE TABLE IF NOT EXISTS leave_policy_mappings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      leave_policy_id BIGINT UNSIGNED NOT NULL,
      department_id BIGINT UNSIGNED NULL,
      designation_id BIGINT UNSIGNED NULL,
      gender VARCHAR(20) DEFAULT 'all',
      created_by BIGINT UNSIGNED NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL
    )\`,
    \`CREATE TABLE IF NOT EXISTS leave_audit_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT NULL,
      performed_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS leave_delegations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      delegator_employee_id BIGINT UNSIGNED NOT NULL,
      delegatee_employee_id BIGINT UNSIGNED NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_by BIGINT UNSIGNED NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL
    )\`,
    \`CREATE TABLE IF NOT EXISTS leave_carry_forward (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      leave_type_id BIGINT UNSIGNED NOT NULL,
      financial_year INT NOT NULL,
      carried_forward_days DECIMAL(6,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'processed',
      created_by BIGINT UNSIGNED NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL
    )\`,
    \`CREATE TABLE IF NOT EXISTS optional_holiday_selections (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(36) NOT NULL UNIQUE,
      organization_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      holiday_id BIGINT UNSIGNED NOT NULL,
      year INT NOT NULL,
      status VARCHAR(50) DEFAULT 'approved',
      created_by BIGINT UNSIGNED NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL
    )\`,
    
    // --- Execute raw ALTER column patches ---
    \`ALTER TABLE leave_application_days MODIFY COLUMN day_type VARCHAR(50) NOT NULL;\`,
    \`ALTER TABLE leave_application_days MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending';\`,
    \`ALTER TABLE leave_balances ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;\`,
    \`ALTER TABLE leave_policy_mappings ADD COLUMN priority INT DEFAULT 0;\`,
    \`ALTER TABLE employee_loans MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending';\`,
    \`ALTER TABLE auth_sessions ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;\`,
    \`ALTER TABLE employees ADD COLUMN notes TEXT NULL;\`
  ];

  for (let i = 0; i < rawQueries.length; i++) {
    const q = rawQueries[i];
    try {
      await knex.raw(q);
    } catch (e: any) {
      ignoreError(e);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Intentionally empty down migration
}
`;

fs.writeFileSync(path.resolve(__dirname, '../../database/migrations/20260804000000_consolidate_server_migrations.ts'), finalMigration);
console.log('Migration generated successfully.');
