import { getKnex } from '../src/db/knex';

async function inspectRecord() {
  const db = getKnex();
  const record = await db('employee_onboarding_records').where('employee_id', 1).first();
  console.log('Record from employee_onboarding_records:', JSON.stringify(record, null, 2));
  process.exit(0);
}

inspectRecord();
