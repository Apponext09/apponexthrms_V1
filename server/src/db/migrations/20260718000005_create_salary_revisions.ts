import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('salary_revisions');
  if (exists) return;

  await knex.schema.createTable('salary_revisions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('revision_type', ['increment', 'promotion', 'compensation_change', 'adjustment']).notNullable();
    table.date('effective_from').notNullable();
    table.decimal('old_ctc', 15, 2).notNullable();
    table.decimal('new_ctc', 15, 2).notNullable();
    table.decimal('increment_percentage', 5, 2).nullable();
    table.decimal('increment_amount', 15, 2).nullable();
    table.text('reason_description').nullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'rejected', 'implemented']).defaultTo('draft');
    table.timestamp('submitted_at').nullable();
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.timestamp('implemented_date').nullable();
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
    table.index('status');
    table.index('effective_from');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('salary_revisions');
}




