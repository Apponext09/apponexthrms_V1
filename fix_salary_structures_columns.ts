import { getKnex } from './server/src/db/knex';

async function fixDefaults() {
  const db = getKnex();
  try {
    console.log('🚀 Fixing NOT NULL columns in `salary_structures`...');

    await db.raw('ALTER TABLE `salary_structures` MODIFY COLUMN `structure_code` VARCHAR(50) NULL;');
    await db.raw('ALTER TABLE `salary_structures` MODIFY COLUMN `created_by` BIGINT UNSIGNED NULL DEFAULT 1;');
    await db.raw('ALTER TABLE `salary_structures` MODIFY COLUMN `updated_by` BIGINT UNSIGNED NULL DEFAULT 1;');

    console.log('✅ NOT NULL column constraints updated successfully!');
  } catch (err) {
    console.error('Error fixing defaults:', err);
  }
  process.exit(0);
}

fixDefaults();
