import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (!hasTable) return;

  // 1. Add new columns if not present
  const hasLop = await knex.schema.hasColumn('leave_applications', 'lop_days');
  if (!hasLop) {
    await knex.schema.alterTable('leave_applications', (table) => {
      table.decimal('lop_days', 5, 2).defaultTo(0);
      table.bigInteger('pool_leave_type_id').unsigned().nullable();
      table.bigInteger('l1_approved_by').unsigned().nullable();
      table.timestamp('l1_approval_date').nullable();
      table.bigInteger('l2_approved_by').unsigned().nullable();
      table.timestamp('l2_approval_date').nullable();

      table.foreign('pool_leave_type_id').references('leave_types.id');
      table.foreign('l1_approved_by').references('users.id');
      table.foreign('l2_approved_by').references('users.id');
    });
  }

  // 2. Modify status enum to VARCHAR(50)
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status VARCHAR(50) DEFAULT 'draft'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_applications', (table) => {
    table.dropForeign(['pool_leave_type_id']);
    table.dropForeign(['l1_approved_by']);
    table.dropForeign(['l2_approved_by']);
    
    table.dropColumn('pool_leave_type_id');
    table.dropColumn('l1_approved_by');
    table.dropColumn('l1_approval_date');
    table.dropColumn('l2_approved_by');
    table.dropColumn('l2_approval_date');
    table.dropColumn('lop_days');
  });

  // Revert enum
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status ENUM('draft', 'submitted', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn') 
    DEFAULT 'draft'
  `);
}
