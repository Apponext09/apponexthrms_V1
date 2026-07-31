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
    console.log('--- Creating Missing Leave Tables ---');

    // 1. leave_ledger_entries
    console.log('Creating leave_ledger_entries if missing...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_ledger_entries (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        leave_type_id BIGINT UNSIGNED NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(8,2) NOT NULL,
        effective_date DATE NULL,
        reference_id VARCHAR(100) NULL,
        remarks TEXT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL
      );
    `);

    // 2. leave_approvals
    console.log('Creating leave_approvals if missing...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_approvals (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        application_id BIGINT UNSIGNED NOT NULL,
        approver_id BIGINT UNSIGNED NOT NULL,
        approver_role VARCHAR(50) NULL,
        status VARCHAR(50) NOT NULL,
        comments TEXT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL
      );
    `);

    // 3. leave_lop_records
    console.log('Creating leave_lop_records if missing...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS leave_lop_records (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(36) NOT NULL UNIQUE,
        organization_id BIGINT UNSIGNED NOT NULL,
        employee_id BIGINT UNSIGNED NOT NULL,
        application_id BIGINT UNSIGNED NOT NULL,
        lop_days DECIMAL(5,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_by BIGINT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL DEFAULT NULL
      );
    `);

    console.log('--- All Missing Leave Tables Created Successfully! ---');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    process.exit(0);
  }
}

run();
