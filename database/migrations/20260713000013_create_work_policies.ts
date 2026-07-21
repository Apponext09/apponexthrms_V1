import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('work_policies', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.string('policy_name', 150).notNullable();
    table.enum('policy_type', ['office', 'hybrid', 'remote']).defaultTo('office');
    table.boolean('applicable_to_all').defaultTo(false);
    table.json('rules').nullable();
    table.date('effective_from').notNullable();
    table.date('effective_to').nullable();
    table.text('description').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('policy_type');
    table.index('effective_from');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_policies');
}




