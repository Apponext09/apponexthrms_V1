import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_regularizations');
  if (exists) return;

  await knex.schema.createTable('attendance_regularizations', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('attendance_record_id').unsigned().nullable();
    table.enum('regularization_type', ['missed_punch', 'late_arrival', 'early_departure', 'work_from_home', 'manual_correction']).notNullable();
    table.date('request_date').notNullable();
    table.text('reason_description').nullable();
    table.string('supporting_document_url', 500).nullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.text('approval_comments').nullable();

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('attendance_record_id').references('attendance_records.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
    table.index('regularization_type');
    table.index('request_date');
    table.index('workflow_instance_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_regularizations');
}




