import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('survey_responses', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('survey_id').notNullable().unsigned();
    table.bigInteger('employee_id').unsigned().nullable(); // Nullable if anonymous

    // Denormalized employee metadata (captured at response time)
    table.bigInteger('department_id').unsigned().nullable();
    table.bigInteger('branch_id').unsigned().nullable();
    table.bigInteger('role_id').unsigned().nullable();

    table.datetime('started_at').nullable();
    table.datetime('submitted_at').nullable();
    table.boolean('is_complete').defaultTo(false);
    table.integer('completion_time_seconds').unsigned().nullable();

    table.string('ip_address', 50).nullable();
    table.string('user_agent', 500).nullable();
    table.json('metadata_json').nullable(); // Device, browser info

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('survey_id').references('id').inTable('surveys').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('SET NULL');
    table.foreign('department_id').references('id').inTable('departments').onDelete('SET NULL');
    table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');

    // Unique constraint: one response per employee per survey (when not anonymous)
    table.unique(['survey_id', 'employee_id'], 'uq_survey_response_employee');

    // Indexes
    table.index('survey_id');
    table.index(['survey_id', 'submitted_at'], 'idx_survey_responses_date');
    table.index('employee_id');
    table.index('is_complete');
    table.index(['department_id', 'submitted_at'], 'idx_survey_responses_dept');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_responses');
}

