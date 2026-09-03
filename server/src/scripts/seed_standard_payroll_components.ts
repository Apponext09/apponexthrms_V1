import { getKnex } from '../db/knex';
import { v4 as uuidv4 } from 'uuid';

async function seedSeparateGroupsAndComponents() {
  const db = getKnex();
  console.log('--- SEEDING 34 SEPARATE 1:1 GROUPS & COMPONENTS (INCLUDING ANNUAL BONUS) ---');

  const firstOrg = await db('organizations').first();
  const orgId = firstOrg ? firstOrg.id : 8;

  // ── 1. DEFINE 34 SEPARATE GROUPS (22 EARNINGS, 12 DEDUCTIONS) ──
  const groupDefs = [
    // 22 Separate Earnings Groups
    { id: 1, name: 'Basic Salary', category: 'Earning', displayOrder: 1, groupForPayslip: 'Basic Salary' },
    { id: 2, name: 'Dearness Allowance', category: 'Earning', displayOrder: 2, groupForPayslip: 'Dearness Allowance' },
    { id: 3, name: 'House Rent Allowance', category: 'Earning', displayOrder: 3, groupForPayslip: 'House Rent Allowance' },
    { id: 4, name: 'City Compensatory Allowance', category: 'Earning', displayOrder: 4, groupForPayslip: 'City Compensatory Allowance' },
    { id: 5, name: 'Conveyance Allowance', category: 'Earning', displayOrder: 5, groupForPayslip: 'Conveyance Allowance' },
    { id: 6, name: 'Fuel Allowance', category: 'Earning', displayOrder: 6, groupForPayslip: 'Fuel Allowance' },
    { id: 7, name: 'Medical Allowance', category: 'Earning', displayOrder: 7, groupForPayslip: 'Medical Allowance' },
    { id: 8, name: 'Fitness Allowance', category: 'Earning', displayOrder: 8, groupForPayslip: 'Fitness Allowance' },
    { id: 9, name: 'Children Education Allowance', category: 'Earning', displayOrder: 9, groupForPayslip: 'Children Education Allowance' },
    { id: 10, name: 'Hostel Allowance', category: 'Earning', displayOrder: 10, groupForPayslip: 'Hostel Allowance' },
    { id: 11, name: 'Telephone Allowance', category: 'Earning', displayOrder: 11, groupForPayslip: 'Telephone Allowance' },
    { id: 12, name: 'Meal Allowance', category: 'Earning', displayOrder: 12, groupForPayslip: 'Meal Allowance' },
    { id: 13, name: 'Uniform Allowance', category: 'Earning', displayOrder: 13, groupForPayslip: 'Uniform Allowance' },
    { id: 14, name: 'Books Allowance', category: 'Earning', displayOrder: 14, groupForPayslip: 'Books Allowance' },
    { id: 15, name: 'Leave Travel Allowance', category: 'Earning', displayOrder: 15, groupForPayslip: 'Leave Travel Allowance' },
    { id: 16, name: 'Driver Allowance', category: 'Earning', displayOrder: 16, groupForPayslip: 'Driver Allowance' },
    { id: 17, name: 'Performance Bonus', category: 'Earning', displayOrder: 17, groupForPayslip: 'Performance Bonus' },
    { id: 18, name: 'Statutory Bonus', category: 'Earning', displayOrder: 18, groupForPayslip: 'Statutory Bonus' },
    { id: 19, name: 'Annual Bonus', category: 'Earning', displayOrder: 19, groupForPayslip: 'Annual Bonus' },
    { id: 20, name: 'Shift Allowance', category: 'Earning', displayOrder: 20, groupForPayslip: 'Shift Allowance' },
    { id: 21, name: 'Night Shift Allowance', category: 'Earning', displayOrder: 21, groupForPayslip: 'Night Shift Allowance' },
    { id: 22, name: 'Special Allowance', category: 'Earning', displayOrder: 22, groupForPayslip: 'Special Allowance' },

    // 12 Separate Deductions Groups
    { id: 23, name: 'Provident Fund', category: 'Deduction', displayOrder: 23, groupForPayslip: 'Provident Fund' },
    { id: 24, name: 'Voluntary Provident Fund', category: 'Deduction', displayOrder: 24, groupForPayslip: 'Voluntary Provident Fund' },
    { id: 25, name: 'Employee State Insurance', category: 'Deduction', displayOrder: 25, groupForPayslip: 'Employee State Insurance' },
    { id: 26, name: 'Labour Welfare Fund', category: 'Deduction', displayOrder: 26, groupForPayslip: 'Labour Welfare Fund' },
    { id: 27, name: 'Professional Tax', category: 'Deduction', displayOrder: 27, groupForPayslip: 'Professional Tax' },
    { id: 28, name: 'Tax Deducted at Source', category: 'Deduction', displayOrder: 28, groupForPayslip: 'Tax Deducted at Source' },
    { id: 29, name: 'Salary Advance Recovery', category: 'Deduction', displayOrder: 29, groupForPayslip: 'Salary Advance Recovery' },
    { id: 30, name: 'Loan EMI Recovery', category: 'Deduction', displayOrder: 30, groupForPayslip: 'Loan EMI Recovery' },
    { id: 31, name: 'Loss of Pay', category: 'Deduction', displayOrder: 31, groupForPayslip: 'Loss of Pay' },
    { id: 32, name: 'Attendance Penalty', category: 'Deduction', displayOrder: 32, groupForPayslip: 'Attendance Penalty' },
    { id: 33, name: 'Health Insurance Premium', category: 'Deduction', displayOrder: 33, groupForPayslip: 'Health Insurance Premium' },
    { id: 34, name: 'Staff Welfare Fund', category: 'Deduction', displayOrder: 34, groupForPayslip: 'Staff Welfare Fund' }
  ];

  // Insert or update groups
  for (const g of groupDefs) {
    const existing = await db('payroll_component_groups').where('id', g.id).first();
    const payload = {
      organization_id: orgId,
      name: g.name,
      category: g.category,
      display_order: g.displayOrder,
      group_for_payslip: g.groupForPayslip,
      is_active: 1,
      is_editable: 1,
      is_taxable: 1,
      updated_at: new Date()
    };
    if (existing) {
      await db('payroll_component_groups').where('id', g.id).update(payload);
    } else {
      await db('payroll_component_groups').insert({
        id: g.id,
        uuid: uuidv4(),
        created_at: new Date(),
        ...payload
      });
    }
  }

  // ── 2. DEFINE 34 SEPARATE COMPONENTS (1 COMPONENT PER SEPARATE GROUP) ──
  const componentDefs = [
    // ─── EARNINGS (22 Components, each in its own distinct group) ───
    {
      id: 1,
      groupId: 1,
      name: 'Basic Salary',
      componentType: 'Derived',
      formula: '[Gross] * 0.50',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 2,
      groupId: 2,
      name: 'Dearness Allowance',
      componentType: 'Derived',
      formula: '[Basic Salary] * 0.17',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 3,
      groupId: 3,
      name: 'House Rent Allowance',
      componentType: 'Derived',
      formula: '[Basic Salary] * 0.40',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 4,
      groupId: 4,
      name: 'City Compensatory Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 5,
      groupId: 5,
      name: 'Conveyance Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1600,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 6,
      groupId: 6,
      name: 'Fuel Allowance',
      componentType: 'Value',
      formula: null,
      amount: 2500,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 7,
      groupId: 7,
      name: 'Medical Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1250,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 8,
      groupId: 8,
      name: 'Fitness Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 9,
      groupId: 9,
      name: 'Children Education Allowance',
      componentType: 'Value',
      formula: null,
      amount: 200,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 10,
      groupId: 10,
      name: 'Hostel Allowance',
      componentType: 'Value',
      formula: null,
      amount: 600,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 11,
      groupId: 11,
      name: 'Telephone Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1500,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 12,
      groupId: 12,
      name: 'Meal Allowance',
      componentType: 'Value',
      formula: null,
      amount: 2200,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 13,
      groupId: 13,
      name: 'Uniform Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 14,
      groupId: 14,
      name: 'Books Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 15,
      groupId: 15,
      name: 'Leave Travel Allowance',
      componentType: 'Derived',
      formula: '[Basic Salary] * 0.0833',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 16,
      groupId: 16,
      name: 'Driver Allowance',
      componentType: 'Value',
      formula: null,
      amount: 2000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 17,
      groupId: 17,
      name: 'Performance Bonus',
      componentType: 'Derived',
      formula: '[Basic Salary] * 0.10',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 18,
      groupId: 18,
      name: 'Statutory Bonus',
      componentType: 'Derived',
      formula: 'min(7000, [Basic Salary]) * 0.0833',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 19,
      groupId: 19,
      name: 'Annual Bonus',
      componentType: 'Derived',
      formula: '[Basic Salary] * 0.0833',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 20,
      groupId: 20,
      name: 'Shift Allowance',
      componentType: 'Value',
      formula: null,
      amount: 1500,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 21,
      groupId: 21,
      name: 'Night Shift Allowance',
      componentType: 'Value',
      formula: null,
      amount: 2000,
      basedOnAttendance: 1,
      isTaxable: 1
    },
    {
      id: 22,
      groupId: 22,
      name: 'Special Allowance',
      componentType: 'Derived',
      formula: '[CTC] - ([Basic Salary] + [House Rent Allowance] + [Dearness Allowance] + [Conveyance Allowance] + [Medical Allowance] + [Children Education Allowance] + [Telephone Allowance] + [Meal Allowance])',
      amount: 0,
      basedOnAttendance: 1,
      isTaxable: 1
    },

    // ─── DEDUCTIONS (12 Components, each in its own distinct group) ───
    {
      id: 23,
      groupId: 23,
      name: 'Provident Fund',
      componentType: 'Derived',
      formula: 'min(1800, [Basic Salary] * 0.12)',
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 24,
      groupId: 24,
      name: 'Voluntary Provident Fund',
      componentType: 'Value',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 25,
      groupId: 25,
      name: 'Employee State Insurance',
      componentType: 'Derived',
      formula: '[Gross] * (0.75 / 100) (if Gross <= 21000)',
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 26,
      groupId: 26,
      name: 'Labour Welfare Fund',
      componentType: 'Value',
      formula: null,
      amount: 20,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 27,
      groupId: 27,
      name: 'Professional Tax',
      componentType: 'Value',
      formula: null,
      amount: 200,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 28,
      groupId: 28,
      name: 'Tax Deducted at Source',
      componentType: 'Module',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 29,
      groupId: 29,
      name: 'Salary Advance Recovery',
      componentType: 'Module',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 30,
      groupId: 30,
      name: 'Loan EMI Recovery',
      componentType: 'Module',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 31,
      groupId: 31,
      name: 'Loss of Pay',
      componentType: 'Module',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 32,
      groupId: 32,
      name: 'Attendance Penalty',
      componentType: 'Value',
      formula: null,
      amount: 0,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 33,
      groupId: 33,
      name: 'Health Insurance Premium',
      componentType: 'Value',
      formula: null,
      amount: 500,
      basedOnAttendance: 0,
      isTaxable: 0
    },
    {
      id: 34,
      groupId: 34,
      name: 'Staff Welfare Fund',
      componentType: 'Value',
      formula: null,
      amount: 100,
      basedOnAttendance: 0,
      isTaxable: 0
    }
  ];

  // Insert or update all components in payroll_components
  for (const c of componentDefs) {
    const existing = await db('payroll_components').where('id', c.id).first();
    const payload = {
      organization_id: orgId,
      group_id: c.groupId,
      name: c.name,
      component_type: c.componentType,
      formula: c.formula,
      amount: c.amount,
      based_on_attendance: c.basedOnAttendance,
      is_active: 1,
      boundary_type: 'Choose',
      updated_at: new Date()
    };
    if (existing) {
      await db('payroll_components').where('id', c.id).update(payload);
    } else {
      await db('payroll_components').insert({
        id: c.id,
        uuid: uuidv4(),
        created_at: new Date(),
        ...payload
      });
    }
  }

  // ── 3. UPDATE PAYROLL SLABS WITH ALL 34 COMPONENT IDS ──
  const allCompIds = componentDefs.map((c) => c.id);
  const allCompIdsJson = JSON.stringify(allCompIds);

  await db('payroll_slabs')
    .where('organization_id', orgId)
    .orWhereNull('organization_id')
    .update({
      selected_component_ids: allCompIdsJson,
      updated_at: new Date()
    });

  console.log(`✅ Seeded ${groupDefs.length} Separate Groups (22 Earnings, 12 Deductions)`);
  console.log(`✅ Seeded ${componentDefs.length} Separate Components (1:1 mapped to groups)`);
  console.log('✅ Updated all Payroll Slabs with full component set:', allCompIds);
}

seedSeparateGroupsAndComponents()
  .then(() => {
    console.log('--- SEED COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error seeding components:', err);
    process.exit(1);
  });
