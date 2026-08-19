const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
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

async function assignAll() {
  const unassigned = [51, 52, 55, 59];
  const standardSlab = await db('payroll_slabs').where('id', 1).first();

  for (const empId of unassigned) {
    const existing = await db('salary_structures').where('employee_id', empId).first();
    const annualCtc = 480000;
    const grossMonthly = 40000;
    const basicMonthly = 20000;
    const hraMonthly = 8000;
    const netSalary = 38000;

    if (existing) {
      await db('salary_structures').where('id', existing.id).update({
        slab_id: standardSlab.id,
        structure_name: standardSlab.name,
        annual_ctc: annualCtc,
        gross_monthly: grossMonthly,
        basic_monthly: basicMonthly,
        hra_monthly: hraMonthly,
        net_take_home: netSalary,
        deleted_at: null,
        updated_at: new Date()
      });
    } else {
      await db('salary_structures').insert({
        uuid: uuidv4(),
        organization_id: 14,
        employee_id: empId,
        slab_id: standardSlab.id,
        structure_name: standardSlab.name,
        structure_code: `STR-STA-${Date.now()}-${empId}`,
        grade_code: `STR-STA-${Date.now()}-${empId}`,
        annual_ctc: annualCtc,
        gross_monthly: grossMonthly,
        basic_monthly: basicMonthly,
        hra_monthly: hraMonthly,
        net_take_home: netSalary,
        effective_from: '2026-08-01',
        status: 'active',
        created_by: 1,
        updated_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  console.log('Assigned all employees to standard slab.');
  await db.destroy();
}

assignAll().catch(console.error);
