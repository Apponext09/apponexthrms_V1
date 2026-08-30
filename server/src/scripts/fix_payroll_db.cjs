const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root@123',
    database: process.env.DB_NAME || 'apponext'
  }
});

const { v4: uuidv4 } = require('uuid');

async function fix() {
  console.log('--- Fixing payroll database component & deduction records ---');

  // 1. Fix null actual_value in payroll_deductions
  await knex('payroll_deductions').whereNull('actual_value').update({
    actual_value: knex.raw('calculated_value')
  });

  // 2. Fix null actual_value in payroll_earnings
  await knex('payroll_earnings').whereNull('actual_value').update({
    actual_value: knex.raw('calculated_value')
  });

  const orgRows = await knex('payroll_deductions').select('organization_id').distinct();
  const orgIds = orgRows.map(r => r.organization_id).filter(Boolean);
  if (!orgIds.includes(14)) orgIds.push(14);

  const firstUser = await knex('users').select('id').first();
  const userId = firstUser ? firstUser.id : 1;

  const defaultSalaryComps = [
    { name: 'Basic Pay', type: 'earnings', matchPattern: '%Basic%', deductionType: null },
    { name: 'House Rent Allowance (HRA)', type: 'earnings', matchPattern: '%HRA%', deductionType: null },
    { name: 'Special Allowance', type: 'earnings', matchPattern: '%Special%', deductionType: null },
    { name: 'Transport Allowance', type: 'earnings', matchPattern: '%Transport%', deductionType: null },
    { name: 'Provident Fund (PF)', type: 'deductions', matchPattern: '%Provident Fund%', deductionType: 'pf' },
    { name: 'Income Tax (TDS)', type: 'deductions', matchPattern: '%Income Tax%', deductionType: 'tds' },
    { name: 'Professional Tax (PT)', type: 'deductions', matchPattern: '%Professional Tax%', deductionType: 'pt' },
    { name: 'ESIC Contribution', type: 'deductions', matchPattern: '%ESIC%', deductionType: 'esi' }
  ];

  for (const orgId of orgIds) {
    for (const sc of defaultSalaryComps) {
      let existingSalComp = await knex('salary_components')
        .where({ organization_id: orgId, component_name: sc.name })
        .whereNull('deleted_at')
        .first();

      if (!existingSalComp) {
        existingSalComp = await knex('salary_components')
          .where('organization_id', orgId)
          .where('component_name', 'like', sc.matchPattern)
          .whereNull('deleted_at')
          .first();
      }

      let salCompId;
      if (!existingSalComp) {
        const [newSalId] = await knex('salary_components').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          component_name: sc.name,
          component_code: sc.name.substring(0, 10).toUpperCase().replace(/[^A-Z]/g, ''),
          component_type: sc.type,
          deduction_type: sc.deductionType,
          status: 'active',
          created_by: userId,
          updated_by: userId
        });
        salCompId = newSalId;
        console.log(`[Org ${orgId}] Created salary_component: ${sc.name} (ID: ${salCompId})`);
      } else {
        salCompId = existingSalComp.id;
      }

      // Link component_id in payroll_deductions / payroll_earnings
      if (sc.type === 'deductions') {
        const linkedDeds = await knex('payroll_deductions')
          .where('organization_id', orgId)
          .where('component_name', 'like', sc.matchPattern)
          .whereNull('component_id')
          .update({ component_id: salCompId });
        if (linkedDeds > 0) {
          console.log(`[Org ${orgId}] Linked ${linkedDeds} deductions to salary_component ${sc.name} (ID: ${salCompId})`);
        }
      } else {
        const linkedEarns = await knex('payroll_earnings')
          .where('organization_id', orgId)
          .where('component_name', 'like', sc.matchPattern)
          .whereNull('component_id')
          .update({ component_id: salCompId });
        if (linkedEarns > 0) {
          console.log(`[Org ${orgId}] Linked ${linkedEarns} earnings to salary_component ${sc.name} (ID: ${salCompId})`);
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
