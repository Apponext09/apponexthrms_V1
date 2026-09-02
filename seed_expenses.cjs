const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: '../.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'apponexthrms',
    charset: 'utf8mb4',
  },
});

async function seedExpenseData() {
  console.log('\n======================================================');
  console.log('💰 SEEDING EXPENSE CLAIMS & LINE ITEMS');
  console.log('======================================================\n');

  try {
    const orgId = 8;
    const userId = 1;

    // Get employee
    const emp = await db('employees').where('organization_id', orgId).first();
    const empId = emp ? emp.id : 1;

    // Get categories
    const categories = await db('expense_categories')
      .where('organization_id', orgId)
      .select('id', 'code', 'name');

    console.log(`Found ${categories.length} expense categories\n`);

    // Map category codes to IDs
    const catMap = {};
    categories.forEach(cat => {
      catMap[cat.code] = cat.id;
    });

    console.log('📦 Seeding Expense Claims...\n');

    const claimsData = [
      {
        claim_number: 'EXP-2026-006',
        title: 'Q3 Training Workshop - AWS Certification',
        category_code: 'TRAINING',
        claim_date: '2026-08-20',
        total_claimed: 18000.00,
        total_approved: 18000.00,
        status: 'approved',
        payment_method: 'bank_transfer',
        merchant_name: 'AWS Training Center',
        description: 'AWS Solutions Architect certification course and exam',
        items: [
          {
            category_code: 'TRAINING',
            expense_date: '2026-08-18',
            claimed_amount: 12000.00,
            merchant_name: 'AWS Training',
            description: '3-day training course',
            receipt_file_name: 'aws_training_receipt.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'TRAINING',
            expense_date: '2026-08-20',
            claimed_amount: 6000.00,
            merchant_name: 'AWS Exam Center',
            description: 'Certification exam fee',
            receipt_file_name: 'aws_exam_invoice.pdf',
            receipt_file_type: 'application/pdf',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-007',
        title: 'Team Offsite - Goa Resort',
        category_code: 'HOTEL',
        claim_date: '2026-08-22',
        total_claimed: 45000.00,
        total_approved: 40000.00,
        status: 'approved',
        payment_method: 'bank_transfer',
        merchant_name: 'Taj Exotica Resort',
        description: '2-night team building offsite at Goa',
        items: [
          {
            category_code: 'HOTEL',
            expense_date: '2026-08-21',
            claimed_amount: 25000.00,
            merchant_name: 'Taj Exotica',
            description: '2 nights deluxe rooms (2 rooms)',
            receipt_file_name: 'taj_goa_hotel_bill.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'FOOD',
            expense_date: '2026-08-21',
            claimed_amount: 12000.00,
            merchant_name: 'Taj Exotica',
            description: 'Team meals and refreshments',
            receipt_file_name: 'taj_goa_food_bill.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'TRAVEL',
            expense_date: '2026-08-21',
            claimed_amount: 8000.00,
            merchant_name: 'Uber',
            description: 'Airport transfers for team (4 trips)',
            receipt_file_name: 'uber_goa_receipt.jpg',
            receipt_file_type: 'image/jpeg',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-008',
        title: 'Monthly Software Licenses',
        category_code: 'OFFICE_SUPPLIES',
        claim_date: '2026-08-25',
        total_claimed: 8500.00,
        total_approved: 8500.00,
        status: 'reimbursed',
        payment_method: 'payroll',
        merchant_name: 'JetBrains',
        description: 'IDE licenses for development team',
        items: [
          {
            category_code: 'OFFICE_SUPPLIES',
            expense_date: '2026-08-01',
            claimed_amount: 5500.00,
            merchant_name: 'JetBrains',
            description: 'IntelliJ IDEA Professional x2 seats',
            receipt_file_name: 'jetbrains_license.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'OFFICE_SUPPLIES',
            expense_date: '2026-08-01',
            claimed_amount: 3000.00,
            merchant_name: 'GitHub',
            description: 'GitHub Enterprise team license',
            receipt_file_name: 'github_invoice.pdf',
            receipt_file_type: 'application/pdf',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-009',
        title: 'Client Dinner Meeting - Acmee Corp',
        category_code: 'FOOD',
        claim_date: '2026-08-28',
        total_claimed: 5800.00,
        total_approved: 0,
        status: 'submitted',
        payment_method: 'payroll',
        merchant_name: 'Leela Palace',
        description: 'Business dinner with client stakeholders',
        items: [
          {
            category_code: 'FOOD',
            expense_date: '2026-08-27',
            claimed_amount: 5800.00,
            merchant_name: 'Leela Palace',
            description: 'Dinner for 6 people (client meeting)',
            receipt_file_name: 'leela_palace_receipt.jpg',
            receipt_file_type: 'image/jpeg',
          }
        ]
      },
      {
        claim_number: 'EXP-2026-010',
        title: 'Field Visit - Client Site Bangalore',
        category_code: 'TRAVEL',
        claim_date: '2026-08-29',
        total_claimed: 22500.00,
        total_approved: 22500.00,
        status: 'approved',
        payment_method: 'bank_transfer',
        merchant_name: 'Various',
        description: '2-day field visit for technical audit',
        items: [
          {
            category_code: 'TRAVEL',
            expense_date: '2026-08-28',
            claimed_amount: 8500.00,
            merchant_name: 'Indigo Airlines',
            description: 'Flight tickets - Pune to Bangalore (round trip)',
            receipt_file_name: 'indigo_flight.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'HOTEL',
            expense_date: '2026-08-28',
            claimed_amount: 10000.00,
            merchant_name: 'Hilton Garden Inn',
            description: '1 night stay at Hilton Bangalore',
            receipt_file_name: 'hilton_bangalore.pdf',
            receipt_file_type: 'application/pdf',
          },
          {
            category_code: 'FOOD',
            expense_date: '2026-08-28',
            claimed_amount: 4000.00,
            merchant_name: 'Various',
            description: 'Meals during site visit',
            receipt_file_name: 'meals_receipt.jpg',
            receipt_file_type: 'image/jpeg',
          }
        ]
      }
    ];

    let claimCount = 0;
    for (const cData of claimsData) {
      const existing = await db('expense_claims')
        .where('organization_id', orgId)
        .where('claim_number', cData.claim_number)
        .first();

      if (!existing) {
        const catId = catMap[cData.category_code];
        const [claimId] = await db('expense_claims').insert({
          uuid: uuidv4(),
          claim_number: cData.claim_number,
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          title: cData.title,
          category_id: catId,
          claim_date: cData.claim_date,
          total_claimed_amount: cData.total_claimed,
          total_approved_amount: cData.total_approved,
          total_rejected_amount: 0,
          payment_method: cData.payment_method,
          merchant_name: cData.merchant_name,
          description: cData.description,
          status: cData.status,
          submitted_at: cData.status !== 'draft' ? new Date() : null,
          approved_at: cData.status === 'approved' || cData.status === 'reimbursed' ? new Date() : null,
          reimbursed_at: cData.status === 'reimbursed' ? new Date() : null,
          created_at: new Date(),
          updated_at: new Date(),
        });

        claimCount++;

        // Add line items
        for (const item of cData.items) {
          const itemCatId = catMap[item.category_code];
          await db('expense_claim_items').insert({
            claim_id: claimId,
            category_id: itemCatId,
            expense_date: item.expense_date,
            claimed_amount: item.claimed_amount,
            approved_amount: cData.status === 'submitted' ? 0 : item.claimed_amount,
            rejected_amount: 0,
            merchant_name: item.merchant_name,
            description: item.description,
            receipt_file_name: item.receipt_file_name,
            receipt_file_type: item.receipt_file_type,
            receipt_file_size: 102450,
            policy_validated: cData.status !== 'rejected',
            status: cData.status === 'submitted' ? 'pending' : 'approved',
          });
        }

        // Add approval log if approved or reimbursed
        if (cData.status === 'approved' || cData.status === 'reimbursed') {
          await db('expense_approval_logs').insert({
            claim_id: claimId,
            approver_id: userId,
            approver_name: 'HR Admin',
            approver_role: 'Manager',
            action: 'approve',
            comments: 'Approved for payment',
          });
        }

        console.log(`  └─ ${cData.claim_number}: ${cData.title} (${cData.status})`);
      }
    }

    console.log(`\n✅ Created ${claimCount} new expense claims\n`);

    console.log('📦 Seeding Mileage Claims...\n');

    const mileageData = [
      {
        trip_date: '2026-08-15',
        from: 'Office Pune',
        to: 'Tech Park - Hinjewadi',
        vehicle: 'car',
        distance: 35.00,
        rate: 12.00,
        purpose: 'Client site visit - architecture discussion',
        status: 'approved'
      },
      {
        trip_date: '2026-08-18',
        from: 'Residence',
        to: 'Office',
        vehicle: 'bike',
        distance: 18.00,
        rate: 6.00,
        purpose: 'Daily commute',
        status: 'approved'
      },
      {
        trip_date: '2026-08-22',
        from: 'Office',
        to: 'Client Office - Viman Nagar',
        vehicle: 'car',
        distance: 22.00,
        rate: 12.00,
        purpose: 'Technical presentation and demo',
        status: 'pending'
      }
    ];

    let mileageCount = 0;
    for (const mData of mileageData) {
      const existing = await db('mileage_claims')
        .where('organization_id', orgId)
        .where('trip_date', mData.trip_date)
        .where('from_location', mData.from)
        .first();

      if (!existing) {
        await db('mileage_claims').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          employee_id: empId,
          submitted_by_user_id: userId,
          trip_date: mData.trip_date,
          from_location: mData.from,
          to_location: mData.to,
          vehicle_type: mData.vehicle,
          distance_km: mData.distance,
          rate_per_km: mData.rate,
          calculated_amount: mData.distance * mData.rate,
          purpose: mData.purpose,
          status: mData.status,
        });
        mileageCount++;
        console.log(`  └─ ${mData.trip_date}: ${mData.from} → ${mData.to} (${mData.distance}km)`);
      }
    }

    console.log(`\n✅ Created ${mileageCount} mileage claims\n`);

    console.log('======================================================');
    console.log('🎉 EXPENSE DATA SEEDING COMPLETED!');
    console.log('======================================================\n');

    console.log('📊 Summary:');
    console.log(`  • Expense Claims: ${claimCount} new claims seeded`);
    console.log(`  • Mileage Claims: ${mileageCount} new claims seeded`);
    console.log(`  • Total Categories: ${categories.length}`);
    console.log('');

    await db.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await db.destroy();
    process.exit(1);
  }
}

seedExpenseData();
