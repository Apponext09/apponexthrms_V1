import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('branding_settings');
  if (exists) return;

  await knex.schema.createTable('branding_settings', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable().unique();
    table.string('primary_color', 7).defaultTo('#000000');
    table.string('secondary_color', 7).defaultTo('#FFFFFF');
    table.string('accent_color', 7).defaultTo('#007BFF');
    table.string('logo_url', 512).nullable();
    table.string('logo_dark_url', 512).nullable();
    table.string('favicon_url', 512).nullable();
    table.enum('theme', ['light', 'dark', 'system']).defaultTo('system');
    table.text('custom_css').nullable();
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
  await knex.schema.dropTableIfExists('branding_settings');
}





