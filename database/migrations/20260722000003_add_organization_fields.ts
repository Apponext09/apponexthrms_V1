import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const columns = ['code', 'owner_name', 'location', 'email', 'phone', 'website_url'];
  for (const col of columns) {
    const exists = await knex.schema.hasColumn('organizations', col);
    if (exists) continue;
    await knex.schema.alterTable('organizations', (table) => {
      if (col === 'code') table.string('code', 50).nullable();
      if (col === 'owner_name') table.string('owner_name', 255).nullable();
      if (col === 'location') table.string('location', 255).nullable();
      if (col === 'email') table.string('email', 255).nullable();
      if (col === 'phone') table.string('phone', 50).nullable();
      if (col === 'website_url') table.string('website_url', 512).nullable();
    });
  }
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
