import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employee_versions', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();

    table.integer('version_number').notNullable();
    table.string('entity_type', 50).notNullable();
    table.bigInteger('entity_id').unsigned().notNullable();

    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.enum('change_type', ['create', 'update', 'delete', 'restore']).notNullable();
    table.text('change_reason').nullable();

    table.bigInteger('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('changed_by').references('users.id');

    table.index('organization_id');
    table.index('employee_id');
    table.index('entity_type');
    table.index('version_number');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_versions');
}



