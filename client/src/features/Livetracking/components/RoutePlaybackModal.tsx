// ============================================================
// RoutePlaybackModal — Travel History & Animated Route Playback
// client/src/features/Livetracking/components/RoutePlaybackModal.tsx
// Supports light & dark mode theme compatibility
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../map/maplibreWorker';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Loader2, Navigation } from 'lucide-react';
import { fetchRouteHistory } from '../api/livetrackingApi';
import { localDateStr, shiftDateStr } from '../utils/dates';
import type { LiveEmployee, RoutePoint } from '../types/livetracking.types';

// Fix for Vite bundling — not needed with MapLibre, kept as no-op for safety

// Default focus when a route hasn't loaded yet (Navi Mumbai — matches the live dashboard default)
// Neutral fallback before route data loads; route coordinates set the real focus.
const DEFAULT_MAP_CENTER: [number, number] = [78.9629, 20.5937];


/** Helper to convert 0-indexed integer into alphabet label (0->A, 1->B, 2->C, 3->D...) */
function getAlphabetLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return `${first}${second}`;
}

// createWaypointAlphabetIcon removed (was Leaflet DivIcon) — PlaybackMap renders cluster markers directly


/** Destination Cluster interface for location-wise differential alphabet markers */
export interface DestinationCluster {
  letter: string;
  index: number;
  rawIndex: number;
  frameIndex: number;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

/** Detects major destination/location clusters along a route (e.g. Pune -> A, Mumbai -> B, Nagpur -> C) */
function detectDestinationClusters(rawPoints: RoutePoint[], stepsPerSegment = 20): DestinationCluster[] {
  if (!rawPoints || rawPoints.length === 0) return [];

  const clusters: DestinationCluster[] = [];

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // 1. Point A: Origin start location
  const first = rawPoints[0];
  clusters.push({
    letter: 'A',
    index: 0,
    rawIndex: 0,
    frameIndex: 0,
    latitude: first.latitude,
    longitude: first.longitude,
    recorded_at: first.recorded_at || (first as any).recordedAt || '',
  });

  // 2. Iterate and cluster distinct destination locations (separated by > 1.0 km)
  let lastClusterPt = first;

  for (let i = 1; i < rawPoints.length - 1; i++) {
    const pt = rawPoints[i];
    const distFromLast = haversineKm(lastClusterPt.latitude, lastClusterPt.longitude, pt.latitude, pt.longitude);

    if (distFromLast >= 1.0) {
      const letter = getAlphabetLabel(clusters.length);
      const frameIdx = Math.min(i * stepsPerSegment, Math.max(0, (rawPoints.length - 1) * stepsPerSegment));
      clusters.push({
        letter,
        index: clusters.length,
        rawIndex: i,
        frameIndex: frameIdx,
        latitude: pt.latitude,
        longitude: pt.longitude,
        recorded_at: pt.recorded_at || (pt as any).recordedAt || '',
      });
      lastClusterPt = pt;
    }
  }

  // 3. Final Destination: If last point is far enough from last cluster or if only 1 cluster exists
  const last = rawPoints[rawPoints.length - 1];
  if (rawPoints.length > 1) {
    const distFromLast = haversineKm(lastClusterPt.latitude, lastClusterPt.longitude, last.latitude, last.longitude);
    const letter = getAlphabetLabel(clusters.length);
    const lastFrameIdx = Math.max(0, (rawPoints.length - 1) * stepsPerSegment);

    if (distFromLast >= 0.3 || clusters.length === 1) {
      clusters.push({
        letter,
        index: clusters.length,
        rawIndex: rawPoints.length - 1,
        frameIndex: lastFrameIdx,
        latitude: last.latitude,
        longitude: last.longitude,
        recorded_at: last.recorded_at || (last as any).recordedAt || '',
      });
    }
  }

  return clusters;
}

/** Interpolates sub-steps between raw waypoints for smooth 60fps frame-by-frame walking animation */
function interpolateRoutePoints(rawPoints: RoutePoint[], stepsPerSegment = 20): RoutePoint[] {
  if (!rawPoints || rawPoints.length < 2) return rawPoints || [];

  const interpolated: RoutePoint[] = [];

  for (let i = 0; i < rawPoints.length - 1; i++) {
    const p1 = rawPoints[i];
    const p2 = rawPoints[i + 1];

    const timeStr1 = p1.recorded_at || (p1 as any).recordedAt || '';
    const timeStr2 = p2.recorded_at || (p2 as any).recordedAt || '';
    const t1 = new Date(timeStr1).getTime();
    const t2 = new Date(timeStr2).getTime();

    for (let step = 0; step < stepsPerSegment; step++) {
      const fraction = step / stepsPerSegment;
      const lat = p1.latitude + (p2.latitude - p1.latitude) * fraction;
      const lng = p1.longitude + (p2.longitude - p1.longitude) * fraction;

      const time =
        !isNaN(t1) && !isNaN(t2)
          ? new Date(t1 + (t2 - t1) * fraction).toISOString()
          : timeStr1;

      interpolated.push({
        latitude: lat,
        longitude: lng,
        speed: p1.speed ?? 15,
        recorded_at: time,
      });
    }
  }

  // Include final destination point
  interpolated.push(rawPoints[rawPoints.length - 1]);
  return interpolated;
}

// ── PlaybackMap — MapLibre GL JS powered playback map ────────────────────────
interface PlaybackMapProps {
  interpolatedRoute: RoutePoint[];
  rawRoute: RoutePoint[];
  playIndex: number;
  currentPoint: RoutePoint | undefined;
  destinationClusters: DestinationCluster[];
  employeeName: string;
  onJumpToCluster: (frameIndex: number) => void;
}

const PLAYBACK_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      // OSM only serves tiles up to z19 — capping the SOURCE here makes MapLibre
      // over-zoom (upscale) the last available tile beyond that instead of
      // fetching non-existent tiles.
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      // NOTE: no `maxzoom` on the LAYER — a layer-level maxzoom stops the layer
      // from rendering at all past that zoom (blank map), unlike a source maxzoom
      // which just triggers over-zoom. Keep this layer active at every zoom level.
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm-tiles',
    },
  ],
};

const PlaybackMap: React.FC<PlaybackMapProps> = ({
  interpolatedRoute,
  rawRoute,
  playIndex,
  currentPoint,
  destinationClusters,
  employeeName,
  onJumpToCluster,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Incrementally-built played-path buffer — avoids re-slicing/re-mapping the
  // whole interpolatedRoute array on every ~15-40ms animation tick, which was
  // the actual cause of the line lagging behind the marker on longer routes
  // (a full day's history can interpolate into tens of thousands of points).
  const playedCoordsRef = useRef<[number, number][]>([]);
  const lastPlayIndexRef = useRef<number>(-1);
  const lastRouteRef = useRef<RoutePoint[] | null>(null);

  // Keep the latest route in a ref so the map's 'load' handler (registered once,
  // on mount) can fit to it even if the route finishes loading AFTER the map's
  // 'load' event fires — using the closed-over prop there was stale and caused
  // the map to stay centered on the fallback location instead of the employee's route.
  const interpolatedRouteRef = useRef<RoutePoint[]>(interpolatedRoute);
  useEffect(() => {
    interpolatedRouteRef.current = interpolatedRoute;
  }, [interpolatedRoute]);

  // ── Init MapLibre ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const first = interpolatedRoute[0];
    const center: [number, number] = first
      ? [first.longitude, first.latitude]
      : DEFAULT_MAP_CENTER;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: PLAYBACK_MAP_STYLE,
      center,
      zoom: 13,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = map;

    // The modal's layout/transition can leave the map container at zero size
    // for a moment when the map initializes — resize once it has settled so
    // fitBounds computes against the real container dimensions, not a stale one.
    setTimeout(() => {
      try {
        map.resize();
      } catch {}
    }, 150);

    map.on('load', () => {
      // Full route trail source (dotted grey ghost path)
      map.addSource('full-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'full-route-line',
        type: 'line',
        source: 'full-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#64748b', 'line-width': 4, 'line-opacity': 0.45, 'line-dasharray': [2, 4] },
      });

      // Played path source (animated theme trail: Pure Black in Light mode, White in Dark mode)
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const lineColor = isDark ? '#ffffff' : '#000000';
      const glowColor = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)';

      map.addSource('played-path', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'played-glow',
        type: 'line',
        source: 'played-path',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': glowColor, 'line-width': 12, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'played-solid',
        type: 'line',
        source: 'played-path',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': lineColor, 'line-width': 5, 'line-opacity': 0.95 },
      });

      mapLoadedRef.current = true;

      // Use the latest route via ref — interpolatedRoute may still have been
      // empty (route still loading) when this 'load' handler was registered.
      const latestRoute = interpolatedRouteRef.current;

      // Fit to full route
      if (latestRoute.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        latestRoute.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        if (!bounds.isEmpty()) {
          map.resize();
          map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
        }
      }

      // Set full route source
      (map.getSource('full-route') as maplibregl.GeoJSONSource)?.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: latestRoute.map((p) => [p.longitude, p.latitude]),
        },
        properties: {},
      } as any);
    });

    return () => {
      mapLoadedRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update full route when interpolatedRoute changes ──────────────────
  useEffect(() => {
    if (!mapLoadedRef.current || !mapRef.current) return;
    (mapRef.current.getSource('full-route') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: interpolatedRoute.map((p) => [p.longitude, p.latitude]),
      },
      properties: {},
    } as any);

    // Re-fit bounds (resize first in case the container was 0-sized when the map initialized)
    if (interpolatedRoute.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      interpolatedRoute.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      if (!bounds.isEmpty()) {
        try {
          mapRef.current.resize();
        } catch {}
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
      }
    }
  }, [interpolatedRoute]);

  // ── Update played path (called on every playIndex tick) ───────────────
  useEffect(() => {
    if (!mapLoadedRef.current || !mapRef.current) return;

    // New route loaded (date/employee changed) — reset the incremental buffer.
    if (lastRouteRef.current !== interpolatedRoute) {
      playedCoordsRef.current = [];
      lastPlayIndexRef.current = -1;
      lastRouteRef.current = interpolatedRoute;
    }

    if (playIndex < lastPlayIndexRef.current) {
      // Scrubbed/seeked backward — rebuild once instead of trying to "un-append".
      playedCoordsRef.current = interpolatedRoute
        .slice(0, playIndex + 1)
        .map((p) => [p.longitude, p.latitude] as [number, number]);
    } else {
      for (let i = lastPlayIndexRef.current + 1; i <= playIndex && i < interpolatedRoute.length; i++) {
        const p = interpolatedRoute[i];
        if (p) playedCoordsRef.current.push([p.longitude, p.latitude]);
      }
    }
    lastPlayIndexRef.current = playIndex;

    (mapRef.current.getSource('played-path') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: playedCoordsRef.current,
      },
      properties: {},
    } as any);
  }, [playIndex, interpolatedRoute]);

  // ── Move animated player marker ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !currentPoint) return;

    const initials = (employeeName || 'Emp')
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    const el = document.createElement('div');
    el.style.cssText = `
      width:40px;height:40px;border-radius:50%;
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      border:3px solid #fff;
      box-shadow:0 4px 12px rgba(79,70,229,0.6);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:12px;font-weight:900;font-family:sans-serif;
      cursor:pointer;
    `;
    el.textContent = initials;

    if (!playerMarkerRef.current) {
      playerMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([currentPoint.longitude, currentPoint.latitude])
        .addTo(mapRef.current);
    } else {
      playerMarkerRef.current.setLngLat([currentPoint.longitude, currentPoint.latitude]);
    }
  }, [currentPoint, employeeName]);

  // ── Render destination cluster markers ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;

    // Remove old cluster markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    destinationClusters.forEach((cluster) => {
      const isStart = cluster.index === 0;
      const isEnd = cluster.index === destinationClusters.length - 1;
      const bg = isStart ? '#ef4444' : isEnd ? '#10b981' : '#6366f1';

      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:${bg};border:2.5px solid #fff;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:11px;font-weight:900;font-family:sans-serif;
        cursor:pointer;
      `;
      el.textContent = cluster.letter;
      el.title = `Point ${cluster.letter}${isStart ? ' (Start)' : isEnd ? ' (End)' : ''}`;

      el.addEventListener('click', () => onJumpToCluster(cluster.frameIndex));

      const popup = new maplibregl.Popup({ closeButton: false, offset: 15 }).setHTML(`
        <div style="background:#1e293b;color:#fff;border-radius:10px;padding:10px;font-family:sans-serif;font-size:12px;min-width:180px;">
          <div style="font-weight:900;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            <span style="width:18px;height:18px;border-radius:50%;background:${bg};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;">${cluster.letter}</span>
            Point ${cluster.letter} ${isStart ? '(Origin)' : isEnd ? '(Latest)' : `(Stop #${cluster.index})`}
          </div>
          ${cluster.recorded_at ? `<div style="color:#94a3b8;font-size:11px;">🕐 ${new Date(cluster.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          <div style="color:#94a3b8;font-size:11px;margin-top:2px;">🌐 ${cluster.latitude.toFixed(5)}, ${cluster.longitude.toFixed(5)}</div>
          <button onclick="window.__jumpToCluster_${cluster.frameIndex}()" style="margin-top:8px;width:100%;padding:5px 8px;border-radius:7px;background:#4f46e5;color:#fff;font-size:11px;font-weight:700;cursor:pointer;border:none;">▶ Jump to Point ${cluster.letter}</button>
        </div>
      `);

      // Attach global jump handler (cleaned up below)
      (window as any)[`__jumpToCluster_${cluster.frameIndex}`] = () => onJumpToCluster(cluster.frameIndex);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([cluster.longitude, cluster.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    return () => {
      destinationClusters.forEach((c) => {
        delete (window as any)[`__jumpToCluster_${c.frameIndex}`];
      });
    };
  }, [destinationClusters, onJumpToCluster]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }} />;
};

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  employee: LiveEmployee;
  onClose: () => void;
}

const SPEEDS = [1, 2, 4, 8];

export const RoutePlaybackModal: React.FC<Props> = ({ employee, onClose }) => {
  const [date, setDate] = useState(localDateStr());
  const [rawRoute, setRawRoute] = useState<RoutePoint[]>([]);
  const [interpolatedRoute, setInterpolatedRoute] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRoute = useCallback(async () => {
    setLoading(true);
    setIsPlaying(false);
    setPlayIndex(0);
    try {
      const data = await fetchRouteHistory(employee.employee_id, date);
      let pointsToUse: RoutePoint[] = [];

      if (data && data.length >= 2) {
        // Breadcrumbs are raw GPS; follow the road-snapped point where one exists
        pointsToUse = data.map((p) =>
          p.snapped_latitude != null && p.snapped_longitude != null
            ? { ...p, latitude: Number(p.snapped_latitude), longitude: Number(p.snapped_longitude) }
            : p
        );
      } else if (employee.routeTrail && employee.routeTrail.length >= 2) {
        pointsToUse = employee.routeTrail;
      }

      if (pointsToUse.length === 0) {
        setRawRoute([]);
        setInterpolatedRoute([]);
        setIsPlaying(false);
        return;
      }

      setRawRoute(pointsToUse);
      const smoothPoints = interpolateRoutePoints(pointsToUse, 25);
      setInterpolatedRoute(smoothPoints);

      if (smoothPoints.length > 1) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[RoutePlayback] Failed to load route history:', error);
      setRawRoute([]);
      setInterpolatedRoute([]);
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [
    employee.employee_id,
    employee.routeTrail,
    date,
  ]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Single-pass animation engine: Plays ONCE from Start -> End, then IMMEDIATELY STOPS. Holds at end frame!
  useEffect(() => {
    if (isPlaying && interpolatedRoute.length > 1) {
      const maxIndex = interpolatedRoute.length - 1;

      const tickRate = Math.max(15, Math.round(40 / SPEEDS[speedIdx]));
      intervalRef.current = setInterval(() => {
        setPlayIndex((prev) => {
          if (prev >= maxIndex) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsPlaying(false);
            return maxIndex;
          }

          const next = prev + 1;
          if (next >= maxIndex) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsPlaying(false);
            return maxIndex;
          }
          return next;
        });
      }, tickRate);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, interpolatedRoute.length, speedIdx]);

  const destinationClusters = useMemo(() => {
    return detectDestinationClusters(rawRoute, 20);
  }, [rawRoute]);

  const currentPoint = interpolatedRoute[playIndex] || interpolatedRoute[0];

  // Date navigation
  const shiftDate = (days: number) => {
    setDate(shiftDateStr(date, days));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card text-card-foreground border border-border/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex justify-between items-center bg-muted/20">
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary animate-pulse" />
              Live Travel Route Playback — {employee.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {employee.designation || 'Employee'} • {employee.department || 'General'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Selector */}
        <div className="px-5 py-3 flex items-center gap-3 border-b border-border/60 bg-muted/10 flex-wrap">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={localDateStr()}
            className="bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
          />
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={loadRoute}
            className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all"
          >
            Refresh Route
          </button>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {destinationClusters.length} Destinations ({rawRoute.length} GPS Points)
          </span>
        </div>

        {/* ── MapLibre GL JS map ──────────────────────────────── */}
        <div className="flex-1 min-h-[380px] relative">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <PlaybackMap
            interpolatedRoute={interpolatedRoute}
            rawRoute={rawRoute}
            playIndex={playIndex}
            currentPoint={currentPoint}
            destinationClusters={destinationClusters}
            employeeName={employee.name}
            onJumpToCluster={(frameIndex) => {
              setIsPlaying(false);
              setPlayIndex(frameIndex);
            }}
          />
        </div>

        {/* Playback Controls */}
        <div className="px-5 py-3.5 border-t border-border/60 flex items-center gap-4 flex-wrap bg-muted/20">
          {/* Progress Slider */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="range"
              min={0}
              max={Math.max(0, interpolatedRoute.length - 1)}
              value={playIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setPlayIndex(Number(e.target.value));
              }}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              <span>
                {interpolatedRoute[0]
                  ? new Date(interpolatedRoute[0].recorded_at).toLocaleTimeString('en-IN')
                  : '--:--'}
              </span>
              <span className="font-bold text-primary">
                Frame {playIndex + 1}/{interpolatedRoute.length} •{' '}
                {isPlaying ? '▶ Moving Live...' : '⏸ Paused'}
              </span>
              <span>
                {interpolatedRoute[interpolatedRoute.length - 1]
                  ? new Date(
                      interpolatedRoute[interpolatedRoute.length - 1].recorded_at
                    ).toLocaleTimeString('en-IN')
                  : '--:--'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(false);
                setPlayIndex(0);
              }}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
              title="Reset to Start"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => {
                if (playIndex >= interpolatedRoute.length - 1) {
                  setPlayIndex(0);
                }
                setIsPlaying((p) => !p);
              }}
              disabled={interpolatedRoute.length === 0}
              className={`px-4 py-2 rounded-xl font-black text-xs text-white flex items-center gap-1.5 shadow-2xs transition-all ${
                interpolatedRoute.length === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play Walking Animation'}
            </button>

            {/* Speed Selector */}
            <div className="flex gap-1">
              {SPEEDS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setSpeedIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    speedIdx === i
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
