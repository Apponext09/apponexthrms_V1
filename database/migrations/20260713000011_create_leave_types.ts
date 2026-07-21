import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_types', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('leave_policy_id').unsigned().nullable();
    table.string('leave_name', 100).notNullable();
    table.string('leave_code', 50).notNullable();
    table.integer('annual_quota').defaultTo(0);
    table.boolean('carry_forward_enabled').defaultTo(false);
    table.integer('carry_forward_limit').nullable();
    table.boolean('encashment_enabled').defaultTo(false);
    table.integer('encashment_limit').nullable();
    table.boolean('sandwich_rule_enabled').defaultTo(false);
    table.enum('gender_applicable', ['all', 'male', 'female', 'other']).defaultTo('all');
    table.text('description').nullable();
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('leave_policy_id').references('leave_policies.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.unique(['organization_id', 'leave_code']);
    table.index('organization_id');
    table.index('leave_policy_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_types');
}




