// ============================================================
// routeStats — Total distance / travel time / stop time helpers
// client/src/features/Livetracking/utils/routeStats.ts
// ============================================================
import type { RoutePoint, BreakPoint } from '../types/livetracking.types';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RouteStats {
  distanceKm: number;
  stopMinutes: number;
  travelMinutes: number;
  offlineMinutes: number;
  startTime: string | null;
  endTime: string | null;
}

/** Gaps between consecutive pings longer than this are treated as "offline/unknown",
 * not travel — the break-detector only clusters by distance, so a phone that goes
 * offline while still moving slowly would otherwise get counted as travel time. */
const OFFLINE_GAP_MS = 20 * 60 * 1000; // 20 minutes

/** Total distance (sum of consecutive breadcrumb hops), stop time, and travel time for a route trail */
export function computeRouteStats(
  routeTrail: RoutePoint[] | undefined,
  breakPoints: BreakPoint[] | undefined
): RouteStats {
  const trail = (routeTrail || []).filter(
    (p) =>
      p &&
      p.latitude != null &&
      p.longitude != null &&
      !isNaN(Number(p.latitude)) &&
      !isNaN(Number(p.longitude))
  );

  let distanceKm = 0;
  let offlineMinutes = 0;
  for (let i = 1; i < trail.length; i++) {
    distanceKm += haversineKm(
      Number(trail[i - 1].latitude),
      Number(trail[i - 1].longitude),
      Number(trail[i].latitude),
      Number(trail[i].longitude)
    );

    const t1 = new Date(trail[i - 1].recorded_at).getTime();
    const t2 = new Date(trail[i].recorded_at).getTime();
    if (!isNaN(t1) && !isNaN(t2) && t2 - t1 > OFFLINE_GAP_MS) {
      offlineMinutes += (t2 - t1) / 60000;
    }
  }

  const stopMinutes = (breakPoints || []).reduce((acc, b) => acc + (b.durationMinutes || 0), 0);

  const startTime = trail.length ? trail[0].recorded_at || null : null;
  const endTime = trail.length ? trail[trail.length - 1].recorded_at || null : null;

  let travelMinutes = 0;
  if (startTime && endTime) {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    if (!isNaN(startMs) && !isNaN(endMs)) {
      const elapsedMinutes = Math.max(0, (endMs - startMs) / 60000);
      travelMinutes = Math.max(0, elapsedMinutes - stopMinutes - offlineMinutes);
    }
  }

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    stopMinutes: Math.round(stopMinutes),
    travelMinutes: Math.round(travelMinutes),
    offlineMinutes: Math.round(offlineMinutes),
    startTime,
    endTime,
  };
}

export function formatMinutesLabel(mins?: number): string {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
