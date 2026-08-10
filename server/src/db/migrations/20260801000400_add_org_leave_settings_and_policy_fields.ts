import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSettingsTable = await knex.schema.hasTable('org_leave_settings');
  if (!hasSettingsTable) {
    await knex.schema.createTable('org_leave_settings', (table) => {
      table.uuid('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.uuid('location_id').nullable();
      table.decimal('normal_working_hours_daily', 5, 2).defaultTo(9);
      table.decimal('full_time_hours', 5, 2).defaultTo(8);
      table.json('weekly_work_pattern').nullable();
      table.integer('holiday_year_start_month').defaultTo(4);
      table.decimal('max_consecutive_annual_leave_days', 5, 2).nullable();
      table.bigInteger('created_by').unsigned().nullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamps(true, true); // created_at, updated_at

      table.foreign('organization_id').references('organizations.id');
      table.foreign('location_id').references('locations.uuid');
      table.unique(['organization_id', 'location_id']);
    });
  }

  const hasEarnedLeavePercent = await knex.schema.hasColumn('leave_policies', 'earned_leave_entitlement_percent');
  if (!hasEarnedLeavePercent) {
    await knex.schema.alterTable('leave_policies', (table) => {
      table.decimal('earned_leave_entitlement_percent', 5, 2).nullable();
    });
  }

  const hasIncludesPublicHolidays = await knex.schema.hasColumn('leave_policies', 'entitlement_includes_public_holidays');
  if (!hasIncludesPublicHolidays) {
    await knex.schema.alterTable('leave_policies', (table) => {
      table.boolean('entitlement_includes_public_holidays').defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('org_leave_settings');

  if (await knex.schema.hasColumn('leave_policies', 'earned_leave_entitlement_percent')) {
    await knex.schema.alterTable('leave_policies', (table) => {
      table.dropColumn('earned_leave_entitlement_percent');
    });
  }
  if (await knex.schema.hasColumn('leave_policies', 'entitlement_includes_public_holidays')) {
    await knex.schema.alterTable('leave_policies', (table) => {
      table.dropColumn('entitlement_includes_public_holidays');
    });
  }
}
