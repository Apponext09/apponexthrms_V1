import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_documents');
  if (exists) return;

  await knex.schema.createTable('employee_documents', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.enum('document_type', [
      'aadhaar', 'pan', 'passport', 'visa', 'driving_license',
      'offer_letter', 'appointment_letter', 'confirmation_letter',
      'relieving_letter', 'experience_letter', 'resume', 'certificate'
    ]).notNullable();

    table.string('document_number', 50).nullable();
    table.date('issue_date').nullable();
    table.date('expiry_date').nullable();
    table.string('issued_by', 100).nullable();
    table.string('file_url', 500).notNullable();
    table.integer('file_size').nullable();
    table.string('file_type', 50).nullable();
    table.enum('verification_status', ['pending', 'verified', 'rejected', 'expired']).defaultTo('pending');
    table.bigInteger('verified_by').unsigned().nullable();
    table.timestamp('verified_at').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('verified_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('document_type');
    table.index('verification_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_documents');
}




