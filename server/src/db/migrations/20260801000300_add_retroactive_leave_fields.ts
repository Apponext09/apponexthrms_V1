import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add comp_off_validity_days to leave_policy_assignments
  const lpaExists = await knex.schema.hasTable('leave_policy_assignments');
  if (lpaExists) {
    const hasCol = await knex.schema.hasColumn('leave_policy_assignments', 'comp_off_validity_days');
    if (!hasCol) {
      await knex.schema.alterTable('leave_policy_assignments', (table) => {
        table.integer('comp_off_validity_days').defaultTo(60);
      });
    }
  }

  // 2. Add is_backdated and requires_payroll_arrears to leave_applications
  const laExists = await knex.schema.hasTable('leave_applications');
  if (laExists) {
    const hasCol1 = await knex.schema.hasColumn('leave_applications', 'is_backdated');
    const hasCol2 = await knex.schema.hasColumn('leave_applications', 'requires_payroll_arrears');

    await knex.schema.alterTable('leave_applications', (table) => {
      if (!hasCol1) table.boolean('is_backdated').defaultTo(false);
      if (!hasCol2) table.boolean('requires_payroll_arrears').defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const lpaExists = await knex.schema.hasTable('leave_policy_assignments');
  if (lpaExists) {
    const hasCol = await knex.schema.hasColumn('leave_policy_assignments', 'comp_off_validity_days');
    if (hasCol) {
      await knex.schema.alterTable('leave_policy_assignments', (table) => {
        table.dropColumn('comp_off_validity_days');
      });
    }
  }

  const laExists = await knex.schema.hasTable('leave_applications');
  if (laExists) {
    await knex.schema.alterTable('leave_applications', (table) => {
      table.dropColumn('is_backdated');
      table.dropColumn('requires_payroll_arrears');
    });
  }
}
