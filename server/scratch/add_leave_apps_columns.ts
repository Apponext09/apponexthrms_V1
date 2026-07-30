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
    console.log('Updating leave_applications table schema...');

    const [columns]: any = await db.raw("SHOW COLUMNS FROM leave_applications");
    const existingCols = columns.map((c: any) => c.Field);

    if (!existingCols.includes('lop_days')) {
      console.log('Adding lop_days...');
      await db.raw("ALTER TABLE leave_applications ADD COLUMN lop_days DECIMAL(5,2) DEFAULT 0;");
    }

    if (!existingCols.includes('pool_leave_type_id')) {
      console.log('Adding pool_leave_type_id...');
      await db.raw("ALTER TABLE leave_applications ADD COLUMN pool_leave_type_id BIGINT UNSIGNED NULL;");
    }

    console.log('Modifying status column to VARCHAR(50)...');
    await db.raw("ALTER TABLE leave_applications MODIFY COLUMN status VARCHAR(50) DEFAULT 'submitted';");

    console.log('leave_applications table updated successfully!');
  } catch (err) {
    console.error('Error altering leave_applications table:', err);
  } finally {
    process.exit(0);
  }
}

run();
