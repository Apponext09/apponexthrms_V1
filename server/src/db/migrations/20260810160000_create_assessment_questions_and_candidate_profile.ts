import type { Knex } from 'knex';

/**
 * Recruitment Module — Additional Tables
 * 
 * Creates:
 * - assessment_questions: Question bank for assessments
 * - candidate_skills: Candidate skill records
 * - candidate_education: Candidate education records
 * - candidate_experience: Candidate work experience records
 */
export async function up(knex: Knex): Promise<void> {

  // ──────────────────────────────────────────────────────────
  // 1. assessment_questions — Question bank for assessments
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('assessment_questions'))) {
    await knex.schema.createTable('assessment_questions', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('assessment_id').unsigned().notNullable();
      table.integer('question_number').notNullable().defaultTo(1);
      table.text('question_text').notNullable();
      table.enum('question_type', ['mcq', 'coding', 'text', 'boolean']).defaultTo('mcq');
      table.json('options_json').nullable(); // JSON array for MCQ choices: [{label, value}]
      table.text('correct_answer').nullable();
      table.integer('marks').defaultTo(1);
      table.text('explanation').nullable();

      table.integer('created_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('assessment_id').references('assessments.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('assessment_id');
      table.index('question_number');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 2. candidate_skills — Candidate skill records
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidate_skills'))) {
    await knex.schema.createTable('candidate_skills', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('candidate_id').unsigned().notNullable();
      table.string('skill_name', 150).notNullable();
      table.enum('proficiency', ['beginner', 'intermediate', 'advanced', 'expert']).defaultTo('intermediate');
      table.decimal('years_of_experience', 4, 1).nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 3. candidate_education — Candidate education records
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidate_education'))) {
    await knex.schema.createTable('candidate_education', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('candidate_id').unsigned().notNullable();
      table.string('degree', 255).notNullable();
      table.string('field_of_study', 255).nullable();
      table.string('institution', 255).nullable();
      table.integer('graduation_year').nullable();
      table.string('grade', 50).nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 4. candidate_experience — Candidate work experience
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidate_experience'))) {
    await knex.schema.createTable('candidate_experience', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('candidate_id').unsigned().notNullable();
      table.string('company_name', 255).notNullable();
      table.string('job_title', 255).nullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.boolean('is_current').defaultTo(false);
      table.text('description').nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('candidate_experience');
  await knex.schema.dropTableIfExists('candidate_education');
  await knex.schema.dropTableIfExists('candidate_skills');
  await knex.schema.dropTableIfExists('assessment_questions');
}
