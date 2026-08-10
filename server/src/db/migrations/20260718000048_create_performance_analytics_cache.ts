import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('performance_analytics_cache');
  if (exists) return;

  await knex.schema.createTable('performance_analytics_cache', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('metric_type', 100).notNullable();
    table.json('metric_data').notNullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.index('organization_id');
    table.index('metric_type');
    table.index('generated_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('performance_analytics_cache');
}

