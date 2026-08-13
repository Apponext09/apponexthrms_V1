import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('designations');
  if (hasTable) {
    const hasMappedCompanies = await knex.schema.hasColumn('designations', 'mapped_companies');
    await knex.schema.alterTable('designations', (table) => {
      if (!hasMappedCompanies) {
        table.json('mapped_companies').nullable();
        table.json('mapped_locations').nullable();
        table.json('mapped_departments').nullable();
        table.json('mapped_shifts').nullable();
        table.json('mapped_grades').nullable();
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('designations');
  if (hasTable) {
    const hasMappedCompanies = await knex.schema.hasColumn('designations', 'mapped_companies');
    await knex.schema.alterTable('designations', (table) => {
      if (hasMappedCompanies) {
        table.dropColumn('mapped_companies');
        table.dropColumn('mapped_locations');
        table.dropColumn('mapped_departments');
        table.dropColumn('mapped_shifts');
        table.dropColumn('mapped_grades');
      }
    });
  }
}
