const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function organizeGroupsAndComponents() {
  console.log('--- Organizing Component Groups & Components Cleanly ---');

  // 1. Define standard clean groups
  const cleanGroups = [
    { id: 2, name: 'Basic Pay & HRA', category: 'Earning' },
    { id: 101, name: 'Standard Allowances & Reimbursements', category: 'Earning' },
    { id: 102, name: 'Supplementary Allowances', category: 'Earning' },
    { id: 103, name: 'Performance & Variable Pay', category: 'Earning' },
    { id: 3, name: 'Statutory Deductions', category: 'Deduction' },
    { id: 104, name: 'Attendance & Leave Deductions', category: 'Deduction' },
    { id: 105, name: 'Loan & Advance Deductions', category: 'Deduction' }
  ];

  const cleanGroupIds = cleanGroups.map(g => g.id);

  // Soft-delete all other groups to keep group list clean and well-organized
  await db('payroll_component_groups')
    .whereNotIn('id', cleanGroupIds)
    .update({ deleted_at: new Date(), is_active: 0 });

  for (const g of cleanGroups) {
    const existing = await db('payroll_component_groups').where('id', g.id).first();
    if (existing) {
      await db('payroll_component_groups').where('id', g.id).update({
        name: g.name,
        category: g.category,
        is_active: 1,
        deleted_at: null,
        updated_at: new Date()
      });
    } else {
      await db('payroll_component_groups').insert({
        id: g.id,
        organization_id: 8,
        name: g.name,
        category: g.category,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  console.log('Active Groups organized: 4 Earning Groups & 3 Deduction Groups.');

  // 2. Define 12 Earning and 7 Deduction Components
  const allComponents = [
    // 12 Earnings
    { id: 1, group_id: 2, name: 'Basic Salary', component_type: 'Derived', amount: 0, formula: '50% of Gross' },
    { id: 2, group_id: 2, name: 'House Rent Allowance (HRA)', component_type: 'Derived', amount: 0, formula: '40% of Basic' },
    { id: 3, group_id: 102, name: 'Special Allowance', component_type: 'Derived', amount: 0, formula: 'CTC - (Basic + HRA + Other)' },
    { id: 4, group_id: 101, name: 'Conveyance Allowance', component_type: 'Value', amount: 1600.00, formula: '' },
    { id: 5, group_id: 102, name: 'Leave Travel Allowance (LTA)', component_type: 'Derived', amount: 0, formula: '8.33% of Basic' },
    { id: 6, group_id: 101, name: 'Medical Allowance', component_type: 'Value', amount: 1250.00, formula: '' },
    { id: 7, group_id: 103, name: 'Overtime Pay', component_type: 'Formula', amount: 0, formula: 'Overtime Hours * Hourly Rate' },
    { id: 8, group_id: 103, name: 'Performance Bonus', component_type: 'Derived', amount: 0, formula: '10% of Basic' },
    { id: 13, group_id: 101, name: 'Children Education Allowance', component_type: 'Value', amount: 200.00, formula: '' },
    { id: 14, group_id: 101, name: 'Meal Allowance', component_type: 'Value', amount: 2200.00, formula: '' },
    { id: 15, group_id: 102, name: 'Telephone / Internet Allowance', component_type: 'Value', amount: 1500.00, formula: '' },
    { id: 16, group_id: 102, name: 'Uniform Allowance', component_type: 'Value', amount: 1000.00, formula: '' },

    // 7 Deductions
    { id: 9, group_id: 3, name: 'EPF', component_type: 'Value', amount: 200.00, formula: '' },
    { id: 10, group_id: 3, name: 'ESIC', component_type: 'Derived', amount: 0, formula: '0.75% of Gross (if Gross <= 21000)' },
    { id: 11, group_id: 3, name: 'Professional Tax (PT)', component_type: 'Value', amount: 200.00, formula: '' },
    { id: 12, group_id: 3, name: 'Tax Deducted at Source (TDS)', component_type: 'Formula', amount: 0, formula: 'Income Tax Slab Projection' },
    { id: 17, group_id: 104, name: 'Loss of Pay (LOP)', component_type: 'Module', amount: 0, formula: '' },
    { id: 18, group_id: 105, name: 'Salary Advance Recovery', component_type: 'Module', amount: 0, formula: '' },
    { id: 19, group_id: 3, name: 'Voluntary Provident Fund (VPF)', component_type: 'Value', amount: 0, formula: '' }
  ];

  const allCompIds = allComponents.map(c => c.id);

  // Soft-delete any old components not in this clean list
  await db('payroll_components')
    .whereNotIn('id', allCompIds)
    .update({ deleted_at: new Date(), is_active: 0 });

  for (const c of allComponents) {
    const existing = await db('payroll_components').where('id', c.id).first();
    if (existing) {
      await db('payroll_components').where('id', c.id).update({
        group_id: c.group_id,
        name: c.name,
        component_type: c.component_type,
        amount: c.amount,
        formula: c.formula,
        is_active: 1,
        boundary_type: 'Choose',
        min_amount: 0,
        max_amount: 0,
        departments: '[]',
        grades: '[]',
        locations: '[]',
        employees: '[]',
        gender_filter: 'All',
        deleted_at: null,
        updated_at: new Date()
      });
    } else {
      await db('payroll_components').insert({
        id: c.id,
        organization_id: 8,
        group_id: c.group_id,
        name: c.name,
        component_type: c.component_type,
        amount: c.amount,
        formula: c.formula,
        is_active: 1,
        boundary_type: 'Choose',
        min_amount: 0,
        max_amount: 0,
        departments: '[]',
        grades: '[]',
        locations: '[]',
        employees: '[]',
        gender_filter: 'All',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }
  console.log('Components organized: 12 Earnings & 7 Deductions.');

  // 3. Update active slab 2 ("Monthly")
  await db('payroll_slabs')
    .where('id', 2)
    .update({
      selected_component_ids: JSON.stringify(allCompIds.map(String)),
      updated_at: new Date()
    });
  console.log('Slab 2 (Monthly) updated with all components.');

  // 4. Update employee 69 existing salary structure to link directly to Slab 2 ("Monthly")
  await db('salary_structures')
    .where('employee_id', 69)
    .update({
      slab_id: 2,
      structure_name: 'Monthly',
      updated_at: new Date()
    });
  console.log('Employee 69 salary structure linked to Slab 2 (Monthly).');

  console.log('--- Completed Successfully ---');
  process.exit(0);
}

organizeGroupsAndComponents().catch(e => {
  console.error(e);
  process.exit(1);
});
