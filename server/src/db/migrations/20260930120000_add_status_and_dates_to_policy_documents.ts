import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasStatus = await knex.schema.hasColumn('policy_documents', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.string('status', 50).notNullable().defaultTo('published');
      table.timestamp('effective_date').nullable();
      table.timestamp('review_date').nullable();
      table.timestamp('expiry_date').nullable();
      table.string('document_ref', 100).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_documents');
  if (!hasTable) return;

  const hasStatus = await knex.schema.hasColumn('policy_documents', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('policy_documents', (table) => {
      table.dropColumn('status');
      table.dropColumn('effective_date');
      table.dropColumn('review_date');
      table.dropColumn('expiry_date');
      table.dropColumn('document_ref');
    });
  }
}
