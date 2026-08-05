import { v4 as uuidv4 } from 'uuid';
import { initializeKnex, getKnex, closeKnex } from '../knex.js';

export async function seedEventsMasterData() {
  try {
    console.log('🚀 Initializing database connection for Events Master seed...');
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected\n');

    const hasTable = await db.schema.hasTable('events');
    if (!hasTable) {
      console.log('⚠️ Table "events" does not exist. Please run migrations first.');
      await closeKnex();
      return;
    }

    // Check existing count
    const existing = await db('events').whereNull('deleted_at');
    if (existing.length > 0) {
      console.log(`ℹ️ Events table already contains ${existing.length} records. Skipping seed.`);
      await closeKnex();
      return;
    }

    // Fetch org ids
    const orgs = await db('organizations').select('id');
    const orgIds = orgs.length > 0 ? orgs.map((o: { id: number }) => o.id) : [1];

    const todayStr = new Date().toISOString().split('T')[0];

    for (const orgId of orgIds) {
      const sampleEvents = [
        {
          uuid: uuidv4(),
          organization_id: orgId,
          title: 'Quarterly All-Hands Townhall',
          description: '<p><strong>Join us for our Q3 All-Hands Townhall!</strong> We will review quarterly progress, announce new initiatives, and hold an open Q&A session with executive leadership.</p><p><em>Attendance is mandatory for all team leads and managers.</em></p>',
          venue: 'Main Auditorium / Zoom Room 1',
          event_type: 'Townhall',
          start_date: todayStr,
          end_date: todayStr,
          start_time: '10:00',
          end_time: '12:00',
          display_days_before: 7,
          require_participation: true,
          allow_comments: true,
          set_reminder: true,
          company_ids: JSON.stringify([]),
          location_ids: JSON.stringify([]),
          department_ids: JSON.stringify([]),
          shift_ids: JSON.stringify([]),
          grade_ids: JSON.stringify([]),
          employment_types: JSON.stringify([]),
          employee_status_ids: JSON.stringify([]),
          gender: 'All',
          is_active: true,
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          uuid: uuidv4(),
          organization_id: orgId,
          title: 'Annual Day Celebration & Awards',
          description: '<p>Celebrate our company achievements with performances, dinner, and our annual Excellence Awards!</p>',
          venue: 'Grand Ball Room, Tech Park Hotel',
          event_type: 'Celebration',
          start_date: todayStr,
          end_date: todayStr,
          start_time: '18:00',
          end_time: '22:00',
          display_days_before: 15,
          require_participation: false,
          allow_comments: true,
          set_reminder: true,
          company_ids: JSON.stringify([]),
          location_ids: JSON.stringify([]),
          department_ids: JSON.stringify([]),
          shift_ids: JSON.stringify([]),
          grade_ids: JSON.stringify([]),
          employment_types: JSON.stringify([]),
          employee_status_ids: JSON.stringify([]),
          gender: 'All',
          is_active: true,
          status: 'Active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      await db('events').insert(sampleEvents);
      console.log(`✅ Seeded ${sampleEvents.length} events for Org ${orgId}`);
    }

    console.log('\n🎉 EVENTS MASTER SEEDED SUCCESSFULLY!');
    await closeKnex();
  } catch (err) {
    console.error('❌ Error seeding events master:', err);
    process.exit(1);
  }
}

// Run standalone if executed directly
if (process.argv[1]?.includes('seed_events_master')) {
  seedEventsMasterData();
}
