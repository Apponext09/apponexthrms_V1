import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_asset_replacements');
  if (exists) return;

  await knex.schema.createTable('employee_asset_replacements', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('asset_id').unsigned().notNullable();

    table.bigInteger('old_asset_id').unsigned().notNullable();
    table.bigInteger('new_asset_id').unsigned().notNullable();
    table.enum('reason', ['damage', 'loss', 'upgrade', 'end_of_life']).notNullable();
    table.date('replacement_date').notNullable();
    table.decimal('replacement_cost', 12, 2).nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('asset_id').references('assets.id');
    table.foreign('old_asset_id').references('assets.id');
    table.foreign('new_asset_id').references('assets.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_asset_replacements');
}




