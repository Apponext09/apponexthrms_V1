import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('organization_profiles');
  if (exists) return;

  await knex.schema.createTable('organization_profiles', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unique();
    table.string('company_name', 255).notNullable();
    table.string('legal_name', 255).nullable();
    table.string('website', 255).nullable();
    table.string('gst_number', 50).nullable();
    table.string('pan_number', 50).nullable();
    table.string('cin_number', 50).nullable();
    table.string('logo_url', 512).nullable();
    table.string('logo_dark_url', 512).nullable();
    table.string('address_line1', 255).nullable();
    table.string('address_line2', 255).nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('country', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('primary_contact_email', 255).nullable();
    table.string('primary_contact_phone', 20).nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organization_profiles');
}




