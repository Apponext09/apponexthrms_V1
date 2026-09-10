import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check existing columns
  const hasOfficeType = await knex.schema.hasColumn('locations', 'office_type');
  const hasLocationName = await knex.schema.hasColumn('locations', 'location_name');
  const hasZipCode = await knex.schema.hasColumn('locations', 'zip_code');
  const hasPostalArea = await knex.schema.hasColumn('locations', 'postal_area');
  const hasDistrict = await knex.schema.hasColumn('locations', 'district');
  const hasDefaultCurrency = await knex.schema.hasColumn('locations', 'default_currency_format');
  const hasLocationMail = await knex.schema.hasColumn('locations', 'location_mail');
  const hasContactName = await knex.schema.hasColumn('locations', 'contact_name');
  const hasContactNumber = await knex.schema.hasColumn('locations', 'contact_number');
  const hasIsActive = await knex.schema.hasColumn('locations', 'is_active');
  const hasCompanyId = await knex.schema.hasColumn('locations', 'company_id');
  const hasBranchId = await knex.schema.hasColumn('locations', 'branch_id');

  // Columns to drop (unused)
  const hasLatitude = await knex.schema.hasColumn('locations', 'latitude');
  const hasLongitude = await knex.schema.hasColumn('locations', 'longitude');
  const hasGeofence = await knex.schema.hasColumn('locations', 'geofence_radius_m');
  const hasTimezone = await knex.schema.hasColumn('locations', 'timezone');
  const hasType = await knex.schema.hasColumn('locations', 'type');

  await knex.schema.alterTable('locations', (table) => {
    // Rename branch_id → company_id (only if branch_id exists and company_id doesn't yet)
    if (hasBranchId && !hasCompanyId) {
      table.renameColumn('branch_id', 'company_id');
    }

    // Add new master fields
    if (!hasOfficeType) {
      table.string('office_type', 100).nullable();
    }
    if (!hasLocationName) {
      table.string('location_name', 255).nullable();
    }
    if (!hasZipCode) {
      table.string('zip_code', 20).nullable();
    }
    if (!hasPostalArea) {
      table.string('postal_area', 100).nullable();
    }
    if (!hasDistrict) {
      table.string('district', 100).nullable();
    }
    if (!hasDefaultCurrency) {
      table.string('default_currency_format', 20).nullable();
    }
    if (!hasLocationMail) {
      table.string('location_mail', 255).nullable();
    }
    if (!hasContactName) {
      table.string('contact_name', 255).nullable();
    }
    if (!hasContactNumber) {
      table.string('contact_number', 50).nullable();
    }
    // is_active stored as 'Yes'/'No' string to avoid boolean issues
    if (!hasIsActive) {
      table.string('is_active', 3).defaultTo('Yes').nullable();
    }

    // Drop unused columns
    if (hasLatitude) table.dropColumn('latitude');
    if (hasLongitude) table.dropColumn('longitude');
    if (hasGeofence) table.dropColumn('geofence_radius_m');
    if (hasTimezone) table.dropColumn('timezone');
    if (hasType) table.dropColumn('type');
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasCompanyId = await knex.schema.hasColumn('locations', 'company_id');

  await knex.schema.alterTable('locations', (table) => {
    // Restore branch_id
    if (hasCompanyId) {
      table.renameColumn('company_id', 'branch_id');
    }

    // Remove added columns
    table.dropColumn('office_type');
    table.dropColumn('location_name');
    table.dropColumn('zip_code');
    table.dropColumn('postal_area');
    table.dropColumn('district');
    table.dropColumn('default_currency_format');
    table.dropColumn('location_mail');
    table.dropColumn('contact_name');
    table.dropColumn('contact_number');
    table.dropColumn('is_active');

    // Restore dropped columns
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
    table.integer('geofence_radius_m').nullable();
    table.string('timezone', 100).defaultTo('UTC');
    table.string('type', 20).defaultTo('office');
  });
}
