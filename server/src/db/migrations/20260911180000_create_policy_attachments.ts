import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('policy_attachments');
  if (!hasTable) {
    await knex.schema.createTable('policy_attachments', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('policy_document_id').unsigned().notNullable();
      table.bigInteger('policy_version_id').unsigned().nullable();
      table.string('file_name', 255).notNullable();
      table.string('file_type', 100).notNullable();
      table.integer('file_size').notNullable();
      table.text('storage_path', 'longtext').notNullable();
      table.string('checksum', 64).notNullable();
      table.boolean('is_main_document').notNullable().defaultTo(false);
      table.bigInteger('uploaded_by').unsigned().notNullable();
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('policy_document_id').references('id').inTable('policy_documents').onDelete('CASCADE');
      table.foreign('policy_version_id').references('id').inTable('policy_document_versions').onDelete('CASCADE');
      table.foreign('uploaded_by').references('id').inTable('users').onDelete('CASCADE');

      table.index('organization_id');
      table.index('company_id');
      table.index('policy_document_id');
      table.index('policy_version_id');
      table.index('is_main_document');
    });
    console.log('[MIGRATION] Created table: policy_attachments');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('policy_attachments');
}
