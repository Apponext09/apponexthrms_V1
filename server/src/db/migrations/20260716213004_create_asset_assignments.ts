import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('asset_assignments')) return;
  return knex.schema.createTable('asset_assignments', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('asset_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('assignment_type', ['permanent', 'temporary']).defaultTo('permanent');
    table.date('assigned_date').notNullable();
    table.date('expected_return_date').nullable();
    table.enum('status', ['active', 'returned', 'lost', 'damaged']).defaultTo('active');
    table.text('notes').nullable();
    table.bigInteger('assigned_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('employee_id').references('users.id');
    table.foreign('assigned_by').references('users.id');

    table.index(['organization_id', 'employee_id']);
    table.index(['organization_id', 'asset_id']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_assignments');
}
