import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('workflows');
  if (exists) return;

  await knex.schema.createTable('workflows', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('workflow_code', 100).notNullable();
    table.string('workflow_name', 255).notNullable();
    table.text('description').nullable();
    table.enum('type', [
      'leave_request',
      'expense_claim',
      'asset_request',
      'recruitment',
      'promotion',
      'salary_revision',
      'exit_clearance',
      'travel_request',
      'attendance_regularization',
      'shift_change',
      'offer_approval',
      'candidate_approval',
      'payroll_approval',
      'offboarding',
      'document_verification',
      'asset_return',
      'employee_transfer'
    ]).notNullable();
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.integer('version_number').defaultTo(1);
    table.boolean('is_published').defaultTo(false);
    table.bigInteger('published_by').unsigned().nullable();
    table.timestamp('published_at').nullable();
    table.enum('approval_pattern', ['sequential', 'parallel', 'conditional']).defaultTo('sequential');
    table.integer('max_escalation_levels').defaultTo(3);
    table.integer('sla_days').nullable();
    table.boolean('notify_on_completion').defaultTo(true);
    table.integer('auto_approve_after_days').nullable();
    table.integer('auto_reject_after_days').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.foreign('published_by').references('users.id');
    table.unique(['organization_id', 'workflow_code']);
    table.index('organization_id');
    table.index('status');
    table.index('type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflows');
}




