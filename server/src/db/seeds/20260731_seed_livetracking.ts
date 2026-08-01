// ============================================================
// Seed: Livetracking — Demo breadcrumbs + session metrics
// server/src/db/seeds/20260731_seed_livetracking.ts
//
// Run: npx ts-node -r tsconfig-paths/register src/db/seeds/20260731_seed_livetracking.ts
// ============================================================
import { getKnex } from '../knex';
import { calculateSessionMetrics } from '../../modules/Livetracking/utils/sessionCalculator';

const db = getKnex();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toMysqlDatetime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Simulate a walking route as breadcrumbs starting from baseLat/baseLng */
function generateBreadcrumbs(
  orgId: number,
  employeeId: number,
  baseLat: number,
  baseLng: number,
  date: Date,
  startHourUTC: number,
  pingCount = 30
) {
  const points = [];
  let curLat = baseLat;
  let curLng = baseLng;
  let time = new Date(date);
  time.setUTCHours(startHourUTC, 0, 0, 0);

  for (let i = 0; i < pingCount; i++) {
    // 2-minute intervals, with a 10-min stationary break between pings 12-17
    const isBreak = i >= 12 && i < 17;
    if (!isBreak) {
      curLat += (Math.random() - 0.45) * 0.0006;
      curLng += (Math.random() - 0.45) * 0.0008;
    }

    points.push({
      organization_id: orgId,
      employee_id: employeeId,
      latitude: Math.round(curLat * 1e7) / 1e7,
      longitude: Math.round(curLng * 1e7) / 1e7,
      accuracy: 5 + Math.random() * 10,
      speed: isBreak ? 0 : 1 + Math.random() * 25,
      recorded_at: toMysqlDatetime(time),
      created_at: toMysqlDatetime(time),
    });

    // Advance time: 2 min normally, 15 min for the break period
    time = new Date(time.getTime() + (isBreak ? 15 * 60_000 : 2 * 60_000));
  }

  return points;
}

async function run() {
  // Find first 2 active employees in any organization
  const employees = await db('employees as e')
    .whereIn('e.status', ['active', 'probation'])
    .whereNull('e.deleted_at')
    .join('users as u', 'u.employee_id', 'e.id')
    .select('e.id', 'e.organization_id', 'e.first_name')
    .limit(2);

  if (employees.length === 0) {
    console.log('[Seed] No active employees found — skipping livetracking seed');
    return;
  }

  const today = new Date();

  for (const emp of employees) {
    const orgId = Number((emp as any).organizationId ?? (emp as any).organization_id);
    const empId = Number((emp as any).id);
    const firstName = (emp as any).firstName ?? (emp as any).first_name;

    // Query current live location if available to anchor history locally
    const liveRow = await db('employee_live_locations')
      .where('organization_id', orgId)
      .where('employee_id', empId)
      .select('latitude', 'longitude')
      .first();

    const currentLat = liveRow?.latitude ? Number(liveRow.latitude) : 20.0059;
    const currentLng = liveRow?.longitude ? Number(liveRow.longitude) : 73.7898;

    // Generate breadcrumbs for today and the past 2 days
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateString = dateStr(date);

      // Base coordinates anchored near current live location (Nashik / local area)
      const baseLat = currentLat + (dayOffset * 0.002) - 0.005;
      const baseLng = currentLng + (dayOffset * 0.002) - 0.005;

      // Delete existing breadcrumbs for this employee/date before seeding
      await db.raw(
        `DELETE FROM employee_location_history WHERE organization_id = ? AND employee_id = ? AND DATE(recorded_at) = ?`,
        [orgId, empId, dateString]
      );

      const breadcrumbs = generateBreadcrumbs(
        orgId,
        empId,
        baseLat,
        baseLng,
        date,
        3,   // 3am UTC = ~8:30am IST start
        28   // 28 pings = ~1hr active time
      );

      await db('employee_location_history').insert(breadcrumbs);

      // Update live_locations to match the last seeded point if dayOffset === 0
      if (dayOffset === 0 && breadcrumbs.length > 0) {
        const lastPt = breadcrumbs[breadcrumbs.length - 1];
        await db('employee_live_locations')
          .insert({
            organization_id: orgId,
            employee_id: empId,
            latitude: lastPt.latitude,
            longitude: lastPt.longitude,
            location_status: 'ON',
            connection_status: 'ONLINE',
            last_ping_at: lastPt.recorded_at,
          })
          .onConflict(['organization_id', 'employee_id'])
          .merge({
            latitude: lastPt.latitude,
            longitude: lastPt.longitude,
            location_status: 'ON',
            connection_status: 'ONLINE',
            last_ping_at: lastPt.recorded_at,
          });
      }

      // Compute and upsert session metrics
      const metrics = calculateSessionMetrics(breadcrumbs);
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
          orgId, empId, dateString,
          sessionStart, sessionEnd,
          metrics.totalWorkingMinutes, metrics.totalBreakMinutes,
          metrics.breakCount, metrics.totalDistanceKm, metrics.pingCount,
        ]
      );

      console.log(`[Seed] ${firstName} (id:${empId}) | ${dateString} | ${metrics.totalWorkingMinutes}min work | ${metrics.totalBreakMinutes}min break | ${metrics.totalDistanceKm}km`);
    }
  }

  console.log('[Seed] Livetracking seed completed.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
