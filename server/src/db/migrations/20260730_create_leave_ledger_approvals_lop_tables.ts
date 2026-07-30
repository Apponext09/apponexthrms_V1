import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. leave_ledger_entries
  const hasLedger = await knex.schema.hasTable('leave_ledger_entries');
  if (!hasLedger) {
    await knex.schema.createTable('leave_ledger_entries', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('leave_type_id').unsigned().notNullable();
      table.string('transaction_type', 50).notNullable();
      table.decimal('amount', 8, 2).notNullable();
      table.date('effective_date').nullable();
      table.string('reference_id', 100).nullable();
      table.text('remarks').nullable();
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 2. leave_approvals
  const hasApprovals = await knex.schema.hasTable('leave_approvals');
  if (!hasApprovals) {
    await knex.schema.createTable('leave_approvals', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('application_id').unsigned().notNullable();
      table.bigInteger('approver_id').unsigned().notNullable();
      table.string('approver_role', 50).nullable();
      table.string('status', 50).notNullable();
      table.text('comments').nullable();
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }

  // 3. leave_lop_records
  const hasLop = await knex.schema.hasTable('leave_lop_records');
  if (!hasLop) {
    await knex.schema.createTable('leave_lop_records', (table) => {
      table.bigIncrements('id').primary();
      table.uuid('uuid').defaultTo(knex.raw('(UUID())')).unique().notNullable();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('application_id').unsigned().notNullable();
      table.decimal('lop_days', 5, 2).notNullable();
      table.string('status', 50).defaultTo('pending');
      table.bigInteger('created_by').unsigned().notNullable();
      table.bigInteger('updated_by').unsigned().notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_lop_records');
  await knex.schema.dropTableIfExists('leave_approvals');
  await knex.schema.dropTableIfExists('leave_ledger_entries');
}
