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
    console.log('Adding missing columns to leave_types table...');

    const [columns]: any = await db.raw("SHOW COLUMNS FROM leave_types");
    const existingCols = columns.map((c: any) => c.Field);

    if (!existingCols.includes('paid_type')) {
      console.log('Adding paid_type...');
      await db.raw("ALTER TABLE leave_types ADD COLUMN paid_type ENUM('paid', 'unpaid', 'half_paid') DEFAULT 'paid';");
    }

    if (!existingCols.includes('allow_negative_balance')) {
      console.log('Adding allow_negative_balance...');
      await db.raw("ALTER TABLE leave_types ADD COLUMN allow_negative_balance TINYINT(1) DEFAULT 0;");
    }

    if (!existingCols.includes('negative_balance_action')) {
      console.log('Adding negative_balance_action...');
      await db.raw("ALTER TABLE leave_types ADD COLUMN negative_balance_action VARCHAR(50) DEFAULT NULL;");
    }

    if (!existingCols.includes('pool_from_leave_type_id')) {
      console.log('Adding pool_from_leave_type_id...');
      await db.raw("ALTER TABLE leave_types ADD COLUMN pool_from_leave_type_id BIGINT UNSIGNED DEFAULT NULL;");
    }

    console.log('Columns added successfully!');
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    process.exit(0);
  }
}

run();
