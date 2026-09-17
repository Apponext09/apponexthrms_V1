import type { Knex } from 'knex';

/** Manager-originated promotions and transfers.  The workflow approval row is
 * deliberately linked to this record so that HR's decision is auditable and
 * the employee's job record cannot be changed before verification. */
export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('employee_change_proposals');
  if (exists) return;

  await knex.schema.createTable('employee_change_proposals', (table) => {
    table.increments('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.integer('organization_id').unsigned().notNullable();
    table.integer('employee_id').unsigned().notNullable();
    table.integer('proposed_by_user_id').unsigned().notNullable();
    table.enu('proposal_type', ['promotion', 'transfer']).notNullable();
    table.text('justification').notNullable();
    table.string('status', 40).notNullable().defaultTo('pending_hr_verification');
    table.integer('workflow_approval_id').unsigned().nullable();
    table.integer('verified_by_user_id').unsigned().nullable();
    table.text('verification_comment').nullable();
    table.timestamp('verified_at').nullable();
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    table.index(['organization_id', 'employee_id']);
    table.index(['organization_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_change_proposals');
}
