import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function check() {
  console.log('🔍 Checking shift_templates table...');
  const hasTable = await db.schema.hasTable('shift_templates');

  if (hasTable) {
    const allShifts = await db('shift_templates').select('id', 'shift_name', 'shift_type', 'organization_id', 'deleted_at');
    console.log('Total shifts in table:', allShifts.length);
    console.log('Shifts rows:', JSON.stringify(allShifts, null, 2));
  }
}

check()
  .catch(console.error)
  .finally(() => db.destroy());
