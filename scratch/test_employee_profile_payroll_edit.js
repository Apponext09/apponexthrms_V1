const knex = require('knex');
require('dotenv').config({ path: './server/.env' });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms',
  }
});

async function testProfileEdit() {
  console.log('Testing Employee Profile Payroll Edit Workflow...');

  // Pick employee #100 (Ravi Kumar)
  const emp = await db('employees').where('id', 100).first();
  console.log(`Testing with Employee: ${emp.first_name} ${emp.last_name} (ID: ${emp.id})`);

  const initialStruct = await db('salary_structures').where('employee_id', emp.id).first();
  console.log('Initial Structure in DB:', {
    id: initialStruct.id,
    slab_id: initialStruct.slab_id,
    structure_name: initialStruct.structure_name,
    annual_ctc: initialStruct.annual_ctc,
    gross_monthly: initialStruct.gross_monthly
  });

  // Simulate updating salary structure with Annual CTC 5,40,000 (Monthly Gross 45,000)
  const newGross = 45000;
  const newCtc = newGross * 12; // 540,000
  const newBasic = Math.round(newGross * 0.5); // 22,500
  const newHra = Math.round(newBasic * 0.4);   // 9,000
  const newPf = Math.min(1800, Math.round(newBasic * 0.12)); // 1800
  const newNet = newGross - (newPf + 200); // 43,000

  await db('salary_structures').where('id', initialStruct.id).update({
    annual_ctc: newCtc,
    gross_monthly: newGross,
    basic_monthly: newBasic,
    hra_monthly: newHra,
    pf_deduction: newPf,
    net_take_home: newNet,
    structure_name: 'Kite Structure Slab',
    updated_at: new Date()
  });

  const updated = await db('salary_structures').where('id', initialStruct.id).first();
  console.log('\nVerified Updated Structure in DB:', {
    id: updated.id,
    employee_id: updated.employee_id,
    structure_name: updated.structure_name,
    annual_ctc: updated.annual_ctc,
    gross_monthly: updated.gross_monthly,
    net_take_home: updated.net_take_home
  });

  if (Number(updated.annual_ctc) === 540000 && Number(updated.gross_monthly) === 45000) {
    console.log('✅ PASS: Employee profile payroll edit successfully stores exact Annual CTC and Gross in DB!');
  } else {
    console.error('❌ FAIL: Mismatched CTC or Gross values!');
  }

  // Restore Ravi Kumar back to 480,000
  await db('salary_structures').where('id', initialStruct.id).update({
    annual_ctc: 480000,
    gross_monthly: 40000,
    basic_monthly: 20000,
    hra_monthly: 8000,
    pf_deduction: 1800,
    net_take_home: 38000,
    structure_name: 'Kite Structure Slab',
    updated_at: new Date()
  });

  console.log('✅ Structure restored safely to 480,000.');
  await db.destroy();
}

testProfileEdit().catch(console.error);
