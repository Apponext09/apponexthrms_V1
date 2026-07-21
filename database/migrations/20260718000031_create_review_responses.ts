import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('review_responses', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').notNullable();
    table.bigInteger('review_id').notNullable();
    table.string('section', 255).notNullable();
    table.text('response_text').nullable();
    table.decimal('score', 5, 2).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('review_id').references('id').inTable('performance_reviews');
    table.index('organization_id');
    table.index('review_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('review_responses');
}
