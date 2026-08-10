import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSettingsTable = await knex.schema.hasTable('org_leave_settings');
  if (hasSettingsTable) {
    await knex.schema.alterTable('org_leave_settings', (table) => {
      table.integer('leave_application_start_day').defaultTo(1);
      table.integer('leave_application_start_month').nullable();
      table.integer('default_leave_month').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSettingsTable = await knex.schema.hasTable('org_leave_settings');
  if (hasSettingsTable) {
    await knex.schema.alterTable('org_leave_settings', (table) => {
      table.dropColumn('leave_application_start_day');
      table.dropColumn('leave_application_start_month');
      table.dropColumn('default_leave_month');
    });
  }
}
