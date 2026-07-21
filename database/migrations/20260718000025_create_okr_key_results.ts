import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('okr_key_results', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('okr_id').notNullable();
    table.text('description').notNullable();
    table.decimal('target_value', 10, 2).notNullable();
    table.decimal('current_value', 10, 2).defaultTo(0);
    table.enum('status', ['draft', 'active', 'completed', 'cancelled']).defaultTo('draft');
    table.decimal('weight', 5, 2).defaultTo(1);
    table.bigInteger('created_by').notNullable();
    table.bigInteger('updated_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('okr_id').references('id').inTable('okr_objectives');
    table.foreign('created_by').references('id').inTable('users');
    table.foreign('updated_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('okr_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('okr_key_results');
}
