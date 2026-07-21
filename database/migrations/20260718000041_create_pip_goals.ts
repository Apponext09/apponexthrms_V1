import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pip_goals', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('pip_id').notNullable();
    table.text('goal_description').notNullable();
    table.date('target_date').notNullable();
    table.enum('status', ['pending', 'in_progress', 'achieved', 'failed']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('pip_id').references('id').inTable('performance_improvement_plans');
    table.index('organization_id');
    table.index('pip_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pip_goals');
}
