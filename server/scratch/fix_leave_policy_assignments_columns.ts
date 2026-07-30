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
    console.log('Adding missing columns to leave_policy_assignments...');

    const [columns]: any = await db.raw("SHOW COLUMNS FROM leave_policy_assignments");
    const existingCols = columns.map((c: any) => c.Field);

    const colsToAdd = [
      { name: 'floating_holiday_quota', type: 'INT DEFAULT 0' },
      { name: 'max_backdated_days', type: 'INT DEFAULT 7' },
      { name: 'max_consecutive_days', type: 'INT DEFAULT 14' },
      { name: 'max_future_days', type: 'INT DEFAULT 90' },
      { name: 'notice_period_excluded', type: 'TINYINT(1) DEFAULT 0' },
      { name: 'prefix_suffix_rule_enabled', type: 'TINYINT(1) DEFAULT 0' }
    ];

    for (const col of colsToAdd) {
      if (!existingCols.includes(col.name)) {
        console.log(`Adding ${col.name}...`);
        await db.raw(`ALTER TABLE leave_policy_assignments ADD COLUMN ${col.name} ${col.type};`);
      }
    }

    console.log('leave_policy_assignments updated successfully!');
  } catch (err) {
    console.error('Error updating table:', err);
  } finally {
    process.exit(0);
  }
}

run();
