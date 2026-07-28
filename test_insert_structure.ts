import { getKnex } from './server/src/db/knex';
import { v4 as uuidv4 } from 'uuid';

async function testInsert() {
  const db = getKnex();
  try {
    const user = await db('users').first();
    const userId = user ? user.id : null;

    const [id] = await db('salary_structures').insert({
      uuid: uuidv4(),
      organization_id: user?.organization_id || 68,
      employee_id: null,
      structure_name: 'Senior Software Engineer CTC Grade-A',
      grade_code: 'GRADE-SEN',
      annual_ctc: 900000,
      basic_monthly: 37500,
      hra_monthly: 15000,
      special_allowance_monthly: 7500,
      gross_monthly: 62850,
      pf_deduction: 1800,
      esi_deduction: 0,
      tds_deduction: 3143,
      net_take_home: 57207,
      effective_from: new Date(),
      status: 'active',
      created_by: userId,
      updated_by: userId
    });

    console.log(`🎉 SUCCESS! Created salary structure ID #${id} in MySQL table \`salary_structures\`!`);
    const rows = await db('salary_structures').select('id', 'organization_id', 'structure_name', 'annual_ctc', 'gross_monthly', 'net_take_home');
    console.log('Current records in `salary_structures`:\n', rows);
  } catch (err) {
    console.error('Insert error:', err);
  }
  process.exit(0);
}

testInsert();
