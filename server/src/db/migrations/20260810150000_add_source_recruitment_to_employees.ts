import type { Knex } from 'knex';

/**
 * Migration: Add source_candidate_id and source_application_id to employees table
 * 
 * Links newly created employee records back to their recruitment origin.
 */
export async function up(knex: Knex): Promise<void> {
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    const hasCandidateId = await knex.schema.hasColumn('employees', 'source_candidate_id');
    const hasApplicationId = await knex.schema.hasColumn('employees', 'source_application_id');

    await knex.schema.alterTable('employees', (table) => {
      if (!hasCandidateId) {
        table.bigInteger('source_candidate_id').unsigned().nullable().after('organization_id');
      }
      if (!hasApplicationId) {
        table.bigInteger('source_application_id').unsigned().nullable().after('source_candidate_id');
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasEmployees = await knex.schema.hasTable('employees');
  if (hasEmployees) {
    const hasCandidateId = await knex.schema.hasColumn('employees', 'source_candidate_id');
    const hasApplicationId = await knex.schema.hasColumn('employees', 'source_application_id');

    await knex.schema.alterTable('employees', (table) => {
      if (hasCandidateId) {
        table.dropColumn('source_candidate_id');
      }
      if (hasApplicationId) {
        table.dropColumn('source_application_id');
      }
    });
  }
}
