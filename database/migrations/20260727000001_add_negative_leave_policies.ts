import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Alter leave_types
  const hasAllowNeg = await knex.schema.hasColumn('leave_types', 'allow_negative_balance');
  if (!hasAllowNeg) {
    await knex.schema.alterTable('leave_types', (table) => {
      table.boolean('allow_negative_balance').defaultTo(false);
      table.string('negative_balance_action', 50).nullable();
      table.bigInteger('pool_from_leave_type_id').unsigned().nullable();

      table.foreign('pool_from_leave_type_id').references('leave_types.id');
    });
  }

  // Alter leave_balances
  const hasCarriedNeg = await knex.schema.hasColumn('leave_balances', 'carried_forward_negative_days');
  if (!hasCarriedNeg) {
    await knex.schema.alterTable('leave_balances', (table) => {
      table.decimal('carried_forward_negative_days', 5, 2).defaultTo(0);
    });
  }

  // Create leave_lop_records
  const hasLopTable = await knex.schema.hasTable('leave_lop_records');
  if (!hasLopTable) {
    await knex.schema.createTable('leave_lop_records', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('leave_application_id').unsigned().notNullable();
      table.decimal('lop_days', 5, 2).notNullable();
      table.integer('month').notNullable();
      table.integer('year').notNullable();
      table.string('status', 50).defaultTo('pending_payroll');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('organization_id').references('organizations.id');
      table.foreign('employee_id').references('employees.id');
      table.foreign('leave_application_id').references('leave_applications.id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_lop_records');

  await knex.schema.alterTable('leave_balances', (table) => {
    table.dropColumn('carried_forward_negative_days');
  });

  await knex.schema.alterTable('leave_types', (table) => {
    table.dropForeign(['pool_from_leave_type_id']);
    table.dropColumn('pool_from_leave_type_id');
    table.dropColumn('negative_balance_action');
    table.dropColumn('allow_negative_balance');
  });
}
