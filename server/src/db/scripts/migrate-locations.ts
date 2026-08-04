/**
 * Standalone migration script for updating the locations table.
 * Renames branch_id → company_id, adds new fields, drops old unused fields.
 * Run with: tsx ./src/db/scripts/migrate-locations.ts
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
  console.log('🔄 Checking locations table...');

  const hasBranchId = await db.schema.hasColumn('locations', 'branch_id');
  const hasCompanyId = await db.schema.hasColumn('locations', 'company_id');
  const hasOfficeType = await db.schema.hasColumn('locations', 'office_type');
  const hasLocationName = await db.schema.hasColumn('locations', 'location_name');
  const hasZipCode = await db.schema.hasColumn('locations', 'zip_code');
  const hasPostalArea = await db.schema.hasColumn('locations', 'postal_area');
  const hasDistrict = await db.schema.hasColumn('locations', 'district');
  const hasDefaultCurrency = await db.schema.hasColumn('locations', 'default_currency_format');
  const hasLocationMail = await db.schema.hasColumn('locations', 'location_mail');
  const hasContactName = await db.schema.hasColumn('locations', 'contact_name');
  const hasContactNumber = await db.schema.hasColumn('locations', 'contact_number');
  const hasIsActive = await db.schema.hasColumn('locations', 'is_active');

  const hasLatitude = await db.schema.hasColumn('locations', 'latitude');
  const hasLongitude = await db.schema.hasColumn('locations', 'longitude');
  const hasGeofence = await db.schema.hasColumn('locations', 'geofence_radius_m');
  const hasTimezone = await db.schema.hasColumn('locations', 'timezone');
  const hasType = await db.schema.hasColumn('locations', 'type');

  await db.schema.alterTable('locations', (table) => {
    // Rename branch_id → company_id
    if (hasBranchId && !hasCompanyId) {
      console.log('  ↳ Renaming branch_id → company_id');
      table.renameColumn('branch_id', 'company_id');
    }

    // Add new columns
    if (!hasOfficeType) { console.log('  + office_type'); table.string('office_type', 100).nullable(); }
    if (!hasLocationName) { console.log('  + location_name'); table.string('location_name', 255).nullable(); }
    if (!hasZipCode) { console.log('  + zip_code'); table.string('zip_code', 20).nullable(); }
    if (!hasPostalArea) { console.log('  + postal_area'); table.string('postal_area', 100).nullable(); }
    if (!hasDistrict) { console.log('  + district'); table.string('district', 100).nullable(); }
    if (!hasDefaultCurrency) { console.log('  + default_currency_format'); table.string('default_currency_format', 20).nullable(); }
    if (!hasLocationMail) { console.log('  + location_mail'); table.string('location_mail', 255).nullable(); }
    if (!hasContactName) { console.log('  + contact_name'); table.string('contact_name', 255).nullable(); }
    if (!hasContactNumber) { console.log('  + contact_number'); table.string('contact_number', 50).nullable(); }
    if (!hasIsActive) { console.log('  + is_active (Yes/No)'); table.string('is_active', 3).defaultTo('Yes').nullable(); }

    // Drop old unused columns
    if (hasLatitude) { console.log('  - latitude'); table.dropColumn('latitude'); }
    if (hasLongitude) { console.log('  - longitude'); table.dropColumn('longitude'); }
    if (hasGeofence) { console.log('  - geofence_radius_m'); table.dropColumn('geofence_radius_m'); }
    if (hasTimezone) { console.log('  - timezone'); table.dropColumn('timezone'); }
    if (hasType) { console.log('  - type'); table.dropColumn('type'); }
  });

  console.log('✅ locations table updated successfully!');
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.destroy());
