// ============================================================
// RoutePlaybackModal — Travel History & Animated Route Playback
// client/src/features/Livetracking/components/RoutePlaybackModal.tsx
// Supports light & dark mode theme compatibility
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { fetchRouteHistory } from '../api/livetrackingApi';
import type { LiveEmployee, RoutePoint } from '../types/livetracking.types';

// Fix Leaflet default marker icon issue with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Walking Man SVG icon for animated route playback marker
const movingIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    border: 3px solid #fff; box-shadow: 0 0 14px rgba(124,58,237,0.8);
    display: flex; align-items: center; justify-content: center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#fff;">
      <path d="M13 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/>
      <path d="M6 21v-4l2-3 2-2 3 2 4 4"/>
      <path d="M12 11l-3 4-4-2"/>
      <path d="M12 11l3 4 3-2"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/** Recenter map on route bounds */
const MapBoundsAdjuster: React.FC<{ points: RoutePoint[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 15);
    }
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
  const [route, setRoute] = useState<RoutePoint[]>([]);
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
      setRoute(data);
    } catch {
      setRoute([]);
    } finally {
      setLoading(false);
    }
  }, [employee.employee_id, date]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Playback engine
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPlayIndex((prev) => {
          if (prev >= route.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 600 / SPEEDS[speedIdx]);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, route.length, speedIdx]);

  const currentPoint = route[playIndex];
  const playedPath = route.slice(0, playIndex + 1);

  // Date navigation
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center bg-muted/20">
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              🗺️ Travel Route History — {employee.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {employee.designation || 'Staff'} • {employee.department || 'General'}
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
        <div className="px-6 py-3 flex items-center gap-3 border-b border-border/60 bg-muted/10 flex-wrap">
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
            className="px-4 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all"
          >
            Load Route
          </button>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {route.length} GPS Waypoints
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
              route.length > 0
                ? [route[0].latitude, route[0].longitude]
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
            {route.length > 1 && (
              <>
                <Polyline
                  positions={route.map((p) => [p.latitude, p.longitude])}
                  color="#8b5cf6"
                  weight={4}
                  dashArray="8 6"
                  opacity={0.4}
                />
                <Polyline
                  positions={playedPath.map((p) => [p.latitude, p.longitude])}
                  color="#4f46e5"
                  weight={5}
                />
              </>
            )}
            {currentPoint && (
              <Marker
                position={[currentPoint.latitude, currentPoint.longitude]}
                icon={movingIcon}
              />
            )}
            <MapBoundsAdjuster points={route} />
          </MapContainer>
        </div>

        {/* Playback Controls */}
        <div className="px-6 py-3.5 border-t border-border/60 flex items-center gap-4 flex-wrap bg-muted/20">
          {/* Progress Slider */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="range"
              min={0}
              max={Math.max(0, route.length - 1)}
              value={playIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setPlayIndex(Number(e.target.value));
              }}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              <span>{route[0] ? new Date(route[0].recorded_at).toLocaleTimeString('en-IN') : '--:--'}</span>
              <span>
                {currentPoint
                  ? new Date(currentPoint.recorded_at).toLocaleTimeString('en-IN')
                  : '--:--'}{' '}
                • Point {playIndex + 1}/{route.length}
              </span>
              <span>
                {route[route.length - 1]
                  ? new Date(route[route.length - 1].recorded_at).toLocaleTimeString('en-IN')
                  : '--:--'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsPlaying(false); setPlayIndex(0); }}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              disabled={route.length === 0}
              className={`px-4 py-2 rounded-xl font-black text-xs text-white flex items-center gap-1.5 shadow-2xs transition-all ${
                route.length === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play Route'}
            </button>

            {/* Speed selector */}
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
