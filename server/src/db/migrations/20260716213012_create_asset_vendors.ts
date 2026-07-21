import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('asset_vendors', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.integer('organization_id').notNullable();
    table.string('name', 200).notNullable();
    table.string('email', 100).nullable();
    table.string('phone', 20).nullable();
    table.string('address', 500).nullable();
    table.string('city', 100).nullable();
    table.string('country', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('contact_person', 100).nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.index(['organization_id', 'name']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_vendors');
}
