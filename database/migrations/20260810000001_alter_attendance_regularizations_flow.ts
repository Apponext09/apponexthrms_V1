import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_regularizations');
  if (!exists) return;

  const hasCompanyId = await knex.schema.hasColumn('attendance_regularizations', 'company_id');
  if (!hasCompanyId) {
    await knex.schema.alterTable('attendance_regularizations', (table) => {
      table.bigInteger('company_id').unsigned().nullable().after('organization_id');
    });
  }

  // Modify status from Enum to VARCHAR(50) to support multi-stage flow
  await knex.raw('ALTER TABLE `attendance_regularizations` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT "pending_manager"');

  const hasIsDateRange = await knex.schema.hasColumn('attendance_regularizations', 'is_date_range');
  if (!hasIsDateRange) {
    await knex.schema.alterTable('attendance_regularizations', (table) => {
      table.boolean('is_date_range').defaultTo(false);
      table.date('end_date').nullable();
      table.string('requested_check_in_time', 50).nullable();
      table.string('requested_check_out_time', 50).nullable();
      table.string('actual_check_in_time', 50).nullable();
      table.string('actual_check_out_time', 50).nullable();
      table.string('reason', 255).nullable();
      table.string('day_type', 100).nullable();
      table.text('comment').nullable();
      table.bigInteger('manager_id').unsigned().nullable();
      table.bigInteger('manager_approved_by').unsigned().nullable();
      table.timestamp('manager_approved_at').nullable();
      table.text('manager_comments').nullable();
      table.bigInteger('hr_approved_by').unsigned().nullable();
      table.timestamp('hr_approved_at').nullable();
      table.text('hr_comments').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // safe down migration
}
