import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('talent_matrix');
  if (exists) return;

  await knex.schema.createTable('talent_matrix', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.decimal('performance_rating', 5, 2).notNullable();
    table.decimal('potential_rating', 5, 2).notNullable();
    table.enum('quadrant', ['emerging', 'solid_performer', 'rising_star', 'superstar']).notNullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('employees');
    table.foreign('created_by').references('id').inTable('users');
    table.index('organization_id');
    table.index('employee_id');
    table.index('quadrant');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('talent_matrix');
}

