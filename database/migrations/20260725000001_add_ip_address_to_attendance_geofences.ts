import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('attendance_geofences');
  if (hasTable) {
    const hasIpColumn = await knex.schema.hasColumn('attendance_geofences', 'ip_address');
    if (!hasIpColumn) {
      await knex.schema.alterTable('attendance_geofences', (table) => {
        table.string('ip_address', 100).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('attendance_geofences');
  if (hasTable) {
    const hasIpColumn = await knex.schema.hasColumn('attendance_geofences', 'ip_address');
    if (hasIpColumn) {
      await knex.schema.alterTable('attendance_geofences', (table) => {
        table.dropColumn('ip_address');
      });
    }
  }
}
