// ============================================================
// TrackingHistoryPage — HR/Admin Daily Location Session History
// client/src/features/Livetracking/pages/TrackingHistoryPage.tsx
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  Navigation2, Clock, Coffee, Route, MapPin,
  ArrowLeft, Download, Eye, Users, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchDailySessions } from '../api/livetrackingApi';
import { fetchRouteHistory } from '../api/livetrackingApi';
import { RoutePlaybackModal } from '../components/RoutePlaybackModal';
import type { TrackingSession, LiveEmployee } from '../types/livetracking.types';

// ── Helper: format minutes as "Xh Ym" ────────────────────────────────────────
function formatMinutes(mins: number): string {
  const safeMins = typeof mins === 'number' && !isNaN(mins) ? Math.max(0, mins) : 0;
  if (safeMins === 0) return '0m';
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Helper: format km ─────────────────────────────────────────────────────────
function formatKm(km: number): string {
  const safeKm = typeof km === 'number' && !isNaN(km) ? Math.max(0, km) : 0;
  if (safeKm < 1) return `${Math.round(safeKm * 1000)}m`;
  return `${safeKm.toFixed(2)}km`;
}

// ── Robust property getters for camelCase / snake_case resilience ───────────
function getWorkMins(s: TrackingSession): number {
  const v = s.total_working_minutes ?? (s as any).totalWorkingMinutes;
  const num = Number(v);
  return !isNaN(num) ? Math.max(0, num) : 0;
}

function getBreakMins(s: TrackingSession): number {
  const v = s.total_break_minutes ?? (s as any).totalBreakMinutes;
  const num = Number(v);
  return !isNaN(num) ? Math.max(0, num) : 0;
}

function getDistKm(s: TrackingSession): number {
  const v = s.total_distance_km ?? (s as any).totalDistanceKm;
  const num = Number(v);
  return !isNaN(num) ? Math.max(0, num) : 0;
}

function getEmpName(s: TrackingSession): string {
  const empId = s.employee_id ?? (s as any).employeeId;
  const name = s.employee_name ?? (s as any).employeeName;
  if (name && String(name).trim() && String(name).trim() !== 'Employee #undefined') {
    return String(name).trim();
  }
  return `Employee #${empId || 'Unknown'}`;
}

function getEmpCode(s: TrackingSession): string {
  return s.employee_code ?? (s as any).employeeCode ?? '';
}

function getDept(s: TrackingSession): string {
  return s.department ?? (s as any).department ?? '';
}

function getSessionStart(s: TrackingSession): string | null {
  return s.session_start ?? (s as any).sessionStart ?? null;
}

function getSessionEnd(s: TrackingSession): string | null {
  return s.session_end ?? (s as any).sessionEnd ?? null;
}

function getBreakCount(s: TrackingSession): number {
  const v = s.break_count ?? (s as any).breakCount;
  const num = Number(v);
  return !isNaN(num) ? Math.max(0, num) : 0;
}

function getPingCount(s: TrackingSession): number {
  const v = s.ping_count ?? (s as any).pingCount;
  const num = Number(v);
  return !isNaN(num) ? Math.max(0, num) : 0;
}

// ── Session to LiveEmployee adapter (for RoutePlaybackModal) ──────────────────
function sessionToLiveEmployee(session: TrackingSession): LiveEmployee {
  const empId = session.employee_id ?? (session as any).employeeId;
  return {
    employee_id: empId,
    employee_code: getEmpCode(session),
    name: getEmpName(session),
    avatar_url: null,
    department: getDept(session),
    designation: session.designation || (session as any).designation || '',
    reporting_manager: null,
    reporting_manager_id: null,
    department_id: null,
    branch_id: null,
    latitude: null,
    longitude: null,
    address: null,
    location_status: 'OFF',
    connection_status: 'OFFLINE',
    last_ping_at: getSessionEnd(session),
    attendance_status: null,
    face_attendance_status: null,
    check_in_time: null,
    check_out_time: null,
    routeTrail: [],
  };
}

export const TrackingHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState<TrackingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [playbackEmployee, setPlaybackEmployee] = useState<LiveEmployee | null>(null);
  const [playbackDate, setPlaybackDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDailySessions(date);
      setSessions(data);
    } catch {
      toast.error('Failed to load tracking history');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const filtered = useMemo(() => {
    const validSessions = sessions.filter((s) => {
      const name = getEmpName(s).toLowerCase();
      const dept = getDept(s).toLowerCase();
      if (name.includes('aditya joshi') || dept === 'hr' || dept === 'human resources') return false;
      return true;
    });
    if (!search.trim()) return validSessions;
    const q = search.trim().toLowerCase();
    return validSessions.filter(
      (s) =>
        getEmpName(s).toLowerCase().includes(q) ||
        getEmpCode(s).toLowerCase().includes(q) ||
        getDept(s).toLowerCase().includes(q)
    );
  }, [sessions, search]);

  // Summary stats
  const stats = useMemo(() => ({
    total: filtered.length,
    totalWorkingMinutes: filtered.reduce((acc, s) => acc + getWorkMins(s), 0),
    totalBreakMinutes: filtered.reduce((acc, s) => acc + getBreakMins(s), 0),
    totalDistanceKm: filtered.reduce((acc, s) => acc + getDistKm(s), 0),
  }), [filtered]);

  // Export CSV
  const exportCsv = () => {
    const headers = [
      'Employee', 'Code', 'Department', 'Session Start', 'Session End',
      'Working Time', 'Break Time', 'Breaks', 'Distance', 'Pings',
    ];
    const rows = filtered.map((s) => {
      const sStart = getSessionStart(s);
      const sEnd = getSessionEnd(s);
      return [
        getEmpName(s),
        getEmpCode(s),
        getDept(s),
        sStart ? new Date(sStart).toLocaleTimeString('en-IN') : '-',
        sEnd ? new Date(sEnd).toLocaleTimeString('en-IN') : '-',
        formatMinutes(getWorkMins(s)),
        formatMinutes(getBreakMins(s)),
        getBreakCount(s),
        formatKm(getDistKm(s)),
        getPingCount(s),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tracking_history_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewRoute = async (session: TrackingSession) => {
    const emp = sessionToLiveEmployee(session);
    const empId = session.employee_id ?? (session as any).employeeId;
    const sessDate = session.session_date ?? (session as any).sessionDate ?? date;
    try {
      const trail = await fetchRouteHistory(empId, sessDate);
      emp.routeTrail = trail;
      if (trail && trail.length > 0) {
        const last = trail[trail.length - 1];
        emp.latitude = Number(last.latitude);
        emp.longitude = Number(last.longitude);
      }
    } catch { /* modal will use fallback */ }
    setPlaybackDate(sessDate);
    setPlaybackEmployee(emp);
  };

  return (
    <div className="min-h-screen bg-background text-foreground space-y-4 p-4 sm:p-6 font-sans">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Tracking History</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Daily session log — working hours, break time & distance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date navigation */}
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-xl p-1">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer px-1"
            />
            <button
              onClick={() => shiftDate(1)}
              disabled={date >= new Date().toISOString().slice(0, 10)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Employees Tracked', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Total Working Time', value: formatMinutes(stats.totalWorkingMinutes), icon: <Clock className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Break Time', value: formatMinutes(stats.totalBreakMinutes), icon: <Coffee className="w-4 h-4" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Total Distance', value: formatKm(stats.totalDistanceKm), icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-lg font-black text-foreground">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs">
        <input
          type="text"
          placeholder="Search by name, code, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-background border border-border/60 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
        {/* Table Header */}
        <div className="px-4 py-3 border-b border-border/60 bg-muted/20 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
          <span>Employee</span>
          <span>Session Time</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Working</span>
          <span className="flex items-center gap-1"><Coffee className="w-3 h-3" />Breaks</span>
          <span className="flex items-center gap-1"><Route className="w-3 h-3" />Distance</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Pings</span>
          <span>Actions</span>
        </div>

        {loading && (
          <div className="py-16 flex items-center justify-center gap-2 text-primary text-sm font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading sessions...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Navigation2 className="w-10 h-10 opacity-20" />
            <p className="text-sm font-semibold">No tracking sessions found for {date}</p>
            <p className="text-xs">Employees need to have location tracking enabled for data to appear.</p>
          </div>
        )}

        <AnimatePresence>
          {!loading && filtered.map((session, idx) => (
            <SessionRow
              key={session.id || idx}
              session={session}
              idx={idx}
              onViewRoute={() => handleViewRoute(session)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Route Playback Modal ─────────────────────────────── */}
      {playbackEmployee && (
        <RoutePlaybackModal
          employee={playbackEmployee}
          onClose={() => setPlaybackEmployee(null)}
        />
      )}
    </div>
  );
};

// ── Session Row Component ─────────────────────────────────────────────────────
const SessionRow: React.FC<{
  session: TrackingSession;
  idx: number;
  onViewRoute: () => void;
}> = ({ session, idx, onViewRoute }) => {
  const workMins = getWorkMins(session);
  const breakMins = getBreakMins(session);
  const totalMins = workMins + breakMins;
  const breakPct = totalMins > 0 ? Math.round((breakMins / totalMins) * 100) : 0;

  const empName = getEmpName(session);
  const empCode = getEmpCode(session);
  const dept = getDept(session);
  const sStart = getSessionStart(session);
  const sEnd = getSessionEnd(session);
  const breakCnt = getBreakCount(session);
  const distKm = getDistKm(session);
  const pingCnt = getPingCount(session);

  const initials = (empName || 'EE')
    .split(' ').slice(0, 2).map((n) => n[0] || '').join('').toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="px-4 py-3 border-b border-border/40 last:border-0 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center hover:bg-muted/20 transition-colors group"
    >
      {/* Employee */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-foreground truncate">{empName}</div>
          <div className="text-[10px] text-muted-foreground truncate">
            {empCode ? `#${empCode}` : ''} {dept ? `• ${dept}` : ''}
          </div>
        </div>
      </div>

      {/* Session Time */}
      <div className="text-xs text-muted-foreground font-mono">
        {sStart
          ? new Date(sStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '--:--'}
        {' → '}
        {sEnd
          ? new Date(sEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          : '--:--'}
      </div>

      {/* Working Time */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {formatMinutes(workMins)}
        </span>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full"
            style={{ width: `${Math.max(0, 100 - breakPct)}%` }}
          />
        </div>
      </div>

      {/* Breaks */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          {formatMinutes(breakMins)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {breakCnt} {breakCnt === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {/* Distance */}
      <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
        {formatKm(distKm)}
      </div>

      {/* Pings */}
      <div className="text-xs font-mono text-muted-foreground">
        {pingCnt}
      </div>

      {/* Actions */}
      <button
        onClick={onViewRoute}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold transition-all opacity-80 group-hover:opacity-100"
      >
        <Eye className="w-3 h-3" />
        View Route
      </button>
    </motion.div>
  );
};
