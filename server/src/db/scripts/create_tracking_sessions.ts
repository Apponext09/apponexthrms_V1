// ============================================================
// Direct migration script for employee_tracking_sessions
// Run: npx tsx src/db/scripts/create_tracking_sessions.ts
// ============================================================
import { getKnex } from '../knex.js';

const db = getKnex();

async function run() {
  console.log('[Migration] Checking employee_tracking_sessions table...');

  const hasTable = await db.schema.hasTable('employee_tracking_sessions');

  if (hasTable) {
    console.log('[Migration] Table already exists. Nothing to do.');
    await db.destroy();
    return;
  }

  console.log('[Migration] Creating employee_tracking_sessions table...');

  await db.schema.createTable('employee_tracking_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.string('uuid', 36).notNullable().unique().defaultTo(db.raw('(UUID())'));
    table.integer('organization_id').unsigned().notNullable();
    table.integer('employee_id').unsigned().notNullable();
    table.date('session_date').notNullable();

    // Timing
    table.datetime('session_start').nullable();
    table.datetime('session_end').nullable();
    table.integer('total_working_minutes').unsigned().notNullable().defaultTo(0);
    table.integer('total_break_minutes').unsigned().notNullable().defaultTo(0);
    table.integer('break_count').unsigned().notNullable().defaultTo(0);

    // Distance
    table.decimal('total_distance_km', 10, 4).unsigned().notNullable().defaultTo(0);

    // Ping count
    table.integer('ping_count').unsigned().notNullable().defaultTo(0);

    table.datetime('created_at').notNullable().defaultTo(db.raw('CURRENT_TIMESTAMP'));
    table.datetime('updated_at').notNullable().defaultTo(
      db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    );

    table.unique(['organization_id', 'employee_id', 'session_date'], 'uniq_tracking_session');
    table.index(['organization_id', 'session_date'], 'idx_tracking_session_org_date');
    table.index(['employee_id', 'session_date'], 'idx_tracking_session_emp_date');
  });

  console.log('[Migration] ✅ employee_tracking_sessions table created successfully!');
  await db.destroy();
}

run().catch((err) => {
  console.error('[Migration] ❌ Error:', err?.message || err);
  process.exit(1);
});
