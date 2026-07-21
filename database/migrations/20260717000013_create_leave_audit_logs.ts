import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_audit_logs', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().nullable();
    table.enum('action', ['applied', 'approved', 'rejected', 'cancelled', 'withdrawn', 'encashed']).notNullable();
    table.enum('entity_type', ['application', 'approval', 'cancellation', 'encashment', 'comp_off']).notNullable();
    table.bigInteger('entity_id').unsigned().notNullable();
    table.json('old_value').nullable();
    table.json('new_value').nullable();
    table.bigInteger('actor_id').unsigned().notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('actor_id').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('action');
    table.index('entity_type');
    table.index('timestamp');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_audit_logs');
}



