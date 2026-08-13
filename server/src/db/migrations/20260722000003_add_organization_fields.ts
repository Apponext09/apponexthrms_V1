import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCode = await knex.schema.hasColumn('organizations', 'code');
  if (hasCode) return;

  await knex.schema.alterTable('organizations', (table) => {
    table.string('code', 50).nullable();
    table.string('owner_name', 255).nullable();
    table.string('location', 255).nullable();
    table.string('email', 255).nullable();
    table.string('phone', 50).nullable();
    table.string('website_url', 512).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
    table.dropColumn('code');
    table.dropColumn('owner_name');
    table.dropColumn('location');
    table.dropColumn('email');
    table.dropColumn('phone');
    table.dropColumn('website_url');
  });
}
