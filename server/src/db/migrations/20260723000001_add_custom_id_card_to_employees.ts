import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('employees', 'custom_id_card');
  if (!hasColumn) {
    await knex.schema.table('employees', (table) => {
      table.text('custom_id_card').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('employees', 'custom_id_card');
  if (hasColumn) {
    await knex.schema.table('employees', (table) => {
      table.dropColumn('custom_id_card');
    });
  }
}
