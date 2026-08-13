import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add auto_escalation_days to leave_policy_assignments
  const tableExists = await knex.schema.hasTable('leave_policy_assignments');
  if (tableExists) {
    const hasCol = await knex.schema.hasColumn('leave_policy_assignments', 'auto_escalation_days');
    if (!hasCol) {
      await knex.schema.alterTable('leave_policy_assignments', (table) => {
        table.integer('auto_escalation_days').nullable().defaultTo(null);
      });
    }
  }

  // 2. Modify status enum in leave_applications to include 'escalated'
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_manager', 'pending_hr', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn', 'pending_hr_override', 'escalated') 
    DEFAULT 'draft'
  `);
}

export async function down(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('leave_policy_assignments');
  if (tableExists) {
    const hasCol = await knex.schema.hasColumn('leave_policy_assignments', 'auto_escalation_days');
    if (hasCol) {
      await knex.schema.alterTable('leave_policy_assignments', (table) => {
        table.dropColumn('auto_escalation_days');
      });
    }
  }

  // Revert status enum
  await knex.raw(`
    ALTER TABLE leave_applications 
    MODIFY COLUMN status ENUM('draft', 'submitted', 'pending_manager', 'pending_hr', 'pending', 'approved', 'rejected', 'cancelled', 'withdrawn', 'pending_hr_override') 
    DEFAULT 'draft'
  `);
}
