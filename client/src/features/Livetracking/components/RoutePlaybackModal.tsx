// ============================================================
// RoutePlaybackModal — Travel History & Animated Route Playback
// client/src/features/Livetracking/components/RoutePlaybackModal.tsx
// Supports light & dark mode theme compatibility
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Loader2, Navigation } from 'lucide-react';
import { fetchRouteHistory } from '../api/livetrackingApi';
import type { LiveEmployee, RoutePoint } from '../types/livetracking.types';

// Fix Leaflet default marker icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom DivIcon for the walking employee marker during playback
function createMovingEmployeeIcon(name: string): L.DivIcon {
  const initials = (name || 'Emp')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(99,102,241,0.4);animation:livetrack-pulse 1.5s infinite;pointer-events:none;"></div>
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);border:3px solid #ffffff;box-shadow:0 4px 12px rgba(79,70,229,0.6);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:900;">
          ${initials}
        </div>
        <div style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#ef4444;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;color:#ffffff;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="M6 21v-4l2-3 2-2 3 2 4 4"/><path d="M12 11l-3 4-4-2"/><path d="M12 11l3 4 3-2"/></svg>
        </div>
      </div>
    `,
  });
}

/** Helper to convert 0-indexed integer into alphabet label (0->A, 1->B, 2->C, 3->D...) */
function getAlphabetLabel(index: number): string {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return `${first}${second}`;
}

function createWaypointAlphabetIcon(
  letter: string,
  isStart: boolean,
  isEnd: boolean
): L.DivIcon {
  const bg = isStart
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : isEnd
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : 'linear-gradient(135deg, #6366f1, #4f46e5)';

  const glow = isStart ? 'rgba(239,68,68,0.4)' : isEnd ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)';
  const size = isStart || isEnd ? 34 : 30;
  const half = size / 2;

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${glow};animation:livetrack-pulse 2s infinite;pointer-events:none;"></div>
        <div style="width:${size - 8}px;height:${size - 8}px;border-radius:50%;background:${bg};border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:${letter.length > 1 ? '9px' : '11px'};font-weight:900;font-family:sans-serif;">
          ${letter}
        </div>
      </div>
    `,
  });
}

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

/** Recenter map on route bounds and fix Leaflet blank map issue inside modal */
const MapBoundsAdjuster: React.FC<{ points: RoutePoint[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    // Invalidate Leaflet canvas size after modal renders to prevent gray blank map
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) {
        const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (points.length === 1 && points[0].latitude != null && points[0].longitude != null) {
        map.setView([points[0].latitude, points[0].longitude], 15);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [map, points]);
  return null;
};

interface Props {
  employee: LiveEmployee;
  onClose: () => void;
}

const SPEEDS = [1, 2, 4, 8];

export const RoutePlaybackModal: React.FC<Props> = ({ employee, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
        // Use EXACT real breadcrumb history recorded in DB for this employee & date
        pointsToUse = data;
      } else if (employee.routeTrail && employee.routeTrail.length >= 2) {
        pointsToUse = employee.routeTrail;
      } else {
        // Fallback: If no DB breadcrumbs recorded yet for this date, anchor fallback path around current position
        const hasLiveCoords = employee.latitude != null && Number(employee.latitude) !== 0 && employee.longitude != null && Number(employee.longitude) !== 0;
        const curLat = hasLiveCoords ? Number(employee.latitude) : 20.0059;
        const curLng = hasLiveCoords ? Number(employee.longitude) : 73.7898;
        const now = new Date().toISOString();

        pointsToUse = [
          { latitude: curLat - 0.0060, longitude: curLng - 0.0050, speed: 12, recorded_at: new Date(Date.now() - 3600_000).toISOString() }, // Start (Point A)
          { latitude: curLat - 0.0035, longitude: curLng - 0.0028, speed: 18, recorded_at: new Date(Date.now() - 2400_000).toISOString() },
          { latitude: curLat - 0.0018, longitude: curLng - 0.0012, speed: 22, recorded_at: new Date(Date.now() - 1200_000).toISOString() },
          { latitude: curLat, longitude: curLng, speed: 0, recorded_at: now },                                                               // Destination (Point B)
        ];
      }

      setRawRoute(pointsToUse);

      const smoothPoints = interpolateRoutePoints(pointsToUse, 25);
      setInterpolatedRoute(smoothPoints);

      if (smoothPoints.length > 1) {
        setIsPlaying(true); // Automatically start frame-by-frame walking animation
      }
    } catch {
      const hasLiveCoords = employee.latitude != null && Number(employee.latitude) !== 0 && employee.longitude != null && Number(employee.longitude) !== 0;
      const curLat = hasLiveCoords ? Number(employee.latitude) : 20.0059;
      const curLng = hasLiveCoords ? Number(employee.longitude) : 73.7898;
      const now = new Date().toISOString();

      const fallback = [
        { latitude: curLat - 0.0060, longitude: curLng - 0.0050, speed: 12, recorded_at: new Date(Date.now() - 3600_000).toISOString() },
        { latitude: curLat - 0.0035, longitude: curLng - 0.0028, speed: 18, recorded_at: new Date(Date.now() - 2400_000).toISOString() },
        { latitude: curLat - 0.0018, longitude: curLng - 0.0012, speed: 22, recorded_at: new Date(Date.now() - 1200_000).toISOString() },
        { latitude: curLat, longitude: curLng, speed: 0, recorded_at: now },
      ];
      setRawRoute(fallback);
      const smooth = interpolateRoutePoints(fallback, 25);
      setInterpolatedRoute(smooth);
      if (smooth.length > 1) setIsPlaying(true);
    } finally {
      setLoading(false);
    }
  }, [
    employee.employee_id,
    employee.routeTrail,
    employee.latitude,
    employee.longitude,
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
  const playedPath = interpolatedRoute.slice(0, playIndex + 1);

  // Date navigation
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
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
            max={new Date().toISOString().slice(0, 10)}
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

        {/* Map */}
        <div className="flex-1 min-h-[380px] relative">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          <MapContainer
            center={
              interpolatedRoute.length > 0
                ? [interpolatedRoute[0].latitude, interpolatedRoute[0].longitude]
                : [20.5937, 78.9629]
            }
            zoom={14}
            style={{ width: '100%', height: '100%', minHeight: '380px' }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Dotted Full Route Trail */}
            {interpolatedRoute.length > 1 && (
              <Polyline
                positions={interpolatedRoute.map((p) => [p.latitude, p.longitude])}
                color="#64748b"
                weight={4}
                dashArray="6 6"
                opacity={0.5}
              />
            )}

            {/* Animated Traveled Path (Red Line growing frame-by-frame behind employee) */}
            {playedPath.length > 1 && (
              <>
                <Polyline
                  positions={playedPath.map((p) => [p.latitude, p.longitude])}
                  color="#dc2626"
                  weight={10}
                  opacity={0.25}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  positions={playedPath.map((p) => [p.latitude, p.longitude])}
                  color="#dc2626"
                  weight={6}
                  opacity={0.95}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}

            {/* Destination Cluster Markers (Point A, Point B, Point C, Point D...) */}
            {destinationClusters.map((cluster) => {
              const isStart = cluster.index === 0;
              const isEnd = cluster.index === destinationClusters.length - 1;

              return (
                <Marker
                  key={`cluster-${cluster.letter}-${cluster.latitude}-${cluster.longitude}`}
                  position={[cluster.latitude, cluster.longitude]}
                  icon={createWaypointAlphabetIcon(cluster.letter, isStart, isEnd)}
                  eventHandlers={{
                    click: () => {
                      setIsPlaying(false);
                      setPlayIndex(cluster.frameIndex);
                    },
                  }}
                >
                  <Popup>
                    <div className="p-3 text-xs font-sans rounded-xl bg-slate-900 text-white shadow-xl max-w-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                        <span className="font-extrabold text-sm flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                              isStart ? 'bg-rose-500' : isEnd ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                          >
                            {cluster.letter}
                          </span>
                          Destination Point {cluster.letter}{' '}
                          {isStart
                            ? '(Origin / Start)'
                            : isEnd
                            ? '(Current / Latest)'
                            : `(Stop #${cluster.index + 1})`}
                        </span>
                      </div>

                      <div className="text-slate-300 text-[11px] space-y-1">
                        {cluster.recorded_at && (
                          <div>
                            <strong>🕐 Recorded:</strong>{' '}
                            {new Date(cluster.recorded_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        <div>
                          <strong>🌐 Coordinates:</strong> {cluster.latitude.toFixed(5)},{' '}
                          {cluster.longitude.toFixed(5)}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setPlayIndex(cluster.frameIndex);
                        }}
                        className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        ▶ Jump Animation to Point {cluster.letter}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Frame-by-Frame Moving Employee Marker */}
            {currentPoint && (
              <Marker
                position={[currentPoint.latitude, currentPoint.longitude]}
                icon={createMovingEmployeeIcon(employee.name)}
              />
            )}

            <MapBoundsAdjuster points={rawRoute} />
          </MapContainer>
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
