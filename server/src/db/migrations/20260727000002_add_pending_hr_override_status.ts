import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  // Modify the status column to VARCHAR(50) to support all statuses (including pending_hr_override) without truncation
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'
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

  const hasNotes = await knex.schema.hasColumn('leave_applications', 'admin_notes');
  if (hasNotes) {
    await knex.schema.alterTable('leave_applications', (table) => {
      table.dropColumn('admin_notes');
    });
  }

  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'
  `);
}
