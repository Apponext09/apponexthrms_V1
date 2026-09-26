// ============================================================
// sessionCalculator — Server-side break/distance calculator
// server/src/modules/Livetracking/utils/sessionCalculator.ts
//
// Computes from raw breadcrumb rows:
//  - total distance (haversine sum)
//  - stationary break clusters (>= 90s within 25m radius)
//  - total working minutes = span - breaks
// ============================================================

interface BreadcrumbRow {
  latitude: number;
  longitude: number;
  recorded_at: string | Date;
}

export interface SessionMetrics {
  sessionStart: string | null;
  sessionEnd: string | null;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  breakCount: number;
  totalDistanceKm: number;
  pingCount: number;
}

/** Haversine distance in meters */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate session metrics from a chronologically ordered list of breadcrumbs.
 *
 * Break Detection Rules:
 *  - Employee stays within 25m radius for >= minBreakDurationMs (30s) → counted as break
 *  - Break duration = time from first ping in cluster to last ping before movement
 *
 * Working Time:
 *  - span = last_ping_at - first_ping_at, minus untracked gaps (> TRACKING_GAP_MS)
 *  - working_minutes = span - break_minutes
 */
/** Pings further apart than this mean tracking was off in between */
const TRACKING_GAP_MS = 15 * 60_000;

function getTimeVal(p: BreadcrumbRow): string {
  return String(p.recorded_at || (p as any).recordedAt || new Date().toISOString());
}

export function calculateSessionMetrics(
  breadcrumbs: BreadcrumbRow[],
  minBreakDurationMs = 30_000,  // 30 seconds
  maxClusterRadiusMeters = 25   // 25 meters
): SessionMetrics {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return {
      sessionStart: null,
      sessionEnd: null,
      totalWorkingMinutes: 0,
      totalBreakMinutes: 0,
      breakCount: 0,
      totalDistanceKm: 0,
      pingCount: 0,
    };
  }

  const sorted = [...breadcrumbs].sort(
    (a, b) => new Date(getTimeVal(a)).getTime() - new Date(getTimeVal(b)).getTime()
  );

  const sessionStart = new Date(getTimeVal(sorted[0])).toISOString();
  const sessionEnd = new Date(getTimeVal(sorted[sorted.length - 1])).toISOString();
  const totalSpanMs = new Date(sessionEnd).getTime() - new Date(sessionStart).getTime();
  const timeMs = (p: BreadcrumbRow) => new Date(getTimeVal(p)).getTime();

  // ── Distance + untracked gaps ─────────────────────────────────────────────
  // A silence longer than TRACKING_GAP_MS means tracking was off (app closed,
  // checked out, phone dead). The straight line across such a gap is not a
  // travelled route and the time is not known working time — counting both
  // used to turn an overnight gap into "107 km travelled, 7h worked".
  let totalDistanceM = 0;
  let untrackedMs = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gapMs = timeMs(curr) - timeMs(prev);
    if (gapMs > TRACKING_GAP_MS) {
      untrackedMs += gapMs;
      continue;
    }
    totalDistanceM += haversineMeters(
      Number(prev.latitude),
      Number(prev.longitude),
      Number(curr.latitude),
      Number(curr.longitude)
    );
  }
  const totalDistanceKm = Math.round((totalDistanceM / 1000) * 10000) / 10000;

  // ── Break detection (stationary cluster algorithm) ────────────────────────
  let totalBreakMs = 0;
  let breakCount = 0;

  let clusterStart = sorted[0];
  let clusterEnd = sorted[0];

  const closeCluster = () => {
    const durationMs = timeMs(clusterEnd) - timeMs(clusterStart);
    if (durationMs >= minBreakDurationMs) {
      totalBreakMs += durationMs;
      breakCount++;
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const distFromStart = haversineMeters(
      Number(clusterStart.latitude),
      Number(clusterStart.longitude),
      Number(current.latitude),
      Number(current.longitude)
    );
    // An untracked gap also ends the cluster, so its time isn't counted twice
    // (once as untracked, once as a break).
    const gapMs = timeMs(current) - timeMs(clusterEnd);

    if (distFromStart <= maxClusterRadiusMeters && gapMs <= TRACKING_GAP_MS) {
      clusterEnd = current;
    } else {
      closeCluster();
      clusterStart = current;
      clusterEnd = current;
    }
  }
  closeCluster();

  // ── Working minutes ───────────────────────────────────────────────────────
  const totalBreakMinutes = Math.round(totalBreakMs / 60_000);
  const trackedSpanMinutes = Math.round((totalSpanMs - untrackedMs) / 60_000);
  const totalWorkingMinutes = Math.max(0, trackedSpanMinutes - totalBreakMinutes);

  return {
    sessionStart,
    sessionEnd,
    totalWorkingMinutes,
    totalBreakMinutes,
    breakCount,
    totalDistanceKm,
    pingCount: sorted.length,
  };
}
