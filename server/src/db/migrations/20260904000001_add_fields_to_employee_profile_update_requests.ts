import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCompanyId = await knex.schema.hasColumn('employee_profile_update_requests', 'company_id');
  const hasProfileSection = await knex.schema.hasColumn('employee_profile_update_requests', 'profile_section');
  const hasReason = await knex.schema.hasColumn('employee_profile_update_requests', 'reason');

  await knex.schema.alterTable('employee_profile_update_requests', (table) => {
    if (!hasCompanyId) {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    }
    if (!hasProfileSection) {
      table.string('profile_section', 200).nullable().after('request_type');
    }
    if (!hasReason) {
      table.text('reason').nullable().after('profile_section');
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employee_profile_update_requests', (table) => {
    table.dropColumn('company_id');
    table.dropColumn('profile_section');
    table.dropColumn('reason');
  });
}
