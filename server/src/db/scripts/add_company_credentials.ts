/**
 * Manually adds company credential columns if they don't exist.
 * Run: tsx ./src/db/scripts/add_company_credentials.ts
 */
import knex from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const columns = [
  { name: 'has_credentials', sql: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { name: 'full_name',        sql: 'VARCHAR(255) NULL' },
  { name: 'login_email',      sql: 'VARCHAR(255) NULL' },
  { name: 'password_hash',    sql: 'TEXT NULL' },
];

try {
  for (const col of columns) {
    const exists = await db.schema.hasColumn('company', col.name);
    if (!exists) {
      console.log(`  Adding column: ${col.name}`);
      await db.schema.raw(`ALTER TABLE \`company\` ADD COLUMN \`${col.name}\` ${col.sql}`);
      console.log(`  ✓ ${col.name} added`);
    } else {
      console.log(`  ✓ ${col.name} already exists — skipping`);
    }
  }
  console.log('\n✓ Company credentials columns are ready.');
} catch (err) {
  console.error('✗ Error:', err);
  process.exit(1);
} finally {
  await db.destroy();
}
