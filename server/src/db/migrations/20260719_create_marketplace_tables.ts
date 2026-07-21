import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create marketplace_addons table
  await knex.schema.createTable('marketplace_addons', (table) => {
    table.string('id', 36).primary();
    table.string('key', 100).unique().notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 50);
    table.string('icon_url', 500);

    table.enum('pricing_model', ['fixed', 'usage-based', 'hybrid']).defaultTo('fixed');
    table.decimal('base_price', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');

    table.integer('trial_days').defaultTo(14);
    table.boolean('trial_enabled').defaultTo(true);

    table.longText('features'); // JSON array
    table.integer('max_users_allowed');
    table.integer('max_api_calls');

    table.enum('status', ['active', 'beta', 'deprecated', 'archived']).defaultTo('active');
    table.timestamp('published_at');
    table.timestamp('deprecated_at');

    table.string('support_url', 500);
    table.string('documentation_url', 500);
    table.string('changelog_url', 500);

    table.timestamps(true, true);
    table.timestamp('deleted_at');

    table.index(['key']);
    table.index(['category']);
    table.index(['status']);
  });

  // Create organization_addon_subscriptions table
  await knex.schema.createTable('organization_addon_subscriptions', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.enum('subscription_status', ['trial', 'active', 'suspended', 'cancelled']).defaultTo('trial');

    table.enum('billing_cycle', ['monthly', 'yearly']).defaultTo('monthly');
    table.decimal('monthly_price', 10, 2);
    table.decimal('yearly_price', 10, 2);
    table.decimal('discount_percent', 5, 2).defaultTo(0);

    table.timestamp('trial_started_at');
    table.timestamp('trial_ends_at');
    table.boolean('trial_converted_to_paid').defaultTo(false);

    table.timestamp('subscription_started_at');
    table.timestamp('subscription_ends_at');
    table.timestamp('next_renewal_date');

    table.integer('api_calls_used').defaultTo(0);
    table.integer('api_calls_limit');
    table.integer('users_added').defaultTo(0);
    table.integer('users_limit');

    table.longText('enabled_features'); // JSON object

    table.boolean('auto_renew').defaultTo(true);
    table.string('payment_method_id', 100);

    table.timestamps(true, true);
    table.timestamp('cancelled_at');

    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.unique(['organization_id', 'addon_id']);
    table.index(['subscription_status']);
    table.index(['next_renewal_date']);
  });

  // Create organization_module_features table
  await knex.schema.createTable('organization_module_features', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();

    table.string('module_key', 100).notNullable();
    table.string('feature_key', 100).notNullable();

    table.boolean('enabled').defaultTo(true);

    table.integer('monthly_usage_limit');
    table.integer('monthly_usage_current').defaultTo(0);

    table.timestamp('enabled_at');
    table.timestamp('disabled_at');

    table.string('reason_disabled', 500);
    table.string('disabled_by_user_id', 36);

    table.timestamps(true, true);

    table.foreign('organization_id').references('organizations.id');
    table.unique(['organization_id', 'module_key', 'feature_key']);
    table.index(['module_key']);
    table.index(['enabled']);
  });

  // Create addon_billing_history table
  await knex.schema.createTable('addon_billing_history', (table) => {
    table.string('id', 36).primary();
    table.string('organization_addon_subscription_id', 36).notNullable();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.string('invoice_number', 50).unique().notNullable();

    table.decimal('amount_subtotal', 10, 2);
    table.decimal('discount_amount', 10, 2).defaultTo(0);
    table.decimal('tax_amount', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2);

    table.string('currency', 3).defaultTo('USD');

    table.date('billing_period_start');
    table.date('billing_period_end');

    table.enum('payment_status', ['pending', 'paid', 'failed', 'refunded']).defaultTo('pending');

    table.string('payment_method_type', 50);
    table.string('payment_method_last4', 4);

    table.string('stripe_charge_id', 100);
    table.string('razorpay_payment_id', 100);

    table.timestamp('paid_at');
    table.date('due_date');

    table.string('invoice_url', 500);
    table.text('notes');

    table.timestamps(true, true);

    table.foreign('organization_addon_subscription_id').references('organization_addon_subscriptions.id');
    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.index(['payment_status']);
    table.index(['due_date']);
  });

  // Create addon_trials table
  await knex.schema.createTable('addon_trials', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.timestamp('trial_started_at').defaultTo(knex.fn.now());
    table.timestamp('trial_ends_at').notNullable();

    table.enum('trial_status', ['active', 'converted', 'expired', 'cancelled']).defaultTo('active');

    table.longText('features_enabled'); // JSON array

    table.string('conversion_decision', 50);
    table.string('conversion_reason', 500);

    table.timestamp('converted_at');

    table.timestamps(true, true);

    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.unique(['organization_id', 'addon_id']);
    table.index(['trial_status']);
    table.index(['trial_ends_at']);
  });

  // Create feature_access_logs table
  await knex.schema.createTable('feature_access_logs', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('user_id', 36).notNullable();

    table.string('module_key', 100).notNullable();
    table.string('feature_key', 100).notNullable();

    table.enum('access_type', ['view', 'create', 'update', 'delete', 'export']).defaultTo('view');

    table.boolean('granted');
    table.string('reason_denied', 255);

    table.string('request_path', 500);
    table.string('ip_address', 50);

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('organization_id').references('organizations.id');
    table.foreign('user_id').references('users.id');
    table.index(['module_key', 'feature_key']);
    table.index(['granted']);
  });

  // Seed marketplace_addons with default addons
  const now = new Date();
  await knex('marketplace_addons').insert([
    {
      id: 'addon_payroll_pro',
      key: 'payroll_pro',
      name: 'Payroll Pro',
      description: 'Advanced payroll processing with multiple salary structures',
      category: 'hrms',
      pricing_model: 'fixed',
      base_price: 100,
      currency: 'USD',
      trial_days: 14,
      trial_enabled: true,
      features: JSON.stringify(['salary_calculation', 'payslips', 'reimbursements', 'loans', 'bonus']),
      status: 'active',
      published_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'addon_recruitment_pro',
      key: 'recruitment_pro',
      name: 'Recruitment Pro',
      description: 'Complete recruitment management with candidate tracking',
      category: 'hrms',
      pricing_model: 'fixed',
      base_price: 80,
      currency: 'USD',
      trial_days: 14,
      trial_enabled: true,
      features: JSON.stringify(['job_postings', 'candidate_tracking', 'interviews', 'offers']),
      status: 'active',
      published_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'addon_ai_assistant',
      key: 'ai_assistant',
      name: 'AI Assistant',
      description: 'AI-powered HR copilot for policies, payroll, and leave management',
      category: 'ai',
      pricing_model: 'fixed',
      base_price: 50,
      currency: 'USD',
      trial_days: 14,
      trial_enabled: true,
      features: JSON.stringify(['policy_search', 'payroll_assistant', 'leave_assistant', 'resume_parser']),
      status: 'active',
      published_at: now,
      created_at: now,
      updated_at: now,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('feature_access_logs');
  await knex.schema.dropTableIfExists('addon_trials');
  await knex.schema.dropTableIfExists('addon_billing_history');
  await knex.schema.dropTableIfExists('organization_module_features');
  await knex.schema.dropTableIfExists('organization_addon_subscriptions');
  await knex.schema.dropTableIfExists('marketplace_addons');
}
