// ============================================================
// LiveTrackingMap — MapLibre GL JS (WebGL + Red Break Points & Interactive Time Card)
// client/src/features/Livetracking/components/LiveTrackingMap.tsx
//
// FEATURES:
//  - MapLibre GL JS GPU map canvas with OpenStreetMap raster tiles
//  - Custom Teardrop Pin Pointer markers with employee Profile Photo / Avatar inside
//  - Red Break Point Markers (#ef4444) highlighting employee stop locations
//  - Click RED break marker → opens interactive time card showing exact break stop time & duration
//  - Prominent Route line: Deep Black (#0f172a, 6.5px) in Light Mode, White (#ffffff) in Dark Mode
// ============================================================
import React, { useEffect, useRef, useMemo, useCallback, Component, ErrorInfo, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LiveEmployee } from '../types/livetracking.types';
import { EmployeeMarkerCard } from './EmployeeMarkerPopup';
import { useThemeStore } from '@/features/settings/store/themeStore';

// ── Coordinate Validator ──────────────────────────────────────────────────────
function isValidCoord(lat: any, lng: any): boolean {
  if (lat == null || lng == null) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    !isNaN(nLat) && !isNaN(nLng) &&
    isFinite(nLat) && isFinite(nLng) &&
    nLat >= -90 && nLat <= 90 &&
    nLng >= -180 && nLng <= 180 &&
    (nLat !== 0 || nLng !== 0)
  );
}

// ── Format Avatar URL ─────────────────────────────────────────────────────────
function formatAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';
  const cleanBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

// ── Resolve marker colors based on employee status ────────────────────────────
function getMarkerStyle(emp: LiveEmployee, isSelected: boolean) {
  if (isSelected) return { bg: '#0f172a', ring: 'rgba(245, 158, 11, 0.6)', border: '#f59e0b' };
  const online = emp.connection_status === 'ONLINE';
  const gpsOn = emp.location_status === 'ON';
  if (online && gpsOn) return { bg: '#0f172a', ring: 'rgba(34, 197, 94, 0.5)', border: '#22c55e' };
  if (gpsOn) return { bg: '#d97706', ring: 'rgba(245, 158, 11, 0.4)', border: '#f59e0b' };
  return { bg: '#dc2626', ring: 'rgba(239, 68, 68, 0.4)', border: '#ef4444' };
}

// ── Helper to detect if dark mode is active ───────────────────────────────────
function isDarkModeActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// ── Convert employee route trails to GeoJSON lines ────────────────────────────
function routesToGeoJSON(employees: LiveEmployee[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: employees
      .filter((e) => isValidCoord(e.latitude, e.longitude))
      .map((emp) => {
        const empId = emp.employee_id ?? (emp as any).id;
        const rawTrail = (emp.routeTrail || []).filter((p) => isValidCoord(p.latitude, p.longitude));

        let coords: [number, number][] = rawTrail.map((p) => [Number(p.longitude), Number(p.latitude)]);

        if (isValidCoord(emp.latitude, emp.longitude)) {
          const cur: [number, number] = [Number(emp.longitude), Number(emp.latitude)];
          const last = coords[coords.length - 1];
          if (!last || last[0] !== cur[0] || last[1] !== cur[1]) {
            coords.push(cur);
          }
        }

        // Generate a 2-point visual segment if only 1 point exists so the line is always visible
        if (coords.length === 1) {
          coords.push([coords[0][0] + 0.00005, coords[0][1] + 0.00005]);
        }

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: coords,
          },
          properties: { employee_id: empId },
        };
      })
      .filter((f) => (f.geometry as GeoJSON.LineString).coordinates.length >= 2),
  };
}

// ── Break markers GeoJSON ─────────────────────────────────────────────────────
function breaksToGeoJSON(employees: LiveEmployee[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const emp of employees) {
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
          },
        });
      }
    }
  }
  return { type: 'FeatureCollection', features };
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
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  employees: LiveEmployee[];
  selectedEmployee?: LiveEmployee | null;
  onSelectEmployee?: (employee: LiveEmployee) => void;
  onViewHistory: (employee: LiveEmployee) => void;
  onClearSelection?: () => void;
}

// ── Inner MapLibre Map ────────────────────────────────────────────────────────
const InnerMap: React.FC<Props> = ({
  employees,
  selectedEmployee,
  onSelectEmployee,
  onViewHistory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const htmlMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map());

  const { theme } = useThemeStore();
  const isDark = isDarkModeActive();

  // Prominent Route Line colors: Deep Black (#0f172a) in Light mode, White (#ffffff) in Dark mode
  const routeLineColor = isDark ? '#ffffff' : '#0f172a';
  const routeGlowColor = isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(15, 23, 42, 0.3)';

  const [popupEmployee, setPopupEmployee] = useState<LiveEmployee | null>(null);
  const [popupAddress, setPopupAddress] = useState<string>('');

  const selectedId: number | null = selectedEmployee
    ? (selectedEmployee.employee_id ?? (selectedEmployee as any).id)
    : null;

  const validEmployees = useMemo(
    () => employees.filter((e) => isValidCoord(e.latitude, e.longitude)),
    [employees]
  );

  // ── Initialize MapLibre map ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const firstEmp = employees.find((e) => isValidCoord(e.latitude, e.longitude));
    const center: [number, number] = firstEmp
      ? [Number(firstEmp.longitude), Number(firstEmp.latitude)]
      : [73.7898, 20.0059];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center,
      zoom: 13,
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
      // ── Source: Route trail lines ─────────────────────────────────────
      map.addSource('routes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // ── Source: Break stop markers ────────────────────────────────────
      map.addSource('breaks', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // ── Layer: Route glow ──────────────────────────────────────────────
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': routeGlowColor,
          'line-width': 14,
          'line-opacity': 0.85,
        },
      });

      // ── Layer: Route solid line (Ultra-prominent 6.5px line) ────────────
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': routeLineColor,
          'line-width': 6.5,
          'line-opacity': 1.0,
        },
      });

      // ── Layer: Red Break Stop Circle Markers (#ef4444) ────────────────
      map.addLayer({
        id: 'break-circles',
        type: 'circle',
        source: 'breaks',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ef4444', // RED color as requested!
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      mapLoadedRef.current = true;

      try {
        (map.getSource('routes') as maplibregl.GeoJSONSource)?.setData(routesToGeoJSON(employees) as any);
        (map.getSource('breaks') as maplibregl.GeoJSONSource)?.setData(breaksToGeoJSON(employees) as any);
      } catch {}

      if (validEmployees.length > 0) {
        fitMapToEmployees(map, validEmployees);
      }
    });

    // ── Click handler: RED break marker popup (shows break stop time & duration) ──
    map.on('click', 'break-circles', (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['break-circles'] });
      if (!features.length) return;
      const props = features[0].properties as any;
      const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];

      const startTimeStr = props.start_time
        ? new Date(props.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';
      const endTimeStr = props.end_time
        ? new Date(props.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : null;

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
        .setLngLat(coords)
        .setHTML(`
          <div style="background:#0f172a;color:#ffffff;border-radius:14px;padding:14px;font-family:sans-serif;font-size:12px;border:1.5px solid rgba(239,68,68,0.5);box-shadow:0 8px 24px rgba(0,0,0,0.6);">
            <div style="display:flex;align-items:center;gap:6px;color:#ef4444;font-weight:900;font-size:13px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <span>🛑 Break / Stop Location</span>
            </div>
            ${props.employee_name ? `<div style="color:#cbd5e1;font-size:11.5px;margin-bottom:6px;"><strong>Staff:</strong> <span style="color:#fff;font-weight:800;">${props.employee_name}</span></div>` : ''}
            <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:10px;padding:9px;margin-bottom:8px;">
              <div style="color:#fca5a5;font-size:11px;font-weight:700;">⏱️ Total Break Duration:</div>
              <div style="color:#ffffff;font-size:15px;font-weight:900;margin-top:2px;">${props.duration_minutes} Minutes</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;font-size:11px;">
              <div>🕒 <strong>Stopped at:</strong> <span style="color:#38bdf8;font-weight:800;">${startTimeStr}</span></div>
              ${endTimeStr ? `<div>🚀 <strong>Resumed at:</strong> <span style="color:#34d399;font-weight:800;">${endTimeStr}</span></div>` : ''}
            </div>
          </div>
        `)
        .addTo(map);
    });

    map.on('mouseenter', 'break-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'break-circles', () => { map.getCanvas().style.cursor = ''; });

    return () => {
      mapLoadedRef.current = false;
      htmlMarkersRef.current.forEach((m) => m.remove());
      htmlMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update Route Line Paints on Theme Change ──────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    const map = mapRef.current;
    try {
      if (map.getLayer('route-line')) {
        map.setPaintProperty('route-line', 'line-color', routeLineColor);
      }
      if (map.getLayer('route-glow')) {
        map.setPaintProperty('route-glow', 'line-color', routeGlowColor);
      }
    } catch {}
  }, [theme, isDark, routeLineColor, routeGlowColor]);

  // ── Sync Compact HTML Teardrop Pin Pointer Markers for Employees ─────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentMarkerIds = new Set<number>();

    validEmployees.forEach((emp) => {
      const empId = emp.employee_id ?? (emp as any).id;
      if (!empId) return;
      currentMarkerIds.add(empId);

      const lat = Number(emp.latitude);
      const lng = Number(emp.longitude);
      const isSelected = empId === selectedId;
      const { bg, ring, border } = getMarkerStyle(emp, isSelected);
      const avatarUrl = formatAvatarUrl(emp.avatar_url);

      // Create or update marker DOM element
      let existingMarker = htmlMarkersRef.current.get(empId);

      if (!existingMarker) {
        const el = document.createElement('div');
        el.className = 'emp-map-pin';
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;';

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (onSelectEmployee) onSelectEmployee(emp);
          setPopupEmployee(emp);
          setPopupAddress('');
          reverseGeocode(lat, lng).then((addr) => setPopupAddress(addr));
        });

        existingMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);

        htmlMarkersRef.current.set(empId, existingMarker);
      } else {
        existingMarker.setLngLat([lng, lat]);
      }

      // Render ultra-clean compact Teardrop Pin Pointer with Profile Avatar photo inside
      const element = existingMarker.getElement();
      element.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;" title="${emp.name} — Click to open details">
          <!-- Animated Status Pulse Ring -->
          <div style="position:absolute;top:14px;width:40px;height:40px;border-radius:50%;background:${ring};animation:pulse 2s infinite;pointer-events:none;"></div>

          <!-- Teardrop Pin Pointer Container -->
          <div style="position:relative;width:44px;height:54px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
            <!-- SVG Teardrop Location Pin -->
            <svg width="44" height="54" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Outer Teardrop Pin Body -->
              <path d="M26 0C11.6406 0 0 11.6406 0 26C0 40.625 26 64 26 64C26 64 52 40.625 52 26C52 11.6406 40.3594 0 26 0Z" fill="${bg}" stroke="${border}" stroke-width="2.5" />
              <!-- Inner Circle Background Window -->
              <circle cx="26" cy="24" r="16" fill="#FFFFFF" />
            </svg>

            <!-- Employee Profile Avatar Photo inside the Pin Window -->
            <div style="position:absolute;top:7px;left:8px;width:28px;height:28px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1e293b;border:1.5px solid #ffffff;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3);">
              ${
                avatarUrl
                  ? `<img src="${avatarUrl}" alt="${emp.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span style="display:none;color:#ffffff;font-weight:900;font-size:12px;font-family:sans-serif;">${(emp.name || 'E').charAt(0).toUpperCase()}</span>`
                  : `<span style="color:#ffffff;font-weight:900;font-size:12px;font-family:sans-serif;">${(emp.name || 'E').charAt(0).toUpperCase()}</span>`
              }
            </div>

            <!-- Online Status Dot on Pin Corner -->
            <div style="position:absolute;bottom:12px;right:3px;width:10px;height:10px;border-radius:50%;background:${border};border:1.5px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>
          </div>

          <!-- Single Line Name Label -->
          <div style="margin-top:1px;background:rgba(15,23,42,0.92);color:#ffffff;font-size:9.5px;font-weight:800;padding:1.5px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;font-family:sans-serif;letter-spacing:-0.2px;">
            ${emp.name}
          </div>
        </div>
      `;
    });

    // Clean up markers for removed employees
    htmlMarkersRef.current.forEach((marker, empId) => {
      if (!currentMarkerIds.has(empId)) {
        marker.remove();
        htmlMarkersRef.current.delete(empId);
      }
    });

    // Update GeoJSON route and break layers
    if (mapLoadedRef.current) {
      try {
        (map.getSource('routes') as maplibregl.GeoJSONSource)?.setData(routesToGeoJSON(employees) as any);
        (map.getSource('breaks') as maplibregl.GeoJSONSource)?.setData(breaksToGeoJSON(employees) as any);
      } catch {}
    }
  }, [employees, validEmployees, selectedId, onSelectEmployee]);

  // ── Helper: fit map bounds to employees ───────────────────────────────────
  const fitMapToEmployees = useCallback((map: maplibregl.Map, emps: LiveEmployee[]) => {
    if (emps.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    emps.forEach((e) => {
      if (isValidCoord(e.latitude, e.longitude)) {
        bounds.extend([Number(e.longitude), Number(e.latitude)]);
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
    }
  }, []);

  // ── Fly to selected employee ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) return;
    if (selectedEmployee && isValidCoord(selectedEmployee.latitude, selectedEmployee.longitude)) {
      mapRef.current.flyTo({
        center: [Number(selectedEmployee.longitude), Number(selectedEmployee.latitude)],
        zoom: 16,
        duration: 1200,
        essential: true,
      });
    }
  }, [selectedEmployee]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* MapLibre GL canvas container */}
      <div ref={mapContainerRef} className="absolute inset-0 rounded-xl overflow-hidden" />

      {/* Employee detail description box / popup card (React-rendered, positioned absolutely) */}
      {popupEmployee && (
        <div className="absolute top-4 right-4 z-50 w-[295px]">
          <EmployeeMarkerCard
            employee={popupEmployee}
            address={popupAddress}
            onViewHistory={(emp) => {
              setPopupEmployee(null);
              onViewHistory(emp);
            }}
            onClose={() => setPopupEmployee(null)}
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
