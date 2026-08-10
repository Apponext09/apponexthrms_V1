import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_leave_locks');
  if (exists) return;

  await knex.schema.createTable('employee_leave_locks', (table) => {
    table.bigInteger('employee_id').unsigned().primary();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('employee_id').references('employees.id');
    table.foreign('organization_id').references('organizations.id');
    table.index('organization_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_leave_locks');
}
