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
    console.log('Running ALTER TABLE to modify paid_type enum...');
    await db.raw("ALTER TABLE leave_types MODIFY COLUMN paid_type ENUM('paid', 'unpaid', 'half_paid') DEFAULT 'paid';");
    console.log('Database altered successfully!');
  } catch (err) {
    console.error('Failed to alter database:', err);
  } finally {
    process.exit(0);
  }
}

run();
