import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasPaidType = await knex.schema.hasColumn('leave_types', 'paid_type');
  const hasAllowNeg = await knex.schema.hasColumn('leave_types', 'allow_negative_balance');
  const hasNegAction = await knex.schema.hasColumn('leave_types', 'negative_balance_action');
  const hasPoolId = await knex.schema.hasColumn('leave_types', 'pool_from_leave_type_id');

  await knex.schema.alterTable('leave_types', (table) => {
    if (!hasPaidType) {
      table.enu('paid_type', ['paid', 'unpaid', 'half_paid']).defaultTo('paid');
    }
    if (!hasAllowNeg) {
      table.boolean('allow_negative_balance').defaultTo(false);
    }
    if (!hasNegAction) {
      table.string('negative_balance_action', 50).nullable();
    }
    if (!hasPoolId) {
      table.bigInteger('pool_from_leave_type_id').unsigned().nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('leave_types', (table) => {
    table.dropColumn('paid_type');
    table.dropColumn('allow_negative_balance');
    table.dropColumn('negative_balance_action');
    table.dropColumn('pool_from_leave_type_id');
  });
}
