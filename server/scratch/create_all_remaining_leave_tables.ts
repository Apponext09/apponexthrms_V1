import { initializeKnex, getKnex } from '../src/db/knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  initializeKnex();
  const db = getKnex();
  try {
    console.log('--- Creating All Remaining Missing Leave Tables ---');

    // 1. leave_policy_mappings
    console.log('Creating leave_policy_mappings...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_policy_mappings (
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
      );
    `);

    // 2. leave_audit_logs
    console.log('Creating leave_audit_logs...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_audit_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NULL,
        performed_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. leave_delegations
    console.log('Creating leave_delegations...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_delegations (
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
      );
    `);

    // 4. leave_carry_forward
    console.log('Creating leave_carry_forward...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_carry_forward (
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
      );
    `);

    // 5. optional_holiday_selections
    console.log('Creating optional_holiday_selections...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS optional_holiday_selections (
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
      );
    `);

    console.log('--- All Remaining Leave Tables Created Successfully! ---');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    process.exit(0);
  }
}

run();
