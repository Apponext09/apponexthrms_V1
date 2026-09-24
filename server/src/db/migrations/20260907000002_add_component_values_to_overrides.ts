import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_register_overrides');
  if (!hasTable) return;

  const hasCol = await knex.schema.hasColumn('payroll_register_overrides', 'component_values');
  if (!hasCol) {
    await knex.schema.alterTable('payroll_register_overrides', (table) => {
      table.json('component_values').nullable().after('notes');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('payroll_register_overrides');
  if (!hasTable) return;

  const hasCol = await knex.schema.hasColumn('payroll_register_overrides', 'component_values');
  if (hasCol) {
    await knex.schema.alterTable('payroll_register_overrides', (table) => {
      table.dropColumn('component_values');
    });
  }
}
