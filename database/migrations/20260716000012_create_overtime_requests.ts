import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('overtime_requests');
  if (exists) return;

  await knex.schema.createTable('overtime_requests', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('overtime_date').notNullable();
    table.decimal('overtime_hours', 4, 2).notNullable();
    table.enum('overtime_type', ['extra_hours', 'weekend_work', 'holiday_work']).notNullable();
    table.text('reason_description').nullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('approval_status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.boolean('comp_off_eligible').defaultTo(true);
    table.boolean('comp_off_used').defaultTo(false);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('approval_status');
    table.index('overtime_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('overtime_requests');
}




