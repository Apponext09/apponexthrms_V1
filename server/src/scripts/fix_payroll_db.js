const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root@123',
    database: process.env.DB_NAME || 'apponext'
  }
});

async function fix() {
  console.log('--- Fixing payroll database component & deduction records ---');

  // 1. Fix null actual_value in payroll_deductions
  const updatedDeds = await knex('payroll_deductions').whereNull('actual_value').update({
    actual_value: knex.raw('calculated_value')
  });
  console.log('Updated null actual_value in payroll_deductions:', updatedDeds);

  // 2. Fix null actual_value in payroll_earnings
  const updatedEarns = await knex('payroll_earnings').whereNull('actual_value').update({
    actual_value: knex.raw('calculated_value')
  });
  console.log('Updated null actual_value in payroll_earnings:', updatedEarns);

  // 3. Get distinct organization_ids from payroll_deductions and payroll_earnings
  const orgRows = await knex('payroll_deductions').select('organization_id').distinct();
  const orgIds = orgRows.map(r => r.organization_id).filter(Boolean);
  if (!orgIds.includes(14)) orgIds.push(14);

  const defaultGroups = [
    { name: 'Basic Pay', category: 'Earning', matchPattern: 'Basic%' },
    { name: 'House Rent Allowance (HRA)', category: 'Earning', matchPattern: '%HRA%' },
    { name: 'Special Allowance', category: 'Earning', matchPattern: '%Special%' },
    { name: 'Employee PF', category: 'Deduction', matchPattern: '%Provident Fund%' },
    { name: 'Income Tax (TDS)', category: 'Deduction', matchPattern: '%Income Tax%' },
    { name: 'Professional Tax (PT)', category: 'Deduction', matchPattern: '%Professional Tax%' },
    { name: 'ESIC Contribution', category: 'Deduction', matchPattern: '%ESIC%' }
  ];

  for (const orgId of orgIds) {
    for (const g of defaultGroups) {
      let existingGroup = await knex('payroll_component_groups')
        .where({ organization_id: orgId, name: g.name })
        .whereNull('deleted_at')
        .first();

      let groupId;
      if (!existingGroup) {
        const [newId] = await knex('payroll_component_groups').insert({
          organization_id: orgId,
          name: g.name,
          category: g.category,
          is_active: 1
        });
        groupId = newId;
        console.log(`[Org ${orgId}] Created group: ${g.name} (ID: ${groupId})`);
      } else {
        groupId = existingGroup.id;
      }

      let existingComp = await knex('payroll_components')
        .where({ organization_id: orgId, name: g.name })
        .whereNull('deleted_at')
        .first();

      let compId;
      if (!existingComp) {
        const [newCompId] = await knex('payroll_components').insert({
          organization_id: orgId,
          group_id: groupId,
          name: g.name,
          component_type: 'Value',
          is_active: 1
        });
        compId = newCompId;
        console.log(`[Org ${orgId}] Created component: ${g.name} (ID: ${compId})`);
      } else {
        compId = existingComp.id;
      }

      // Link component_id in payroll_deductions / payroll_earnings
      if (g.category === 'Deduction') {
        const linkedDeds = await knex('payroll_deductions')
          .where('organization_id', orgId)
          .where('component_name', 'like', g.matchPattern)
          .whereNull('component_id')
          .update({ component_id: compId });
        if (linkedDeds > 0) {
          console.log(`[Org ${orgId}] Linked ${linkedDeds} deductions to component ${g.name} (ID: ${compId})`);
        }
      } else {
        const linkedEarns = await knex('payroll_earnings')
          .where('organization_id', orgId)
          .where('component_name', 'like', g.matchPattern)
          .whereNull('component_id')
          .update({ component_id: compId });
        if (linkedEarns > 0) {
          console.log(`[Org ${orgId}] Linked ${linkedEarns} earnings to component ${g.name} (ID: ${compId})`);
        }
      }
    }
  }

  console.log('--- FIX COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

fix().catch(err => {
  console.error('Fix script error:', err);
  process.exit(1);
});
