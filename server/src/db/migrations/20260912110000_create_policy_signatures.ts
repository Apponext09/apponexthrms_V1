import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasPolicySignatures = await knex.schema.hasTable('policy_signatures');
  if (!hasPolicySignatures) {
    await knex.schema.createTable('policy_signatures', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('policy_document_id').unsigned().notNullable();
      table.bigInteger('policy_version_id').unsigned().nullable();
      table.bigInteger('user_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().nullable();
      table.string('provider', 50).notNullable().defaultTo('docusign'); // 'docusign' | 'adobesign' | 'leegality' | 'generic'
      table.string('provider_transaction_id', 255).notNullable().unique();
      table.string('status', 50).notNullable().defaultTo('PENDING'); // PENDING | SENT | VIEWED | SIGNED | DECLINED | EXPIRED | FAILED | CANCELLED
      table.string('authentication_method', 100).nullable();
      table.timestamp('initiated_at').defaultTo(knex.fn.now());
      table.timestamp('signed_at').nullable();
      table.string('document_hash', 255).nullable();
      table.text('signed_document_ref', 'longtext').nullable();
      table.text('evidence_ref', 'longtext').nullable();
      table.json('provider_metadata').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('policy_document_id').references('id').inTable('policy_documents').onDelete('CASCADE');
      table.foreign('policy_version_id').references('id').inTable('policy_document_versions').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

      table.index('organization_id');
      table.index('company_id');
      table.index('policy_document_id');
      table.index('policy_version_id');
      table.index('user_id');
      table.index('provider_transaction_id');
      table.index('status');
    });
    console.log('[MIGRATION] Created table: policy_signatures');
  }

  const hasPolicyDocs = await knex.schema.hasTable('policy_documents');
  if (hasPolicyDocs) {
    const hasSigMode = await knex.schema.hasColumn('policy_documents', 'signature_mode');
    if (!hasSigMode) {
      await knex.schema.alterTable('policy_documents', (table) => {
        table.string('signature_mode', 30).notNullable().defaultTo('ACKNOWLEDGEMENT');
      });
      console.log('[MIGRATION] Added signature_mode column to policy_documents');
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('policy_signatures');
  const hasPolicyDocs = await knex.schema.hasTable('policy_documents');
  if (hasPolicyDocs) {
    const hasSigMode = await knex.schema.hasColumn('policy_documents', 'signature_mode');
    if (hasSigMode) {
      await knex.schema.alterTable('policy_documents', (table) => {
        table.dropColumn('signature_mode');
      });
    }
  }
}
