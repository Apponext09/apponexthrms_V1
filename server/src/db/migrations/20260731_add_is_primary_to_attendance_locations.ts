import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('attendance_locations');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('attendance_locations', 'is_primary');
    if (!hasColumn) {
      await knex.schema.alterTable('attendance_locations', (table) => {
        table.boolean('is_primary').defaultTo(false);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('attendance_locations');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('attendance_locations', 'is_primary');
    if (hasColumn) {
      await knex.schema.alterTable('attendance_locations', (table) => {
        table.dropColumn('is_primary');
      });
    }
  }
}
