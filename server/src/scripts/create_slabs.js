import { getKnex } from '../db/knex.js';
import { v4 as uuidv4 } from 'uuid';

async function createAndSeedSlabs() {
  console.log('🚀 Checking payroll_slabs table in MySQL...');

  try {
    const db = getKnex();
    const tableExists = await db.schema.hasTable('payroll_slabs');

    if (!tableExists) {
      console.log('📦 Table payroll_slabs does not exist. Creating schema...');
      await db.schema.createTable('payroll_slabs', (table) => {
        table.increments('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.integer('organization_id').nullable();
        table.string('name', 255).notNullable();
        table.text('departments').nullable();
        table.text('grades').nullable();
        table.text('locations').nullable();
        table.decimal('min_ctc', 14, 2).defaultTo(0);
        table.decimal('max_ctc', 14, 2).defaultTo(10000000);
        table.text('selected_component_ids').nullable();
        table.integer('cycle_id').nullable();
        table.string('employment_type', 50).defaultTo('Regular'); // Regular | Intern | Probation | Contract
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
      });
      console.log('✅ Created table: payroll_slabs');
    } else {
      console.log('✅ Table payroll_slabs already exists.');
    }

    // Query active organization ID
    let targetOrgId = null;
    try {
      const firstOrg = await db('organizations').first();
      if (firstOrg) targetOrgId = firstOrg.id;
    } catch {}

    // Seed default slabs if table is empty
    const existingSlabs = await db('payroll_slabs').select('id');

    if (existingSlabs.length === 0) {
      console.log('🌱 Seeding default enterprise Payroll Slabs into MySQL...');

      const defaultSlabs = [
        {
          uuid: uuidv4(),
          organization_id: targetOrgId,
          name: 'Engineering Senior Slab (L4 - L6)',
          departments: JSON.stringify(['Engineering', 'IT & Product']),
          grades: JSON.stringify(['L4 Senior', 'L5 Lead', 'L6 Principal']),
          locations: JSON.stringify(['All Locations']),
          min_ctc: 600000,
          max_ctc: 1800000,
          selected_component_ids: JSON.stringify(['basic', 'hra', 'special_allowance', 'pf', 'pt', 'tds']),
          employment_type: 'Regular',
          cycle_id: null,
          is_active: true
        },
        {
          uuid: uuidv4(),
          organization_id: targetOrgId,
          name: 'Sales & Growth Slab (L2 - L4)',
          departments: JSON.stringify(['Sales & Marketing', 'Business Development']),
          grades: JSON.stringify(['L2 Associate', 'L3 Executive', 'L4 Senior']),
          locations: JSON.stringify(['All Locations']),
          min_ctc: 350000,
          max_ctc: 900000,
          selected_component_ids: JSON.stringify(['basic', 'hra', 'special_allowance', 'conveyance', 'pf', 'esic', 'pt']),
          employment_type: 'Regular',
          cycle_id: null,
          is_active: true
        },
        {
          uuid: uuidv4(),
          organization_id: targetOrgId,
          name: 'HR & Operations Management Slab',
          departments: JSON.stringify(['Human Resources', 'Operations', 'Finance']),
          grades: JSON.stringify(['L3 Specialist', 'L4 Manager']),
          locations: JSON.stringify(['All Locations']),
          min_ctc: 450000,
          max_ctc: 1200000,
          selected_component_ids: JSON.stringify(['basic', 'hra', 'special_allowance', 'medical', 'pf', 'pt', 'tds']),
          employment_type: 'Regular',
          cycle_id: null,
          is_active: true
        },
        {
          uuid: uuidv4(),
          organization_id: targetOrgId,
          name: 'Intern Stipend Slab (No PF / ESI)',
          departments: JSON.stringify(['All Departments']),
          grades: JSON.stringify(['Intern']),
          locations: JSON.stringify(['All Locations']),
          min_ctc: 120000,
          max_ctc: 240000,
          selected_component_ids: JSON.stringify(['stipend_allowance']),
          employment_type: 'Intern',
          cycle_id: null,
          is_active: true
        }
      ];

      await db('payroll_slabs').insert(defaultSlabs);
      console.log('✅ Seeded 4 Enterprise Payroll Slabs successfully!');
    } else {
      console.log(`ℹ️ Table payroll_slabs already contains ${existingSlabs.length} records.`);
    }

    const allSlabs = await db('payroll_slabs').select('id', 'name', 'min_ctc', 'max_ctc', 'is_active');
    console.log('\n📊 Current Database Payroll Slabs:');
    console.table(allSlabs);

  } catch (error) {
    console.error('❌ Error executing create_slabs.js:', error);
  } finally {
    process.exit(0);
  }
}

createAndSeedSlabs();
