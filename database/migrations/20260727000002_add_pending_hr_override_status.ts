import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  // Modify the status column to include 'pending_hr_override'
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_manager', 'pending_hr', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn', 'pending_hr_override', 'escalated') 
    DEFAULT 'draft'
  `);

  // Add admin_notes/remarks to leave_applications
  const hasNotes = await knex.schema.hasColumn('leave_applications', 'admin_notes');
  if (!hasNotes) {
    await knex.schema.alterTable('leave_applications', (table) => {
      table.text('admin_notes').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  await knex.schema.alterTable('leave_applications', (table) => {
    table.dropColumn('admin_notes');
  });

  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status ENUM('draft', 'submitted', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn') 
    DEFAULT 'draft'
  `);
}
