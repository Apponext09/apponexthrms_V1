const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedExpenseData() {
  console.log('\n======================================================');
  console.log('🌱 STARTING EXPENSE MODULE SEED EXECUTION');
  console.log('======================================================\n');

  const dbName = process.env.DB_NAME || 'apponexthrms';

  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      charset: 'utf8mb4',
    },
  });

  try {
    // Determine target organization ID
    let org = await db('organizations').first();
    const orgId = org ? org.id : 8;
    console.log(`🏢 Seeding Expense Data for Organization ID: ${orgId}`);

    // Determine target employee ID or user ID
    let emp = await db('employees').where('organization_id', orgId).first();
    let empId = emp ? emp.id : 1;

    let user = await db('users').where('organization_id', orgId).first();
    let userId = user ? user.id : 1;

    // ----------------------------------------------------------------------
    // 1. EXPENSE CATEGORIES SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Expense Categories...');
    const hasCatTable = await db.schema.hasTable('expense_categories');
    if (!hasCatTable) {
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

    const categoriesData = [
      { name: 'Travel', code: 'TRAVEL', description: 'Flight, train, cabs and intercity travel expenses', spending_limit: 50000.00, is_receipt_mandatory: true, min_amount_for_receipt: 500.00, auto_approval_threshold: 500.00 },
      { name: 'Food & Dining', code: 'FOOD', description: 'Client entertainment, team lunches, and meals during business trips', spending_limit: 5000.00, is_receipt_mandatory: true, min_amount_for_receipt: 300.00, auto_approval_threshold: 300.00 },
      { name: 'Hotel & Lodging', code: 'HOTEL', description: 'Accommodation and hotel stay during official business trips', spending_limit: 30000.00, is_receipt_mandatory: true, min_amount_for_receipt: 1000.00, auto_approval_threshold: 0.00 },
      { name: 'Fuel', code: 'FUEL', description: 'Fuel reimbursements for official field visits', spending_limit: 8000.00, is_receipt_mandatory: true, min_amount_for_receipt: 500.00, auto_approval_threshold: 500.00 },
      { name: 'WFH Broadband & Mobile', code: 'INTERNET', description: 'Work-from-home internet allowances & Broadband/Mobile bills', spending_limit: 2500.00, is_receipt_mandatory: true, min_amount_for_receipt: 200.00, auto_approval_threshold: 500.00 },
      { name: 'Office Supplies', code: 'OFFICE_SUPPLIES', description: 'Stationery, hardware accessories, and office equipment', spending_limit: 15000.00, is_receipt_mandatory: true, min_amount_for_receipt: 500.00, auto_approval_threshold: 500.00 },
      { name: 'Certifications & Training', code: 'TRAINING', description: 'Professional certifications, courses, and workshops', spending_limit: 25000.00, is_receipt_mandatory: true, min_amount_for_receipt: 1000.00, auto_approval_threshold: 0.00 },
    ];

    const categoryMap = new Map();
    for (const cat of categoriesData) {
      let existing = await db('expense_categories')
        .where('organization_id', orgId)
        .where('code', cat.code)
        .first();

      if (!existing) {
        const [insertedId] = await db('expense_categories').insert({
          organization_id: orgId,
          name: cat.name,
          code: cat.code,
          description: cat.description,
          spending_limit: cat.spending_limit,
          is_receipt_mandatory: cat.is_receipt_mandatory,
          min_amount_for_receipt: cat.min_amount_for_receipt,
          auto_approval_threshold: cat.auto_approval_threshold,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        categoryMap.set(cat.code, insertedId);
        console.log(`  └─ Created Category: ${cat.name} (${cat.code})`);
      } else {
        categoryMap.set(cat.code, existing.id);
        console.log(`  └─ Category Exists: ${cat.name} (ID: ${existing.id})`);
      }
    }

    // ----------------------------------------------------------------------
    // 2. EXPENSE POLICIES SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Expense Policies...');
    const hasPolTable = await db.schema.hasTable('expense_policies');
    if (!hasPolTable) {
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
      });
    }

    const defaultPolicies = [
      {
        policy_name: 'Standard Employee Expense Limit Policy',
        grade: 'All',
        designation: 'All',
        location: 'All',
        max_limit_per_claim: 25000.00,
        max_limit_per_month: 75000.00,
        require_receipt_above: 500.00,
        allow_exception: true,
      },
      {
        policy_name: 'Executive Leadership Travel Policy',
        grade: 'CXO/VP',
        designation: 'Director',
        location: 'All',
        max_limit_per_claim: 100000.00,
        max_limit_per_month: 300000.00,
        require_receipt_above: 1000.00,
        allow_exception: true,
      }
    ];

    for (const pol of defaultPolicies) {
      const existingPol = await db('expense_policies')
        .where('organization_id', orgId)
        .where('policy_name', pol.policy_name)
        .first();

      if (!existingPol) {
        await db('expense_policies').insert({
          organization_id: orgId,
          policy_name: pol.policy_name,
          category_id: null,
          grade: pol.grade,
          designation: pol.designation,
          department_id: null,
          location: pol.location,
          max_limit_per_claim: pol.max_limit_per_claim,
          max_limit_per_month: pol.max_limit_per_month,
          require_receipt_above: pol.require_receipt_above,
          allow_exception: pol.allow_exception,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`  └─ Created Policy: ${pol.policy_name}`);
      } else {
        console.log(`  └─ Policy Exists: ${pol.policy_name}`);
      }
    }

    // ----------------------------------------------------------------------
    // 3. TRAVEL REQUESTS & TRAVEL ADVANCES SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Travel Requests & Advances...');
    let tr1Id = null;
    let tr2Id = null;

    const hasTravel = await db.schema.hasTable('travel_requests');
    if (hasTravel) {
      const existingTr1 = await db('travel_requests').where('request_number', 'TR-2026-001').first();
      if (!existingTr1) {
        const [id1] = await db('travel_requests').insert({
          uuid: uuidv4(),
          request_number: 'TR-2026-001',
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          from_location: 'Bengaluru',
          to_location: 'New Delhi',
          purpose: 'Annual Enterprise HR Tech Summit',
          start_date: '2026-09-05',
          end_date: '2026-09-08',
          estimated_budget: 35000.00,
          status: 'approved',
          approver_notes: 'Approved by Management.',
          created_at: new Date(),
          updated_at: new Date(),
        });
        tr1Id = id1;
        console.log('  └─ Created Travel Request: TR-2026-001');
      } else {
        tr1Id = existingTr1.id;
        console.log(`  └─ Travel Request Exists: TR-2026-001 (ID: ${tr1Id})`);
      }

      const existingTr2 = await db('travel_requests').where('request_number', 'TR-2026-002').first();
      if (!existingTr2) {
        const [id2] = await db('travel_requests').insert({
          uuid: uuidv4(),
          request_number: 'TR-2026-002',
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          from_location: 'Pune',
          to_location: 'Hyderabad',
          purpose: 'Client Onboarding & Technical Workshop',
          start_date: '2026-09-12',
          end_date: '2026-09-14',
          estimated_budget: 22000.00,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        });
        tr2Id = id2;
        console.log('  └─ Created Travel Request: TR-2026-002');
      } else {
        tr2Id = existingTr2.id;
        console.log(`  └─ Travel Request Exists: TR-2026-002 (ID: ${tr2Id})`);
      }
    }

    const hasAdvances = await db.schema.hasTable('travel_advances');
    if (hasAdvances) {
      const existingAdv1 = await db('travel_advances').where('advance_number', 'ADV-2026-001').first();
      if (!existingAdv1) {
        await db('travel_advances').insert({
          uuid: uuidv4(),
          advance_number: 'ADV-2026-001',
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          travel_request_id: tr1Id,
          advance_amount: 15000.00,
          approved_amount: 15000.00,
          settled_amount: 0.00,
          balance_amount: 15000.00,
          purpose: 'Advance for flights & accommodation in Delhi',
          status: 'disbursed',
          disbursed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log('  └─ Created Travel Advance: ADV-2026-001');
      } else {
        console.log('  └─ Travel Advance Exists: ADV-2026-001');
      }

      const existingAdv2 = await db('travel_advances').where('advance_number', 'ADV-2026-002').first();
      if (!existingAdv2) {
        await db('travel_advances').insert({
          uuid: uuidv4(),
          advance_number: 'ADV-2026-002',
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          travel_request_id: tr2Id,
          advance_amount: 10000.00,
          approved_amount: 0.00,
          settled_amount: 0.00,
          balance_amount: 10000.00,
          purpose: 'Cab and meals advance for Hyderabad trip',
          status: 'requested',
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log('  └─ Created Travel Advance: ADV-2026-002');
      } else {
        console.log('  └─ Travel Advance Exists: ADV-2026-002');
      }
    }

    // Create missing expense tables if they don't exist
    console.log('📦 Creating expense tables if they don\'t exist...');
    const hasClaimsTable = await db.schema.hasTable('expense_claims');
    if (!hasClaimsTable) {
      await db.schema.createTable('expense_claims', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.string('claim_number', 50).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable();
        table.bigInteger('employee_id').unsigned().nullable();
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
        table.bigInteger('submitted_by_user_id').unsigned().nullable();
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
      console.log('  └─ Created expense_claims table');
    }

    const hasItemsTable = await db.schema.hasTable('expense_claim_items');
    if (!hasItemsTable) {
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
        table.string('receipt_file_name', 255).nullable();
        table.string('receipt_file_type', 50).nullable();
        table.integer('receipt_file_size').nullable();
        table.boolean('policy_validated').defaultTo(false);
        table.string('status', 50).defaultTo('pending');
        table.text('adjustment_reason').nullable();
        table.timestamps(true, true);
        table.foreign('claim_id').references('expense_claims.id').onDelete('CASCADE');
        table.index(['claim_id']);
      });
      console.log('  └─ Created expense_claim_items table');
    }

    const hasLogsTable = await db.schema.hasTable('expense_approval_logs');
    if (!hasLogsTable) {
      await db.schema.createTable('expense_approval_logs', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('claim_id').unsigned().notNullable();
        table.bigInteger('approver_id').unsigned().nullable();
        table.string('approver_name', 150).nullable();
        table.string('approver_role', 100).nullable();
        table.string('action', 50).notNullable();
        table.text('comments').nullable();
        table.timestamps(true, true);
        table.foreign('claim_id').references('expense_claims.id').onDelete('CASCADE');
        table.index(['claim_id']);
      });
      console.log('  └─ Created expense_approval_logs table');
    }

    // ----------------------------------------------------------------------
    // 4. EXPENSE CLAIMS & LINE ITEMS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Expense Claims & Line Items...');

    const claimsSeed = [
      {
        claim_number: 'EXP-2026-001',
        title: 'Client Onboarding Visit to Mumbai',
        category_code: 'TRAVEL',
        claim_date: '2026-08-15',
        total_claimed_amount: 14500.00,
        total_approved_amount: 14500.00,
        total_rejected_amount: 0.00,
        payment_method: 'bank_transfer',
        merchant_name: 'IndiGo Airlines & Taj',
        description: 'Flight tickets and 1 night accommodation for client kickoff meeting in Mumbai.',
        project_cost_center: 'COST-MUM-01',
        status: 'approved',
        submitted_at: '2026-08-16 10:00:00',
        approved_at: '2026-08-17 14:30:00',
        reimbursed_at: null,
        paid_amount: 0.00,
        payment_reference: null,
        items: [
          {
            category_code: 'TRAVEL',
            expense_date: '2026-08-14',
            claimed_amount: 8500.00,
            approved_amount: 8500.00,
            rejected_amount: 0.00,
            merchant_name: 'IndiGo Airlines',
            description: 'Flight ticket BLR -> BOM',
            receipt_file_name: 'indigo_flight_ticket.pdf',
            receipt_file_type: 'application/pdf',
            status: 'approved',
          },
          {
            category_code: 'HOTEL',
            expense_date: '2026-08-15',
            claimed_amount: 6000.00,
            approved_amount: 6000.00,
            rejected_amount: 0.00,
            merchant_name: 'Taj Santacruz',
            description: '1 Night Executive Deluxe Room stay',
            receipt_file_name: 'taj_hotel_invoice.pdf',
            receipt_file_type: 'application/pdf',
            status: 'approved',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-002',
        title: 'Q3 Team Dinner & Client Meeting',
        category_code: 'FOOD',
        claim_date: '2026-08-22',
        total_claimed_amount: 4200.00,
        total_approved_amount: 0.00,
        total_rejected_amount: 0.00,
        payment_method: 'payroll',
        merchant_name: 'Mainland China',
        description: 'Client dinner meeting with Acmee Corp representatives.',
        project_cost_center: 'COST-SALES-Q3',
        status: 'submitted',
        submitted_at: '2026-08-23 11:15:00',
        approved_at: null,
        reimbursed_at: null,
        paid_amount: 0.00,
        payment_reference: null,
        items: [
          {
            category_code: 'FOOD',
            expense_date: '2026-08-22',
            claimed_amount: 4200.00,
            approved_amount: 0.00,
            rejected_amount: 0.00,
            merchant_name: 'Mainland China',
            description: 'Dinner invoice for 4 attendees',
            receipt_file_name: 'mainland_china_bill.jpg',
            receipt_file_type: 'image/jpeg',
            status: 'pending',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-003',
        title: 'Monthly Internet & Mobile Allowance',
        category_code: 'INTERNET',
        claim_date: '2026-08-01',
        total_claimed_amount: 2299.00,
        total_approved_amount: 2299.00,
        total_rejected_amount: 0.00,
        payment_method: 'payroll',
        merchant_name: 'Airtel Broadband & Jio',
        description: 'Work-from-home broadband and official mobile reimbursement for July 2026.',
        project_cost_center: 'COST-GEN-01',
        status: 'reimbursed',
        submitted_at: '2026-08-02 09:30:00',
        approved_at: '2026-08-03 16:00:00',
        reimbursed_at: '2026-08-28 12:00:00',
        paid_amount: 2299.00,
        payment_reference: 'TXN984210',
        items: [
          {
            category_code: 'INTERNET',
            expense_date: '2026-08-01',
            claimed_amount: 1499.00,
            approved_amount: 1499.00,
            rejected_amount: 0.00,
            merchant_name: 'Airtel Broadband',
            description: 'Home Fiber Broadband 200Mbps Monthly Bill',
            receipt_file_name: 'airtel_broadband_july.pdf',
            receipt_file_type: 'application/pdf',
            status: 'approved',
          },
          {
            category_code: 'INTERNET',
            expense_date: '2026-08-01',
            claimed_amount: 800.00,
            approved_amount: 800.00,
            rejected_amount: 0.00,
            merchant_name: 'Jio Postpaid',
            description: 'Postpaid Corporate SIM Line',
            receipt_file_name: 'jio_postpaid_bill.pdf',
            receipt_file_type: 'application/pdf',
            status: 'approved',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-004',
        title: 'AWS Cloud Architect Certification Exam',
        category_code: 'TRAINING',
        claim_date: '2026-08-28',
        total_claimed_amount: 12500.00,
        total_approved_amount: 0.00,
        total_rejected_amount: 0.00,
        payment_method: 'bank_transfer',
        merchant_name: 'Amazon Web Services',
        description: 'AWS Certified Solutions Architect Associate exam registration fee.',
        project_cost_center: 'COST-DEV-01',
        status: 'draft',
        submitted_at: null,
        approved_at: null,
        reimbursed_at: null,
        paid_amount: 0.00,
        payment_reference: null,
        items: [
          {
            category_code: 'TRAINING',
            expense_date: '2026-08-28',
            claimed_amount: 12500.00,
            approved_amount: 0.00,
            rejected_amount: 0.00,
            merchant_name: 'Amazon Web Services',
            description: 'Exam Registration Fee',
            receipt_file_name: 'aws_exam_receipt.pdf',
            receipt_file_type: 'application/pdf',
            status: 'pending',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-005',
        title: 'Outstation Taxi Fare',
        category_code: 'TRAVEL',
        claim_date: '2026-08-10',
        total_claimed_amount: 3800.00,
        total_approved_amount: 0.00,
        total_rejected_amount: 3800.00,
        payment_method: 'bank_transfer',
        merchant_name: 'Uber Intercity',
        description: 'Intercity cab for emergency client visit.',
        project_cost_center: 'COST-SALES-01',
        status: 'rejected',
        rejection_reason: 'Missing itemized tax invoice receipt and pre-approval for intercity travel.',
        submitted_at: '2026-08-11 14:00:00',
        approved_at: null,
        reimbursed_at: null,
        paid_amount: 0.00,
        payment_reference: null,
        items: [
          {
            category_code: 'TRAVEL',
            expense_date: '2026-08-10',
            claimed_amount: 3800.00,
            approved_amount: 0.00,
            rejected_amount: 3800.00,
            merchant_name: 'Uber Intercity',
            description: 'Uber Intercity Ride',
            receipt_file_name: 'uber_cab_receipt.png',
            receipt_file_type: 'image/png',
            status: 'rejected',
            adjustment_reason: 'Unsubstantiated expense without GST invoice.',
          }
        ]
      }
    ];

    for (const cData of claimsSeed) {
      let existingClaim = await db('expense_claims')
        .where('organization_id', orgId)
        .where('claim_number', cData.claim_number)
        .first();

      let claimId;
      const catId = categoryMap.get(cData.category_code) || null;

      if (!existingClaim) {
        const [newId] = await db('expense_claims').insert({
          uuid: uuidv4(),
          claim_number: cData.claim_number,
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          title: cData.title,
          category_id: catId,
          claim_date: cData.claim_date,
          total_claimed_amount: cData.total_claimed_amount,
          total_approved_amount: cData.total_approved_amount,
          total_rejected_amount: cData.total_rejected_amount,
          payment_method: cData.payment_method,
          merchant_name: cData.merchant_name,
          description: cData.description,
          project_cost_center: cData.project_cost_center,
          receipt_url: null,
          status: cData.status,
          rejection_reason: cData.rejection_reason || null,
          submitted_at: cData.submitted_at ? new Date(cData.submitted_at) : null,
          approved_at: cData.approved_at ? new Date(cData.approved_at) : null,
          reimbursed_at: cData.reimbursed_at ? new Date(cData.reimbursed_at) : null,
          paid_amount: cData.paid_amount,
          payment_reference: cData.payment_reference,
          created_at: new Date(),
          updated_at: new Date(),
        });
        claimId = newId;
        console.log(`  └─ Created Claim: ${cData.claim_number} - ${cData.title} (Status: ${cData.status})`);
      } else {
        claimId = existingClaim.id;
        console.log(`  └─ Claim Exists: ${cData.claim_number} (ID: ${claimId})`);
      }

      // Seed line items for this claim
      for (const item of cData.items) {
        const itemCatId = categoryMap.get(item.category_code) || catId;
        const existingItem = await db('expense_claim_items')
          .where('claim_id', claimId)
          .where('merchant_name', item.merchant_name)
          .first();

        if (!existingItem) {
          await db('expense_claim_items').insert({
            claim_id: claimId,
            category_id: itemCatId,
            expense_date: item.expense_date,
            claimed_amount: item.claimed_amount,
            approved_amount: item.approved_amount,
            rejected_amount: item.rejected_amount,
            merchant_name: item.merchant_name,
            description: item.description,
            receipt_file_name: item.receipt_file_name,
            receipt_file_type: item.receipt_file_type,
            receipt_file_size: 102450,
            policy_validated: item.status !== 'rejected',
            status: item.status,
            adjustment_reason: item.adjustment_reason || null,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      // Seed Approval log entry if approved or rejected
      if (cData.status === 'approved' || cData.status === 'rejected') {
        const existingLog = await db('expense_approval_logs').where('claim_id', claimId).first();
        if (!existingLog) {
          await db('expense_approval_logs').insert({
            claim_id: claimId,
            approver_id: userId,
            approver_name: 'Abhishek Sharma',
            approver_role: 'Reporting Manager / HR Admin',
            action: cData.status === 'approved' ? 'approve' : 'reject',
            comments: cData.status === 'approved' ? 'Claim verified and approved for payout.' : cData.rejection_reason,
            created_at: new Date(),
          });
        }
      }
    }

    // ----------------------------------------------------------------------
    // 5. MILEAGE CLAIMS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Mileage Claims...');
    const hasMileage = await db.schema.hasTable('mileage_claims');
    if (hasMileage) {
      const mileageSeed = [
        {
          trip_date: '2026-08-20',
          from_location: 'Office (BOM HQ)',
          to_location: 'Hinjewadi Phase 3 Client Site',
          vehicle_type: 'car',
          distance_km: 45.00,
          rate_per_km: 12.00,
          calculated_amount: 540.00,
          purpose: 'Onsite client server setup & architecture inspection',
          status: 'approved',
        },
        {
          trip_date: '2026-08-24',
          from_location: 'Branch Office',
          to_location: 'Regional Hub',
          vehicle_type: 'bike',
          distance_km: 28.00,
          rate_per_km: 6.00,
          calculated_amount: 168.00,
          purpose: 'Document dispatch & physical audit verification',
          status: 'pending',
        }
      ];

      for (const m of mileageSeed) {
        const existingMil = await db('mileage_claims')
          .where('organization_id', orgId)
          .where('trip_date', m.trip_date)
          .where('from_location', m.from_location)
          .first();

        if (!existingMil) {
          await db('mileage_claims').insert({
            uuid: uuidv4(),
            organization_id: orgId,
            employee_id: empId,
            submitted_by_user_id: userId,
            trip_date: m.trip_date,
            from_location: m.from_location,
            to_location: m.to_location,
            vehicle_type: m.vehicle_type,
            distance_km: m.distance_km,
            rate_per_km: m.rate_per_km,
            calculated_amount: m.calculated_amount,
            purpose: m.purpose,
            status: m.status,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`  └─ Created Mileage Claim: ${m.from_location} -> ${m.to_location} (${m.distance_km} km)`);
        } else {
          console.log(`  └─ Mileage Claim Exists: ${m.from_location} -> ${m.to_location}`);
        }
      }
    }

    // ----------------------------------------------------------------------
    // 6. EXPENSE SETTINGS SEEDING
    // ----------------------------------------------------------------------
    console.log('📦 Seeding Expense Module Settings...');
    const hasSettings = await db.schema.hasTable('expense_settings');
    if (hasSettings) {
      const existingSettings = await db('expense_settings').where('organization_id', orgId).first();
      if (!existingSettings) {
        await db('expense_settings').insert({
          organization_id: orgId,
          auto_approval_threshold: 500.00,
          mileage_rate_car: 12.00,
          mileage_rate_bike: 6.00,
          require_manager_approval: true,
          require_finance_approval: true,
          multi_level_approval: true,
          enable_travel_module: true,
          enable_mileage_module: true,
          updated_at: new Date(),
        });
        console.log('  └─ Expense settings seeded successfully.');
      } else {
        console.log('  └─ Expense settings exist.');
      }
    }

    console.log('\n======================================================');
    console.log('🎉 EXPENSE MODULE SEED COMPLETED SUCCESSFULLY!');
    console.log('======================================================\n');
    await db.destroy();
  } catch (error) {
    console.error('❌ Expense Seed Failed:', error);
    process.exit(1);
  }
}

seedExpenseData().then(() => process.exit(0));
