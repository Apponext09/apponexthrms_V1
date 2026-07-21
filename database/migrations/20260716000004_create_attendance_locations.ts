import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attendance_locations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('location_name', 100).notNullable();
    table.string('location_code', 50).notNullable();
    table.bigInteger('branch_id').unsigned().nullable();
    table.text('address').nullable();
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();
    table.string('timezone', 50).defaultTo('UTC');
    table.boolean('is_primary').defaultTo(false);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('branch_id').references('branches.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'location_code']);
    table.index('organization_id');
    table.index('is_primary');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_locations');
}




