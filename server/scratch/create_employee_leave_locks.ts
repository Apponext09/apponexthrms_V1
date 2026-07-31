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
    console.log('Creating employee_leave_locks table if not exists...');
    await db.raw(`
      CREATE TABLE IF NOT EXISTS employee_leave_locks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_employee_org (employee_id, organization_id)
      );
    `);
    console.log('employee_leave_locks table created successfully!');
  } catch (err) {
    console.error('Failed to create table:', err);
  } finally {
    process.exit(0);
  }
}

run();
