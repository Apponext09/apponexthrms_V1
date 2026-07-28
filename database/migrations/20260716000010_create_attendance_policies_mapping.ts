import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('attendance_policies_mapping');
  if (exists) return;

  await knex.schema.createTable('attendance_policies_mapping', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('attendance_policy_id').unsigned().notNullable();
    table.bigInteger('shift_id').unsigned().nullable();
    table.integer('grace_period_minutes').defaultTo(0);
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.boolean('is_active').defaultTo(true);

    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('attendance_policy_id').references('attendance_policies.id');
    table.foreign('shift_id').references('shift_templates.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('is_active');
    table.index('effective_from');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attendance_policies_mapping');
}




