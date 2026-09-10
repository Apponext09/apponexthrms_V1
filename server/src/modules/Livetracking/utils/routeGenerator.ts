// ============================================================
// routeGenerator.ts — Server-Side Route Generation with Caching
// Swiggy/Zomato-style road-following routes
// ============================================================

interface RouteSegmentCache {
  polyline: [number, number][];
  distance: number;
  duration: number;
  cachedAt: number;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
  speed?: number | null;
  recorded_at?: string;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const ROUTE_CACHE = new Map<string, RouteSegmentCache>();
const CACHE_TTL_MS = 3_600_000; // 1 hour
const MAX_CACHE_SIZE = 5000; // Increased from 1000

function cacheKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
  return `${lat1.toFixed(4)},${lng1.toFixed(4)};${lat2.toFixed(4)},${lng2.toFixed(4)}`;
}

function pruneCache(): void {
  if (ROUTE_CACHE.size <= MAX_CACHE_SIZE) return;
  const cutoff = Date.now() - CACHE_TTL_MS;
  const expired: string[] = [];

  ROUTE_CACHE.forEach((val, key) => {
    if (val.cachedAt < cutoff) expired.push(key);
  });

  // Remove oldest 50% of expired entries
  expired.slice(0, Math.max(1, expired.length / 2)).forEach((k) => ROUTE_CACHE.delete(k));
}

/**
 * Decode OSRM polyline (6-precision encoded format)
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
 * Fetch road-following route between two points from OSRM
 * WITH caching to avoid duplicate API calls
 */
export async function getRoutePolyline(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  timeout = 5000
): Promise<[number, number][] | null> {
  const key = cacheKey(lat1, lng1, lat2, lng2);

  // Check cache first
  const cached = ROUTE_CACHE.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    // Cache hit - log in dev mode only
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RouteGenerator] Cache HIT: ${key}`);
    }
    return cached.polyline;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const url = `${OSRM_BASE_URL}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?geometries=polyline&overview=full`;

    const startTime = Date.now();
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    const fetchTime = Date.now() - startTime;

    if (!res.ok) {
      console.warn(`[RouteGenerator] OSRM error ${res.status} for ${key}`);
      return null;
    }

    const data = (await res.json()) as any;
    const routes = data?.routes ?? [];

    if (!routes.length) {
      console.warn(`[RouteGenerator] No routes in OSRM response for ${key}`);
      return null;
    }

    const geometry = routes[0]?.geometry;
    if (!geometry) {
      console.warn(`[RouteGenerator] No geometry in route for ${key}`);
      return null;
    }

    const polyline = decodePolyline(geometry);
    const distance = routes[0].distance ?? 0;
    const duration = routes[0].duration ?? 0;

    // Cache the result
    pruneCache();
    ROUTE_CACHE.set(key, {
      polyline,
      distance,
      duration,
      cachedAt: Date.now(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[RouteGenerator] Routed ${key}: ${polyline.length} points, ${(distance / 1000).toFixed(2)}km, ${fetchTime}ms`
      );
    }

    return polyline;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[RouteGenerator] OSRM timeout for ${key} (${timeout}ms)`);
    } else {
      console.error(`[RouteGenerator] OSRM error for ${key}:`, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/**
 * Generate complete routed polyline for employee trail
 * Batches requests for efficiency and handles fallbacks
 * Like Swiggy/Zomato delivery tracking
 */
export async function generateRoutedTrail(
  points: RoutePoint[],
  options: { maxTimeout?: number; batchSize?: number; employeeId?: number } = {}
): Promise<[number, number][]> {
  if (points.length < 2) {
    return points
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [Number(p.longitude), Number(p.latitude)]);
  }

  const { maxTimeout = 10000, batchSize = 5, employeeId } = options;
  const result: [number, number][] = [];
  const empLog = employeeId ? `[emp-${employeeId}]` : '';

  try {
    // Add first point
    result.push([Number(points[0].longitude), Number(points[0].latitude)]);

    // Generate route segments with intelligent batching
    const segments: { from: number; to: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({ from: i, to: i + 1 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[RouteGenerator] ${empLog} Starting trail routing: ${segments.length} segments, batch=${batchSize}`);
    }

    let successCount = 0;
    let fallbackCount = 0;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, Math.min(i + batchSize, segments.length));
      const perSegmentTimeout = Math.max(1000, Math.floor(maxTimeout / Math.ceil(segments.length / batchSize)));

      const routePromises = batch.map(({ from, to }) =>
        getRoutePolyline(
          Number(points[from].latitude),
          Number(points[from].longitude),
          Number(points[to].latitude),
          Number(points[to].longitude),
          perSegmentTimeout
        ).catch(() => null)
      );

      const polylines = await Promise.all(routePromises);

      // Combine results
      for (let j = 0; j < polylines.length; j++) {
        const polyline = polylines[j];
        if (polyline && polyline.length > 1) {
          result.push(...polyline.slice(1));
          successCount++;
        } else {
          const nextIdx = batch[j].to;
          result.push([Number(points[nextIdx].longitude), Number(points[nextIdx].latitude)]);
          fallbackCount++;
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[RouteGenerator] ${empLog} Trail complete: ${result.length} polyline points, ${successCount} routed/${fallbackCount} fallback segments`
      );
    }

    return result;
  } catch (err) {
    console.error(`[RouteGenerator] ${empLog} Trail generation error:`, err instanceof Error ? err.message : err);
    // Ultimate fallback: return raw GPS trail
    return points
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [Number(p.longitude), Number(p.latitude)]);
  }
}

/**
 * Clear expired cache entries (call periodically)
 */
export function clearExpiredCache(): void {
  const cutoff = Date.now() - CACHE_TTL_MS;
  const keysToDelete: string[] = [];

  ROUTE_CACHE.forEach((val, key) => {
    if (val.cachedAt < cutoff) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((k) => ROUTE_CACHE.delete(k));
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate?: number;
} {
  return {
    size: ROUTE_CACHE.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
