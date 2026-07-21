import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('locations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable();
    table.enum('type', ['office', 'work']).defaultTo('office');
    table.bigInteger('branch_id').unsigned().nullable();
    table.string('address_line1', 255).nullable();
    table.string('address_line2', 255).nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('country', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();
    table.integer('geofence_radius_m').nullable();
    table.string('timezone', 50).defaultTo('UTC');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('branch_id').references('branches.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'code']);
    table.index('organization_id');
    table.index('type');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('locations');
}




