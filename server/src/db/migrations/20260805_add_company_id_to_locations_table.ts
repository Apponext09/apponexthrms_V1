import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCompanyId = await knex.schema.hasColumn('locations', 'company_id');
  
  if (!hasCompanyId) {
    await knex.schema.alterTable('locations', (table) => {
      table.integer('company_id').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCompanyId = await knex.schema.hasColumn('locations', 'company_id');
  
  if (hasCompanyId) {
    await knex.schema.alterTable('locations', (table) => {
      table.dropColumn('company_id');
    });
  }
}
