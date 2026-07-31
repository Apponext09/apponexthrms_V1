import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('employee_leave_locks');
  if (!hasTable) {
    await knex.schema.createTable('employee_leave_locks', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['employee_id', 'organization_id'], 'uk_employee_org');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_leave_locks');
}
