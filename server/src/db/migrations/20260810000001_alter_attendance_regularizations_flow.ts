import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_regularizations');
  if (!exists) return;

  const addColIfMissing = async (colName: string, builderFn: (table: Knex.CreateTableBuilder) => void) => {
    const hasCol = await knex.schema.hasColumn('attendance_regularizations', colName);
    if (!hasCol) {
      await knex.schema.alterTable('attendance_regularizations', builderFn);
    }
  };

  await addColIfMissing('company_id', (t) => t.bigInteger('company_id').unsigned().nullable().after('organization_id'));

  try {
    await knex.raw('ALTER TABLE `attendance_regularizations` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT "pending_manager"');
  } catch (e) {}

  await addColIfMissing('is_date_range', (t) => t.boolean('is_date_range').defaultTo(false));
  await addColIfMissing('end_date', (t) => t.date('end_date').nullable());
  await addColIfMissing('requested_check_in_time', (t) => t.string('requested_check_in_time', 50).nullable());
  await addColIfMissing('requested_check_out_time', (t) => t.string('requested_check_out_time', 50).nullable());
  await addColIfMissing('actual_check_in_time', (t) => t.string('actual_check_in_time', 50).nullable());
  await addColIfMissing('actual_check_out_time', (t) => t.string('actual_check_out_time', 50).nullable());
  await addColIfMissing('reason', (t) => t.string('reason', 255).nullable());
  await addColIfMissing('day_type', (t) => t.string('day_type', 100).nullable());
  await addColIfMissing('comment', (t) => t.text('comment').nullable());
  await addColIfMissing('manager_id', (t) => t.bigInteger('manager_id').unsigned().nullable());
  await addColIfMissing('manager_approved_by', (t) => t.bigInteger('manager_approved_by').unsigned().nullable());
  await addColIfMissing('manager_approved_at', (t) => t.timestamp('manager_approved_at').nullable());
  await addColIfMissing('manager_comments', (t) => t.text('manager_comments').nullable());
  await addColIfMissing('hr_approved_by', (t) => t.bigInteger('hr_approved_by').unsigned().nullable());
  await addColIfMissing('hr_approved_at', (t) => t.timestamp('hr_approved_at').nullable());
  await addColIfMissing('hr_comments', (t) => t.text('hr_comments').nullable());
}

export async function down(knex: Knex): Promise<void> {}
