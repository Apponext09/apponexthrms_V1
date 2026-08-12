import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('assets')) return;
  return knex.schema.createTable('assets', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').unique().notNullable();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.integer('category_id').unsigned().notNullable();
    table.string('asset_code', 50).unique().notNullable();
    table.string('qr_code', 255).nullable();
    table.string('barcode', 255).nullable();
    table.string('serial_number', 100).unique().nullable();
    table.string('model', 100).nullable();
    table.string('brand', 100).nullable();
    table.decimal('cost', 15, 2).nullable();
    table.date('purchase_date').nullable();
    table.date('warranty_start').nullable();
    table.date('warranty_end').nullable();
    table.integer('vendor_id').unsigned().nullable();
    table.enum('status', ['available', 'assigned', 'repair', 'retired', 'lost', 'disposed']).defaultTo('available');
    table.enum('condition', ['excellent', 'good', 'fair', 'poor']).defaultTo('good');
    table.bigInteger('location_id').unsigned().nullable();
    table.bigInteger('department_id').unsigned().nullable();
    table.bigInteger('current_owner_id').unsigned().nullable();
    table.text('notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('category_id').references('asset_categories.id');
    table.foreign('vendor_id').references('asset_vendors.id').onDelete('set null');
    table.foreign('location_id').references('locations.id').onDelete('set null');
    table.foreign('department_id').references('departments.id').onDelete('set null');
    table.foreign('current_owner_id').references('users.id').onDelete('set null');
    table.foreign('created_by').references('users.id');

    table.index(['organization_id', 'asset_code']);
    table.index(['organization_id', 'category_id']);
    table.index(['organization_id', 'status']);
    table.index(['organization_id', 'current_owner_id']);
    table.index(['serial_number']);
    table.index(['organization_id', 'deleted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('assets');
}
