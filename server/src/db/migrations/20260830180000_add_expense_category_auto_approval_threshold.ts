import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('expense_categories');
  if (!hasTable) return;
  const hasCol = await knex.schema.hasColumn('expense_categories', 'auto_approval_threshold');
  if (hasCol) return;
  await knex.schema.alterTable('expense_categories', (table) => {
    table.decimal('auto_approval_threshold', 15, 2).defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('expense_categories');
  if (!hasTable) return;
  const hasCol = await knex.schema.hasColumn('expense_categories', 'auto_approval_threshold');
  if (!hasCol) return;
  await knex.schema.alterTable('expense_categories', (table) => {
    table.dropColumn('auto_approval_threshold');
  });
}
