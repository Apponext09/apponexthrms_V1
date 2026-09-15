import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. LMS Categories Table
  const hasCategories = await knex.schema.hasTable('lms_categories');
  if (!hasCategories) {
    await knex.schema.createTable('lms_categories', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.string('name', 150).notNullable();
      table.text('description').nullable();
      table.string('icon', 50).nullable().defaultTo('Folder');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id']);
      table.index(['company_id']);
    });
  }

  // 2. LMS Courses Table
  const hasCourses = await knex.schema.hasTable('lms_courses');
  if (!hasCourses) {
    await knex.schema.createTable('lms_courses', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).nullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('category_id').unsigned().nullable();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.string('type', 50).defaultTo('self_paced'); // 'self_paced', 'blended', 'instructor_led'
      table.decimal('duration_hours', 5, 2).defaultTo(0);
      table.json('skill_tags').nullable();
      table.text('thumbnail_url').nullable();
      table.boolean('is_mandatory').defaultTo(false);
      table.integer('deadline_days').defaultTo(0);
      table.decimal('pass_percentage', 5, 2).defaultTo(60.00);
      table.integer('attempt_limit').defaultTo(3);
      table.string('status', 50).defaultTo('draft'); // 'draft', 'published', 'archived'
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id']);
      table.index(['company_id']);
      table.index(['category_id']);
      table.index(['status']);
    });
  }

  // 3. LMS Modules Table
  const hasModules = await knex.schema.hasTable('lms_modules');
  if (!hasModules) {
    await knex.schema.createTable('lms_modules', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.string('name', 255).notNullable();
      table.string('content_type', 50).defaultTo('video'); // 'video', 'pdf', 'ppt', 'link', 'text'
      table.text('content_url').nullable();
      table.text('body_text').nullable();
      table.integer('sequence').defaultTo(1);
      table.boolean('is_locked').defaultTo(false);
      table.integer('duration_minutes').defaultTo(0);
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id']);
      table.index(['course_id']);
      table.index(['sequence']);
    });
  }

  // 4. LMS Batches Table
  const hasBatches = await knex.schema.hasTable('lms_batches');
  if (!hasBatches) {
    await knex.schema.createTable('lms_batches', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.bigInteger('trainer_id').unsigned().nullable();
      table.string('trainer_name', 150).nullable();
      table.string('title', 255).notNullable();
      table.datetime('start_date').nullable();
      table.datetime('end_date').nullable();
      table.string('mode', 50).defaultTo('online'); // 'online', 'offline'
      table.integer('max_seats').defaultTo(50);
      table.integer('seats_filled').defaultTo(0);
      table.text('meeting_link').nullable();
      table.string('location', 255).nullable();
      table.string('status', 50).defaultTo('upcoming'); // 'upcoming', 'ongoing', 'completed', 'cancelled'
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['organization_id']);
      table.index(['course_id']);
      table.index(['status']);
    });
  }

  // 5. LMS Enrollments Table
  const hasEnrollments = await knex.schema.hasTable('lms_enrollments');
  if (!hasEnrollments) {
    await knex.schema.createTable('lms_enrollments', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.bigInteger('batch_id').unsigned().nullable();
      table.string('enrolled_by', 50).defaultTo('self'); // 'self', 'manager', 'admin'
      table.bigInteger('enrolled_by_employee_id').unsigned().nullable();
      table.string('status', 50).defaultTo('enrolled'); // 'enrolled', 'in_progress', 'completed', 'dropped'
      table.decimal('progress_pct', 5, 2).defaultTo(0.00);
      table.json('completed_modules').nullable();
      table.timestamp('enrolled_on').defaultTo(knex.fn.now());
      table.timestamp('completed_on').nullable();
      table.decimal('score', 5, 2).nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['course_id']);
      table.index(['batch_id']);
      table.index(['status']);
    });
  }

  // 6. LMS Assessments Table
  const hasAssessments = await knex.schema.hasTable('lms_assessments');
  if (!hasAssessments) {
    await knex.schema.createTable('lms_assessments', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.json('questions').notNullable();
      table.decimal('pass_percentage', 5, 2).defaultTo(60.00);
      table.integer('attempt_limit').defaultTo(3);
      table.integer('timer_seconds').defaultTo(1800);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['course_id']);
    });
  }

  // 7. LMS Assessment Attempts Table
  const hasAttempts = await knex.schema.hasTable('lms_assessment_attempts');
  if (!hasAttempts) {
    await knex.schema.createTable('lms_assessment_attempts', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('assessment_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('enrollment_id').unsigned().nullable();
      table.json('answers').notNullable();
      table.decimal('score', 5, 2).defaultTo(0.00);
      table.boolean('passed').defaultTo(false);
      table.integer('attempt_number').defaultTo(1);
      table.timestamp('attempted_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['assessment_id']);
      table.index(['employee_id']);
    });
  }

  // 8. LMS Certificates Table
  const hasCertificates = await knex.schema.hasTable('lms_certificates');
  if (!hasCertificates) {
    await knex.schema.createTable('lms_certificates', (table) => {
      table.bigIncrements('id').primary();
      table.string('certificate_number', 100).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.bigInteger('enrollment_id').unsigned().nullable();
      table.timestamp('issued_on').defaultTo(knex.fn.now());
      table.datetime('expiry_date').nullable();
      table.text('certificate_url').nullable();
      table.decimal('score', 5, 2).nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['course_id']);
      table.index(['certificate_number']);
    });
  }

  // 9. LMS Compliance Table
  const hasCompliance = await knex.schema.hasTable('lms_compliance');
  if (!hasCompliance) {
    await knex.schema.createTable('lms_compliance', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('course_id').unsigned().notNullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.bigInteger('designation_id').unsigned().nullable();
      table.boolean('is_mandatory').defaultTo(true);
      table.integer('deadline_days').defaultTo(30);
      table.json('reminder_schedule').nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['course_id']);
      table.index(['department_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('lms_compliance');
  await knex.schema.dropTableIfExists('lms_certificates');
  await knex.schema.dropTableIfExists('lms_assessment_attempts');
  await knex.schema.dropTableIfExists('lms_assessments');
  await knex.schema.dropTableIfExists('lms_enrollments');
  await knex.schema.dropTableIfExists('lms_batches');
  await knex.schema.dropTableIfExists('lms_modules');
  await knex.schema.dropTableIfExists('lms_courses');
  await knex.schema.dropTableIfExists('lms_categories');
}
