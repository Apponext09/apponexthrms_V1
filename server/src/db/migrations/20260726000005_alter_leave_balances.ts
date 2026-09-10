import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('leave_balances');
  if (!hasTable) return;

  const hasAllocatedBalance = await knex.schema.hasColumn('leave_balances', 'allocated_balance');
  if (hasAllocatedBalance) {
    await knex.schema.alterTable('leave_balances', (table) => {
      table.renameColumn('allocated_balance', 'opening_balance');
    });
  }

  const hasFinancialYearEnd = await knex.schema.hasColumn('leave_balances', 'financial_year_end');
  const hasCreditedBalance = await knex.schema.hasColumn('leave_balances', 'credited_balance');
  const hasCarryForwardBalance = await knex.schema.hasColumn('leave_balances', 'carry_forward_balance');
  const hasEncashedBalance = await knex.schema.hasColumn('leave_balances', 'encashed_balance');
  const hasExpiredBalance = await knex.schema.hasColumn('leave_balances', 'expired_balance');
  const hasLastUpdatedAt = await knex.schema.hasColumn('leave_balances', 'last_updated_at');
  const hasCreatedBy = await knex.schema.hasColumn('leave_balances', 'created_by');
  const hasUpdatedBy = await knex.schema.hasColumn('leave_balances', 'updated_by');
  const hasDeletedAt = await knex.schema.hasColumn('leave_balances', 'deleted_at');

  await knex.schema.alterTable('leave_balances', (table) => {
    if (!hasFinancialYearEnd) {
      table.date('financial_year_end').nullable();
    }
    if (!hasCreditedBalance) {
      table.decimal('credited_balance', 6, 2).defaultTo(0);
    }
    if (!hasCarryForwardBalance) {
      table.decimal('carry_forward_balance', 6, 2).defaultTo(0);
    }
    if (!hasEncashedBalance) {
      table.decimal('encashed_balance', 6, 2).defaultTo(0);
    }
    if (!hasExpiredBalance) {
      table.decimal('expired_balance', 6, 2).defaultTo(0);
    }
    if (!hasLastUpdatedAt) {
      table.timestamp('last_updated_at').nullable();
    }
    if (!hasCreatedBy) {
      table.bigInteger('created_by').unsigned().nullable();
      table.foreign('created_by').references('users.id');
    }
    if (!hasUpdatedBy) {
      table.bigInteger('updated_by').unsigned().nullable();
      table.foreign('updated_by').references('users.id');
    }
    if (!hasDeletedAt) {
      table.timestamp('deleted_at').nullable();
    }
  });
}

export async function down(knex: Knex): Promise<void> {
  // No-op rollback for alter
}
