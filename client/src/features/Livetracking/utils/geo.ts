// ============================================================
// Geo helpers shared by the live tracking store and map engine
// client/src/features/Livetracking/utils/geo.ts
// ============================================================

/** Silence longer than this starts a new route segment (matches the server) */
export const SEGMENT_GAP_MS = 15 * 60_000;
/** Route points closer than this to the previous kept point are GPS jitter, not movement */
export const ROUTE_MIN_SPACING_M = 10;
/** Hops faster than this are glitches — the route is split instead of drawing a huge line */
export const MAX_PLAUSIBLE_SPEED_MPS = 70;

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  if (lat == null || lng == null) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180 &&
    (nLat !== 0 || nLng !== 0)
  );
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compass bearing (0–360°, 0 = north) from point 1 to point 2 */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Interpolate between two angles along the shorter arc (so 350° → 10° turns 20°, not 340°) */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * t + 360) % 360;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  /** epoch ms */
  ts: number;
  /** true when this point must not be connected to the previous one */
  brk?: boolean;
}

/**
 * Whether `next` should be appended after `last` in a route line: always on a
 * gap/break, otherwise only when it has moved past GPS jitter distance.
 */
export function routeAppendDecision(
  last: TrackPoint | null,
  next: TrackPoint
): { append: boolean; brk: boolean } {
  if (!last) return { append: true, brk: true };
  if (next.brk) return { append: true, brk: true };
  const dt = next.ts - last.ts;
  if (dt >= SEGMENT_GAP_MS) return { append: true, brk: true };
  const d = haversineMeters(last.lat, last.lng, next.lat, next.lng);
  if (dt > 0 && d / (dt / 1000) > MAX_PLAUSIBLE_SPEED_MPS && d > 500) return { append: true, brk: true };
  return { append: d >= ROUTE_MIN_SPACING_M, brk: false };
}

/** Thin + split raw points (chronological) into route points with segment breaks marked */
export function buildRoutePoints(raw: TrackPoint[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (const p of raw) {
    if (!isValidCoord(p.lat, p.lng)) continue;
    const last = out[out.length - 1] ?? null;
    if (last && p.ts <= last.ts) continue;
    const { append, brk } = routeAppendDecision(last, p);
    if (append) out.push({ lat: p.lat, lng: p.lng, ts: p.ts, brk });
  }
  return out;
}

/** Route points → GeoJSON MultiLineString coordinates ([lng, lat] order) */
export function toLineCoordinates(points: TrackPoint[], upTo = points.length): [number, number][][] {
  const lines: [number, number][][] = [];
  let current: [number, number][] = [];
  for (let i = 0; i < upTo; i++) {
    const p = points[i];
    if (p.brk && current.length) {
      lines.push(current);
      current = [];
    }
    current.push([p.lng, p.lat]);
  }
  if (current.length) lines.push(current);
  return lines.filter((l) => l.length >= 2);
}

/** Sum of segment lengths in meters (segment breaks are not counted) */
export function routeDistanceMeters(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].brk) continue;
    total += haversineMeters(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total;
}
