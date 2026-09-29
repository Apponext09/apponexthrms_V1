// ============================================================
// LiveTrackingMap — MapLibre GL JS live map (WebGL, clustered, animated)
// client/src/features/Livetracking/components/LiveTrackingMap.tsx
//
// FEATURES:
//  - MapLibre GL JS GPU map canvas with OpenStreetMap raster tiles
//  - Smoothly moving markers with heading arrows (see map/liveMapEngine.ts)
//  - Live route lines that grow behind each moving employee; clustering for crowds
//  - Selected employee: Teardrop Pin with Profile Photo, prominent route line
//    (Pure Black in Light Mode, White in Dark Mode) and Follow mode
//  - GREEN starting point, ORANGE break/stop points, RED ending/latest point
//  - Click any start/stop/end marker → shows total distance (km), stop time & travel time
//
// The map instance is created ONCE. GPS updates never re-render this
// component — they flow store → engine. React only handles selection, the
// roster metadata, and the selected-employee card.
// ============================================================
import React, { useEffect, useRef, Component, ErrorInfo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../map/maplibreWorker';
import type { BreakPoint, LiveEmployee, RoutePoint } from '../types/livetracking.types';
import { EmployeeMarkerCard } from './EmployeeMarkerPopup';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { computeRouteStats, formatMinutesLabel } from '../utils/routeStats';
import { detectBreakPoints } from '../utils/breakDetector';
import { escapeHtml } from '../utils/html';
import { isValidCoord } from '../utils/geo';
import { liveTrackingStore, movementStatus } from '../store/liveTrackingStore';
import { useLiveTrack } from '../hooks/useLiveTrack';
import { DETAIL_LAYERS, DETAIL_SOURCES, LiveMapEngine, type EmployeeMeta } from '../map/liveMapEngine';

// ── Default map focus when nobody is active (Navi Mumbai) ────────────────────
const NAVI_MUMBAI_CENTER: [number, number] = [73.0297, 19.033];
/** Start/stop/end detail markers are recomputed at most this often for the selected employee */
const DETAIL_REFRESH_MS = 2000;

// ── Helper to detect if dark mode is active ───────────────────────────────────
function isDarkModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// ── Break markers GeoJSON (ORANGE stop dots) ──────────────────────────────────
function breaksToGeoJSON(employees: LiveEmployee[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const emp of employees) {
    const stats = computeRouteStats(emp.routeTrail, emp.breakPoints);
    for (const bp of emp.breakPoints || []) {
      if (isValidCoord(bp.latitude, bp.longitude)) {
        features.push({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [Number(bp.longitude), Number(bp.latitude)] },
          properties: {
            id: bp.id,
            employee_id: emp.employee_id,
            employee_name: emp.name,
            duration_minutes: bp.durationMinutes,
            start_time: bp.startTime,
            end_time: bp.endTime,
            distance_km: stats.distanceKm,
            stop_minutes: stats.stopMinutes,
            travel_minutes: stats.travelMinutes,
            offline_minutes: stats.offlineMinutes,
            trail_start_time: stats.startTime,
            trail_end_time: stats.endTime,
          },
        });
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

// ── Start / End breadcrumb point GeoJSON (GREEN start, RED end) ──────────────
// The "end" point is offset a few metres from the raw coordinate so it doesn't
// sit exactly under the live avatar pin (which would otherwise swallow clicks).
const END_MARKER_OFFSET_DEG = 0.00015; // ~15-17m

function routeEndpointsToGeoJSON(
  employees: LiveEmployee[],
  kind: 'start' | 'end'
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const emp of employees) {
    const trail = (emp.routeTrail || []).filter((p) => isValidCoord(p.latitude, p.longitude));
    if (trail.length === 0) continue;
    const rawPoint = kind === 'start' ? trail[0] : trail[trail.length - 1];
    const lat = Number(rawPoint.latitude) + (kind === 'end' ? END_MARKER_OFFSET_DEG : 0);
    const lng = Number(rawPoint.longitude) + (kind === 'end' ? END_MARKER_OFFSET_DEG : 0);
    const stats = computeRouteStats(emp.routeTrail, emp.breakPoints);
    const isLive = emp.connection_status === 'ONLINE' && emp.location_status === 'ON';
    features.push({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: {
        employee_id: emp.employee_id ?? (emp as any).id,
        employee_name: emp.name,
        kind,
        is_live: kind === 'end' ? isLive : undefined,
        distance_km: stats.distanceKm,
        stop_minutes: stats.stopMinutes,
        travel_minutes: stats.travelMinutes,
        offline_minutes: stats.offlineMinutes,
        trail_start_time: stats.startTime,
        trail_end_time: stats.endTime,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ── Shared popup HTML for start / stop / end markers ──────────────────────────
function formatPopupTime(iso?: string | null): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function buildRouteStatsPopupHTML(kind: 'start' | 'stop' | 'end', props: any): string {
  const meta =
    kind === 'start'
      ? { icon: '🟢', label: 'Starting Point', color: '#22c55e' }
      : kind === 'end'
        ? props.is_live
          ? { icon: '🔴', label: 'Live Position (Current)', color: '#ef4444' }
          : { icon: '🔴', label: 'Ending Point (Last Seen)', color: '#ef4444' }
        : { icon: '🟠', label: 'Stop / Break Location', color: '#f97316' };

  const stopBlock =
    kind === 'stop'
      ? `<div style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.4);border-radius:10px;padding:9px;margin-bottom:8px;">
          <div style="color:#fdba74;font-size:11px;font-weight:700;">⏱️ This Stop Duration:</div>
          <div style="color:#ffffff;font-size:15px;font-weight:900;margin-top:2px;">${props.duration_minutes} Minutes</div>
          <div style="color:#cbd5e1;font-size:10.5px;margin-top:4px;">🕒 ${formatPopupTime(props.start_time)} → ${props.end_time ? formatPopupTime(props.end_time) : 'ongoing'}</div>
        </div>`
      : '';

  return `
    <div style="background:#0f172a;color:#ffffff;border-radius:14px;padding:14px;font-family:sans-serif;font-size:12px;border:1.5px solid ${meta.color}80;box-shadow:0 8px 24px rgba(0,0,0,0.6);min-width:230px;">
      <div style="display:flex;align-items:center;gap:6px;color:${meta.color};font-weight:900;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
        <span>${meta.icon} ${meta.label}</span>
      </div>
      ${props.employee_name ? `<div style="color:#cbd5e1;font-size:11.5px;margin-bottom:8px;"><strong>Staff:</strong> <span style="color:#fff;font-weight:800;">${escapeHtml(props.employee_name)}</span></div>` : ''}
      ${stopBlock}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35);border-radius:10px;padding:8px;">
          <div style="color:#93c5fd;font-size:10px;font-weight:700;">📏 Total Distance</div>
          <div style="color:#fff;font-size:14px;font-weight:900;">${props.distance_km} km</div>
        </div>
        <div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:10px;padding:8px;">
          <div style="color:#86efac;font-size:10px;font-weight:700;">🚗 Travel Time</div>
          <div style="color:#fff;font-size:14px;font-weight:900;">${formatMinutesLabel(props.travel_minutes)}</div>
        </div>
      </div>
      <div style="background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.35);border-radius:10px;padding:8px;margin-bottom:8px;">
        <div style="color:#fdba74;font-size:10px;font-weight:700;">🛑 Total Stop Time</div>
        <div style="color:#fff;font-size:14px;font-weight:900;">${formatMinutesLabel(props.stop_minutes)}</div>
      </div>
      ${
        props.offline_minutes > 0
          ? `<div style="color:#94a3b8;font-size:10px;margin-bottom:8px;">📡 GPS was offline for ~${formatMinutesLabel(props.offline_minutes)} (excluded from travel time)</div>`
          : ''
      }
      <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;font-size:11px;">
        <div>🏁 <strong>Started:</strong> <span style="color:#38bdf8;font-weight:800;">${formatPopupTime(props.trail_start_time)}</span></div>
        <div>📍 <strong>Last update:</strong> <span style="color:#34d399;font-weight:800;">${formatPopupTime(props.trail_end_time)}</span></div>
      </div>
    </div>
  `;
}

// ── Nominatim reverse-geocode with local cache ────────────────────────────────
const geocodeCache = new Map<string, string>();
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data?.display_name) {
      const parts = data.display_name.split(', ');
      const short = parts.slice(0, 3).join(', ');
      geocodeCache.set(key, short);
      return short;
    }
  } catch {
    // ignore
  }
  const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  geocodeCache.set(key, coords);
  return coords;
}

const MAP_STYLE: maplibregl.StyleSpecification = {
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

/** Selected employee's live route as RoutePoint[] (for break detection / stats) */
function routeTrailOf(employeeId: number): RoutePoint[] {
  const track = liveTrackingStore.get(employeeId);
  if (!track) return [];
  return track.route.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
    speed: null,
    recorded_at: new Date(p.ts).toISOString(),
  }));
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  /** Roster metadata (names, avatars, statuses) — positions come from the live store */
  employees: LiveEmployee[];
  selectedEmployee?: LiveEmployee | null;
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  onSelectEmployee?: (employee: LiveEmployee) => void;
  onViewHistory: (employee: LiveEmployee) => void;
  onClearSelection?: () => void;
}

// ── Inner MapLibre Map ────────────────────────────────────────────────────────
const InnerMap: React.FC<Props> = ({
  employees,
  selectedEmployee,
  follow = false,
  onFollowChange,
  onSelectEmployee,
  onViewHistory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const engineRef = useRef<LiveMapEngine | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  const { theme } = useThemeStore();
  const isDark = isDarkModeActive();

  const selectedId: number | null = selectedEmployee
    ? Number(selectedEmployee.employee_id ?? (selectedEmployee as any).id) || null
    : null;

  // Latest roster + callbacks in refs — the engine is created once and reads them lazily
  const employeesByIdRef = useRef<Map<number, LiveEmployee>>(new Map());
  useEffect(() => {
    employeesByIdRef.current = new Map(employees.map((e) => [Number(e.employee_id ?? (e as any).id), e]));
    engineRef.current?.refreshSelectedPin();
  }, [employees]);
  const callbacksRef = useRef({ onSelectEmployee, onFollowChange });
  useEffect(() => {
    callbacksRef.current = { onSelectEmployee, onFollowChange };
  });

  const [cardOpen, setCardOpen] = useState(false);
  const [popupAddress, setPopupAddress] = useState<string>('');
  const [breaks, setBreaks] = useState<BreakPoint[]>([]);

  // ── Initialize MapLibre map + engine (once) ────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: NAVI_MUMBAI_CENTER,
      zoom: 12,
      attributionControl: false,
      fadeDuration: 0,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    setTimeout(() => {
      try { map.resize(); } catch {}
    }, 150);

    map.on('load', () => {
      engineRef.current = new LiveMapEngine(map, {
        isDark: isDarkModeActive(),
        getMeta: (id): EmployeeMeta | undefined => {
          const emp = employeesByIdRef.current.get(id);
          return emp ? { name: emp.name, avatarUrl: emp.avatar_url, code: emp.employee_code } : undefined;
        },
        onSelect: (id) => {
          const emp = employeesByIdRef.current.get(id);
          if (emp) {
            callbacksRef.current.onSelectEmployee?.(emp);
            setCardOpen(true);
          }
        },
        onFollowChange: (value) => callbacksRef.current.onFollowChange?.(value),
      });
      setEngineReady(true);
    });

    // ── Click handlers: start / stop / end markers → shared stats popup ──────
    const openStatsPopup = (kind: 'start' | 'stop' | 'end', layerId: string) => (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (!features.length) return;
      const props = features[0].properties as any;
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
        .setLngLat(coords)
        .setHTML(buildRouteStatsPopupHTML(kind, props))
        .addTo(map);
    };

    map.on('click', DETAIL_LAYERS.breaks, openStatsPopup('stop', DETAIL_LAYERS.breaks));
    map.on('click', DETAIL_LAYERS.start, openStatsPopup('start', DETAIL_LAYERS.start));
    map.on('click', DETAIL_LAYERS.end, openStatsPopup('end', DETAIL_LAYERS.end));

    Object.values(DETAIL_LAYERS).forEach((layerId) => {
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Theme → selected route colours ─────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.setTheme(isDark);
  }, [theme, isDark, engineReady]);

  // ── Selection ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!engineReady) return;
    engineRef.current?.setSelected(selectedId);
    setCardOpen(selectedId != null);
    setPopupAddress('');
    if (selectedId != null) {
      const track = liveTrackingStore.get(selectedId);
      if (track?.lat != null && track.lng != null) {
        reverseGeocode(track.lat, track.lng).then((addr) => setPopupAddress(addr));
      }
    }
  }, [selectedId, engineReady]);

  useEffect(() => {
    if (engineReady) engineRef.current?.setFollow(follow);
  }, [follow, engineReady, selectedId]);

  // ── Start / stop / end detail markers for the selected employee (throttled) ─
  useEffect(() => {
    const map = mapRef.current;
    if (!engineReady || !map) return;

    const setDetail = (fc: { breaks: GeoJSON.FeatureCollection; start: GeoJSON.FeatureCollection; end: GeoJSON.FeatureCollection }) => {
      (map.getSource(DETAIL_SOURCES.breaks) as maplibregl.GeoJSONSource)?.setData(fc.breaks);
      (map.getSource(DETAIL_SOURCES.start) as maplibregl.GeoJSONSource)?.setData(fc.start);
      (map.getSource(DETAIL_SOURCES.end) as maplibregl.GeoJSONSource)?.setData(fc.end);
    };
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

    if (selectedId == null) {
      setDetail({ breaks: empty, start: empty, end: empty });
      setBreaks([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;
    const refresh = () => {
      timer = null;
      lastRun = Date.now();
      const base = employeesByIdRef.current.get(selectedId);
      const track = liveTrackingStore.get(selectedId);
      if (!base || !track) return;
      const routeTrail = routeTrailOf(selectedId);
      const breakPoints = detectBreakPoints(routeTrail);
      const detailEmp: LiveEmployee = {
        ...base,
        routeTrail,
        breakPoints,
        location_status: track.locationStatus,
        connection_status: track.connectionStatus,
      };
      setDetail({
        breaks: breaksToGeoJSON([detailEmp]),
        start: routeEndpointsToGeoJSON([detailEmp], 'start'),
        end: routeEndpointsToGeoJSON([detailEmp], 'end'),
      });
      setBreaks(breakPoints);
    };
    refresh();
    const unsubscribe = liveTrackingStore.subscribeEmployee(selectedId, () => {
      if (timer) return;
      timer = setTimeout(refresh, Math.max(0, DETAIL_REFRESH_MS - (Date.now() - lastRun)));
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [selectedId, engineReady]);

  const liveTrack = useLiveTrack(selectedId);
  const selectedMeta = selectedId != null ? employeesByIdRef.current.get(selectedId) ?? selectedEmployee : null;

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* MapLibre GL canvas container */}
      {/* position/inset inline: maplibre-gl.css (loaded after the app CSS) sets
          .maplibregl-map { position: relative }, which overrode Tailwind's
          `absolute inset-0` and collapsed the container to 0px height. */}
      <div
        ref={mapContainerRef}
        className="rounded-xl overflow-hidden"
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Selected employee live card (React-rendered, positioned absolutely) */}
      {cardOpen && selectedMeta && (
        <div className="absolute top-4 right-4 z-50 w-[295px]">
          <EmployeeMarkerCard
            employee={{
              ...selectedMeta,
              breakPoints: breaks,
              latitude: liveTrack?.lat ?? selectedMeta.latitude,
              longitude: liveTrack?.lng ?? selectedMeta.longitude,
              location_status: liveTrack?.locationStatus ?? selectedMeta.location_status,
              connection_status: liveTrack?.connectionStatus ?? selectedMeta.connection_status,
            }}
            address={popupAddress}
            live={
              liveTrack
                ? {
                    status: movementStatus(liveTrack),
                    speedMps: liveTrack.speed,
                    distanceKm: liveTrack.distanceM / 1000,
                    accuracyM: liveTrack.accuracy,
                    lastUpdatedMs: liveTrack.lastPingAt || liveTrack.ts || null,
                    trackingSinceMs: liveTrack.trackingStartTs,
                  }
                : undefined
            }
            follow={follow}
            onToggleFollow={onFollowChange ? () => onFollowChange(!follow) : undefined}
            onZoomTo={selectedId != null ? () => engineRef.current?.zoomTo(selectedId) : undefined}
            onViewHistory={(emp) => {
              setCardOpen(false);
              onViewHistory(emp);
            }}
            onClose={() => setCardOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

// ── Error Boundary ────────────────────────────────────────────────────────────
class MapErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LiveTrackingMap] MapLibre error boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
          <p className="text-rose-400 font-bold text-sm mb-2">⚠️ Map Render Error</p>
          <p className="text-slate-400 text-xs mb-4">MapLibre GL encountered a rendering issue.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-md"
          >
            Reload Map
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Public Export ─────────────────────────────────────────────────────────────
export const LiveTrackingMap: React.FC<Props> = (props) => (
  <MapErrorBoundary>
    <InnerMap {...props} />
  </MapErrorBoundary>
);
