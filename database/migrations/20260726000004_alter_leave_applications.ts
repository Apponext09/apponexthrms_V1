import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  const hasFromDate = await knex.schema.hasColumn('leave_applications', 'from_date');
  const hasToDate = await knex.schema.hasColumn('leave_applications', 'to_date');
  const hasDurationDays = await knex.schema.hasColumn('leave_applications', 'duration_days');
  const hasHalfDay = await knex.schema.hasColumn('leave_applications', 'half_day');
  const hasReason = await knex.schema.hasColumn('leave_applications', 'reason');

  await knex.schema.alterTable('leave_applications', (table) => {
    if (hasFromDate) {
      table.renameColumn('from_date', 'application_start_date');
    }
    if (hasToDate) {
      table.renameColumn('to_date', 'application_end_date');
    }
    if (hasDurationDays) {
      table.renameColumn('duration_days', 'total_days');
    }
    if (hasHalfDay) {
      table.renameColumn('half_day', 'is_half_day');
    }
    if (hasReason) {
      table.renameColumn('reason', 'reason_description');
    }
  });

  const hasHalfDayPeriod = await knex.schema.hasColumn('leave_applications', 'half_day_period');
  const hasIsHourly = await knex.schema.hasColumn('leave_applications', 'is_hourly');
  const hasHourlyDuration = await knex.schema.hasColumn('leave_applications', 'hourly_duration');
  const hasSupportingDocumentUrl = await knex.schema.hasColumn('leave_applications', 'supporting_document_url');
  const hasWorkflowInstanceId = await knex.schema.hasColumn('leave_applications', 'workflow_instance_id');
  const hasSubmittedAt = await knex.schema.hasColumn('leave_applications', 'submitted_at');
  const hasSubmittedByUserId = await knex.schema.hasColumn('leave_applications', 'submitted_by_user_id');
  const hasApprovedBy = await knex.schema.hasColumn('leave_applications', 'approved_by');
  const hasApprovalDate = await knex.schema.hasColumn('leave_applications', 'approval_date');
  const hasRejectionReason = await knex.schema.hasColumn('leave_applications', 'rejection_reason');
  const hasCancelledBy = await knex.schema.hasColumn('leave_applications', 'cancelled_by');
  const hasCancelledAt = await knex.schema.hasColumn('leave_applications', 'cancelled_at');
  const hasCancellationReason = await knex.schema.hasColumn('leave_applications', 'cancellation_reason');
  const hasWithdrawnAt = await knex.schema.hasColumn('leave_applications', 'withdrawn_at');
  const hasWithdrawnBy = await knex.schema.hasColumn('leave_applications', 'withdrawn_by');
  const hasWithdrawnReason = await knex.schema.hasColumn('leave_applications', 'withdrawn_reason');
  const hasIsSandwichDay = await knex.schema.hasColumn('leave_applications', 'is_sandwich_day');
  const hasDelegatedToUserId = await knex.schema.hasColumn('leave_applications', 'delegated_to_user_id');

  await knex.schema.alterTable('leave_applications', (table) => {
    if (!hasHalfDayPeriod) {
      table.enum('half_day_period', ['first_half', 'second_half']).nullable();
    }
    if (!hasIsHourly) {
      table.boolean('is_hourly').defaultTo(false);
    }
    if (!hasHourlyDuration) {
      table.decimal('hourly_duration', 4, 2).nullable();
    }
    if (!hasSupportingDocumentUrl) {
      table.string('supporting_document_url', 500).nullable();
    }
    if (!hasWorkflowInstanceId) {
      table.bigInteger('workflow_instance_id').unsigned().nullable();
      table.foreign('workflow_instance_id').references('workflow_instances.id');
    }
    if (!hasSubmittedAt) {
      table.timestamp('submitted_at').nullable();
    }
    if (!hasSubmittedByUserId) {
      table.bigInteger('submitted_by_user_id').unsigned().nullable();
      table.foreign('submitted_by_user_id').references('users.id');
    }
    if (!hasApprovedBy) {
      table.bigInteger('approved_by').unsigned().nullable();
      table.foreign('approved_by').references('users.id');
    }
    if (!hasApprovalDate) {
      table.timestamp('approval_date').nullable();
    }
    if (!hasRejectionReason) {
      table.text('rejection_reason').nullable();
    }
    if (!hasCancelledBy) {
      table.bigInteger('cancelled_by').unsigned().nullable();
      table.foreign('cancelled_by').references('users.id');
    }
    if (!hasCancelledAt) {
      table.timestamp('cancelled_at').nullable();
    }
    if (!hasCancellationReason) {
      table.text('cancellation_reason').nullable();
    }
    if (!hasWithdrawnAt) {
      table.timestamp('withdrawn_at').nullable();
    }
    if (!hasWithdrawnBy) {
      table.bigInteger('withdrawn_by').unsigned().nullable();
      table.foreign('withdrawn_by').references('users.id');
    }
    if (!hasWithdrawnReason) {
      table.text('withdrawn_reason').nullable();
    }
    if (!hasIsSandwichDay) {
      table.boolean('is_sandwich_day').defaultTo(false);
    }
    if (!hasDelegatedToUserId) {
      table.bigInteger('delegated_to_user_id').unsigned().nullable();
      table.foreign('delegated_to_user_id').references('users.id');
    }
  });

  // Make core columns NOT nullable and ensure indexes
  await knex.schema.alterTable('leave_applications', (table) => {
    table.date('application_start_date').notNullable().alter();
    table.date('application_end_date').notNullable().alter();
    table.decimal('total_days', 6, 2).notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // No-op rollback for alter
}
