import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function test() {
  const shifts = await db('shift_templates').whereNull('deleted_at');
  console.log('RAW shift_templates rows:');
  shifts.forEach(s => {
    console.log(s);
  });
}

test().finally(() => db.destroy());
