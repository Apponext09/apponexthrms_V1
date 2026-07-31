// ============================================================
// LiveTrackingMap — Leaflet Map with Animated Walking Man SVG Markers
// client/src/features/Livetracking/components/LiveTrackingMap.tsx
// ============================================================
import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LiveEmployee } from '../types/livetracking.types';
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

// ── Smooth animated marker ──────────────────────────────────
interface AnimatedMarkerProps {
  employee: LiveEmployee;
  isSelected?: boolean;
  onViewHistory: (employee: LiveEmployee) => void;
}

const ANIMATION_DURATION = 1000; // ms

const AnimatedMarker: React.FC<AnimatedMarkerProps> = ({ employee, isSelected, onViewHistory }) => {
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
    if (selectedEmployee && selectedEmployee.latitude && selectedEmployee.longitude) {
      map.flyTo([selectedEmployee.latitude, selectedEmployee.longitude], 16, {
        duration: 1.5,
      });
    }
  }, [map, selectedEmployee]);
  return null;
};

// ── Main Map Component ─────────────────────────────────────
interface Props {
  employees: LiveEmployee[];
  selectedEmployee?: LiveEmployee | null;
  onViewHistory: (employee: LiveEmployee) => void;
}

export const LiveTrackingMap: React.FC<Props> = ({ employees, selectedEmployee, onViewHistory }) => {
  const validEmployees = employees.filter((e) => e.latitude != null && e.longitude != null);

  const defaultCenter: [number, number] =
    validEmployees.length > 0
      ? [validEmployees[0].latitude!, validEmployees[0].longitude!]
      : [20.5937, 78.9629];

  return (
    <>
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
        {validEmployees.map((emp) => (
          <AnimatedMarker
            key={emp.employee_id}
            employee={emp}
            isSelected={selectedEmployee?.employee_id === emp.employee_id}
            onViewHistory={onViewHistory}
          />
        ))}
      </MapContainer>
    </>
  );
};
