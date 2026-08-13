import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('asset_requests')) return;
  return knex.schema.createTable('asset_requests', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.integer('category_id').unsigned().notNullable();
    table.string('asset_model', 100).nullable();
    table.string('specification', 500).nullable();
    table.text('reason').nullable();
    table.date('required_date').nullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'fulfilled']).defaultTo('pending');
    table.bigInteger('requested_by').unsigned().notNullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.bigInteger('fulfilled_by').unsigned().nullable();
    table.timestamp('fulfilled_date').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('users.id');
    table.foreign('category_id').references('asset_categories.id');
    table.foreign('requested_by').references('users.id');
    table.foreign('approved_by').references('users.id').onDelete('set null');
    table.foreign('fulfilled_by').references('users.id').onDelete('set null');

    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'employee_id']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_requests');
}
