import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('interview_panel');
  if (!hasTable) {
    await knex.schema.createTable('interview_panel', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.integer('interview_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('interview_id').references('interviews.id').onDelete('CASCADE');
      table.foreign('employee_id').references('employees.id');

      table.index('organization_id');
      table.index('interview_id');
      table.index('employee_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('interview_panel');
}
