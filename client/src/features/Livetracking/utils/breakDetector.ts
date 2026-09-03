// ============================================================
// breakDetector — Real-Time Stop & Break Point Calculation
// client/src/features/Livetracking/utils/breakDetector.ts
// ============================================================
import type { RoutePoint, BreakPoint } from '../types/livetracking.types';

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

function getRecTime(p: RoutePoint): string {
  return p.recorded_at || (p as any).recordedAt || new Date().toISOString();
}

/**
 * Analyzes a chronological list of route breadcrumb points
 * and detects stationary clusters (stops/breaks).
 *
 * @param trail Chronological list of location pings
 * @param minBreakDurationMs Minimum stay time to register as a break (default: 3 mins for meaningful breaks)
 * @param maxClusterRadiusMeters Maximum movement allowed while stopped (default: 50m for GPS noise tolerance)
 */
export function detectBreakPoints(
  trail: RoutePoint[],
  minBreakDurationMs = 3 * 60 * 1000, // 3 minutes - real break detection (not traffic lights!)
  maxClusterRadiusMeters = 50 // 50m tolerance for GPS noise and movement at stop
): BreakPoint[] {
  if (!trail || trail.length === 0) return [];

  const breaks: BreakPoint[] = [];
  let clusterStart = trail[0];
  let clusterEnd = trail[0];
  let clusterPoints: RoutePoint[] = [trail[0]];

  for (let i = 1; i < trail.length; i++) {
    const current = trail[i];
    const distFromStart = haversineMeters(
      Number(clusterStart.latitude),
      Number(clusterStart.longitude),
      Number(current.latitude),
      Number(current.longitude)
    );

    if (distFromStart <= maxClusterRadiusMeters) {
      // Still in the same stationary spot
      clusterEnd = current;
      clusterPoints.push(current);
    } else {
      // Moved away from the stationary spot — evaluate previous cluster
      const startTimeStr = getRecTime(clusterStart);
      const endTimeStr = getRecTime(clusterEnd);
      const startTime = new Date(startTimeStr).getTime();
      const endTime = new Date(endTimeStr).getTime();
      const durationMs = Math.max(endTime - startTime, 0);

      if (durationMs >= minBreakDurationMs && !isNaN(startTime) && !isNaN(endTime)) {
        // Calculate average location of cluster
        const avgLat = clusterPoints.reduce((acc, p) => acc + Number(p.latitude), 0) / clusterPoints.length;
        const avgLng = clusterPoints.reduce((acc, p) => acc + Number(p.longitude), 0) / clusterPoints.length;
        const durationMinutes = Math.max(1, Math.ceil(durationMs / 60_000));

        breaks.push({
          id: `break-${startTimeStr}-${breaks.length}`,
          latitude: avgLat,
          longitude: avgLng,
          startTime: startTimeStr,
          endTime: endTimeStr,
          durationMinutes,
        });
      }

      // Reset cluster to current point
      clusterStart = current;
      clusterEnd = current;
      clusterPoints = [current];
    }
  }

  // Evaluate active/ongoing stationary cluster
  const startTimeStr = getRecTime(clusterStart);
  const endTimeStr = getRecTime(clusterEnd);
  const startTime = new Date(startTimeStr).getTime();
  const lastPingTime = new Date(endTimeStr).getTime();
  const currentTime = Date.now();

  const isRecentPing = !isNaN(lastPingTime) && Math.abs(currentTime - lastPingTime) < 15 * 60 * 1000;
  const ongoingDurationMs = isRecentPing
    ? Math.max(currentTime - startTime, lastPingTime - startTime)
    : Math.max(lastPingTime - startTime, 0);

  if (ongoingDurationMs >= minBreakDurationMs && !isNaN(startTime)) {
    const avgLat = clusterPoints.reduce((acc, p) => acc + Number(p.latitude), 0) / clusterPoints.length;
    const avgLng = clusterPoints.reduce((acc, p) => acc + Number(p.longitude), 0) / clusterPoints.length;
    const durationMinutes = Math.max(1, Math.ceil(ongoingDurationMs / 60_000));

    breaks.push({
      id: `break-${startTimeStr}-${breaks.length}`,
      latitude: avgLat,
      longitude: avgLng,
      startTime: startTimeStr,
      endTime: new Date(startTime + ongoingDurationMs).toISOString(),
      durationMinutes,
    });
  }

  return breaks;
}
