import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('holiday_calendars', 'applicable_location_id');
  if (!hasColumn) {
    await knex.schema.alterTable('holiday_calendars', (table) => {
      table.bigInteger('applicable_location_id').unsigned().nullable();
      table.foreign('applicable_location_id').references('locations.id');
      table.index('applicable_location_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('holiday_calendars', 'applicable_location_id');
  if (hasColumn) {
    await knex.schema.alterTable('holiday_calendars', (table) => {
      table.dropForeign(['applicable_location_id']);
      table.dropIndex('applicable_location_id');
      table.dropColumn('applicable_location_id');
    });
  }
}
