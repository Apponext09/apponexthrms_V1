import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Alter candidates table
  const hasCandidatesTable = await knex.schema.hasTable('candidates');
  if (hasCandidatesTable) {
    const hasResumeUrl = await knex.schema.hasColumn('candidates', 'resume_url');
    if (!hasResumeUrl) {
      await knex.schema.alterTable('candidates', (table) => {
        table.string('resume_url', 512).nullable();
      });
    }
  }

  // Alter applications table
  const hasApplicationsTable = await knex.schema.hasTable('applications');
  if (hasApplicationsTable) {
    const hasRecruiterId = await knex.schema.hasColumn('applications', 'assigned_recruiter_id');
    if (!hasRecruiterId) {
      await knex.schema.alterTable('applications', (table) => {
        table.bigInteger('assigned_recruiter_id').unsigned().nullable();
      });
    }
    const hasRejectionReason = await knex.schema.hasColumn('applications', 'rejection_reason');
    if (!hasRejectionReason) {
      await knex.schema.alterTable('applications', (table) => {
        table.text('rejection_reason').nullable();
      });
    }
    const hasRejectedStage = await knex.schema.hasColumn('applications', 'rejected_at_stage');
    if (!hasRejectedStage) {
      await knex.schema.alterTable('applications', (table) => {
        table.string('rejected_at_stage', 100).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCandidatesTable = await knex.schema.hasTable('candidates');
  if (hasCandidatesTable) {
    const hasResumeUrl = await knex.schema.hasColumn('candidates', 'resume_url');
    if (hasResumeUrl) {
      await knex.schema.alterTable('candidates', (table) => {
        table.dropColumn('resume_url');
      });
    }
  }

  const hasApplicationsTable = await knex.schema.hasTable('applications');
  if (hasApplicationsTable) {
    const hasRecruiterId = await knex.schema.hasColumn('applications', 'assigned_recruiter_id');
    if (hasRecruiterId) {
      await knex.schema.alterTable('applications', (table) => {
        table.dropColumn('assigned_recruiter_id');
      });
    }
    const hasRejectionReason = await knex.schema.hasColumn('applications', 'rejection_reason');
    if (hasRejectionReason) {
      await knex.schema.alterTable('applications', (table) => {
        table.dropColumn('rejection_reason');
      });
    }
    const hasRejectedStage = await knex.schema.hasColumn('applications', 'rejected_at_stage');
    if (hasRejectedStage) {
      await knex.schema.alterTable('applications', (table) => {
        table.dropColumn('rejected_at_stage');
      });
    }
  }
}
