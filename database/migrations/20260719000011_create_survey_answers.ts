import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('survey_answers', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('response_id').notNullable().unsigned();
    table.bigInteger('question_id').notNullable().unsigned();

    // JSON to support multiple answer types: string, number, array, boolean
    table.json('answer_value').nullable();

    table.datetime('answered_at').nullable();

    // Foreign keys
    table.foreign('response_id').references('id').inTable('survey_responses').onDelete('CASCADE');
    table.foreign('question_id').references('id').inTable('survey_questions').onDelete('CASCADE');

    // Indexes
    table.index('response_id');
    table.index(['response_id', 'question_id'], 'idx_survey_answers_response_question');
    table.index('question_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_answers');
}

