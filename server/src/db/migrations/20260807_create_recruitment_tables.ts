import { Knex } from 'knex';

/**
 * Recruitment Module — Complete Database Schema
 * 
 * Creates 19 tables for the full recruitment lifecycle:
 * MRF Requests, Jobs, Candidates, Applications, Interviews,
 * Assessments, Offers, Referrals, Resume Bank, Pipeline Stages
 */
export async function up(knex: Knex): Promise<void> {

  // ──────────────────────────────────────────────────────────
  // 1. pipeline_stages — Configurable recruitment pipeline
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('pipeline_stages'))) {
    await knex.schema.createTable('pipeline_stages', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.string('stage_name', 100).notNullable();
      table.integer('stage_order').notNullable().defaultTo(0);
      table.string('stage_color', 20).nullable();
      table.boolean('is_default').defaultTo(false);
      table.enum('status', ['active', 'inactive']).defaultTo('active');

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('stage_order');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 2. mrf_requests — Manpower Requisition Forms
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('mrf_requests'))) {
    await knex.schema.createTable('mrf_requests', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.string('mr_number', 50).notNullable();
      table.string('position_title', 255).notNullable();
      table.integer('number_of_positions').notNullable().defaultTo(1);
      table.string('recruitment_type', 50).defaultTo('Both');
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('company_location_id').unsigned().nullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('grade_id').unsigned().nullable();
      table.string('employment_type', 50).nullable();
      table.string('qualification_required', 500).nullable();
      table.string('experience_desired', 255).nullable();
      table.bigInteger('interviewer_id').unsigned().nullable();
      table.string('pay_scale_type', 50).nullable();
      table.string('pay_scale_for_position', 255).nullable();
      table.string('reason_for_requirement', 255).nullable();
      table.enum('list_in_job_page', ['Yes', 'No']).defaultTo('Yes');
      table.json('skills').nullable();
      table.text('comment').nullable();
      table.text('job_description', 'longtext').nullable();
      table.string('stage', 50).defaultTo('Pending Approval');
      table.enum('status', ['Open', 'Closed']).defaultTo('Open');
      table.bigInteger('requested_by').unsigned().nullable();
      table.bigInteger('approved_by').unsigned().nullable();
      table.timestamp('approved_at').nullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('mr_number');
      table.index('status');
      table.index('stage');
      table.index('department_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 3. mrf_approval_history — Audit trail for MRF approvals
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('mrf_approval_history'))) {
    await knex.schema.createTable('mrf_approval_history', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('mrf_request_id').unsigned().notNullable();
      table.bigInteger('approver_id').unsigned().nullable();
      table.enum('action', ['approved', 'rejected', 'returned', 'submitted']).notNullable();
      table.text('comment').nullable();
      table.timestamp('acted_at').defaultTo(knex.fn.now());

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('mrf_request_id').references('mrf_requests.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('mrf_request_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 4. mrf_table_settings — Per-user table/field config
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('mrf_table_settings'))) {
    await knex.schema.createTable('mrf_table_settings', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('user_id').unsigned().notNullable();
      table.string('config_type', 50).notNullable();
      table.json('settings_json').nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('user_id');
      table.unique(['organization_id', 'user_id', 'config_type']);
    });
  }

  // ──────────────────────────────────────────────────────────
  // 5. jobs — Job postings linked to MRF
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('jobs'))) {
    await knex.schema.createTable('jobs', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('mrf_request_id').unsigned().nullable();
      table.string('job_code', 50).notNullable();
      table.string('job_title', 255).notNullable();
      table.text('job_description', 'longtext').nullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('designation_id').unsigned().nullable();
      table.bigInteger('location_id').unsigned().nullable();
      table.enum('job_type', ['full_time', 'part_time', 'contract', 'internship']).defaultTo('full_time');
      table.enum('experience_level', ['entry', 'mid', 'senior', 'lead']).defaultTo('mid');
      table.integer('min_experience_years').nullable();
      table.integer('max_experience_years').nullable();
      table.decimal('min_salary', 15, 2).nullable();
      table.decimal('max_salary', 15, 2).nullable();
      table.string('currency', 3).defaultTo('INR');
      table.enum('employment_type', ['onsite', 'remote', 'hybrid']).defaultTo('onsite');
      table.integer('no_of_positions').notNullable().defaultTo(1);
      table.bigInteger('job_template_id').unsigned().nullable();
      table.enum('status', ['draft', 'published', 'closed', 'on_hold']).defaultTo('draft');
      table.timestamp('published_at').nullable();
      table.timestamp('closed_at').nullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('job_code');
      table.index('status');
      table.index('department_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 6. job_skills — Skills required per job
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('job_skills'))) {
    await knex.schema.createTable('job_skills', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('job_id').unsigned().notNullable();

      table.string('skill_name', 150).notNullable();
      table.enum('proficiency', ['beginner', 'intermediate', 'expert']).defaultTo('intermediate');
      table.boolean('is_mandatory').defaultTo(false);

      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('job_id').references('jobs.id').onDelete('CASCADE');
      table.index('job_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 7. candidates — Candidate master records
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidates'))) {
    await knex.schema.createTable('candidates', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).nullable();
      table.string('email', 255).notNullable();
      table.string('phone', 20).nullable();
      table.string('alt_phone', 20).nullable();
      table.date('dob').nullable();
      table.string('gender', 20).nullable();
      table.string('marital_status', 30).nullable();
      table.string('current_location', 255).nullable();
      table.string('preferred_location', 255).nullable();
      table.decimal('current_salary', 15, 2).nullable();
      table.string('salary_currency', 3).defaultTo('INR');
      table.decimal('expected_salary', 15, 2).nullable();
      table.integer('notice_period_days').nullable();
      table.string('current_company', 255).nullable();
      table.decimal('years_of_experience', 4, 1).nullable();
      table.string('qualification', 255).nullable();
      table.string('university', 255).nullable();
      table.string('linkedin_url', 500).nullable();
      table.string('github_url', 500).nullable();
      table.string('portfolio_url', 500).nullable();
      table.string('source', 50).nullable();
      table.string('address_line1', 500).nullable();
      table.string('address_line2', 500).nullable();
      table.string('country', 100).nullable();
      table.string('zipcode', 20).nullable();
      table.string('state', 100).nullable();
      table.string('city', 100).nullable();
      table.text('skills').nullable();
      table.text('comments').nullable();
      table.string('resume_url', 500).nullable();
      table.string('signature_url', 500).nullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('email');
      table.index('source');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 8. candidate_documents — Resume, certificates, etc.
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidate_documents'))) {
    await knex.schema.createTable('candidate_documents', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('candidate_id').unsigned().notNullable();
      table.string('document_type', 50).notNullable();
      table.string('file_name', 255).notNullable();
      table.string('file_url', 500).notNullable();
      table.integer('file_size').nullable();
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 9. candidate_notes — Internal notes on candidates
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('candidate_notes'))) {
    await knex.schema.createTable('candidate_notes', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('candidate_id').unsigned().notNullable();
      table.text('note_text').notNullable();
      table.bigInteger('created_by').unsigned().nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('candidate_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 10. applications — Links candidate to job
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('applications'))) {
    await knex.schema.createTable('applications', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('candidate_id').unsigned().notNullable();
      table.bigInteger('job_id').unsigned().notNullable();
      table.bigInteger('mrf_request_id').unsigned().nullable();
      table.enum('application_status', ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']).defaultTo('applied');
      table.timestamp('applied_at').defaultTo(knex.fn.now());
      table.string('applied_from_source', 100).nullable();
      table.enum('initial_screening_status', ['pending', 'passed', 'failed']).defaultTo('pending');
      table.bigInteger('screening_completed_by').unsigned().nullable();
      table.timestamp('screening_completed_at').nullable();
      table.bigInteger('pipeline_stage_id').unsigned().nullable();
      table.timestamp('current_stage_entered_at').nullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id');
      table.foreign('job_id').references('jobs.id');
      table.index('organization_id');
      table.index('candidate_id');
      table.index('job_id');
      table.index('application_status');
      table.index('pipeline_stage_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 11. application_stage_history — Pipeline movement audit
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('application_stage_history'))) {
    await knex.schema.createTable('application_stage_history', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('application_id').unsigned().notNullable();
      table.bigInteger('from_stage_id').unsigned().nullable();
      table.bigInteger('to_stage_id').unsigned().notNullable();
      table.bigInteger('changed_by').unsigned().nullable();
      table.text('notes').nullable();
      table.timestamp('changed_at').defaultTo(knex.fn.now());

      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('application_id').references('applications.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('application_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 12. interviews — Interview scheduling
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('interviews'))) {
    await knex.schema.createTable('interviews', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('application_id').unsigned().notNullable();
      table.enum('interview_type', ['phone', 'video', 'in_person']).defaultTo('video');
      table.integer('interview_round').notNullable().defaultTo(1);
      table.timestamp('scheduled_date').notNullable();
      table.integer('duration_minutes').defaultTo(60);
      table.string('meeting_url', 500).nullable();
      table.string('location', 255).nullable();
      table.enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).defaultTo('scheduled');

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('application_id').references('applications.id');
      table.index('organization_id');
      table.index('application_id');
      table.index('status');
      table.index('scheduled_date');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 13. interview_feedback — Per-interviewer feedback
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('interview_feedback'))) {
    await knex.schema.createTable('interview_feedback', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('interview_id').unsigned().notNullable();
      table.bigInteger('interviewer_id').unsigned().notNullable();
      table.integer('overall_rating').nullable();
      table.integer('technical_rating').nullable();
      table.integer('communication_rating').nullable();
      table.integer('cultural_fit_rating').nullable();
      table.text('feedback_text').nullable();
      table.boolean('would_recommend').defaultTo(false);
      table.timestamp('submitted_at').defaultTo(knex.fn.now());

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('interview_id').references('interviews.id').onDelete('CASCADE');
      table.index('organization_id');
      table.index('interview_id');
      table.index('interviewer_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 14. assessments — Assessment templates
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('assessments'))) {
    await knex.schema.createTable('assessments', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.string('assessment_name', 255).notNullable();
      table.enum('assessment_type', ['coding', 'mcq', 'assignment', 'form']).defaultTo('mcq');
      table.integer('duration_minutes').notNullable().defaultTo(60);
      table.integer('passing_score').defaultTo(50);
      table.text('description').nullable();
      table.enum('status', ['active', 'inactive', 'draft']).defaultTo('active');

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('status');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 15. assessment_attempts — Candidate assessment results
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('assessment_attempts'))) {
    await knex.schema.createTable('assessment_attempts', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('application_id').unsigned().notNullable();
      table.bigInteger('assessment_id').unsigned().notNullable();
      table.integer('score').nullable();
      table.enum('status', ['assigned', 'in_progress', 'completed', 'expired']).defaultTo('assigned');
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.json('answers_json').nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('application_id').references('applications.id');
      table.foreign('assessment_id').references('assessments.id');
      table.index('organization_id');
      table.index('application_id');
      table.index('assessment_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 16. offers — Offer letters
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('offers'))) {
    await knex.schema.createTable('offers', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('application_id').unsigned().notNullable();
      table.string('position_title', 255).notNullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('designation_id').unsigned().nullable();
      table.decimal('cost_to_company', 15, 2).nullable();
      table.decimal('base_salary', 15, 2).nullable();
      table.string('currency', 3).defaultTo('INR');
      table.date('offer_start_date').nullable();
      table.date('offer_expiry_date').nullable();
      table.enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn']).defaultTo('draft');
      table.timestamp('accepted_at').nullable();
      table.timestamp('rejected_at').nullable();

      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('application_id').references('applications.id');
      table.index('organization_id');
      table.index('application_id');
      table.index('status');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 17. referrals — Employee referral tracking
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('referrals'))) {
    await knex.schema.createTable('referrals', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('mrf_request_id').unsigned().nullable();
      table.bigInteger('referring_employee_id').unsigned().nullable();
      table.bigInteger('candidate_id').unsigned().notNullable();
      table.decimal('referral_reward_amount', 15, 2).nullable();
      table.enum('status', ['submitted', 'approved', 'hired', 'rejected', 'reward_paid']).defaultTo('submitted');

      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.foreign('candidate_id').references('candidates.id');
      table.index('organization_id');
      table.index('mrf_request_id');
      table.index('candidate_id');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 18. resume_bank — Resume bank entries
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('resume_bank'))) {
    await knex.schema.createTable('resume_bank', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.string('tracker_id', 50).notNullable();
      table.bigInteger('candidate_id').unsigned().nullable();
      table.string('source', 50).nullable();
      table.string('position', 255).nullable();
      table.enum('status', ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected', 'On Hold']).defaultTo('Applied');
      table.bigInteger('uploaded_by').unsigned().nullable();

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
      table.index('tracker_id');
      table.index('status');
    });
  }

  // ──────────────────────────────────────────────────────────
  // 19. resume_upload_logs — Bulk upload audit logs
  // ──────────────────────────────────────────────────────────
  if (!(await knex.schema.hasTable('resume_upload_logs'))) {
    await knex.schema.createTable('resume_upload_logs', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();

      table.bigInteger('uploaded_by').unsigned().nullable();
      table.string('file_name', 255).notNullable();
      table.integer('total_records').defaultTo(0);
      table.integer('success_count').defaultTo(0);
      table.integer('failed_count').defaultTo(0);
      table.enum('status', ['Processing', 'Completed', 'Failed']).defaultTo('Processing');
      table.json('error_log_json').nullable();
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.index('organization_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse dependency order
  await knex.schema.dropTableIfExists('resume_upload_logs');
  await knex.schema.dropTableIfExists('resume_bank');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('offers');
  await knex.schema.dropTableIfExists('assessment_attempts');
  await knex.schema.dropTableIfExists('assessments');
  await knex.schema.dropTableIfExists('interview_feedback');
  await knex.schema.dropTableIfExists('interviews');
  await knex.schema.dropTableIfExists('application_stage_history');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('candidate_notes');
  await knex.schema.dropTableIfExists('candidate_documents');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('job_skills');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('mrf_table_settings');
  await knex.schema.dropTableIfExists('mrf_approval_history');
  await knex.schema.dropTableIfExists('mrf_requests');
  await knex.schema.dropTableIfExists('pipeline_stages');
}
