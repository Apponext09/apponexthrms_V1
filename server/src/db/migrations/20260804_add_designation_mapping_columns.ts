import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('designations');
  if (hasTable) {
    await knex.schema.alterTable('designations', (table) => {
      table.json('mapped_companies').nullable();
      table.json('mapped_locations').nullable();
      table.json('mapped_departments').nullable();
      table.json('mapped_shifts').nullable();
      table.json('mapped_grades').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('designations');
  if (hasTable) {
    await knex.schema.alterTable('designations', (table) => {
      table.dropColumn('mapped_companies');
      table.dropColumn('mapped_locations');
      table.dropColumn('mapped_departments');
      table.dropColumn('mapped_shifts');
      table.dropColumn('mapped_grades');
    });
  }
}
