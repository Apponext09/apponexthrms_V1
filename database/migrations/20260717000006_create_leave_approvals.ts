import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_approvals', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('application_id').unsigned().notNullable();
    table.integer('approval_level').notNullable();
    table.bigInteger('approver_user_id').unsigned().notNullable();
    table.enum('approval_action', ['approve', 'reject', 'delegate']).notNullable();
    table.timestamp('approval_date').notNullable();
    table.text('approval_comments').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('application_id').references('leave_applications.id');
    table.foreign('approver_user_id').references('users.id');
    table.index('organization_id');
    table.index('application_id');
    table.index('approver_user_id');
    table.index('approval_level');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_approvals');
}



