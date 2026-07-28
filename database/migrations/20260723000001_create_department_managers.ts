import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('department_managers');
  if (hasTable) return;

  await knex.schema.createTable('department_managers', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('department_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.enum('manager_type', ['department_manager', 'team_lead', 'hr_contact']).notNullable().defaultTo('department_manager');
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.bigInteger('assigned_by').unsigned().notNullable();
    table.timestamp('assigned_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('department_id').references('id').inTable('departments').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('assigned_by').references('id').inTable('users').onDelete('RESTRICT');
    table.unique(['department_id', 'employee_id', 'manager_type'], 'dept_mgr_emp_type_unique');
    table.index(['organization_id', 'department_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('department_managers');
}
