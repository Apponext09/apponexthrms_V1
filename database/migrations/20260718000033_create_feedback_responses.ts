import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('feedback_responses', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('feedback_request_id').notNullable();
    table.text('response_text').notNullable();
    table.decimal('score', 5, 2).nullable();
    table.boolean('is_anonymous').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('feedback_request_id').references('id').inTable('feedback_requests');
    table.index('organization_id');
    table.index('feedback_request_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feedback_responses');
}

