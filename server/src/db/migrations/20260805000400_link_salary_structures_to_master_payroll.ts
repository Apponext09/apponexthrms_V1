import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('salary_structures');
  if (!hasTable) return;

  const hasCycleId = await knex.schema.hasColumn('salary_structures', 'cycle_id');
  const hasSlabId = await knex.schema.hasColumn('salary_structures', 'slab_id');

  if (!hasCycleId || !hasSlabId) {
    await knex.schema.alterTable('salary_structures', (table) => {
      if (!hasCycleId) {
        table.bigInteger('cycle_id').unsigned().nullable();
        table.foreign('cycle_id').references('payroll_cycles.id');
      }
      if (!hasSlabId) {
        table.bigInteger('slab_id').unsigned().nullable();
      }
    });
  }

  // payroll_slabs was superseded by payroll_component_groups/payroll_components
  // in this environment and may not exist; only add the FK if it does.
  const hasPayrollSlabs = await knex.schema.hasTable('payroll_slabs');
  if (hasPayrollSlabs) {
    const fks: Array<{ CONSTRAINT_NAME: string }> = await knex('information_schema.key_column_usage')
      .where({
        table_schema: knex.client.config.connection.database,
        table_name: 'salary_structures',
        column_name: 'slab_id',
      })
      .whereNotNull('referenced_table_name')
      .select('constraint_name as CONSTRAINT_NAME');
    if (fks.length === 0) {
      await knex.schema.alterTable('salary_structures', (table) => {
        table.foreign('slab_id').references('payroll_slabs.id');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('salary_structures');
  if (hasTable) {
    await knex.schema.alterTable('salary_structures', (table) => {
      table.dropForeign(['cycle_id']);
      table.dropForeign(['slab_id']);
      table.dropColumn('cycle_id');
      table.dropColumn('slab_id');
    });
  }
}
