import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add accrual_method and accrual_rate to leave_policy_assignments
  const lpaExists = await knex.schema.hasTable('leave_policy_assignments');
  if (lpaExists) {
    const hasAccrual = await knex.schema.hasColumn('leave_policy_assignments', 'accrual_method');
    if (!hasAccrual) {
      await knex.schema.alterTable('leave_policy_assignments', (table) => {
        table.string('accrual_method', 50).nullable().defaultTo('monthly');
        table.decimal('accrual_rate', 6, 2).nullable().defaultTo(0);
      });
    }
  }

  // 2. Add hours_worked_accumulator and last_reconciled_attendance_date to leave_balances
  const lbExists = await knex.schema.hasTable('leave_balances');
  if (lbExists) {
    const hasHoursAcc = await knex.schema.hasColumn('leave_balances', 'hours_worked_accumulator');
    if (!hasHoursAcc) {
      await knex.schema.alterTable('leave_balances', (table) => {
        table.decimal('hours_worked_accumulator', 8, 2).defaultTo(0);
        table.date('last_reconciled_attendance_date').nullable().defaultTo(null);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const lpaExists = await knex.schema.hasTable('leave_policy_assignments');
  if (lpaExists) {
    await knex.schema.alterTable('leave_policy_assignments', (table) => {
      table.dropColumn('accrual_method');
      table.dropColumn('accrual_rate');
    });
  }

  const lbExists = await knex.schema.hasTable('leave_balances');
  if (lbExists) {
    await knex.schema.alterTable('leave_balances', (table) => {
      table.dropColumn('hours_worked_accumulator');
      table.dropColumn('last_reconciled_attendance_date');
    });
  }
}
