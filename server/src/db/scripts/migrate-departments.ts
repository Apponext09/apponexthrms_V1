/**
 * Migration script for updating the departments table schema.
 * Adds missing fields: department_code, email, colour, is_active, company_id.
 * Run with: tsx ./src/db/scripts/migrate-departments.ts
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
  console.log('🔄 Checking departments table schema...');

  const hasName = await db.schema.hasColumn('departments', 'name');
  const hasCode = await db.schema.hasColumn('departments', 'code');
  const hasEmail = await db.schema.hasColumn('departments', 'email');
  const hasColour = await db.schema.hasColumn('departments', 'colour');
  const hasColor = await db.schema.hasColumn('departments', 'color');
  const hasDescription = await db.schema.hasColumn('departments', 'description');
  const hasCompanyId = await db.schema.hasColumn('departments', 'company_id');
  const hasIsActive = await db.schema.hasColumn('departments', 'is_active');

  await db.schema.alterTable('departments', (table) => {
    if (!hasCode) { console.log('  + code'); table.string('code', 100).nullable(); }
    if (!hasEmail) { console.log('  + email'); table.string('email', 255).nullable(); }
    if (!hasColour && !hasColor) { console.log('  + colour'); table.string('colour', 50).nullable(); }
    if (!hasDescription) { console.log('  + description'); table.text('description').nullable(); }
    if (!hasCompanyId) { console.log('  + company_id'); table.integer('company_id').unsigned().nullable(); }
    if (!hasIsActive) { console.log('  + is_active (Yes/No)'); table.string('is_active', 3).defaultTo('Yes').nullable(); }
  });

  console.log('✅ departments table schema updated successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
