// ============================================================
// roadSnapper.ts — OSRM Road-Snap Utility
// server/src/modules/Livetracking/utils/roadSnapper.ts
//
// Snaps raw GPS coordinates to the nearest road using the
// public OSRM routing engine (project-osrm.org). Falls back
// silently to the original coordinates if OSRM is unreachable
// or the point is too far from any road (>50m snap distance).
//
// OSRM Nearest API:
//   GET /nearest/v1/driving/{lng},{lat}?number=1
//   Returns { waypoints: [{ location: [lng, lat], distance: m }] }
// ============================================================

interface SnapResult {
  latitude: number;
  longitude: number;
  /** true = coordinate was snapped to road; false = original used */
  snapped: boolean;
  /** distance in meters from raw GPS to snapped point */
  snapDistanceM: number;
}

/** Maximum distance in meters to accept a road snap. Beyond this, use raw GPS. */
const MAX_SNAP_DISTANCE_M = 50;

/** OSRM endpoint — uses public instance; replace with self-hosted for production */
const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

/** In-memory LRU-style cache: ~100m precision key → snapped result */
const snapCache = new Map<string, SnapResult & { cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function cacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places (~11m precision grid)
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function pruneCache(): void {
  if (snapCache.size < 1000) return;
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [k, v] of snapCache) {
    if (v.cachedAt < cutoff) snapCache.delete(k);
  }
}

/**
 * Snaps a GPS coordinate to the nearest road using OSRM Nearest API.
 * Returns the original coordinates on failure (never throws).
 */
export async function snapToRoad(
  latitude: number,
  longitude: number
): Promise<SnapResult> {
  const key = cacheKey(latitude, longitude);

  // Check cache
  const cached = snapCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { latitude: cached.latitude, longitude: cached.longitude, snapped: cached.snapped, snapDistanceM: cached.snapDistanceM };
  }

  const fallback: SnapResult = {
    latitude,
    longitude,
    snapped: false,
    snapDistanceM: 0,
  };

  try {
    const url = `${OSRM_BASE_URL}/nearest/v1/driving/${longitude},${latitude}?number=1`;

    // 3-second hard timeout — GPS events must not be delayed
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ApponextHRMS/1.0' },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) return fallback;

    const data = await res.json() as any;

    const waypoints: any[] = data?.waypoints ?? [];
    if (!waypoints.length) return fallback;

    const [snapLng, snapLat] = waypoints[0].location as [number, number];
    const dist: number = waypoints[0].distance ?? 0;

    // Reject snaps that are too far from raw GPS (likely in a building or off-road)
    if (dist > MAX_SNAP_DISTANCE_M) return fallback;

    const result: SnapResult = {
      latitude: snapLat,
      longitude: snapLng,
      snapped: true,
      snapDistanceM: Math.round(dist),
    };

    pruneCache();
    snapCache.set(key, { ...result, cachedAt: Date.now() });
    return result;
  } catch {
    // AbortError (timeout) or network error — use raw GPS silently
    return fallback;
  }
}
