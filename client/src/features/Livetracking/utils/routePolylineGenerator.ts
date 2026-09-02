// ============================================================
// routePolylineGenerator — OSRM Road-Following Polylines
// client/src/features/Livetracking/utils/routePolylineGenerator.ts
//
// Fetches routing polylines from OSRM that follow actual roads
// instead of straight GPS lines. Includes LRU cache (1000 requests).
// ============================================================

interface RouteSegmentCache {
  polyline: [number, number][];
  distance: number;
  duration: number;
  cached: number;
}

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const ROUTE_CACHE = new Map<string, RouteSegmentCache>();
const CACHE_TTL_MS = 3_600_000; // 1 hour
const MAX_CACHE_SIZE = 1000;

function cacheKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
  return `${lat1.toFixed(5)},${lng1.toFixed(5)};${lat2.toFixed(5)},${lng2.toFixed(5)}`;
}

function pruneCache(): void {
  if (ROUTE_CACHE.size <= MAX_CACHE_SIZE) return;
  const cutoff = Date.now() - CACHE_TTL_MS;
  const expired: string[] = [];
  ROUTE_CACHE.forEach((val, key) => {
    if (val.cached < cutoff) expired.push(key);
  });
  expired.slice(0, Math.max(1, expired.length / 2)).forEach((k) => ROUTE_CACHE.delete(k));
}

/**
 * Decodes OSRM polyline (6-precision encoded format)
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;

  while (i < encoded.length) {
    let dLat = 0;
    let shift = 0;
    while (true) {
      const b = encoded.charCodeAt(i++) - 63;
      dLat |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    lat += dLat & 1 ? ~(dLat >> 1) : dLat >> 1;

    let dLng = 0;
    shift = 0;
    while (true) {
      const b = encoded.charCodeAt(i++) - 63;
      dLng |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }
    lng += dLng & 1 ? ~(dLng >> 1) : dLng >> 1;

    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

/**
 * Fetch a road-following route between two points from OSRM
 */
export async function getRoutePolyline(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  timeout = 3000
): Promise<[number, number][] | null> {
  const key = cacheKey(lat1, lng1, lat2, lng2);

  const cached = ROUTE_CACHE.get(key);
  if (cached && Date.now() - cached.cached < CACHE_TTL_MS) {
    if (import.meta.env.DEV) console.log(`[Route] Cache hit: ${key}`);
    return cached.polyline;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const url = `${OSRM_BASE_URL}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?geometries=polyline&overview=full`;

    if (import.meta.env.DEV) console.log(`[Route] Fetching: ${key}`);

    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      if (import.meta.env.DEV) console.warn(`[Route] OSRM returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as any;
    const routes = data?.routes ?? [];
    if (!routes.length) {
      if (import.meta.env.DEV) console.warn(`[Route] No routes in OSRM response`);
      return null;
    }

    const geometry = routes[0]?.geometry;
    if (!geometry) {
      if (import.meta.env.DEV) console.warn(`[Route] No geometry in route`);
      return null;
    }

    const polyline = decodePolyline(geometry);
    if (import.meta.env.DEV) console.log(`[Route] Got ${polyline.length} points for ${key}`);

    pruneCache();
    ROUTE_CACHE.set(key, {
      polyline,
      distance: routes[0].distance ?? 0,
      duration: routes[0].duration ?? 0,
      cached: Date.now(),
    });

    return polyline;
  } catch (err) {
    if (import.meta.env.DEV) console.warn(`[Route] Error for ${key}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Generate routed polylines for employee trail
 */
export async function generateRoutedTrail(
  points: Array<{ latitude: number; longitude: number }>
): Promise<[number, number][]> {
  if (points.length < 2) return [];

  const result: [number, number][] = [];

  try {
    // Add first point
    result.push([Number(points[0].longitude), Number(points[0].latitude)]);

    // Fetch routes for each segment in parallel (faster)
    const routePromises: Promise<[number, number][] | null>[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      routePromises.push(
        getRoutePolyline(
          Number(current.latitude),
          Number(current.longitude),
          Number(next.latitude),
          Number(next.longitude),
          2000 // Reduce timeout for faster fallback
        ).catch(() => null)
      );
    }

    const polylines = await Promise.all(routePromises);

    // Combine results
    for (let i = 0; i < polylines.length; i++) {
      const polyline = polylines[i];
      if (polyline && polyline.length > 1) {
        // Skip first point (already added or duplicate)
        result.push(...polyline.slice(1));
      } else {
        // Fallback: direct line to next point
        const next = points[i + 1];
        result.push([Number(next.longitude), Number(next.latitude)]);
      }
    }

    return result;
  } catch (err) {
    // Ultimate fallback: return raw GPS trail
    console.warn('[Route] Error generating routed trail:', err);
    return points.map((p) => [Number(p.longitude), Number(p.latitude)]);
  }
}
