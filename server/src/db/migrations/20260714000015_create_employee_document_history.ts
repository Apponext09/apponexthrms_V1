import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_document_history');
  if (exists) return;

  await knex.schema.createTable('employee_document_history', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('document_id').unsigned().notNullable();

    table.enum('action', ['upload', 'verify', 'reject', 'expire']).notNullable();
    table.string('old_file_url', 500).nullable();
    table.string('new_file_url', 500).nullable();
    table.text('change_reason').nullable();
    table.bigInteger('changed_by').unsigned().notNullable();
    table.timestamp('changed_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('document_id').references('employee_documents.id');
    table.foreign('changed_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('document_id');
    table.index('changed_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_document_history');
}



