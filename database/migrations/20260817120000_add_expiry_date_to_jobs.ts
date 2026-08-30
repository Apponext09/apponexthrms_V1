import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasExpiryDate = await knex.schema.hasColumn('jobs', 'expiry_date');
  if (!hasExpiryDate) {
    await knex.schema.alterTable('jobs', (table) => {
      table.date('expiry_date').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasExpiryDate = await knex.schema.hasColumn('jobs', 'expiry_date');
  if (hasExpiryDate) {
    await knex.schema.alterTable('jobs', (table) => {
      table.dropColumn('expiry_date');
    });
  }
}
