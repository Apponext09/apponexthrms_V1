import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('salary_structures');
  if (hasTable) {
    await knex.schema.alterTable('salary_structures', (table) => {
      table.bigInteger('cycle_id').unsigned().nullable();
      table.bigInteger('slab_id').unsigned().nullable();

      table.foreign('cycle_id').references('payroll_cycles.id');
      table.foreign('slab_id').references('payroll_slabs.id');
    });
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
