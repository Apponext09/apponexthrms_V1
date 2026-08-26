import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

<<<<<<< HEAD
  // Modify the status column to VARCHAR(50)
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft'
  `);

  // Add admin_notes/remarks to leave_applications
  const hasAdminNotes = await knex.schema.hasColumn('leave_applications', 'admin_notes');
  if (!hasAdminNotes) {
=======
  // Modify the status column to VARCHAR(50) to support all statuses without truncation
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'
  `);

  // Add admin_notes/remarks to leave_applications
  const hasNotes = await knex.schema.hasColumn('leave_applications', 'admin_notes');
  if (!hasNotes) {
>>>>>>> 4825c726bbdedae8d5c3b893c36de60124305872
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
