import { getKnex } from './db/knex';
import { v4 as uuidv4 } from 'uuid';

async function seedSlabs() {
  const db = getKnex();
  try {
    const orgRow = await db('organizations').first();
    const orgId = orgRow ? orgRow.id : 8;

    const cycleRow = await db('payroll_cycles').whereNull('deleted_at').first();
    const cycleId = cycleRow ? cycleRow.id : null;

    const comps = await db('payroll_components').whereNull('deleted_at');
    const compIds = comps.map(c => String(c.id));

    // Check if slabs already exist
    const existing = await db('payroll_slabs').whereNull('deleted_at');
    if (existing.length === 0) {
      console.log('Seeding default Pay Slabs into MySQL...');

      await db('payroll_slabs').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Standard Staff Slab',
        departments: JSON.stringify(['All Departments']),
        grades: JSON.stringify(['All Pay Grades']),
        locations: JSON.stringify(['All Locations']),
        min_ctc: 1,
        max_ctc: 600000,
        selected_component_ids: JSON.stringify(compIds),
        cycle_id: cycleId,
        employment_type: 'Regular',
        is_active: true,
        created_by: 1,
        updated_by: 1
      });

      await db('payroll_slabs').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        name: 'Executive Management Slab',
        departments: JSON.stringify(['All Departments']),
        grades: JSON.stringify(['All Pay Grades']),
        locations: JSON.stringify(['All Locations']),
        min_ctc: 600001,
        max_ctc: 10000000,
        selected_component_ids: JSON.stringify(compIds),
        cycle_id: cycleId,
        employment_type: 'Regular',
        is_active: true,
        created_by: 1,
        updated_by: 1
      });

      console.log('Successfully created 2 Pay Slabs in MySQL database!');
    } else {
      console.log(`Pay Slabs already exist in DB (${existing.length} slabs).`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error seeding Pay Slabs:', err);
    process.exit(1);
  }
}

seedSlabs();
