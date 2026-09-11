import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('lms_modules');
  if (exists) {
    await knex.schema.alterTable('lms_modules', (table) => {
      table.text('content_url', 'longtext').nullable().alter();
      table.text('body_text', 'longtext').nullable().alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('lms_modules');
  if (exists) {
    await knex.schema.alterTable('lms_modules', (table) => {
      table.text('content_url').nullable().alter();
      table.text('body_text').nullable().alter();
    });
  }
}
