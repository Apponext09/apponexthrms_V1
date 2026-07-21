import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('asset_maintenance', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.integer('organization_id').notNullable();
    table.integer('asset_id').notNullable();
    table.enum('maintenance_type', ['repair', 'amc', 'scheduled', 'preventive']).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.integer('vendor_id').nullable();
    table.decimal('cost', 15, 2).nullable();
    table.text('description').nullable();
    table.enum('status', ['pending', 'in_progress', 'completed', 'cancelled']).defaultTo('pending');
    table.text('completion_notes').nullable();
    table.integer('completed_by').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('vendor_id').references('asset_vendors.id').onDelete('set null');
    table.foreign('completed_by').references('users.id').onDelete('set null');

    table.index(['organization_id', 'asset_id']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('asset_maintenance');
}
