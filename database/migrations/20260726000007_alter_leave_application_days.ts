import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_application_days');
  if (!hasTable) return;

  const hasUpdatedAt = await knex.schema.hasColumn('leave_application_days', 'updated_at');
  const hasDeletedAt = await knex.schema.hasColumn('leave_application_days', 'deleted_at');

  // Modify enums and add timestamps using raw SQL for compatibility in MySQL
  await knex.raw(`
    ALTER TABLE leave_application_days
    MODIFY COLUMN day_type ENUM('full_day', 'half_day_first_half', 'half_day_second_half', 'FULL', 'FIRST_HALF', 'SECOND_HALF') NOT NULL,
    MODIFY COLUMN status ENUM('approved', 'rejected', 'pending', 'cancelled') DEFAULT 'pending'
  `);

  await knex.schema.alterTable('leave_application_days', (table) => {
    if (!hasUpdatedAt) {
      table.timestamp('updated_at').nullable();
    }
    if (!hasDeletedAt) {
      table.timestamp('deleted_at').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  // No-op rollback for alter
}
