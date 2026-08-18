// ============================================================
// LiveTrackingMap — Leaflet Map with Animated Walking Man SVG Markers
// client/src/features/Livetracking/components/LiveTrackingMap.tsx
// ============================================================
import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LiveEmployee, BreakPoint } from '../types/livetracking.types';
import { EmployeeMarkerPopup } from './EmployeeMarkerPopup';

// Fix Leaflet default icon issue with Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// ── Custom DivIcon factory with Circular Profile Photo & Walking Man Badge ────────
function createEmployeeIcon(employee: LiveEmployee, isSelected?: boolean): L.DivIcon {
  const isOnline = employee.connection_status === 'ONLINE';
  const isLocationOn = employee.location_status === 'ON';
  const ringColor = isOnline && isLocationOn ? '#22c55e' : isLocationOn ? '#f59e0b' : '#ef4444';
  const pulse = isOnline && isLocationOn;

  const initials = (employee.name || 'Emp')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const avatarSrc = formatAvatarUrl(employee.avatar_url);

  const avatarHtml = avatarSrc
    ? `<img src="${avatarSrc}" alt="${employee.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="display:none;width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:800;">${initials}</div>`
    : `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:-0.5px;">${initials}</div>`;

  // Walking Man SVG Icon
  const manSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="M6 21v-4l2-3 2-2 3 2 4 4"/><path d="M12 11l-3 4-4-2"/><path d="M12 11l3 4 3-2"/></svg>`;

  return L.divIcon({
    className: '',
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -58],
    html: `
      <div style="position:relative;width:48px;height:56px;display:flex;flex-direction:column;align-items:center;">
        ${
          pulse
            ? `<div style="position:absolute;top:0;left:2px;width:44px;height:44px;border-radius:50%;border:3px solid ${ringColor};animation:livetrack-pulse 1.8s ease-out infinite;opacity:0.6;pointer-events:none;"></div>`
            : ''
        }
        <div style="position:relative;width:44px;height:44px;border-radius:50%;background:#ffffff;border:3px solid ${isSelected ? '#fbbf24' : ringColor};box-shadow:${isSelected ? '0 0 16px rgba(251,191,36,0.9)' : '0 4px 12px rgba(0,0,0,0.35)'};padding:2px;box-sizing:border-box;">
          <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">
            ${avatarHtml}
          </div>
          <div style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:${isSelected ? '#f59e0b' : '#4f46e5'};border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
            ${manSvg}
          </div>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${isSelected ? '#fbbf24' : ringColor};margin-top:-2px;"></div>
      </div>
    `,
  });
}

// ── Custom DivIcon for Start Location Pin (Point A) ───────────────────
function createStartIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,0.35);animation:livetrack-pulse 2s infinite;"></div>
        <div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      </div>
    `,
  });
}

// ── Custom DivIcon for Yellow Break / Stop Markers ────────────────────
function createBreakIcon(durationMinutes: number): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,0.35);animation:livetrack-pulse 2s infinite;"></div>
        <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:700;font-size:11px;">
          ⚡
        </div>
        <div style="position:absolute;top:-8px;right:-8px;background:#1e293b;color:#fbbf24;border:1px solid #f59e0b;font-size:9px;font-weight:800;padding:1px 5px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;">
          ${durationMinutes}m break
        </div>
      </div>
    `,
  });
}

// ── Smooth animated marker ──────────────────────────────────
interface AnimatedMarkerProps {
  employee: LiveEmployee;
  isSelected?: boolean;
  onSelectEmployee?: (employee: LiveEmployee) => void;
  onViewHistory: (employee: LiveEmployee) => void;
}

const ANIMATION_DURATION = 1000; // ms

const AnimatedMarker: React.FC<AnimatedMarkerProps> = ({ employee, isSelected, onSelectEmployee, onViewHistory }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevLatLngRef = useRef<L.LatLng | null>(null);

  const icon = useMemo(
    () => createEmployeeIcon(employee, isSelected),
    [employee.connection_status, employee.location_status, employee.avatar_url, isSelected]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || employee.latitude == null || employee.longitude == null) return;

    const targetLat = employee.latitude;
    const targetLng = employee.longitude;
    const target = L.latLng(targetLat, targetLng);

    const current = prevLatLngRef.current;

    if (!current) {
      prevLatLngRef.current = target;
      marker.setLatLng(target);
      return;
    }

    const startLat = current.lat;
    const startLng = current.lng;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / ANIMATION_DURATION, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const lat = startLat + (targetLat - startLat) * ease;
      const lng = startLng + (targetLng - startLng) * ease;
      marker.setLatLng([lat, lng]);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevLatLngRef.current = target;
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [employee.latitude, employee.longitude]);

  if (employee.latitude == null || employee.longitude == null) return null;

  return (
    <Marker
      ref={markerRef}
      position={[employee.latitude as number, employee.longitude as number]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onSelectEmployee) onSelectEmployee(employee);
        },
      }}
    >
      <EmployeeMarkerPopup employee={employee} onViewHistory={onViewHistory} />
    </Marker>
  );
};

// ── Map center adjuster when no markers ────────────────────
const DefaultCenter: React.FC<{ employees: LiveEmployee[] }> = ({ employees }) => {
  const map = useMap();
  useEffect(() => {
    const withCoords = employees.filter((e) => e.latitude != null && e.longitude != null);
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map((e) => [e.latitude!, e.longitude!]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, []);
  return null;
};

// ── Fly To Selected Employee ───────────────────────────────
const FlyToSelected: React.FC<{ selectedEmployee: LiveEmployee | null }> = ({ selectedEmployee }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedEmployee && selectedEmployee.latitude != null && selectedEmployee.longitude != null) {
      map.flyTo([selectedEmployee.latitude, selectedEmployee.longitude], 16, {
        duration: 1.2,
      });
    }
  }, [map, selectedEmployee?.employee_id, (selectedEmployee as any)?.id, selectedEmployee?.latitude, selectedEmployee?.longitude]);
  return null;
};

// ── Main Map Component ─────────────────────────────────────
interface Props {
  employees: LiveEmployee[];
  selectedEmployee?: LiveEmployee | null;
  onSelectEmployee?: (employee: LiveEmployee) => void;
  onViewHistory: (employee: LiveEmployee) => void;
  onClearSelection?: () => void;
}

export const LiveTrackingMap: React.FC<Props> = ({
  employees,
  selectedEmployee,
  onSelectEmployee,
  onViewHistory,
  onClearSelection,
}) => {
  const [isolateSelected, setIsolateSelected] = React.useState(true);

  const selectedEmpId = selectedEmployee ? String(selectedEmployee.employee_id ?? (selectedEmployee as any).id) : 'all';

  // Automatically enable isolation when a new selectedEmployee is clicked
  React.useEffect(() => {
    if (selectedEmployee) {
      setIsolateSelected(true);
    }
  }, [selectedEmployee?.employee_id, (selectedEmployee as any)?.id]);

  const allValidEmployees = employees.filter((e) => e.latitude != null && e.longitude != null);

  // If selectedEmployee exists and isolation is ON, render ONLY that employee on the map
  const validEmployees = useMemo(() => {
    if (selectedEmployee && isolateSelected) {
      const selectedKey = String(selectedEmployee.employee_id ?? (selectedEmployee as any).id);
      const found = allValidEmployees.find((e) => String(e.employee_id ?? (e as any).id) === selectedKey);
      return found ? [found] : (selectedEmployee.latitude != null ? [selectedEmployee] : []);
    }
    return allValidEmployees;
  }, [allValidEmployees, selectedEmployee, isolateSelected]);

  // Local state recording every location coordinate change per employee
  const [localTrails, setLocalTrails] = React.useState<Record<number, [number, number][]>>({});

  React.useEffect(() => {
    setLocalTrails((prev) => {
      let changed = false;
      const next = { ...prev };

      allValidEmployees.forEach((emp) => {
        if (emp.latitude == null || emp.longitude == null) return;
        const empId = emp.employee_id ?? (emp as any).id;
        const currentTrail = next[empId] || [];

        // Hydrate from emp.routeTrail if available and longer
        if (emp.routeTrail && emp.routeTrail.length > currentTrail.length) {
          next[empId] = emp.routeTrail.map((p) => [p.latitude, p.longitude]);
          changed = true;
          return;
        }

        const lastPoint = currentTrail[currentTrail.length - 1];
        const newPoint: [number, number] = [emp.latitude, emp.longitude];

        if (!lastPoint || lastPoint[0] !== newPoint[0] || lastPoint[1] !== newPoint[1]) {
          next[empId] = [...currentTrail, newPoint];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [employees]);

  const defaultCenter: [number, number] =
    validEmployees.length > 0
      ? [validEmployees[0].latitude!, validEmployees[0].longitude!]
      : [20.0059, 73.7898];

  return (
    <div className="relative w-full h-full">
      {/* ── Top Floating Employee Focus Control Banner ────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-violet-500/40 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          
          <select
            value={selectedEmpId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                if (onClearSelection) onClearSelection();
                setIsolateSelected(false);
              } else {
                const found = employees.find((emp) => String(emp.employee_id ?? (emp as any).id) === String(val));
                if (found && onSelectEmployee) {
                  onSelectEmployee(found);
                  setIsolateSelected(true);
                }
              }
            }}
            className="bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-1 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer max-w-[240px] truncate"
          >
            <option value="all">Show All Employees ({allValidEmployees.length})</option>
            {allValidEmployees.map((emp) => {
              const empId = emp.employee_id ?? (emp as any).id;
              return (
                <option key={empId} value={String(empId)}>
                  Focus: {emp.name} {emp.department ? `(${emp.department})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {selectedEmployee && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
            <button
              onClick={() => setIsolateSelected(!isolateSelected)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all ${
                isolateSelected
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isolateSelected ? 'Focus Only' : `Show All (${allValidEmployees.length})`}
            </button>

            {onClearSelection && (
              <button
                onClick={() => {
                  onClearSelection();
                  setIsolateSelected(false);
                }}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Show all employees"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes livetrack-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .livetrack-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .livetrack-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .livetrack-popup .leaflet-popup-tip-container {
          display: none;
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ width: '100%', height: '100%', borderRadius: '16px' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <DefaultCenter employees={validEmployees} />
        <FlyToSelected selectedEmployee={selectedEmployee || null} />

        {/* ── Render Route Lines & Yellow Break Markers ────────────────── */}
        {validEmployees.map((emp) => {
          // Priority: localTrails -> emp.routeTrail
          const positions: [number, number][] =
            (localTrails[emp.employee_id] && localTrails[emp.employee_id].length >= 2)
              ? localTrails[emp.employee_id]
              : (emp.routeTrail || []).map((p) => [p.latitude, p.longitude]);

          const breaks = emp.breakPoints || [];
          const isSelected = selectedEmployee?.employee_id === emp.employee_id;
          const strokeColor = isSelected ? '#ea580c' : '#dc2626'; // Vibrant bright crimson red (Swiggy/Zomato style)

          return (
            <React.Fragment key={`route-${emp.employee_id}`}>
              {/* Route Polyline Path Line (Clean 6px aesthetic width) */}
              {positions.length >= 2 && (
                <>
                  {/* Soft outer glow stroke */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: strokeColor,
                      weight: 10,
                      opacity: 0.25,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                  {/* Main clean crimson red polyline path (6px width) */}
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: strokeColor,
                      weight: 6,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />

                  {/* Start Point Badge (Point A) */}
                  <Marker
                    position={positions[0]}
                    icon={createStartIcon()}
                  >
                    <Popup>
                      <div className="p-2 text-xs font-sans font-medium text-slate-800 dark:text-slate-100">
                        <span className="font-bold text-red-500">📍 Route Origin (Point A)
                        <br />
                        Employee started tracking from here.</span>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Yellow Break / Stop Markers */}
              {breaks.map((bp) => (
                <Marker
                  key={bp.id}
                  position={[bp.latitude, bp.longitude]}
                  icon={createBreakIcon(bp.durationMinutes)}
                >
                  <Popup>
                    <div className="p-3 text-xs font-sans rounded-xl bg-slate-900 text-white shadow-xl max-w-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-400">
                        <span>⚡ Break / Stop Detected</span>
                      </div>
                      <div className="text-slate-300">
                        <strong>Duration:</strong> {bp.durationMinutes} mins
                      </div>
                      {bp.startTime && (
                        <div className="text-slate-400 text-[11px]">
                          <strong>Stopped at:</strong> {new Date(bp.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      <div className="text-[10px] text-amber-300/80 pt-1 border-t border-slate-800">
                        Employee remained stationary at this location.
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          );
        })}

        {/* ── Render Employee Markers ──────────────────────────────────── */}
        {validEmployees.map((emp) => (
          <AnimatedMarker
            key={emp.employee_id}
            employee={emp}
            isSelected={selectedEmployee?.employee_id === emp.employee_id}
            onSelectEmployee={onSelectEmployee}
            onViewHistory={onViewHistory}
          />
        ))}
      </MapContainer>
    </div>
  );
};
