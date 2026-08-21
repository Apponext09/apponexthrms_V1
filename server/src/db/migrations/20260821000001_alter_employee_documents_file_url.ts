import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_documents');
  if (exists) {
    await knex.schema.alterTable('employee_documents', (table) => {
      table.text('file_url', 'longtext').notNullable().alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_documents');
  if (exists) {
    await knex.schema.alterTable('employee_documents', (table) => {
      table.string('file_url', 500).notNullable().alter();
    });
  }
}
