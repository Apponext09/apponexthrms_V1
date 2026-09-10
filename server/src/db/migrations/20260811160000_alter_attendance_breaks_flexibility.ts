import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_breaks');
  if (exists) {
    const hasSettingId = await knex.schema.hasColumn('attendance_breaks', 'break_setting_id');
    if (!hasSettingId) {
      await knex.schema.alterTable('attendance_breaks', (table) => {
        table.bigInteger('break_setting_id').unsigned().nullable();
      });
    }

    // Alter break_type and status columns to VARCHAR to allow nulls, custom names & 'paused' status
    await knex.raw('ALTER TABLE `attendance_breaks` MODIFY COLUMN `break_type` VARCHAR(255) NULL');
    await knex.raw('ALTER TABLE `attendance_breaks` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT "active"');
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_breaks');
  if (exists) {
    const hasSettingId = await knex.schema.hasColumn('attendance_breaks', 'break_setting_id');
    if (hasSettingId) {
      await knex.schema.alterTable('attendance_breaks', (table) => {
        table.dropColumn('break_setting_id');
      });
    }
  }
}
