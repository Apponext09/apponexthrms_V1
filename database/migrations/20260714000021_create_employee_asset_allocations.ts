import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_asset_allocations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('asset_id').unsigned().notNullable();

    table.date('allocation_date').notNullable();
    table.date('return_date').nullable();
    table.enum('condition_at_allocation', ['good', 'fair', 'poor']).defaultTo('good');
    table.enum('condition_at_return', ['good', 'fair', 'poor']).nullable();
    table.text('notes').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('asset_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_asset_allocations');
}




