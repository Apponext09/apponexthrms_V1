/**
 * Drops the stale foreign key constraint `locations_branch_id_foreign`
 * that was carried over when branch_id was renamed to company_id.
 * company_id is a free field now (no FK to branches table).
 * Run with: tsx ./src/db/scripts/drop-locations-fk.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../..', '.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  },
});

async function run() {
  console.log('🔍 Checking for stale FK constraint on locations.company_id...');

  // Check if the constraint still exists
  const [rows] = await db.raw(`
    SELECT CONSTRAINT_NAME 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'locations'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  `);

  const constraintNames = rows.map((r: any) => r.CONSTRAINT_NAME);
  console.log('  Found FK constraints:', constraintNames.length ? constraintNames : '(none)');

  for (const name of constraintNames) {
    // Drop any FK pointing to branches (the old branch_id FK)
    const [fkRows] = await db.raw(`
      SELECT REFERENCED_TABLE_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'locations'
        AND CONSTRAINT_NAME = ?
    `, [name]);

    const refTable = fkRows[0]?.REFERENCED_TABLE_NAME;
    if (refTable === 'branches') {
      console.log(`  ↳ Dropping FK constraint "${name}" (references branches table)...`);
      await db.raw(`ALTER TABLE \`locations\` DROP FOREIGN KEY \`${name}\``);
      console.log(`  ✓ Dropped "${name}"`);
    }
  }

  console.log('✅ Done. locations.company_id is now a free integer field with no FK constraint.');
}

run()
  .catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
