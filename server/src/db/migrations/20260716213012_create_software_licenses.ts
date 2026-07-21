import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('software_licenses', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.integer('organization_id').notNullable();
    table.string('software_name', 200).notNullable();
    table.string('license_key', 255).nullable();
    table.enum('license_type', ['perpetual', 'subscription', 'trial']).notNullable();
    table.integer('total_licenses').notNullable();
    table.integer('used_licenses').defaultTo(0);
    table.date('purchase_date').nullable();
    table.date('expiry_date').nullable();
    table.decimal('cost', 15, 2).nullable();
    table.integer('vendor_id').nullable();
    table.text('notes').nullable();
    table.enum('status', ['active', 'expired', 'inactive']).defaultTo('active');
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('vendor_id').references('asset_vendors.id').onDelete('set null');

    table.index(['organization_id', 'software_name']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'expiry_date']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('software_licenses');
}
