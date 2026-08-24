const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function seedCleanComponents() {
  console.log('--- Updating Component Settings in DB ---');

  const componentsConfig = [
    { id: 1, name: 'Basic Salary', component_type: 'Derived', amount: 0, formula: '50% of Gross' },
    { id: 2, name: 'House Rent Allowance (HRA)', component_type: 'Derived', amount: 0, formula: '40% of Basic' },
    { id: 3, name: 'Special Allowance', component_type: 'Derived', amount: 0, formula: 'CTC - (Basic + HRA + Other)' },
    { id: 4, name: 'Conveyance Allowance', component_type: 'Value', amount: 1600.00, formula: '' },
    { id: 5, name: 'Leave Travel Allowance (LTA)', component_type: 'Module', amount: 0, formula: '' },
    { id: 6, name: 'Medical Allowance', component_type: 'Value', amount: 1250.00, formula: '' },
    { id: 7, name: 'Overtime Pay', component_type: 'Formula', amount: 0, formula: 'Overtime Hours * Hourly Rate' },
    { id: 8, name: 'Performance Bonus', component_type: 'Value', amount: 0, formula: null },
    { id: 9, name: 'EPF', component_type: 'Value', amount: 200.00, formula: null },
    { id: 10, name: 'ESIC', component_type: 'Derived', amount: 0, formula: '0.75% of Gross (if Gross <= 21000)' },
    { id: 11, name: 'Professional Tax (PT)', component_type: 'Value', amount: 200.00, formula: null },
    { id: 12, name: 'Tax Deducted at Source (TDS)', component_type: 'Formula', amount: 0, formula: 'Income Tax Slab Projection' }
  ];

  for (const c of componentsConfig) {
    await db('payroll_components')
      .where('id', c.id)
      .update({
        component_type: c.component_type,
        amount: c.amount,
        formula: c.formula,
        updated_at: new Date()
      });
    console.log(`Updated Component ${c.id}: ${c.name} -> Type: ${c.component_type}, Amt: ${c.amount}, Formula: ${c.formula}`);
  }

  // Update slab 2 ("Monthly") to include all 12 components
  await db('payroll_slabs')
    .where('id', 2)
    .update({
      selected_component_ids: JSON.stringify(["1","2","3","4","5","6","7","8","9","10","11","12"]),
      updated_at: new Date()
    });
  console.log('Updated Slab 2 (Monthly) selected_component_ids to all 12 components.');

  console.log('--- Completed Successfully ---');
  process.exit(0);
}

seedCleanComponents().catch(e => {
  console.error(e);
  process.exit(1);
});
