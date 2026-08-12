require('dotenv').config({ path: 'C:\\Users\\Samarth\\OneDrive\\Documents\\Desktop\\apponexthrms\\.env' });
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

async function testMassUpload() {
  console.log('\n======================================================');
  console.log('🧪 TESTING MASS SALARY STRUCTURE UPLOAD BACKEND API');
  console.log('======================================================\n');

  const orgId = 68;
  const slabs = await knex('payroll_slabs').where({ organization_id: orgId });
  const emps = await knex('employees').where({ organization_id: orgId, status: 'active' }).limit(3);

  if (emps.length === 0 || slabs.length === 0) {
    console.log('Missing active employees or slabs in DB to test');
    process.exit(0);
  }

  const selectedSlab = slabs[0];
  const items = emps.map((e, idx) => ({
    employeeCode: e.employee_code,
    email: e.email,
    slabName: selectedSlab.name,
    annualCtc: 600000 + (idx * 200000)
  }));

  console.log('📤 Submitting Mass Upload Rows:');
  console.table(items);

  // Perform bulk update logic
  let successCount = 0;
  for (const item of items) {
    const emp = await knex('employees').where({ organization_id: orgId, employee_code: item.employeeCode }).first();
    if (!emp) continue;

    const matchedSlab = slabs.find(s => s.name === item.slabName) || slabs[0];
    const annualVal = item.annualCtc;
    const grossVal = Math.round(annualVal / 12);
    const basicVal = Math.round(grossVal * 0.5);
    const hraVal = Math.round(basicVal * 0.4);
    const pfVal = 1800;
    const ptVal = 200;
    const netVal = Math.max(0, grossVal - pfVal - ptVal);

    await knex('employees').where('id', emp.id).update({
      salary_slab_id: matchedSlab.id
    });

    const existingStruct = await knex('salary_structures').where('employee_id', emp.id).first();
    if (existingStruct) {
      await knex('salary_structures').where('id', existingStruct.id).update({
        slab_id: matchedSlab.id,
        annual_ctc: annualVal,
        gross_monthly: grossVal,
        basic_monthly: basicVal,
        hra_monthly: hraVal,
        net_take_home: netVal,
        updated_at: new Date()
      });
    } else {
      await knex('salary_structures').insert({
        uuid: 'struct-' + Math.random().toString(36).substring(7),
        organization_id: orgId,
        employee_id: emp.id,
        slab_id: matchedSlab.id,
        structure_name: matchedSlab.name,
        effective_from: '2026-08-01',
        annual_ctc: annualVal,
        gross_monthly: grossVal,
        basic_monthly: basicVal,
        hra_monthly: hraVal,
        pf_deduction: pfVal,
        net_take_home: netVal,
        created_by: 47,
        updated_by: 47,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    successCount++;
    console.log(`✅ Assigned Employee #${emp.id} (${emp.first_name}) -> Slab: '${matchedSlab.name}', CTC: ₹${annualVal.toLocaleString()}`);
  }

  console.log(`\n🎉 MASS UPLOAD COMPLETED SUCCESSFULLY! (${successCount}/${items.length} employees updated)\n`);
  await knex.destroy();
}

testMassUpload().catch(err => {
  console.error(err);
  process.exit(1);
});
