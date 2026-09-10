import { getKnex } from '../../../db/knex';

export class ExpenseDbService {
  private static isInitialized = false;

  public static async ensureTablesAndSeed(organizationId: number = 1): Promise<void> {
    try {
      const db = getKnex();
      await this.ensureSubmitterColumns(db);
      await this.ensureTravelWorkflowColumns(db);
      await this.ensureMileageDesignationRatesTable(db);
      await this.ensureExpenseConfig(db);

      const hasCategoriesTable = await db.schema.hasTable('expense_categories');
      if (hasCategoriesTable) {
        const hasAutoCol = await db.schema.hasColumn('expense_categories', 'auto_approval_threshold').catch(() => false);
        if (!hasAutoCol) {
          await db.schema.alterTable('expense_categories', (table) => {
            table.decimal('auto_approval_threshold', 15, 2).defaultTo(0);
          });
        }
        await this.deactivateDuplicateCategories(db, organizationId);
        await this.seedDefaultCategories(db, organizationId);
      }

      if (this.isInitialized) {
        return;
      }

      // 1. Expense Categories Table
      const hasCategories = await db.schema.hasTable('expense_categories');
      if (!hasCategories) {
        await db.schema.createTable('expense_categories', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.string('name', 100).notNullable();
          table.string('code', 50).notNullable();
          table.text('description').nullable();
          table.decimal('spending_limit', 15, 2).defaultTo(0);
          table.boolean('is_receipt_mandatory').defaultTo(false);
          table.decimal('min_amount_for_receipt', 15, 2).defaultTo(0);
          table.decimal('auto_approval_threshold', 15, 2).defaultTo(0);
          table.boolean('is_active').defaultTo(true);
          table.timestamps(true, true);
          table.index(['organization_id']);
          table.index(['code']);
        });
      }

      // 2. Expense Policies Table
      const hasPolicies = await db.schema.hasTable('expense_policies');
      if (!hasPolicies) {
        await db.schema.createTable('expense_policies', (table) => {
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
      const hasClaims = await db.schema.hasTable('expense_claims');
      if (!hasClaims) {
        await db.schema.createTable('expense_claims', (table) => {
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
          table.string('payment_method', 50).defaultTo('bank_transfer');
          table.string('merchant_name', 150).nullable();
          table.text('description').nullable();
          table.string('project_cost_center', 100).nullable();
          table.specificType('receipt_url', 'LONGTEXT').nullable();
          table.string('status', 50).defaultTo('draft');
          table.string('submitted_by_role', 50).nullable(); // employee | team_lead | manager | hr | admin
          table.bigInteger('submitted_by_user_id').unsigned().nullable();
          table.bigInteger('current_approver_id').unsigned().nullable();
          table.string('current_approver_role', 100).nullable();
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
        });
      }

      // 4. Expense Claim Line Items Table
      const hasItems = await db.schema.hasTable('expense_claim_items');
      if (!hasItems) {
        await db.schema.createTable('expense_claim_items', (table) => {
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

      // Ensure MySQL receipt_url columns are LONGTEXT (supports up to 4GB base64 uploads)
      try {
        await db.raw('ALTER TABLE expense_claims MODIFY COLUMN receipt_url LONGTEXT NULL');
        await db.raw('ALTER TABLE expense_claim_items MODIFY COLUMN receipt_url LONGTEXT NULL');
      } catch (err) {
        // Safe to ignore if non-MySQL database engine or already LONGTEXT
      }

      try {
        const hasLevel = await db.schema.hasColumn('expense_claims', 'current_level');
        if (!hasLevel) {
          await db.schema.table('expense_claims', (t) => {
            t.integer('current_level').defaultTo(1);
            t.bigInteger('workflow_id').unsigned().nullable();
          });
        }
      } catch (err) {
        // Ignore if exists
      }

      // 5. Expense Approval Logs Table
      const hasLogs = await db.schema.hasTable('expense_approval_logs');
      if (!hasLogs) {
        await db.schema.createTable('expense_approval_logs', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('claim_id').unsigned().notNullable();
          table.bigInteger('approver_id').unsigned().nullable();
          table.string('approver_name', 150).notNullable();
          table.string('approver_role', 100).notNullable();
          table.string('action', 50).notNullable();
          table.text('comments').nullable();
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.index(['claim_id']);
        });
      }

      // 6. Travel Requests Table
      const hasTravel = await db.schema.hasTable('travel_requests');
      if (!hasTravel) {
        await db.schema.createTable('travel_requests', (table) => {
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
      const hasAdvances = await db.schema.hasTable('travel_advances');
      if (!hasAdvances) {
        await db.schema.createTable('travel_advances', (table) => {
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
          table.string('status', 50).defaultTo('pending_finance');
          table.timestamp('disbursed_at').nullable();
          table.timestamps(true, true);
          table.index(['organization_id']);
          table.index(['employee_id']);
          table.index(['status']);
        });
      }

      // 8. Mileage Claims Table
      const hasMileage = await db.schema.hasTable('mileage_claims');
      if (!hasMileage) {
        await db.schema.createTable('mileage_claims', (table) => {
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

      // 9. Expense Settings Table
      const hasSettings = await db.schema.hasTable('expense_settings');
      if (!hasSettings) {
        await db.schema.createTable('expense_settings', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('organization_id').unsigned().notNullable().unique();
          table.decimal('auto_approval_threshold', 15, 2).defaultTo(500.00);
          table.decimal('mileage_rate_car', 10, 2).defaultTo(12.00);
          table.decimal('mileage_rate_bike', 10, 2).defaultTo(6.00);
          table.boolean('require_manager_approval').defaultTo(true);
          table.boolean('require_finance_approval').defaultTo(true);
          table.boolean('multi_level_approval').defaultTo(true);
          table.boolean('enable_travel_module').defaultTo(true);
          table.boolean('enable_mileage_module').defaultTo(true);
          table.timestamp('updated_at').defaultTo(db.fn.now());
        });
      } else {
        const hasTravelCol = await db.schema.hasColumn('expense_settings', 'enable_travel_module').catch(() => false);
        if (!hasTravelCol) {
          await db.schema.table('expense_settings', (table) => {
            table.boolean('enable_travel_module').defaultTo(true);
          }).catch(() => null);
        }
        const hasMileageCol = await db.schema.hasColumn('expense_settings', 'enable_mileage_module').catch(() => false);
        if (!hasMileageCol) {
          await db.schema.table('expense_settings', (table) => {
            table.boolean('enable_mileage_module').defaultTo(true);
          }).catch(() => null);
        }
      }

      // 10. Expense Dynamic Workflows Table
      const hasWorkflows = await db.schema.hasTable('expense_workflows');
      if (!hasWorkflows) {
        await db.schema.createTable('expense_workflows', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('organization_id').unsigned().notNullable();
          table.string('name', 150).notNullable();
          table.text('description').nullable();
          table.decimal('min_amount', 15, 2).defaultTo(0);
          table.decimal('max_amount', 15, 2).defaultTo(10000000);
          table.bigInteger('department_id').unsigned().nullable();
          table.boolean('is_active').defaultTo(true);
          table.timestamps(true, true);
          table.index(['organization_id']);
        });
      }

      // 11. Expense Workflow Approval Levels Table
      const hasWorkflowLevels = await db.schema.hasTable('expense_workflow_levels');
      if (!hasWorkflowLevels) {
        await db.schema.createTable('expense_workflow_levels', (table) => {
          table.bigIncrements('id').primary();
          table.bigInteger('workflow_id').unsigned().notNullable();
          table.integer('level_order').notNullable().defaultTo(1);
          table.string('approver_type', 50).notNullable(); // reporting_manager, department_head, hr, ceo, role
          table.string('approver_role', 100).nullable();
          table.string('step_name', 100).notNullable();
          table.boolean('is_mandatory').defaultTo(true);
          table.timestamps(true, true);
          table.index(['workflow_id']);
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Expense DB schema and seed data:', error);
    }
  }

  private static async ensureMileageDesignationRatesTable(db: any): Promise<void> {
    const hasTable = await db.schema.hasTable('expense_mileage_designation_rates').catch(() => false);
    if (hasTable) return;
    await db.schema.createTable('expense_mileage_designation_rates', (table: any) => {
      table.bigIncrements('id').primary();
      table.bigInteger('organization_id').unsigned().notNullable();
      table.bigInteger('designation_id').unsigned().notNullable();
      table.decimal('rate_car', 10, 2).notNullable().defaultTo(12.0);
      table.decimal('rate_bike', 10, 2).notNullable().defaultTo(6.0);
      table.timestamps(true, true);
      table.unique(['organization_id', 'designation_id']);
      table.index(['organization_id']);
      table.index(['designation_id']);
    });
  }

  private static async ensureExpenseConfig(db: any): Promise<void> {
    // expense_settings: add configurable (non-hardcoded) columns with backfill defaults
    // identical to the literals they replace, so behaviour is unchanged until an admin edits them.
    const hasSettings = await db.schema.hasTable('expense_settings').catch(() => false);
    if (hasSettings) {
      const cols: Array<[string, (t: any) => void]> = [
        ['currency_symbol', (t) => t.string('currency_symbol', 8).notNullable().defaultTo('₹')],
        ['currency_code', (t) => t.string('currency_code', 8).notNullable().defaultTo('INR')],
        ['currency_locale', (t) => t.string('currency_locale', 20).notNullable().defaultTo('en-IN')],
        ['claim_number_prefix', (t) => t.string('claim_number_prefix', 10).notNullable().defaultTo('EXP')],
        ['travel_request_number_prefix', (t) => t.string('travel_request_number_prefix', 10).notNullable().defaultTo('TRV')],
        ['travel_advance_number_prefix', (t) => t.string('travel_advance_number_prefix', 10).notNullable().defaultTo('ADV')],
        ['default_payment_method', (t) => t.string('default_payment_method', 50).notNullable().defaultTo('bank_transfer')],
        ['default_advance_status', (t) => t.string('default_advance_status', 50).notNullable().defaultTo('pending_finance')],
        ['workflow_fallback_max_amount', (t) => t.decimal('workflow_fallback_max_amount', 15, 2).notNullable().defaultTo(10000000)],
        ['number_sequence_digits', (t) => t.integer('number_sequence_digits').notNullable().defaultTo(6)],
        ['workflows_seeded', (t) => t.boolean('workflows_seeded').notNullable().defaultTo(false)],
      ];
      for (const [name, build] of cols) {
        const exists = await db.schema.hasColumn('expense_settings', name).catch(() => false);
        if (!exists) {
          await db.schema.alterTable('expense_settings', (t: any) => build(t)).catch(() => null);
        }
      }
    }

    const hasSequences = await db.schema.hasTable('expense_number_sequences').catch(() => false);
    if (!hasSequences) {
      await db.schema.createTable('expense_number_sequences', (table: any) => {
        table.bigIncrements('id').primary();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('seq_key', 50).notNullable();
        table.string('prefix', 20).nullable();
        table.bigInteger('current_value').notNullable().defaultTo(0);
        table.timestamps(true, true);
        table.unique(['organization_id', 'seq_key']);
        table.index(['organization_id']);
      }).catch(() => null);
    }

    const hasLabels = await db.schema.hasTable('expense_config_labels').catch(() => false);
    if (!hasLabels) {
      await db.schema.createTable('expense_config_labels', (table: any) => {
        table.bigIncrements('id').primary();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.string('label_key', 100).notNullable();
        table.string('label_value', 255).notNullable();
        table.timestamps(true, true);
        table.unique(['organization_id', 'label_key']);
        table.index(['organization_id']);
      }).catch(() => null);
    }
  }

  private static async ensureTravelWorkflowColumns(db: any): Promise<void> {
    // travel_requests: add workflow tracking columns
    const hasTR = await db.schema.hasTable('travel_requests').catch(() => false);
    if (hasTR) {
      const hasTRLevel = await db.schema.hasColumn('travel_requests', 'current_level').catch(() => false);
      if (!hasTRLevel) {
        await db.schema.alterTable('travel_requests', (t: any) => {
          t.integer('current_level').defaultTo(1).nullable();
          t.string('current_approver_role', 100).nullable();
          t.bigInteger('workflow_id').unsigned().nullable();
        }).catch(() => null);
      }
      const hasTRRole = await db.schema.hasColumn('travel_requests', 'submitted_by_role').catch(() => false);
      if (!hasTRRole) {
        await db.schema.alterTable('travel_requests', (t: any) => {
          t.string('submitted_by_role', 50).nullable(); // employee | team_lead | manager | hr | admin
        }).catch(() => null);
      }
      const hasTRNotes = await db.schema.hasColumn('travel_requests', 'rejection_reason').catch(() => false);
      if (!hasTRNotes) {
        await db.schema.alterTable('travel_requests', (t: any) => {
          t.text('rejection_reason').nullable();
        }).catch(() => null);
      }
    }
    // travel_advances: add finance approval columns & migrate requested/pending rows
    const hasTA = await db.schema.hasTable('travel_advances').catch(() => false);
    if (hasTA) {
      const hasTARole = await db.schema.hasColumn('travel_advances', 'submitted_by_role').catch(() => false);
      if (!hasTARole) {
        await db.schema.alterTable('travel_advances', (t: any) => {
          t.string('submitted_by_role', 50).nullable();
          t.bigInteger('finance_approver_id').unsigned().nullable();
          t.text('finance_notes').nullable();
          t.text('rejection_reason').nullable();
          t.timestamp('finance_approved_at').nullable();
        }).catch(() => null);
      }
      // Migrate any advances stuck in 'requested' or 'pending' to 'pending_finance' with approved_amount=0
      await db('travel_advances')
        .whereIn('status', ['requested', 'pending'])
        .update({
          status: 'pending_finance',
          approved_amount: 0,
          balance_amount: 0
        })
        .catch(() => null);
    }
  }

  private static async ensureSubmitterColumns(db: any): Promise<void> {
    const tables = ['expense_claims', 'travel_requests', 'travel_advances', 'mileage_claims'];
    for (const tableName of tables) {
      const hasTable = await db.schema.hasTable(tableName).catch(() => false);
      if (!hasTable) continue;
      const hasSubmitter = await db.schema.hasColumn(tableName, 'submitted_by_user_id').catch(() => false);
      if (!hasSubmitter) {
        await db.schema.alterTable(tableName, (table: any) => {
          table.bigInteger('submitted_by_user_id').unsigned().nullable();
        }).catch(() => null);
      }
      // Ensure submitted_by_role column exists on all tables
      const hasSubmittedByRole = await db.schema.hasColumn(tableName, 'submitted_by_role').catch(() => false);
      if (!hasSubmittedByRole) {
        await db.schema.alterTable(tableName, (table: any) => {
          table.string('submitted_by_role', 50).nullable();
        }).catch(() => null);
      }
      // Ensure workflow columns exist on workflow tables (expense_claims, travel_requests, mileage_claims)
      if (['expense_claims', 'travel_requests', 'mileage_claims'].includes(tableName)) {
        const hasCurrentLevel = await db.schema.hasColumn(tableName, 'current_level').catch(() => false);
        if (!hasCurrentLevel) {
          await db.schema.alterTable(tableName, (table: any) => {
            table.integer('current_level').defaultTo(1).nullable();
            table.string('current_approver_role', 100).nullable();
            table.bigInteger('workflow_id').unsigned().nullable();
          }).catch(() => null);
        }
      }
      try {
        await db.raw(`ALTER TABLE \`${tableName}\` MODIFY COLUMN employee_id BIGINT UNSIGNED NULL`);
      } catch {
        // ignore if already nullable or engine mismatch
      }
    }

    // Auto-fix legacy claims submitted by Admin / CEO / HR stuck in pending_level_1
    try {
      const adminUsers = await db('users')
        .where('organization_id', organizationId)
        .where(function (this: any) {
          this.whereRaw("LOWER(role) LIKE '%admin%'")
            .orWhereRaw("LOWER(role) LIKE '%ceo%'")
            .orWhereRaw("LOWER(role) LIKE '%super%'");
        })
        .select('id')
        .catch(() => []);
      const adminUserIds = (adminUsers || []).map((u: any) => Number(u.id)).filter(Boolean);

      const tablesToMigrate = ['mileage_claims', 'expense_claims', 'travel_requests'];
      for (const t of tablesToMigrate) {
        await db(t)
          .where('organization_id', organizationId)
          .where(function (this: any) {
            this.whereIn('submitted_by_role', ['admin', 'ceo', 'organization_admin', 'super_admin', 'hr'])
              .orWhereIn('submitted_by_user_id', adminUserIds.length ? adminUserIds : [0]);
          })
          .whereIn('status', ['pending_level_1', 'pending', 'submitted'])
          .update({
            submitted_by_role: 'admin',
            status: 'pending_finance',
            current_level: 3,
            current_approver_role: 'Finance Verification'
          }).catch(() => null);
      }
    } catch { /* ignore */ }
  }


  private static async deactivateDuplicateCategories(db: any, organizationId: number): Promise<void> {
    try {
      const rows = await db('expense_categories')
        .where('organization_id', organizationId)
        .select('id', 'code')
        .orderBy('id', 'asc');
      const seen = new Set<string>();
      const duplicateIds: number[] = [];
      for (const row of rows) {
        const key = String(row.code || '').trim().toUpperCase();
        if (!key) continue;
        if (seen.has(key)) duplicateIds.push(row.id);
        else seen.add(key);
      }
      if (duplicateIds.length > 0) {
        await db('expense_categories')
          .whereIn('id', duplicateIds)
          .update({ is_active: false, updated_at: new Date() });
      }
    } catch (err) {
      console.error('Failed to deactivate duplicate expense categories:', err);
    }
  }

  public static async seedDefaultCategories(db: any, organizationId: number): Promise<void> {
    try {
      const existing = await db('expense_categories')
        .where('organization_id', organizationId)
        .first()
        .catch(() => null);

      if (existing) return;

      const defaults = [
        { name: 'Travel & Lodging', code: 'TRAVEL', description: 'Flight, train, hotel, and accommodation expenses', spending_limit: 50000, is_receipt_mandatory: true, min_amount_for_receipt: 500, auto_approval_threshold: 1000 },
        { name: 'Meals & Food', code: 'MEALS', description: 'Business meals, food, and dining out expenses', spending_limit: 5000, is_receipt_mandatory: true, min_amount_for_receipt: 200, auto_approval_threshold: 500 },
        { name: 'Fuel & Local Conveyance', code: 'CONVEYANCE', description: 'Cab, auto, bus, fuel, and local transport', spending_limit: 10000, is_receipt_mandatory: false, min_amount_for_receipt: 500, auto_approval_threshold: 500 },
        { name: 'Office Supplies & Stationery', code: 'SUPPLIES', description: 'Paper, pens, toner, and small office consumables', spending_limit: 15000, is_receipt_mandatory: true, min_amount_for_receipt: 500, auto_approval_threshold: 1000 },
        { name: 'Telephone & Internet', code: 'COMMUNICATION', description: 'Mobile recharge, broadband, and phone bill claims', spending_limit: 3000, is_receipt_mandatory: true, min_amount_for_receipt: 100, auto_approval_threshold: 500 },
        { name: 'Client Entertainment', code: 'ENTERTAINMENT', description: 'Hosting clients, meeting refreshments, and events', spending_limit: 20000, is_receipt_mandatory: true, min_amount_for_receipt: 500, auto_approval_threshold: 0 },
        { name: 'Training & Certification', code: 'TRAINING', description: 'Courses, exams, books, and skill development', spending_limit: 30000, is_receipt_mandatory: true, min_amount_for_receipt: 1000, auto_approval_threshold: 0 },
        { name: 'Medical Expenses', code: 'MEDICAL', description: 'Emergency medical reimbursements and health checks', spending_limit: 25000, is_receipt_mandatory: true, min_amount_for_receipt: 500, auto_approval_threshold: 0 },
        { name: 'Miscellaneous', code: 'MISC', description: 'Other general business expenses not categorized elsewhere', spending_limit: 5000, is_receipt_mandatory: false, min_amount_for_receipt: 500, auto_approval_threshold: 500 },
      ];

      const now = new Date();
      const rows = defaults.map((d) => ({
        organization_id: organizationId,
        ...d,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

      await db('expense_categories').insert(rows).catch((err: any) => {
        console.error('Failed to seed default categories:', err);
      });
    } catch (err) {
      console.error('Error seeding default categories:', err);
    }
  }
}
