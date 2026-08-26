const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function fixAndSeedComponents() {
  console.log('=== FIXING & STANDARDIZING ALL COMPONENTS FOR ORG 8 ===\n');

  // Update all components to use correct type and proper bracket formulas
  const updates = [
    // EARNINGS
    { id: 1, name: 'Basic Salary',                       component_type: 'Derived', amount: 0, formula: '[CTC] * 0.50' },
    { id: 2, name: 'House Rent Allowance (HRA)',          component_type: 'Derived', amount: 0, formula: '[Basic Salary] * 0.40' },
    { id: 3, name: 'Special Allowance',                  component_type: 'Derived', amount: 0, formula: '[CTC] - ([Basic Salary] + [House Rent Allowance (HRA)] + [Conveyance Allowance] + [Medical Allowance] + [Children Education Allowance])' },
    { id: 4, name: 'Conveyance Allowance',               component_type: 'Value',   amount: 1600, formula: null },
    { id: 5, name: 'Medical Allowance',                  component_type: 'Value',   amount: 1250, formula: null },
    { id: 6, name: 'Children Education Allowance',       component_type: 'Value',   amount: 200,  formula: null },
    { id: 7, name: 'Telephone & Internet Allowance',     component_type: 'Value',   amount: 0,    formula: null },
    { id: 8, name: 'Meal Allowance',                     component_type: 'Value',   amount: 0,    formula: null },
    { id: 9, name: 'Leave Travel Allowance (LTA)',       component_type: 'Derived', amount: 0, formula: '[Basic Salary] * (8.33 / 100)' },
    { id: 10, name: 'Uniform Allowance',                 component_type: 'Value',   amount: 0, formula: null },
    // VARIABLE PAY
    { id: 11, name: 'Performance Bonus',                 component_type: 'Derived', amount: 0, formula: '[Basic Salary] * 0.10' },
    { id: 12, name: 'Overtime Pay',                      component_type: 'Module',  amount: 0, formula: null },
    { id: 13, name: 'Shift Allowance',                   component_type: 'Value',   amount: 0, formula: null },
    // DEDUCTIONS
    { id: 14, name: 'Provident Fund (EPF)',              component_type: 'Derived', amount: 0, formula: 'min(1800, [Basic Salary] * 0.12)' },
    { id: 15, name: 'Employee State Insurance (ESIC)',   component_type: 'Derived', amount: 0, formula: '[Gross] * (0.75 / 100)' },
    { id: 16, name: 'Professional Tax (PT)',             component_type: 'Value',   amount: 200, formula: null },
    { id: 17, name: 'Tax Deducted at Source (TDS)',      component_type: 'Module',  amount: 0, formula: null },
    { id: 18, name: 'Labour Welfare Fund (LWF)',         component_type: 'Value',   amount: 25, formula: null },
    { id: 19, name: 'Salary Advance Recovery',           component_type: 'Module',  amount: 0, formula: null },
    { id: 20, name: 'Loan EMI Deduction',                component_type: 'Module',  amount: 0, formula: null },
    { id: 21, name: 'Loss of Pay (LOP)',                 component_type: 'Module',  amount: 0, formula: null },
  ];

  for (const u of updates) {
    const updateData = {
      name: u.name,
      component_type: u.component_type,
      amount: u.amount,
      formula: u.formula,
      updated_at: db.fn.now(),
    };
    await db('payroll_components').where('id', u.id).update(updateData);
    console.log(`Updated ID:${u.id} "${u.name}" -> Type:${u.component_type} ${u.formula ? 'Formula:' + u.formula : 'Amt:' + u.amount}`);
  }

  // Verify final state
  console.log('\n=== FINAL STATE ===');
  const all = await db('payroll_components').where('organization_id', 8).orderBy('group_id').orderBy('id');
  all.forEach(c => {
    console.log(`ID:${c.id} Grp:${c.group_id} "${c.name}" [${c.component_type}] ${c.formula ? 'F: ' + c.formula : 'Amt: ' + c.amount}`);
  });

  await db.destroy();
  console.log('\n=== ALL COMPONENTS FIXED SUCCESSFULLY ===');
}

fixAndSeedComponents().catch(e => { console.error(e.message); process.exit(1); });
