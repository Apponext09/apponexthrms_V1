import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_document_versions');
  if (!hasTable) {
    await knex.schema.createTable('policy_document_versions', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('policy_document_id').unsigned().notNullable();
      table.string('version', 20).notNullable().defaultTo('1.0');
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.text('file_url', 'longtext').notNullable();
      table.string('file_name', 255).nullable();
      table.integer('file_size').nullable();
      table.string('file_type', 50).nullable();
      table.text('change_description').nullable();
      table.bigInteger('created_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('policy_document_id').references('id').inTable('policy_documents').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');

      table.index('organization_id');
      table.index('policy_document_id');
      table.index('version');
    });
    console.log('[MIGRATION] Created table: policy_document_versions');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('policy_document_versions');
}
