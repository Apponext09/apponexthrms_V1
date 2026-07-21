import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('full_final_settlements', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.date('exit_date').notNullable();
    table.integer('notice_period_days').notNullable();
    table.decimal('notice_period_recovery', 15, 2).notNullable().defaultTo(0);
    table.decimal('leave_encashment_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('gratuity_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('bonus_settlement', 15, 2).notNullable().defaultTo(0);
    table.decimal('asset_recovery_amount', 15, 2).notNullable().defaultTo(0);
    table.decimal('other_deductions', 15, 2).notNullable().defaultTo(0);
    table.decimal('total_settlement_amount', 15, 2).notNullable();
    table.bigInteger('workflow_instance_id').unsigned().nullable();
    table.enum('status', ['draft', 'submitted', 'approved', 'processed']).defaultTo('draft');
    table.bigInteger('approved_by').unsigned().nullable();
    table.timestamp('approval_date').nullable();
    table.timestamp('processed_date').nullable();
    table.text('settlement_notes').nullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.bigInteger('updated_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('workflow_instance_id').references('workflow_instances.id');
    table.foreign('approved_by').references('users.id');
    table.foreign('created_by').references('users.id');
    table.foreign('updated_by').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('full_final_settlements');
}




