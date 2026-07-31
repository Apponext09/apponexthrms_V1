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
    console.log('Adding missing columns to leave_application_days table...');

    const [columns]: any = await db.raw("SHOW COLUMNS FROM leave_application_days");
    const existingCols = columns.map((c: any) => c.Field);

    if (!existingCols.includes('updated_at')) {
      console.log('Adding updated_at...');
      await db.raw("ALTER TABLE leave_application_days ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;");
    }

    if (!existingCols.includes('deleted_at')) {
      console.log('Adding deleted_at...');
      await db.raw("ALTER TABLE leave_application_days ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;");
    }

    console.log('Columns added to leave_application_days successfully!');
  } catch (err) {
    console.error('Error altering leave_application_days:', err);
  } finally {
    process.exit(0);
  }
}

run();
