import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. policy_documents table
  const hasPolicyDocs = await knex.schema.hasTable('policy_documents');
  if (!hasPolicyDocs) {
    await knex.schema.createTable('policy_documents', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.string('category', 100).notNullable().defaultTo('General');
      table.text('file_url', 'longtext').notNullable();
      table.string('file_name', 255).nullable();
      table.integer('file_size').nullable();
      table.string('file_type', 50).nullable();
      table.string('version', 20).notNullable().defaultTo('1.0');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');

      table.index('organization_id');
      table.index('company_id');
      table.index('is_active');
      table.index('category');
    });
    console.log('[MIGRATION] Created table: policy_documents');
  }

  // 2. policy_document_role_mappings table
  const hasRoleMappings = await knex.schema.hasTable('policy_document_role_mappings');
  if (!hasRoleMappings) {
    await knex.schema.createTable('policy_document_role_mappings', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('policy_document_id').unsigned().notNullable();
      table.string('role_code', 50).notNullable();
      table.bigInteger('role_id').unsigned().nullable();
      table.boolean('is_mandatory').notNullable().defaultTo(true);
      table.bigInteger('created_by').unsigned().nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('policy_document_id').references('id').inTable('policy_documents').onDelete('CASCADE');

      table.unique(['policy_document_id', 'role_code', 'organization_id'], 'unq_policy_role_org');
      table.index('organization_id');
      table.index('company_id');
      table.index('policy_document_id');
      table.index('role_code');
    });
    console.log('[MIGRATION] Created table: policy_document_role_mappings');
  }

  // 3. employee_policy_acceptances table
  const hasAcceptances = await knex.schema.hasTable('employee_policy_acceptances');
  if (!hasAcceptances) {
    await knex.schema.createTable('employee_policy_acceptances', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('company_id').unsigned().nullable();
      table.bigInteger('employee_id').unsigned().nullable();
      table.bigInteger('user_id').unsigned().notNullable();
      table.bigInteger('policy_document_id').unsigned().notNullable();
      table.string('policy_version', 20).notNullable();
      table.timestamp('accepted_at').defaultTo(knex.fn.now());
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('policy_document_id').references('id').inTable('policy_documents').onDelete('CASCADE');
      table.foreign('employee_id').references('id').inTable('employees').onDelete('SET NULL');

      table.unique(['user_id', 'policy_document_id', 'policy_version'], 'unq_user_policy_version');
      table.index('organization_id');
      table.index('company_id');
      table.index('user_id');
      table.index('employee_id');
      table.index('policy_document_id');
      table.index('policy_version');
    });
    console.log('[MIGRATION] Created table: employee_policy_acceptances');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_policy_acceptances');
  await knex.schema.dropTableIfExists('policy_document_role_mappings');
  await knex.schema.dropTableIfExists('policy_documents');
}
