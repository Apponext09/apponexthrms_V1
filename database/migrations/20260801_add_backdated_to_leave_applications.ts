import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (hasTable) {
    const hasIsBackdated = await knex.schema.hasColumn('leave_applications', 'is_backdated');
    if (!hasIsBackdated) {
      await knex.schema.alterTable('leave_applications', (table) => {
        table.boolean('is_backdated').defaultTo(false);
      });
    }

    const hasRequiresArrears = await knex.schema.hasColumn('leave_applications', 'requires_payroll_arrears');
    if (!hasRequiresArrears) {
      await knex.schema.alterTable('leave_applications', (table) => {
        table.boolean('requires_payroll_arrears').defaultTo(false);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_applications');
  if (hasTable) {
    const hasIsBackdated = await knex.schema.hasColumn('leave_applications', 'is_backdated');
    if (hasIsBackdated) {
      await knex.schema.alterTable('leave_applications', (table) => {
        table.dropColumn('is_backdated');
      });
    }

    const hasRequiresArrears = await knex.schema.hasColumn('leave_applications', 'requires_payroll_arrears');
    if (hasRequiresArrears) {
      await knex.schema.alterTable('leave_applications', (table) => {
        table.dropColumn('requires_payroll_arrears');
      });
    }
  }
}
