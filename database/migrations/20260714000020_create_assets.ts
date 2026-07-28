import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('assets');
  if (exists) return;

  await knex.schema.createTable('assets', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();

    table.bigInteger('asset_type_id').unsigned().notNullable();
    table.string('asset_code', 50).notNullable();
    table.string('brand', 100).nullable();
    table.string('model', 100).nullable();
    table.string('serial_number', 100).nullable();

    table.date('purchase_date').nullable();
    table.decimal('purchase_price', 12, 2).nullable();
    table.string('currency', 3).defaultTo('INR');

    table.enum('status', ['available', 'allocated', 'returned', 'damaged', 'disposed']).defaultTo('available');

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('asset_type_id').references('asset_types.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.unique(['organization_id', 'asset_code']);
    table.index('organization_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('assets');
}




