import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Skip if table already exists (defensive for existing databases)
  const hasJobRequisitions = await knex.schema.hasTable('job_requisitions');
  if (hasJobRequisitions) {
    return; // Tables already created, skip migration
  }

  // Job Requisitions Table
  await knex.schema.createTable('job_requisitions', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('requisition_code', 50).notNullable();
    table.string('position_title', 255).notNullable();
    table.integer('department_id').unsigned().nullable();
    table.integer('headcount_count').notNullable();
    table.enum('requisition_type', ['new_position', 'replacement_hiring']).notNullable();
    table.decimal('budget_allocated', 15, 2).nullable();
    table.text('hiring_justification').nullable();
    table.enum('priority', ['low', 'medium', 'high', 'critical']).notNullable();
    table.integer('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'active', 'closed']).notNullable().defaultTo('draft');
    table.json('approvers_chain').nullable();
    table.timestamp('submitted_at').nullable();
    table.timestamp('approved_at').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.unique(['organization_id', 'requisition_code']);
    table.index('organization_id');
    table.index('status');
  });

  // Jobs Table
  await knex.schema.createTable('jobs', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('job_code', 50).notNullable();
    table.string('job_title', 255).notNullable();
    table.text('job_description').notNullable();
    table.integer('department_id').unsigned().nullable();
    table.integer('designation_id').unsigned().nullable();
    table.integer('location_id').unsigned().nullable();
    table.enum('job_type', ['full_time', 'part_time', 'contract', 'internship']).notNullable();
    table.enum('experience_level', ['entry', 'mid', 'senior', 'lead']).notNullable();
    table.integer('min_experience_years').unsigned().nullable();
    table.integer('max_experience_years').unsigned().nullable();
    table.decimal('min_salary', 15, 2).nullable();
    table.decimal('max_salary', 15, 2).nullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.enum('employment_type', ['onsite', 'remote', 'hybrid']).notNullable();
    table.integer('no_of_positions').unsigned().notNullable();
    table.integer('job_template_id').unsigned().nullable();
    table.enum('status', ['draft', 'published', 'closed', 'archived']).notNullable().defaultTo('draft');
    table.timestamp('published_at').nullable();
    table.timestamp('closed_at').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.unique(['organization_id', 'job_code']);
    table.index('organization_id');
    table.index('status');
  });

  // Job Templates Table
  await knex.schema.createTable('job_templates', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('template_name', 255).notNullable();
    table.text('description').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.index('organization_id');
  });

  // Job Skills Table
  await knex.schema.createTable('job_skills', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('job_id').unsigned().notNullable();
    table.string('skill_name', 100).notNullable();
    table.enum('proficiency_level', ['beginner', 'intermediate', 'expert']).notNullable();
    table.boolean('is_mandatory').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('job_id').references('jobs.id');
    table.index('organization_id');
  });

  // Job Locations Table
  await knex.schema.createTable('job_locations', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('job_id').unsigned().notNullable();
    table.integer('location_id').unsigned().notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('job_id').references('jobs.id');
    table.index('organization_id');
  });

  // Candidates Table
  await knex.schema.createTable('candidates', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 20).nullable();
    table.string('alternative_phone', 20).nullable();
    table.integer('current_location_id').unsigned().nullable();
    table.integer('preferred_location_id').unsigned().nullable();
    table.decimal('current_salary', 15, 2).nullable();
    table.string('salary_currency', 3).nullable();
    table.decimal('expected_salary', 15, 2).nullable();
    table.integer('notice_period_days').nullable();
    table.string('current_company', 255).nullable();
    table.decimal('years_of_experience', 4, 2).nullable();
    table.string('linkedin_url', 500).nullable();
    table.string('github_url', 500).nullable();
    table.string('portfolio_url', 500).nullable();
    table.enum('status', ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'dropped']).notNullable().defaultTo('applied');
    table.enum('source', ['job_board', 'employee_referral', 'direct_apply', 'recruitment_agency']).notNullable();
    table.decimal('ai_score', 5, 2).nullable();
    table.text('ai_summary').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.unique(['organization_id', 'email']);
    table.index('organization_id');
    table.index('status');
  });

  // Candidate Resumes Table
  await knex.schema.createTable('candidate_resumes', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('resume_file_url', 500).notNullable();
    table.integer('resume_version').notNullable();
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.integer('file_size_kb').nullable();
    table.text('extracted_text').nullable();
    table.timestamps(true, true);
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Documents Table
  await knex.schema.createTable('candidate_documents', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.enum('document_type', ['cover_letter', 'certificate', 'portfolio', 'other']).notNullable();
    table.string('document_url', 500).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Skills Table
  await knex.schema.createTable('candidate_skills', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('skill_name', 100).notNullable();
    table.enum('proficiency_level', ['beginner', 'intermediate', 'expert']).notNullable();
    table.decimal('years_of_experience', 4, 2).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Education Table
  await knex.schema.createTable('candidate_education', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('degree', 100).notNullable();
    table.string('field_of_study', 100).notNullable();
    table.string('institution', 255).notNullable();
    table.integer('graduation_year').unsigned().nullable();
    table.decimal('cgpa', 4, 2).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Experience Table
  await knex.schema.createTable('candidate_experience', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('company_name', 255).notNullable();
    table.string('job_title', 255).notNullable();
    table.text('description').nullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.boolean('currently_working').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Certifications Table
  await knex.schema.createTable('candidate_certifications', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('certification_name', 255).notNullable();
    table.string('issuing_organization', 255).notNullable();
    table.date('issue_date').notNullable();
    table.date('expiry_date').nullable();
    table.string('credential_url', 500).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Notes Table
  await knex.schema.createTable('candidate_notes', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.text('note_text').notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Candidate Tags Table
  await knex.schema.createTable('candidate_tags', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.string('tag_name', 50).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Pipeline Stages Table
  await knex.schema.createTable('pipeline_stages', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('stage_name', 100).notNullable();
    table.integer('sequence_order').notNullable();
    table.boolean('is_rejection_stage').notNullable().defaultTo(false);
    table.string('stage_color', 7).nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.index('organization_id');
  });

  // Applications Table
  await knex.schema.createTable('applications', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.integer('job_id').unsigned().notNullable();
    table.enum('application_status', ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']).notNullable();
    table.timestamp('applied_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('applied_from_source').nullable();
    table.enum('initial_screening_status', ['pending', 'passed', 'failed']).notNullable().defaultTo('pending');
    table.integer('screening_completed_by').unsigned().nullable();
    table.timestamp('screening_completed_at').nullable();
    table.integer('pipeline_stage_id').unsigned().nullable();
    table.timestamp('current_stage_entered_at').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.foreign('candidate_id').references('candidates.id');
    table.foreign('job_id').references('jobs.id');
    table.unique(['organization_id', 'candidate_id', 'job_id']);
    table.index('organization_id');
    table.index('application_status');
  });

  // Application Stage History Table
  await knex.schema.createTable('application_stage_history', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('application_id').unsigned().notNullable();
    table.integer('from_stage_id').unsigned().nullable();
    table.integer('to_stage_id').unsigned().notNullable();
    table.timestamp('moved_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.integer('moved_by_user_id').unsigned().notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('application_id').references('applications.id');
    table.index('organization_id');
  });

  // Interviews Table
  await knex.schema.createTable('interviews', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('application_id').unsigned().notNullable();
    table.enum('interview_type', ['phone', 'video', 'in_person']).notNullable();
    table.integer('interview_round').notNullable();
    table.timestamp('scheduled_date', { useTz: true }).notNullable();
    table.integer('interview_duration_minutes').nullable();
    table.enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled']).notNullable();
    table.string('meeting_url', 500).nullable();
    table.string('recording_url', 500).nullable();
    table.boolean('feedback_submitted').notNullable().defaultTo(false);
    table.json('interviewer_ids').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.foreign('application_id').references('applications.id');
    table.index('organization_id');
  });

  // Interview Feedback Table
  await knex.schema.createTable('interview_feedback', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('interview_id').unsigned().notNullable();
    table.integer('interviewer_id').unsigned().notNullable();
    table.integer('overall_rating').notNullable();
    table.integer('technical_rating').nullable();
    table.integer('communication_rating').nullable();
    table.integer('cultural_fit_rating').nullable();
    table.text('feedback_text').nullable();
    table.boolean('would_recommend').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('interview_id').references('interviews.id');
    table.index('organization_id');
  });

  // Assessments Table
  await knex.schema.createTable('assessments', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('assessment_name', 255).notNullable();
    table.enum('assessment_type', ['coding', 'mcq', 'assignment', 'form']).notNullable();
    table.integer('duration_minutes').notNullable();
    table.integer('passing_score').notNullable();
    table.text('description').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.index('organization_id');
  });

  // Assessment Attempts Table
  await knex.schema.createTable('assessment_attempts', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('application_id').unsigned().notNullable();
    table.integer('assessment_id').unsigned().notNullable();
    table.integer('attempt_number').notNullable();
    table.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.integer('score').nullable();
    table.enum('status', ['in_progress', 'completed', 'passed', 'failed']).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.foreign('application_id').references('applications.id');
    table.foreign('assessment_id').references('assessments.id');
    table.index('organization_id');
  });

  // Assessment Results Table
  await knex.schema.createTable('assessment_results', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('attempt_id').unsigned().notNullable();
    table.integer('question_number').notNullable();
    table.text('answer_text').nullable();
    table.boolean('is_correct').notNullable();
    table.integer('score').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('attempt_id').references('assessment_attempts.id');
    table.index('organization_id');
  });

  // Offers Table
  await knex.schema.createTable('offers', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('application_id').unsigned().notNullable();
    table.string('offer_code', 50).notNullable();
    table.string('position_title', 255).notNullable();
    table.integer('department_id').unsigned().nullable();
    table.integer('designation_id').unsigned().nullable();
    table.decimal('cost_to_company', 15, 2).notNullable();
    table.decimal('base_salary', 15, 2).notNullable();
    table.string('currency', 3).notNullable();
    table.date('offer_start_date').notNullable();
    table.date('offer_expiry_date').notNullable();
    table.enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn']).notNullable();
    table.string('offer_pdf_url', 500).nullable();
    table.timestamp('sent_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.timestamp('rejected_at').nullable();
    table.integer('workflow_instance_id').unsigned().nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.unique(['organization_id', 'offer_code']);
    table.foreign('application_id').references('applications.id');
    table.index('organization_id');
  });

  // Offer Versions Table
  await knex.schema.createTable('offer_versions', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('offer_id').unsigned().notNullable();
    table.integer('version_number').notNullable();
    table.decimal('ctc', 15, 2).notNullable();
    table.decimal('base_salary', 15, 2).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('offer_id').references('offers.id');
    table.index('organization_id');
  });

  // Offer Approvals Table
  await knex.schema.createTable('offer_approvals', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('offer_id').unsigned().notNullable();
    table.integer('approver_user_id').unsigned().notNullable();
    table.enum('approval_status', ['approved', 'rejected']).notNullable();
    table.timestamp('approval_date', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text('approval_comments').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('offer_id').references('offers.id');
    table.index('organization_id');
  });

  // Referrals Table
  await knex.schema.createTable('referrals', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('referrer_employee_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.integer('application_id').unsigned().nullable();
    table.date('referral_date').notNullable();
    table.decimal('referral_reward_amount', 15, 2).nullable();
    table.enum('referral_status', ['pending', 'hired', 'rejected']).notNullable();
    table.date('hired_date').nullable();
    table.enum('reward_status', ['pending', 'paid', 'forfeited']).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.foreign('candidate_id').references('candidates.id');
    table.index('organization_id');
  });

  // Referral Rewards Table
  await knex.schema.createTable('referral_rewards', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('referral_id').unsigned().notNullable();
    table.decimal('reward_amount', 15, 2).notNullable();
    table.string('reward_type').notNullable();
    table.enum('status', ['pending', 'paid', 'forfeited']).notNullable();
    table.date('paid_date').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.foreign('referral_id').references('referrals.id');
    table.index('organization_id');
  });

  // Career Portal Pages Table
  await knex.schema.createTable('career_portal_pages', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('page_name', 100).notNullable();
    table.string('page_slug', 100).notNullable();
    table.text('page_content').notNullable();
    table.boolean('is_published').notNullable().defaultTo(false);
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.unique(['organization_id', 'page_slug']);
    table.index('organization_id');
  });

  // Candidate AI Analysis Table
  await knex.schema.createTable('candidate_ai_analysis', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('candidate_id').unsigned().notNullable();
    table.integer('job_id').unsigned().notNullable();
    table.decimal('overall_score', 5, 2).notNullable();
    table.decimal('skill_match_percentage', 5, 2).nullable();
    table.decimal('experience_match_percentage', 5, 2).nullable();
    table.decimal('education_match_percentage', 5, 2).nullable();
    table.decimal('salary_expectation_match', 5, 2).nullable();
    table.enum('ai_recommendation', ['strong_match', 'good_match', 'fair_match', 'poor_match']).notNullable();
    table.json('skill_gaps').nullable();
    table.text('ai_generated_summary').nullable();
    table.timestamp('generated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('candidate_id').references('candidates.id');
    table.foreign('job_id').references('jobs.id');
    table.index('organization_id');
  });

  // Recruitment Analytics Cache Table
  await knex.schema.createTable('recruitment_analytics_cache', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').unsigned().notNullable();
    table.date('metric_month').notNullable();
    table.integer('total_applications').notNullable();
    table.integer('total_hired').notNullable();
    table.integer('total_rejected').notNullable();
    table.integer('average_time_to_hire').nullable();
    table.integer('average_time_to_fill').nullable();
    table.decimal('cost_per_hire', 15, 2).nullable();
    table.json('source_wise_hires').nullable();
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['organization_id', 'metric_month']);
    table.index('organization_id');
  });

  // Add foreign key constraints for requisitions and job approvals
  await knex.schema.createTable('job_requisition_approvals', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('requisition_id').unsigned().notNullable();
    table.integer('approver_level').notNullable();
    table.integer('approver_user_id').unsigned().notNullable();
    table.enum('approval_status', ['approved', 'rejected']).notNullable();
    table.date('approval_date').notNullable();
    table.text('approval_comments').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.foreign('requisition_id').references('job_requisitions.id');
    table.index('organization_id');
  });

  // Career Portal Portal Sections Table
  await knex.schema.createTable('candidate_sources', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').unique();
    table.integer('organization_id').unsigned().notNullable();
    table.string('source_name', 100).notNullable();
    table.enum('source_type', ['job_board', 'referral', 'direct', 'agency']).notNullable();
    table.integer('created_by').unsigned().notNullable();
    table.integer('updated_by').unsigned().notNullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.index('organization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order of creation (due to foreign keys)
  await knex.schema.dropTableIfExists('candidate_sources');
  await knex.schema.dropTableIfExists('recruitment_analytics_cache');
  await knex.schema.dropTableIfExists('candidate_ai_analysis');
  await knex.schema.dropTableIfExists('career_portal_pages');
  await knex.schema.dropTableIfExists('referral_rewards');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('offer_approvals');
  await knex.schema.dropTableIfExists('offer_versions');
  await knex.schema.dropTableIfExists('offers');
  await knex.schema.dropTableIfExists('assessment_results');
  await knex.schema.dropTableIfExists('assessment_attempts');
  await knex.schema.dropTableIfExists('assessments');
  await knex.schema.dropTableIfExists('interview_feedback');
  await knex.schema.dropTableIfExists('interviews');
  await knex.schema.dropTableIfExists('application_stage_history');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('pipeline_stages');
  await knex.schema.dropTableIfExists('candidate_tags');
  await knex.schema.dropTableIfExists('candidate_notes');
  await knex.schema.dropTableIfExists('candidate_certifications');
  await knex.schema.dropTableIfExists('candidate_experience');
  await knex.schema.dropTableIfExists('candidate_education');
  await knex.schema.dropTableIfExists('candidate_skills');
  await knex.schema.dropTableIfExists('candidate_documents');
  await knex.schema.dropTableIfExists('candidate_resumes');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('job_locations');
  await knex.schema.dropTableIfExists('job_skills');
  await knex.schema.dropTableIfExists('job_templates');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('job_requisition_approvals');
  await knex.schema.dropTableIfExists('job_requisitions');
}



