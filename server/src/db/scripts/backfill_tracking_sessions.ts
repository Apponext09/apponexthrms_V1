// ============================================================
// Backfill script — compute sessions from existing breadcrumbs
// Run: npx tsx src/db/scripts/backfill_tracking_sessions.ts
// ============================================================
import { getKnex } from '../knex.js';
import { calculateSessionMetrics } from '../../modules/Livetracking/utils/sessionCalculator.js';

const db = getKnex();

async function run() {
  console.log('[Backfill] Finding distinct employee/date combos in employee_location_history...');

  const combos = await db('employee_location_history')
    .select(
      'organization_id',
      'employee_id',
      db.raw('DATE(recorded_at) as session_date')
    )
    .groupByRaw('organization_id, employee_id, DATE(recorded_at)');

  console.log(`[Backfill] Found ${combos.length} employee-day combos to process.`);

  for (const combo of combos) {
    const sessionDateStr = typeof combo.session_date === 'object'
      ? (combo.session_date as Date).toISOString().slice(0, 10)
      : String(combo.session_date).slice(0, 10);

    const orgId = Number(combo.organization_id);
    const empId = Number(combo.employee_id);

    const breadcrumbs = await db('employee_location_history')
      .where('organization_id', orgId)
      .where('employee_id', empId)
      .andWhereRaw('DATE(recorded_at) = ?', [sessionDateStr])
      .orderBy('recorded_at', 'asc')
      .select('latitude', 'longitude', 'speed', 'recorded_at');

    if (!breadcrumbs || breadcrumbs.length === 0) continue;

    const metrics = calculateSessionMetrics(breadcrumbs);

    await db('employee_tracking_sessions')
      .insert({
        organization_id: orgId,
        employee_id: empId,
        session_date: sessionDateStr,
        session_start: metrics.sessionStart,
        session_end: metrics.sessionEnd,
        total_working_minutes: metrics.totalWorkingMinutes,
        total_break_minutes: metrics.totalBreakMinutes,
        break_count: metrics.breakCount,
        total_distance_km: metrics.totalDistanceKm,
        ping_count: metrics.pingCount,
      })
      .onConflict(['organization_id', 'employee_id', 'session_date'])
      .merge({
        session_start: metrics.sessionStart,
        session_end: metrics.sessionEnd,
        total_working_minutes: metrics.totalWorkingMinutes,
        total_break_minutes: metrics.totalBreakMinutes,
        break_count: metrics.breakCount,
        total_distance_km: metrics.totalDistanceKm,
        ping_count: metrics.pingCount,
      });

    console.log(`[Backfill] ✅ emp:${combo.employee_id} | ${sessionDateStr} | ${metrics.pingCount} pings | ${metrics.totalWorkingMinutes}min work | ${metrics.totalBreakMinutes}min break`);
  }

  console.log('[Backfill] Done!');
  await db.destroy();
}

run().catch((err) => {
  console.error('[Backfill] ❌ Error:', err?.message || err);
  process.exit(1);
});
