// ============================================================
// EmployeeMarkerPopup — Marker Popup & Detail Drawer
// client/src/features/Livetracking/components/EmployeeMarkerPopup.tsx
// Supports light & dark mode theme compatibility
// ============================================================
import React from 'react';
import { Popup } from 'react-leaflet';
import { Navigation, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { saveEmployeeLocation } from '../api/livetrackingApi';
import type { LiveEmployee } from '../types/livetracking.types';

interface Props {
  employee: LiveEmployee;
  onViewHistory: (employee: LiveEmployee) => void;
}

function formatTime(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function getStatusColorClass(status: string | null): string {
  switch (status) {
    case 'present': return 'text-emerald-600 dark:text-emerald-400 font-bold';
    case 'absent': return 'text-rose-600 dark:text-rose-400 font-bold';
    case 'work_from_home': return 'text-blue-600 dark:text-blue-400 font-bold';
    case 'on_leave': return 'text-amber-600 dark:text-amber-400 font-bold';
    default: return 'text-muted-foreground font-semibold';
  }
}

function formatAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const apiBase = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:5000';
  const cleanBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export const EmployeeMarkerPopup: React.FC<Props> = ({ employee, onViewHistory }) => {
  const isOnline = employee.connection_status === 'ONLINE';
  const isLocationOn = employee.location_status === 'ON';
  const avatarSrc = formatAvatarUrl(employee.avatar_url);

  return (
    <Popup
      className="livetrack-popup"
      minWidth={300}
      maxWidth={340}
      autoPan
    >
      <div className="bg-card text-card-foreground border border-border/80 rounded-2xl p-4 shadow-xl font-sans min-w-[280px]">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-border/60">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={employee.name}
                className={`w-12 h-12 rounded-full object-cover border-2 ${isOnline ? 'border-emerald-500' : 'border-muted-foreground/40'}`}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-base font-black border-2 ${isOnline ? 'border-emerald-500' : 'border-muted-foreground/40'}`}
              >
                {employee.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Online pulse indicator */}
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm text-foreground truncate">{employee.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{employee.employee_code}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate font-medium">
              {employee.designation}
            </div>
          </div>
        </div>

        {/* Info Grid: 11 required spec fields */}
        <div className="space-y-2 text-xs">
          <InfoRow icon="🏢" label="Department" value={employee.department || '—'} />
          <InfoRow icon="👤" label="Reporting Manager" value={employee.reporting_manager || '—'} />
          <InfoRow icon="📍" label="Address" value={employee.address || 'Fetching location...'} />

          <InfoRow
            icon="🌐"
            label="Coordinates"
            value={
              employee.latitude && employee.longitude
                ? `${employee.latitude.toFixed(5)}, ${employee.longitude.toFixed(5)}`
                : 'No GPS data'
            }
          />

          <InfoRow
            icon="🕐"
            label="Last Updated"
            value={
              employee.last_ping_at
                ? new Date(employee.last_ping_at).toLocaleTimeString('en-IN')
                : '—'
            }
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">📅 Attendance</span>
            <span className={`capitalize ${getStatusColorClass(employee.attendance_status)}`}>
              {employee.attendance_status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>

          <InfoRow
            icon="⏰"
            label="Check-in / Out"
            value={`${formatTime(employee.check_in_time)} → ${formatTime(employee.check_out_time)}`}
          />

          <InfoRow
            icon="🤳"
            label="Face Attendance"
            value={employee.face_attendance_status || 'N/A'}
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">📡 Location</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isLocationOn
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              Location {employee.location_status}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-medium">🔌 Connection</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {employee.connection_status}
            </span>
          </div>
        </div>

        {/* Action Buttons: Save Location & View History */}
        <div className="mt-3.5 space-y-2">
          <button
            onClick={async () => {
              if (!employee.latitude || !employee.longitude) {
                toast.error('No GPS coordinates available to save');
                return;
              }
              try {
                await saveEmployeeLocation(
                  employee.employee_id,
                  employee.latitude,
                  employee.longitude,
                  employee.address || undefined
                );
                toast.success(`📍 Saved location & updated walk history for ${employee.name}`);
              } catch {
                toast.error('Failed to save location');
              }
            }}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save Current Location
          </button>

          <button
            onClick={() => onViewHistory(employee)}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            View Travel History
          </button>
        </div>
      </div>
    </Popup>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex justify-between items-start gap-2 text-xs">
    <span className="text-muted-foreground font-medium shrink-0">
      {icon} {label}
    </span>
    <span
      className="text-foreground font-semibold text-right truncate max-w-[160px]"
      title={value}
    >
      {value}
    </span>
  </div>
);
