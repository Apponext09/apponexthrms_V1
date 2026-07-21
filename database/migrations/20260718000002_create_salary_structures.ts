import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('salary_structures', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('structure_name', 100).notNullable();
    table.string('structure_code', 50).notNullable();
    table.text('description').nullable();
    table.bigInteger('applicable_to_designation_id').unsigned().nullable();
    table.bigInteger('applicable_to_location_id').unsigned().nullable();
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('applicable_to_designation_id').references('designations.id');
    table.foreign('applicable_to_location_id').references('locations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'structure_code']);
    table.index('organization_id');
    table.index('applicable_to_designation_id');
    table.index('applicable_to_location_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_structures');
}




