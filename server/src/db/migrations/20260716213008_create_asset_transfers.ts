import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('asset_transfers')) return;
  return knex.schema.createTable('asset_transfers', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('asset_id').unsigned().notNullable();
    table.bigInteger('from_employee_id').unsigned().notNullable();
    table.bigInteger('to_employee_id').unsigned().notNullable();
    table.date('transfer_date').notNullable();
    table.text('reason').nullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'completed']).defaultTo('pending');
    table.bigInteger('requested_by').unsigned().notNullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('from_employee_id').references('users.id');
    table.foreign('to_employee_id').references('users.id');
    table.foreign('requested_by').references('users.id');
    table.foreign('approved_by').references('users.id').onDelete('set null');

    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'asset_id']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_transfers');
}
