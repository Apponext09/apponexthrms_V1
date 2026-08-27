const knex = require('knex');
const crypto = require('crypto');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function organizePayrollComponents() {
  const orgId = 8;
  console.log('=== ORGANIZING ENTERPRISE PAYROLL COMPONENTS & GROUPS ===');

  // 1. Clean existing groups and components for Org 8 to setup a clean standard set
  await db('payroll_components').where('organization_id', orgId).del();
  await db('payroll_component_groups').where('organization_id', orgId).del();

  // 2. Define standard clean groups
  const groupsDef = [
    {
      id: 1,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      name: 'Basic Pay & House Rent',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 1,
      group_for_payslip: 'Basic',
      display_order: 1,
      disable_arrear: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      name: 'Fixed Allowances & Perks',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 1,
      group_for_payslip: 'Special Allowance',
      display_order: 2,
      disable_arrear: 0,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      name: 'Performance & Variable Pay',
      category: 'Earning',
      round_format: 'Round',
      group_function: 'Max',
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Earnings',
      display_order: 3,
      disable_arrear: 1,
      is_taxable: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      name: 'Statutory Deductions',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Max',
      is_editable: 0,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 1,
      group_for_payslip: 'Statutory',
      display_order: 4,
      disable_arrear: 1,
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      name: 'Loans, Advances & Recoveries',
      category: 'Deduction',
      round_format: 'Round',
      group_function: 'Max',
      is_editable: 1,
      contributed_by: 'Employee',
      is_active: 1,
      recalculate_on_change: 0,
      group_for_payslip: 'Deductions',
      display_order: 5,
      disable_arrear: 1,
      is_taxable: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await db('payroll_component_groups').insert(groupsDef);
  console.log(`Inserted ${groupsDef.length} standard Component Groups.`);

  // 3. Define standard components
  const compsDef = [
    // --- Group 1: Basic & Core Pay ---
    {
      id: 1,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 1,
      name: 'Basic Salary',
      component_type: 'Formula',
      amount: 0,
      formula: '50% of Gross',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 1,
      name: 'House Rent Allowance (HRA)',
      component_type: 'Formula',
      amount: 0,
      formula: '40% of Basic',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },

    // --- Group 2: Fixed Allowances & Perks ---
    {
      id: 3,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Special Allowance',
      component_type: 'Formula',
      amount: 0,
      formula: 'Gross - (Basic + HRA + Allowances)',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Conveyance Allowance',
      component_type: 'Value',
      amount: 1600,
      formula: '',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Medical Allowance',
      component_type: 'Value',
      amount: 1250,
      formula: '',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 6,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Children Education Allowance',
      component_type: 'Value',
      amount: 200,
      formula: '',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 7,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Telephone & Internet Allowance',
      component_type: 'Value',
      amount: 1500,
      formula: '',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 8,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Meal Allowance',
      component_type: 'Value',
      amount: 2200,
      formula: '',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 9,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Leave Travel Allowance (LTA)',
      component_type: 'Formula',
      amount: 0,
      formula: '8.33% of Basic',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 10,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 2,
      name: 'Uniform Allowance',
      component_type: 'Value',
      amount: 1000,
      formula: '',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },

    // --- Group 3: Variable Pay & Incentives ---
    {
      id: 11,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 3,
      name: 'Performance Bonus',
      component_type: 'Formula',
      amount: 0,
      formula: '10% of Basic',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 12,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 3,
      name: 'Overtime Pay',
      component_type: 'Module',
      amount: 0,
      formula: '',
      module_source: 'Overtime',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 13,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 3,
      name: 'Shift Allowance',
      component_type: 'Value',
      amount: 500,
      formula: '',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },

    // --- Group 4: Statutory Deductions ---
    {
      id: 14,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 4,
      name: 'Provident Fund (EPF)',
      component_type: 'Formula',
      amount: 0,
      formula: '12% of Basic',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 15,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 4,
      name: 'Employee State Insurance (ESIC)',
      component_type: 'Formula',
      amount: 0,
      formula: '0.75% of Gross',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 16,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 4,
      name: 'Professional Tax (PT)',
      component_type: 'Value',
      amount: 200,
      formula: '',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 17,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 4,
      name: 'Tax Deducted at Source (TDS)',
      component_type: 'Module',
      amount: 0,
      formula: '',
      module_source: 'Tax Slabs',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 18,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 4,
      name: 'Labour Welfare Fund (LWF)',
      component_type: 'Value',
      amount: 25,
      formula: '',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },

    // --- Group 5: Loans, Advances & Recoveries ---
    {
      id: 19,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 5,
      name: 'Salary Advance Recovery',
      component_type: 'Module',
      amount: 0,
      formula: '',
      module_source: 'Advance Recovery',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 20,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 5,
      name: 'Loan EMI Deduction',
      component_type: 'Module',
      amount: 0,
      formula: '',
      module_source: 'Loan EMI',
      based_on_attendance: 0,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 21,
      uuid: crypto.randomUUID(),
      organization_id: orgId,
      group_id: 5,
      name: 'Loss of Pay (LOP)',
      component_type: 'Module',
      amount: 0,
      formula: '',
      module_source: 'Attendance',
      based_on_attendance: 1,
      non_cashable: 0,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await db('payroll_components').insert(compsDef);
  console.log(`Inserted ${compsDef.length} standard Components.`);

  // 4. Update Pay Slab 2 with all 21 component IDs
  const allCompIds = compsDef.map(c => c.id);
  await db('payroll_slabs').where('id', 2).update({
    selected_component_ids: JSON.stringify(allCompIds),
    is_active: 1,
    min_ctc: 300000,
    max_ctc: 10000000
  });
  console.log(`Updated Pay Slab 2 with ${allCompIds.length} components.`);

  await db.destroy();
}

organizePayrollComponents().catch(console.error);
