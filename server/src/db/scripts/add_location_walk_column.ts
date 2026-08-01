// ============================================================
// Migration: Add location_walk column to employee_tracking_sessions
// Run: npx tsx src/db/scripts/add_location_walk_column.ts
// ============================================================
import { getKnex } from '../knex.js';

const db = getKnex();

async function run() {
  console.log('[Migration] Checking location_walk column in employee_tracking_sessions...');

  const hasTable = await db.schema.hasTable('employee_tracking_sessions');
  if (!hasTable) {
    console.error('[Migration] Table employee_tracking_sessions does not exist.');
    await db.destroy();
    return;
  }

  const hasColumn = await db.schema.hasColumn('employee_tracking_sessions', 'location_walk');

  if (!hasColumn) {
    console.log('[Migration] Adding location_walk column...');
    await db.schema.alterTable('employee_tracking_sessions', (table) => {
      table.text('location_walk', 'longtext').nullable().comment('JSON array of chronological walk points [ {latitude, longitude, recorded_at, speed} ]');
    });
    console.log('[Migration] ✅ location_walk column added successfully!');
  } else {
    console.log('[Migration] location_walk column already exists.');
  }

  await db.destroy();
}

run().catch((err) => {
  console.error('[Migration] ❌ Error:', err?.message || err);
  process.exit(1);
});
