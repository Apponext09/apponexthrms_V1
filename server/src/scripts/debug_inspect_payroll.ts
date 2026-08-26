import { getKnex } from '../db/knex';

async function run() {
  const db = getKnex();

  const des = await db('designations').limit(5);
  console.log('DESIGNATIONS:', des);

  const depts = await db('departments').limit(5);
  console.log('DEPARTMENTS:', depts);

  const cycles = await db('payroll_cycles').whereNull('deleted_at');
  console.log('CYCLES:', cycles);

  const slabs = await db('payroll_slabs').whereNull('deleted_at');
  console.log('SLABS:', slabs);

  const comps = await db('payroll_components').whereNull('deleted_at');
  console.log('ALL COMPS:', comps);

  const groups = await db('payroll_component_groups').whereNull('deleted_at');
  console.log('ALL GROUPS:', groups);

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
