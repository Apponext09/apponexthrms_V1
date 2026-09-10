// ============================================================
// EmployeeMarkerCard — Standalone Employee Description Box / Info Card
// client/src/features/Livetracking/components/EmployeeMarkerPopup.tsx
//
// FEATURES:
//  - Displays when an employee pin on the live tracking map is clicked
//  - Shows Employee Name, Avatar, Designation, Online/GPS status
//  - Prominent Break Time & Duration Hero Box (⚡ X Breaks / Ym total)
//  - Reverse-geocoded Address, GPS Coordinates, Live Speed, Last Ping time
//  - CTA button to open full historical Travel History Playback
// ============================================================
import React from 'react';
import { X, Navigation, MapPin, Clock, Wifi, Radio, Zap, ShieldCheck } from 'lucide-react';
import type { LiveEmployee } from '../types/livetracking.types';

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

interface Props {
  employee: LiveEmployee;
  /** Reverse-geocoded address string (handled externally with cache) */
  address: string;
  onViewHistory: (employee: LiveEmployee) => void;
  onClose: () => void;
}

export const EmployeeMarkerCard: React.FC<Props> = ({ employee, address, onViewHistory, onClose }) => {
  const isOnline = employee.connection_status === 'ONLINE';
  const isLocationOn = employee.location_status === 'ON';
  const avatarSrc = formatAvatarUrl(employee.avatar_url);

  const lat = employee.latitude != null ? Number(employee.latitude) : null;
  const lng = employee.longitude != null ? Number(employee.longitude) : null;
  const hasCoords = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  const breakCount = (employee.breakPoints || []).length;
  const totalBreakMins = (employee.breakPoints || []).reduce(
    (acc, b) => acc + (b.durationMinutes || 0),
    0
  );

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-4 shadow-2xl font-sans w-[295px] ring-1 ring-white/10 relative animate-in fade-in zoom-in-95 duration-150">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Header: Avatar + Employee Name + Code */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800">
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={employee.name}
              className={`w-12 h-12 rounded-full object-cover border-2 ${
                isOnline ? 'border-emerald-500' : 'border-slate-600'
              }`}
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-black border-2 ${
                isOnline ? 'border-emerald-500' : 'border-slate-600'
              }`}
            >
              {(employee.name || 'E').charAt(0).toUpperCase()}
            </div>
          )}
          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-500'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1 pr-5">
          <div className="font-black text-sm text-white truncate leading-tight">{employee.name}</div>
          <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
            {employee.designation || employee.department || 'Field Staff'}
            {employee.employee_code ? ` (#${employee.employee_code})` : ''}
          </div>
        </div>
      </div>

      {/* Hero Box: Break Time & Shift Status */}
      <div
        className={`rounded-xl p-2.5 mb-3 flex items-center justify-between border ${
          breakCount > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${breakCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-80">Shift & Break Summary</div>
            <div className="text-xs font-black truncate">
              {breakCount > 0
                ? `${breakCount} Break${breakCount > 1 ? 's' : ''} (${totalBreakMins}m total duration)`
                : '0 Breaks Taken (Active Shift)'}
            </div>
          </div>
        </div>
        {breakCount > 0 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 shrink-0 ml-1">
            {totalBreakMins}m
          </span>
        )}
      </div>

      {/* Detail Grid */}
      <div className="space-y-2 text-xs mb-3.5">
        {/* GPS + Connection status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-indigo-400" /> Connection
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isLocationOn
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              GPS {isLocationOn ? 'ON' : 'OFF'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {employee.connection_status}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/60">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-400" /> Current Address
          </span>
          <span className="text-slate-200 font-semibold text-right text-[11px] leading-tight line-clamp-2">
            {address ||
              (hasCoords && lat != null && lng != null
                ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                : 'No coordinates')}
          </span>
        </div>

        {/* Coordinates */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-sky-400" /> Coordinates
          </span>
          <span className="text-slate-300 font-mono text-[11px]">
            {hasCoords && lat != null && lng != null
              ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : 'N/A'}
          </span>
        </div>

        {/* Speed / Movement */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Live Speed
          </span>
          <span className="text-slate-300 font-semibold text-[11px]">
            {employee.speed && Number(employee.speed) > 0
              ? `${Math.round(Number(employee.speed))} km/h`
              : 'Stationary'}
          </span>
        </div>

        {/* Last ping */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> Last Ping
          </span>
          <span className="text-slate-300 font-semibold text-[11px]">
            {employee.last_ping_at
              ? new Date(employee.last_ping_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now'}
          </span>
        </div>
      </div>

      {/* CTA: View Travel History */}
      <button
        onClick={() => onViewHistory(employee)}
        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
      >
        <Navigation className="w-3.5 h-3.5" />
        View Travel History Playback
      </button>
    </div>
  );
};

// ── Legacy export alias ──
export const EmployeeMarkerPopup = EmployeeMarkerCard;
