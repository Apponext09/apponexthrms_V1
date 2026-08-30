import { getKnex } from '../../../db/knex';

export class ExpenseDbService {
  private static isInitialized = false;

  public static async ensureTablesAndSeed(organizationId: number = 1): Promise<void> {
    try {
      const db = getKnex();

      const hasCategoriesTable = await db.schema.hasTable('expense_categories');
      if (hasCategoriesTable) {
        const hasAutoCol = await db.schema.hasColumn('expense_categories', 'auto_approval_threshold').catch(() => false);
        if (!hasAutoCol) {
          await db.schema.alterTable('expense_categories', (table) => {
            table.decimal('auto_approval_threshold', 15, 2).defaultTo(0);
          });
        }
        await this.deactivateDuplicateCategories(db, organizationId);
      }

      if (this.isInitialized) {
        await this.seedOrgDefaults(db, organizationId);
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
          table.string('status', 50).defaultTo('requested');
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

      await this.seedOrgDefaults(db, organizationId);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Expense DB schema and seed data:', error);
    }
  }

  private static async seedOrgDefaults(db: any, organizationId: number): Promise<void> {
    const existingCodes = new Set(
      (await db('expense_categories').where('organization_id', organizationId).select('code'))
        .map((r: any) => String(r.code || '').toUpperCase())
    );

    const defaultCategories = [
      { name: 'Travel', code: 'TRAVEL', description: 'Flight, train, cab and local travel expenses', spendingLimit: 50000, isReceiptMandatory: true, minAmountForReceipt: 500 },
      { name: 'Food', code: 'FOOD', description: 'Client entertainment, team lunches, and meals during business trips', spendingLimit: 5000, isReceiptMandatory: true, minAmountForReceipt: 300 },
      { name: 'Hotel', code: 'HOTEL', description: 'Accommodation during official business trips', spendingLimit: 30000, isReceiptMandatory: true, minAmountForReceipt: 1000 },
      { name: 'Fuel', code: 'FUEL', description: 'Fuel reimbursements for official field visits', spendingLimit: 8000, isReceiptMandatory: true, minAmountForReceipt: 500 },
      { name: 'Mobile Bill', code: 'MOBILE', description: 'Official mobile & communication bill reimbursements', spendingLimit: 2000, isReceiptMandatory: true, minAmountForReceipt: 200 },
      { name: 'Internet', code: 'INTERNET', description: 'Work-from-home internet allowances & Broadband bills', spendingLimit: 2500, isReceiptMandatory: true, minAmountForReceipt: 500 },
      { name: 'Training', code: 'TRAINING', description: 'Professional certifications, courses, and workshops', spendingLimit: 25000, isReceiptMandatory: true, minAmountForReceipt: 1000 },
      { name: 'Parking', code: 'PARKING', description: 'Official parking tickets & toll charges', spendingLimit: 2000, isReceiptMandatory: false, minAmountForReceipt: 200 },
      { name: 'Office Purchase', code: 'OFFICE_SUPPLIES', description: 'Stationery, hardware accessories, and office supplies', spendingLimit: 15000, isReceiptMandatory: true, minAmountForReceipt: 500 },
      { name: 'Other', code: 'OTHER', description: 'Miscellaneous work-related expense claims', spendingLimit: 10000, isReceiptMandatory: true, minAmountForReceipt: 500 }
    ];

    for (const cat of defaultCategories) {
      if (existingCodes.has(cat.code)) continue;
      await db('expense_categories').insert({
        organization_id: organizationId,
        name: cat.name,
        code: cat.code,
        description: cat.description,
        spending_limit: cat.spendingLimit,
        is_receipt_mandatory: cat.isReceiptMandatory,
        min_amount_for_receipt: cat.minAmountForReceipt,
        auto_approval_threshold: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      existingCodes.add(cat.code);
    }

    const existingSettings = await db('expense_settings').where('organization_id', organizationId).first();
    if (!existingSettings) {
      await db('expense_settings').insert({
        organization_id: organizationId,
        auto_approval_threshold: 500.00,
        mileage_rate_car: 12.00,
        mileage_rate_bike: 6.00,
        require_manager_approval: true,
        require_finance_approval: true,
        multi_level_approval: true,
        updated_at: new Date()
      });
    }

    const policyCount = await db('expense_policies').where('organization_id', organizationId).count({ count: '*' }).first();
    const pCount = policyCount ? Number(policyCount.count || (policyCount as any)['count(*)'] || 0) : 0;
    if (pCount === 0) {
      await db('expense_policies').insert({
        organization_id: organizationId,
        policy_name: 'Standard Employee Expense Limit Policy',
        category_id: null,
        grade: 'All',
        designation: 'All',
        department_id: null,
        location: 'All',
        max_limit_per_claim: 25000.00,
        max_limit_per_month: 75000.00,
        require_receipt_above: 500.00,
        allow_exception: true,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    const wfCount = await db('expense_workflows').where('organization_id', organizationId).count({ count: '*' }).first();
    const wCount = wfCount ? Number(wfCount.count || (wfCount as any)['count(*)'] || 0) : 0;
    if (wCount === 0) {
      const [wfId] = await db('expense_workflows').insert({
        organization_id: organizationId,
        name: 'Standard HRMS Expense Approval Workflow',
        description: 'Default 2-stage approval: Reporting Manager then Finance Verification',
        min_amount: 0,
        max_amount: 10000000,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      await db('expense_workflow_levels').insert([
        {
          workflow_id: wfId,
          level_order: 1,
          approver_type: 'reporting_manager',
          approver_role: 'Reporting Manager',
          step_name: 'Manager Approval',
          is_mandatory: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          workflow_id: wfId,
          level_order: 2,
          approver_type: 'hr',
          approver_role: 'Finance / HR Officer',
          step_name: 'Finance Verification',
          is_mandatory: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }
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
}
