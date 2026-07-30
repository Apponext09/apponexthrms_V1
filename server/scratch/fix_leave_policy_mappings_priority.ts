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
    console.log('Adding priority column to leave_policy_mappings...');

    const [columns]: any = await db.raw("SHOW COLUMNS FROM leave_policy_mappings");
    const existingCols = columns.map((c: any) => c.Field);

    if (!existingCols.includes('priority')) {
      await db.raw("ALTER TABLE leave_policy_mappings ADD COLUMN priority INT DEFAULT 0;");
      console.log('priority column added to leave_policy_mappings!');
    } else {
      console.log('priority column already exists!');
    }
  } catch (err) {
    console.error('Error adding priority:', err);
  } finally {
    process.exit(0);
  }
}

run();
