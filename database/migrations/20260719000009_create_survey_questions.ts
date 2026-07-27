import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('survey_questions');
  if (exists) return;

  await knex.schema.createTable('survey_questions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('survey_id').unsigned().notNullable().unsigned();

    table.string('question_text', 1000).notNullable();

    table.enum('question_type', [
      'short_text',
      'long_text',
      'rating',
      'nps',
      'multiple_choice',
      'checkbox',
      'matrix',
      'ranking',
      'date',
      'file_upload',
    ]).notNullable();

    table.integer('sort_order').defaultTo(0);
    table.boolean('is_required').defaultTo(true);
    table.text('description').nullable();

    // For rating questions
    table.integer('min_scale').unsigned().nullable(); // e.g., 1
    table.integer('max_scale').unsigned().nullable(); // e.g., 5
    table.json('scale_labels').nullable(); // e.g., {"1": "Very Poor", "5": "Excellent"}

    // For choice, checkbox, ranking questions
    table.json('options').nullable(); // Array of option strings

    // For matrix questions
    table.json('matrix_rows').nullable(); // Array of row labels
    table.json('matrix_columns').nullable(); // Array of column labels

    // For file upload
    table.string('file_accept_types', 255).nullable(); // e.g., ".pdf,.doc"
    table.bigInteger('max_file_size').unsigned().nullable(); // In bytes

    // Branching logic
    table.json('branching_logic_json').nullable(); // For conditional questions

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('survey_id').references('id').inTable('surveys').onDelete('CASCADE');

    // Indexes
    table.index('survey_id');
    table.index(['survey_id', 'sort_order'], 'idx_survey_questions_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_questions');
}

