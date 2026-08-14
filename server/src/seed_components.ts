import { getKnex } from './db/knex';
import { v4 as uuidv4 } from 'uuid';

async function seedComponents() {
  const db = getKnex();
  try {
    const orgRow = await db('organizations').first();
    const orgId = orgRow ? orgRow.id : 8;
    console.log(`Seeding Component Groups & Definitions into MySQL for Org ID: ${orgId}...`);

    // 1. Insert Standard Earnings group
    const [earnGroupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Standard Earnings',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Sum',
      configure_on_profile: true,
      display_on_profile: true,
      is_editable: true,
      contributed_by: 'Employee',
      is_active: true,
      recalculate_on_change: true,
      group_for_payslip: 'Earnings',
      display_order: 1,
      disable_arrear: false,
      display_total_on_process: true,
      tds_same_month: true,
      is_taxable: true
    });

    // 2. Insert Statutory Deductions group
    const [dedGroupId] = await db('payroll_component_groups').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: 'Statutory Deductions',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Sum',
      configure_on_profile: true,
      display_on_profile: true,
      is_editable: false,
      contributed_by: 'Employee',
      is_active: true,
      recalculate_on_change: true,
      group_for_payslip: 'Deductions',
      display_order: 2,
      disable_arrear: false,
      display_total_on_process: true,
      tds_same_month: true,
      is_taxable: false
    });

    console.log(`Created Component Groups in MySQL! Earning Group ID: ${earnGroupId}, Deduction Group ID: ${dedGroupId}`);

    // 3. Insert Earnings components
    const earnComps = [
      { name: 'Basic Salary', type: 'Formula', amount: 50, formula: '50% of CTC', nonCash: false, attendance: true },
      { name: 'House Rent Allowance (HRA)', type: 'Formula', amount: 40, formula: '40% of Basic', nonCash: false, attendance: true },
      { name: 'Special Allowance', type: 'Formula', amount: 0, formula: 'CTC - (Basic + HRA + Other)', nonCash: false, attendance: true },
      { name: 'Conveyance Allowance', type: 'Value', amount: 1600, formula: '', nonCash: false, attendance: true },
      { name: 'Leave Travel Allowance (LTA)', type: 'Value', amount: 0, formula: '', nonCash: false, attendance: false },
      { name: 'Medical Allowance', type: 'Value', amount: 1250, formula: '', nonCash: false, attendance: false },
      { name: 'Overtime Pay', type: 'Formula', amount: 0, formula: 'Overtime Hours * Hourly Rate', nonCash: false, attendance: true },
      { name: 'Performance Bonus', type: 'Value', amount: 0, formula: '', nonCash: false, attendance: false }
    ];

    for (const c of earnComps) {
      await db('payroll_components').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: earnGroupId,
        name: c.name,
        component_type: c.type,
        amount: c.amount,
        formula: c.formula,
        non_cashable: c.nonCash,
        based_on_attendance: c.attendance,
        is_active: true,
        gender_filter: 'All',
        grades: JSON.stringify([]),
        departments: JSON.stringify([]),
        locations: JSON.stringify([]),
        employees: JSON.stringify([])
      });
    }

    // 4. Insert Deductions components
    const dedComps = [
      { name: 'Employee Provident Fund (EPF)', type: 'Formula', amount: 12, formula: '12% of Basic (capped at 1800)', nonCash: false, attendance: true },
      { name: 'Employee State Insurance (ESIC)', type: 'Formula', amount: 0.75, formula: '0.75% of Gross (if Gross <= 21000)', nonCash: false, attendance: true },
      { name: 'Professional Tax (PT)', type: 'Value', amount: 200, formula: 'State Slab Table', nonCash: false, attendance: false },
      { name: 'Tax Deducted at Source (TDS)', type: 'Formula', amount: 0, formula: 'Income Tax Slab Projection', nonCash: false, attendance: false }
    ];

    for (const c of dedComps) {
      await db('payroll_components').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        group_id: dedGroupId,
        name: c.name,
        component_type: c.type,
        amount: c.amount,
        formula: c.formula,
        non_cashable: c.nonCash,
        based_on_attendance: c.attendance,
        is_active: true,
        gender_filter: 'All',
        grades: JSON.stringify([]),
        departments: JSON.stringify([]),
        locations: JSON.stringify([]),
        employees: JSON.stringify([])
      });
    }

    console.log('SUCCESS! Seeded 12 component definitions into MySQL DB.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedComponents();
