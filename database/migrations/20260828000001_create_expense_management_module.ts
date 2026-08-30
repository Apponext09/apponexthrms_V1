import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Expense Categories Table
  const hasCategories = await knex.schema.hasTable('expense_categories');
  if (!hasCategories) {
    await knex.schema.createTable('expense_categories', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('name', 100).notNullable();
      table.string('code', 50).notNullable();
      table.text('description').nullable();
      table.decimal('spending_limit', 15, 2).defaultTo(0);
      table.boolean('is_receipt_mandatory').defaultTo(false);
      table.decimal('min_amount_for_receipt', 15, 2).defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['code']);
    });
  }

  // 2. Expense Policies Table
  const hasPolicies = await knex.schema.hasTable('expense_policies');
  if (!hasPolicies) {
    await knex.schema.createTable('expense_policies', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.string('policy_name', 150).notNullable();
      table.bigInteger('category_id').unsigned().nullable();
      table.string('grade', 50).nullable();
      table.string('designation', 100).nullable();
      table.bigInteger('department_id').unsigned().nullable();
      table.string('location', 100).nullable();
      table.decimal('max_limit_per_claim', 15, 2).defaultTo(0);
      table.decimal('max_limit_per_month', 15, 2).defaultTo(0);
      table.decimal('require_receipt_above', 15, 2).defaultTo(0);
      table.boolean('allow_exception').defaultTo(true);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['category_id']);
    });
  }

  // 3. Main Expense Claims Table
  const hasClaims = await knex.schema.hasTable('expense_claims');
  if (!hasClaims) {
    await knex.schema.createTable('expense_claims', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.string('claim_number', 50).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.string('title', 255).notNullable();
      table.bigInteger('category_id').unsigned().nullable();
      table.date('claim_date').notNullable();
      table.decimal('total_claimed_amount', 15, 2).defaultTo(0);
      table.decimal('total_approved_amount', 15, 2).defaultTo(0);
      table.decimal('total_rejected_amount', 15, 2).defaultTo(0);
      table.string('payment_method', 50).defaultTo('payroll');
      table.string('merchant_name', 150).nullable();
      table.text('description').nullable();
      table.string('project_cost_center', 100).nullable();
      table.specificType('receipt_url', 'LONGTEXT').nullable();
      table.string('status', 50).defaultTo('draft');
      table.bigInteger('current_approver_id').unsigned().nullable();
      table.string('current_approver_role', 50).nullable();
      table.text('rejection_reason').nullable();
      table.text('return_comments').nullable();
      table.bigInteger('travel_request_id').unsigned().nullable();
      table.bigInteger('travel_advance_id').unsigned().nullable();
      table.timestamp('submitted_at').nullable();
      table.timestamp('approved_at').nullable();
      table.timestamp('reimbursed_at').nullable();
      table.date('payment_date').nullable();
      table.decimal('paid_amount', 15, 2).defaultTo(0);
      table.string('payment_reference', 100).nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['status']);
      table.index(['claim_number']);
    });
  }

  // 4. Expense Claim Line Items Table
  const hasItems = await knex.schema.hasTable('expense_claim_items');
  if (!hasItems) {
    await knex.schema.createTable('expense_claim_items', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('claim_id').unsigned().notNullable();
      table.bigInteger('category_id').unsigned().nullable();
      table.date('expense_date').notNullable();
      table.decimal('claimed_amount', 15, 2).defaultTo(0);
      table.decimal('approved_amount', 15, 2).defaultTo(0);
      table.decimal('rejected_amount', 15, 2).defaultTo(0);
      table.string('merchant_name', 150).nullable();
      table.text('description').nullable();
      table.string('project_cost_center', 100).nullable();
      table.specificType('receipt_url', 'LONGTEXT').nullable();
      table.string('receipt_file_name', 255).nullable();
      table.string('receipt_file_type', 50).nullable();
      table.integer('receipt_file_size').nullable();
      table.boolean('policy_validated').defaultTo(true);
      table.text('policy_violations').nullable();
      table.text('employee_justification').nullable();
      table.string('status', 50).defaultTo('pending');
      table.text('adjustment_reason').nullable();
      table.timestamps(true, true);

      table.index(['claim_id']);
      table.index(['category_id']);
    });
  }

  // 5. Expense Approval Logs Table
  const hasLogs = await knex.schema.hasTable('expense_approval_logs');
  if (!hasLogs) {
    await knex.schema.createTable('expense_approval_logs', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('claim_id').unsigned().notNullable();
      table.bigInteger('approver_id').unsigned().nullable();
      table.string('approver_name', 150).notNullable();
      table.string('approver_role', 100).notNullable();
      table.string('action', 50).notNullable();
      table.text('comments').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['claim_id']);
    });
  }

  // 6. Travel Requests Table
  const hasTravel = await knex.schema.hasTable('travel_requests');
  if (!hasTravel) {
    await knex.schema.createTable('travel_requests', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.string('request_number', 50).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.string('from_location', 150).notNullable();
      table.string('to_location', 150).notNullable();
      table.text('purpose').notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.decimal('estimated_budget', 15, 2).defaultTo(0);
      table.string('status', 50).defaultTo('pending');
      table.bigInteger('approver_id').unsigned().nullable();
      table.text('approver_notes').nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['status']);
    });
  }

  // 7. Travel Advances Table
  const hasAdvances = await knex.schema.hasTable('travel_advances');
  if (!hasAdvances) {
    await knex.schema.createTable('travel_advances', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.string('advance_number', 50).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.bigInteger('travel_request_id').unsigned().nullable();
      table.decimal('advance_amount', 15, 2).defaultTo(0);
      table.decimal('approved_amount', 15, 2).defaultTo(0);
      table.decimal('settled_amount', 15, 2).defaultTo(0);
      table.decimal('balance_amount', 15, 2).defaultTo(0);
      table.text('purpose').nullable();
      table.string('status', 50).defaultTo('requested');
      table.timestamp('disbursed_at').nullable();
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['status']);
    });
  }

  // 8. Mileage Claims Table
  const hasMileage = await knex.schema.hasTable('mileage_claims');
  if (!hasMileage) {
    await knex.schema.createTable('mileage_claims', (table) => {
      table.bigIncrements('id').primary();
      table.string('uuid', 36).notNullable().unique();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('employee_id').unsigned().notNullable();
      table.date('trip_date').notNullable();
      table.string('from_location', 150).notNullable();
      table.string('to_location', 150).notNullable();
      table.string('vehicle_type', 50).defaultTo('car');
      table.decimal('distance_km', 10, 2).defaultTo(0);
      table.decimal('rate_per_km', 10, 2).defaultTo(0);
      table.decimal('calculated_amount', 15, 2).defaultTo(0);
      table.text('purpose').nullable();
      table.bigInteger('claim_id').unsigned().nullable();
      table.string('status', 50).defaultTo('pending');
      table.timestamps(true, true);

      table.index(['organization_id']);
      table.index(['employee_id']);
      table.index(['status']);
    });
  }

  // 9. Expense Module Settings Table
  const hasSettings = await knex.schema.hasTable('expense_settings');
  if (!hasSettings) {
    await knex.schema.createTable('expense_settings', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable().unique();
      table.decimal('auto_approval_threshold', 15, 2).defaultTo(500.00);
      table.decimal('mileage_rate_car', 10, 2).defaultTo(12.00);
      table.decimal('mileage_rate_bike', 10, 2).defaultTo(6.00);
      table.boolean('require_manager_approval').defaultTo(true);
      table.boolean('require_finance_approval').defaultTo(true);
      table.boolean('multi_level_approval').defaultTo(true);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_settings');
  await knex.schema.dropTableIfExists('mileage_claims');
  await knex.schema.dropTableIfExists('travel_advances');
  await knex.schema.dropTableIfExists('travel_requests');
  await knex.schema.dropTableIfExists('expense_approval_logs');
  await knex.schema.dropTableIfExists('expense_claim_items');
  await knex.schema.dropTableIfExists('expense_claims');
  await knex.schema.dropTableIfExists('expense_policies');
  await knex.schema.dropTableIfExists('expense_categories');
}
