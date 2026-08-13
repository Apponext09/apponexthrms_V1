import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSettingsTable = await knex.schema.hasTable('org_leave_settings');
  
  if (hasSettingsTable) {
    const hasCol = await knex.schema.hasColumn('org_leave_settings', 'leave_clubbing_rules');
    if (!hasCol) {
      await knex.schema.alterTable('org_leave_settings', (table) => {
        // Leave Clubbing
        table.json('leave_clubbing_rules').nullable();
        // Leave Restriction Policy
        table.json('leave_restriction_rules').nullable();
        // Leave Week Setting
        table.string('default_week_day', 20).nullable();
        // Leave Application Reminder Settings
        table.boolean('disable_leave_application_reminder').defaultTo(false);
        // Leave Application Settings
        table.boolean('show_popup_on_week_off_or_holiday').defaultTo(false);
        table.boolean('leave_application_date_restriction').defaultTo(false);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSettingsTable = await knex.schema.hasTable('org_leave_settings');
  
  if (hasSettingsTable) {
    const hasCol = await knex.schema.hasColumn('org_leave_settings', 'leave_clubbing_rules');
    if (hasCol) {
      await knex.schema.alterTable('org_leave_settings', (table) => {
        table.dropColumn('leave_clubbing_rules');
        table.dropColumn('leave_restriction_rules');
        table.dropColumn('default_week_day');
        table.dropColumn('disable_leave_application_reminder');
        table.dropColumn('show_popup_on_week_off_or_holiday');
        table.dropColumn('leave_application_date_restriction');
      });
    }
  }
}
