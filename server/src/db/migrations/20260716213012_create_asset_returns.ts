import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('asset_returns', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.integer('organization_id').notNullable();
    table.integer('asset_id').notNullable();
    table.integer('employee_id').notNullable();
    table.date('return_date').notNullable();
    table.enum('condition', ['good', 'minor_damage', 'major_damage', 'lost']).defaultTo('good');
    table.text('damage_notes').nullable();
    table.boolean('is_recoverable').defaultTo(true);
    table.decimal('recovery_amount', 15, 2).nullable();
    table.enum('status', ['pending', 'completed', 'processing']).defaultTo('pending');
    table.integer('received_by').notNullable();
    table.timestamp('received_date').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('employee_id').references('users.id');
    table.foreign('received_by').references('users.id');

    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'employee_id']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_returns');
}
