import { Knex } from 'knex';

/**
 * Recruitment Module — ATS Score & AI Screening Schema
 */
export async function up(knex: Knex): Promise<void> {

  // 1. skills
  if (!(await knex.schema.hasTable('skills'))) {
    await knex.schema.createTable('skills', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().nullable();

      table.string('name', 150).notNullable();
      table.string('category', 100).nullable().defaultTo('Technical');
      table.text('description').nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('organization_id');
      table.index('name');
      table.index('category');
    });
  }

  // 2. skill_aliases
  if (!(await knex.schema.hasTable('skill_aliases'))) {
    await knex.schema.createTable('skill_aliases', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().nullable();

      table.integer('skill_id').unsigned().notNullable();
      table.string('alias', 150).notNullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('skill_id').references('skills.id').onDelete('CASCADE');
      table.index('skill_id');
      table.index('alias');
      table.index('organization_id');
    });
  }

  // 3. job_ai_settings
  if (!(await knex.schema.hasTable('job_ai_settings'))) {
    await knex.schema.createTable('job_ai_settings', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('job_id').unsigned().notNullable().unique();
      table.boolean('ai_screening_enabled').defaultTo(true);
      table.boolean('ats_enabled').defaultTo(true);
      table.integer('ats_threshold').defaultTo(85);
      table.boolean('jd_match_enabled').defaultTo(true);
      table.integer('jd_match_threshold').defaultTo(80);
      table.enum('shortlisting_mode', ['ATS_ONLY', 'JD_MATCH_ONLY', 'ATS_AND_JD', 'WEIGHTED_SCORE', 'AI_RECOMMENDED']).defaultTo('ATS_AND_JD');
      table.integer('ats_weight').defaultTo(40);
      table.integer('jd_match_weight').defaultTo(60);
      table.boolean('auto_shortlist_enabled').defaultTo(false);
      table.integer('suggestion_limit').defaultTo(50);
      table.json('mandatory_skills').nullable();
      table.decimal('min_experience', 4, 1).nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('job_id').references('jobs.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('job_id');
    });
  }

  // 4. resume_ats_scores
  if (!(await knex.schema.hasTable('resume_ats_scores'))) {
    await knex.schema.createTable('resume_ats_scores', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('candidate_id').unsigned().notNullable();
      table.integer('resume_id').unsigned().nullable();
      table.integer('job_id').unsigned().notNullable();

      table.decimal('ats_score', 5, 2).notNullable().defaultTo(0);
      table.decimal('keyword_score', 5, 2).defaultTo(0);
      table.decimal('skill_score', 5, 2).defaultTo(0);
      table.decimal('experience_score', 5, 2).defaultTo(0);
      table.decimal('structure_score', 5, 2).defaultTo(0);
      table.decimal('format_score', 5, 2).defaultTo(0);
      table.decimal('education_score', 5, 2).defaultTo(0);

      table.json('matched_keywords').nullable();
      table.json('missing_keywords').nullable();
      table.json('section_details').nullable();

      table.integer('analysis_version').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.foreign('job_id').references('jobs.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
      table.index('job_id');
      table.unique(['candidate_id', 'job_id']);
    });
  }

  // 5. candidate_job_matches
  if (!(await knex.schema.hasTable('candidate_job_matches'))) {
    await knex.schema.createTable('candidate_job_matches', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('job_id').unsigned().notNullable();
      table.integer('candidate_id').unsigned().notNullable();

      table.decimal('overall_score', 5, 2).notNullable().defaultTo(0);
      table.decimal('skill_score', 5, 2).defaultTo(0);
      table.decimal('experience_score', 5, 2).defaultTo(0);
      table.decimal('semantic_score', 5, 2).defaultTo(0);

      table.json('matched_skills').nullable();
      table.json('missing_skills').nullable();
      table.enum('match_status', ['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR']).defaultTo('AVERAGE');

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('job_id').references('jobs.id').onDelete('CASCADE');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('job_id');
      table.index('candidate_id');
      table.unique(['job_id', 'candidate_id']);
    });
  }

  // 6. candidate_job_actions
  if (!(await knex.schema.hasTable('candidate_job_actions'))) {
    await knex.schema.createTable('candidate_job_actions', (table) => {
      table.increments('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.integer('organization_id').unsigned().notNullable();

      table.integer('job_id').unsigned().notNullable();
      table.integer('candidate_id').unsigned().notNullable();

      table.string('action', 50).notNullable();
      table.text('reason').nullable();
      table.integer('performed_by').unsigned().nullable();
      table.string('source', 50).defaultTo('AI_SCREENING');

      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('job_id').references('jobs.id').onDelete('CASCADE');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('job_id');
      table.index('candidate_id');
      table.index('action');
    });
  }

  // 7. Enhance resume_upload_logs
  if (await knex.schema.hasTable('resume_upload_logs')) {
    const hasJobId = await knex.schema.hasColumn('resume_upload_logs', 'target_job_id');
    if (!hasJobId) {
      await knex.schema.alterTable('resume_upload_logs', (table) => {
        table.integer('target_job_id').unsigned().nullable();
        table.integer('ats_passed_count').defaultTo(0);
        table.integer('jd_match_passed_count').defaultTo(0);
        table.integer('ai_shortlisted_count').defaultTo(0);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('resume_upload_logs')) {
    const hasJobId = await knex.schema.hasColumn('resume_upload_logs', 'target_job_id');
    if (hasJobId) {
      await knex.schema.alterTable('resume_upload_logs', (table) => {
        table.dropColumn('target_job_id');
        table.dropColumn('ats_passed_count');
        table.dropColumn('jd_match_passed_count');
        table.dropColumn('ai_shortlisted_count');
      });
    }
  }

  await knex.schema.dropTableIfExists('candidate_job_actions');
  await knex.schema.dropTableIfExists('candidate_job_matches');
  await knex.schema.dropTableIfExists('resume_ats_scores');
  await knex.schema.dropTableIfExists('job_ai_settings');
  await knex.schema.dropTableIfExists('skill_aliases');
  await knex.schema.dropTableIfExists('skills');
}
