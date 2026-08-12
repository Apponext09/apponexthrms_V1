import { initializeKnex } from './db/knex';

const db = initializeKnex();

async function run() {
  try {
    const components = await db('payroll_components').select('*');
    console.log('--- LIVE DB PAYROLL COMPONENTS ---');
    console.log(JSON.stringify(components, null, 2));

    const slabs = await db('payroll_slabs').select('*');
    console.log('\n--- LIVE DB PAYROLL SLABS ---');
    console.log(JSON.stringify(slabs, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
