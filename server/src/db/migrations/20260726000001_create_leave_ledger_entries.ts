import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('leave_ledger_entries');
  if (exists) return;

  await knex.schema.createTable('leave_ledger_entries', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('uuid').notNullable().unique();
    table.bigInteger('organization_id').unsigned().notNullable();
    table.bigInteger('employee_id').unsigned().notNullable();
    table.bigInteger('leave_type_id').unsigned().notNullable();
    table.enum('transaction_type', [
      'ACCRUAL',
      'USAGE',
      'RESERVATION',
      'RESERVATION_RELEASE',
      'CARRY_FORWARD',
      'ENCASHMENT',
      'LAPSE',
      'MANUAL_ADJUSTMENT',
      'COMP_OFF_CREDIT'
    ]).notNullable();
    table.decimal('amount', 6, 2).notNullable(); // Negative for reservations and usage, positive for accruals
    table.string('reference_id', 255).nullable();
    table.date('effective_date').notNullable();
    table.bigInteger('created_by').unsigned().notNullable();
    table.string('remarks', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('employee_id').references('employees.id');
    table.foreign('leave_type_id').references('leave_types.id');
    table.foreign('created_by').references('users.id');
    table.index('organization_id');
    table.index('employee_id');
    table.index('leave_type_id');
    table.index('effective_date');
    table.index('transaction_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_ledger_entries');
}
