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
    console.log('--- Checking & Fixing All Leave Table Schemas ---');

    // 1. leave_application_days
    console.log('Altering leave_application_days day_type & status columns to VARCHAR(50)...');
    await db.raw("ALTER TABLE leave_application_days MODIFY COLUMN day_type VARCHAR(50) NOT NULL;");
    await db.raw("ALTER TABLE leave_application_days MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending';");

    // 2. leave_balances - check columns
    const [balCols]: any = await db.raw("SHOW COLUMNS FROM leave_balances");
    const existingBalCols = balCols.map((c: any) => c.Field);
    console.log('leave_balances existing columns:', existingBalCols);

    if (!existingBalCols.includes('updated_at')) {
      await db.raw("ALTER TABLE leave_balances ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;");
    }
    if (!existingBalCols.includes('deleted_at')) {
      await db.raw("ALTER TABLE leave_balances ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;");
    }

    // 3. leave_cancellations - check if table exists or columns missing
    try {
      const [cancCols]: any = await db.raw("SHOW COLUMNS FROM leave_cancellations");
      const existingCancCols = cancCols.map((c: any) => c.Field);
      console.log('leave_cancellations existing columns:', existingCancCols);
    } catch (e: any) {
      console.log('Creating leave_cancellations table if missing...');
      await db.raw(`
        CREATE TABLE IF NOT EXISTS leave_cancellations (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          uuid CHAR(36) NOT NULL UNIQUE,
          organization_id BIGINT UNSIGNED NOT NULL,
          application_id BIGINT UNSIGNED NOT NULL,
          requested_by BIGINT UNSIGNED NOT NULL,
          reason TEXT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          approved_by BIGINT UNSIGNED NULL,
          approved_at TIMESTAMP NULL,
          created_by BIGINT UNSIGNED NOT NULL,
          updated_by BIGINT UNSIGNED NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL DEFAULT NULL
        );
      `);
    }

    // 4. leave_policy_assignments - check columns
    try {
      const [polCols]: any = await db.raw("SHOW COLUMNS FROM leave_policy_assignments");
      const existingPolCols = polCols.map((c: any) => c.Field);
      console.log('leave_policy_assignments existing columns:', existingPolCols);
    } catch (e: any) {
      console.log('Creating leave_policy_assignments table if missing...');
      await db.raw(`
        CREATE TABLE IF NOT EXISTS leave_policy_assignments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          uuid CHAR(36) NOT NULL UNIQUE,
          organization_id BIGINT UNSIGNED NOT NULL,
          employee_id BIGINT UNSIGNED NOT NULL,
          leave_type_id BIGINT UNSIGNED NOT NULL,
          annual_quota DECIMAL(6,2) DEFAULT 0,
          created_by BIGINT UNSIGNED NOT NULL,
          updated_by BIGINT UNSIGNED NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL DEFAULT NULL
        );
      `);
    }

    console.log('--- All Leave Table Schemas Successfully Verified and Updated! ---');
  } catch (err) {
    console.error('Error during schema fix:', err);
  } finally {
    process.exit(0);
  }
}

run();
