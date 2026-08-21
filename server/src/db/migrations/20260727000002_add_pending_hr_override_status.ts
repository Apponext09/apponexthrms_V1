import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  // Modify the status column to VARCHAR(50)
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft'
  `);

  // Add admin_notes/remarks to leave_applications
  const hasAdminNotes = await knex.schema.hasColumn('leave_applications', 'admin_notes');
  if (!hasAdminNotes) {
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
