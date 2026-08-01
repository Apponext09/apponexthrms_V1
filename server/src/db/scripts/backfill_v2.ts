// ============================================================
// Backfill — compute sessions from existing breadcrumbs
// Run: npx tsx src/db/scripts/backfill_v2.ts
//
// NOTE: knex postProcessResponse hook converts snake_case -> camelCase
// So organization_id -> organizationId, etc.
// ============================================================
import { getKnex } from '../knex.js';
import { calculateSessionMetrics } from '../../modules/Livetracking/utils/sessionCalculator.js';

const db = getKnex();

async function run() {
  const [comboRows] = await db.raw(`
    SELECT organization_id, employee_id, DATE(recorded_at) AS session_date
    FROM employee_location_history
    GROUP BY organization_id, employee_id, DATE(recorded_at)
  `);

  console.log(`[Backfill] Found ${comboRows.length} employee-day combos.`);
  if (comboRows.length > 0) {
    console.log('[Backfill] Sample keys:', Object.keys(comboRows[0]));
  }

  for (const row of comboRows) {
    // knex postProcessResponse converts snake_case -> camelCase
    const orgId = Number(row.organizationId ?? row.organization_id);
    const empId = Number(row.employeeId ?? row.employee_id);
    const rawDate = row.sessionDate ?? row.session_date;
    const dateStr: string =
      rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : String(rawDate).slice(0, 10);

    if (isNaN(orgId) || isNaN(empId) || !dateStr || dateStr === 'undefined') {
      console.warn('[Backfill] Skipping invalid row:', row);
      continue;
    }

    const [crumbRows] = await db.raw(
      `SELECT latitude, longitude, speed, recorded_at
       FROM employee_location_history
       WHERE organization_id = ? AND employee_id = ? AND DATE(recorded_at) = ?
       ORDER BY recorded_at ASC`,
      [orgId, empId, dateStr]
    );

    if (!crumbRows || crumbRows.length === 0) continue;

    const breadcrumbs = crumbRows.map((c: any) => ({
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
      speed: c.speed != null ? Number(c.speed) : null,
      recorded_at: c.recordedAt ?? c.recorded_at,
    }));

    const metrics = calculateSessionMetrics(breadcrumbs);

    // Convert ISO 8601 to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const toMysql = (iso: string | null): string | null => {
      if (!iso) return null;
      return iso.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace('Z', '');
    };

    const sessionStart = toMysql(metrics.sessionStart);
    const sessionEnd = toMysql(metrics.sessionEnd);

    await db.raw(
      `INSERT INTO employee_tracking_sessions
        (organization_id, employee_id, session_date, session_start, session_end,
         total_working_minutes, total_break_minutes, break_count, total_distance_km, ping_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        session_start = VALUES(session_start),
        session_end = VALUES(session_end),
        total_working_minutes = VALUES(total_working_minutes),
        total_break_minutes = VALUES(total_break_minutes),
        break_count = VALUES(break_count),
        total_distance_km = VALUES(total_distance_km),
        ping_count = VALUES(ping_count),
        updated_at = CURRENT_TIMESTAMP`,
      [
        orgId, empId, dateStr,
        sessionStart, sessionEnd,
        metrics.totalWorkingMinutes, metrics.totalBreakMinutes,
        metrics.breakCount, metrics.totalDistanceKm, metrics.pingCount,
      ]
    );

    console.log(`✅ emp:${empId} | ${dateStr} | ${metrics.pingCount} pings | work:${metrics.totalWorkingMinutes}min | break:${metrics.totalBreakMinutes}min | dist:${metrics.totalDistanceKm}km`);
  }

  console.log('[Backfill] Done!');
  await db.destroy();
}

run().catch((err) => {
  console.error('[Backfill] ❌ Error:', err?.message || err);
  process.exit(1);
});
