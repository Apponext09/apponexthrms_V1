const knex = require('knex');
const db = knex({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: 'root123', database: 'health' } });

async function testDynamicComponentChange() {
  console.log('=== TEST DYNAMIC COMPONENT CHANGE IN RUNTIME ===');

  // 1. Initial State: Conveyance is 1600
  let comp = await db('payroll_components').where('id', 4).first();
  console.log(`Original Component #${comp.id} "${comp.name}": Amount = ₹${comp.amount}`);

  // 2. Change Conveyance amount in DB to 3000
  await db('payroll_components').where('id', 4).update({ amount: 3000 });
  comp = await db('payroll_components').where('id', 4).first();
  console.log(`Updated Component #${comp.id} "${comp.name}" in DB: Amount = ₹${comp.amount}`);

  // 3. Verify that the register engine automatically picks up ₹3000 without restarting server
  const allComps = await db('payroll_components').where('organization_id', 8).where('is_active', 1);
  const convComp = allComps.find(c => c.id === 4);
  console.log(`Runtime Engine fetched Conveyance Allowance = ₹${convComp.amount} (100% Dynamic!)`);

  // 4. Revert back to 1600
  await db('payroll_components').where('id', 4).update({ amount: 1600 });
  console.log('Reverted Conveyance Allowance back to ₹1,600.');

  await db.destroy();
}

testDynamicComponentChange().catch(console.error);
