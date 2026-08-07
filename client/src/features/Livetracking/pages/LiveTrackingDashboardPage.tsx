// ============================================================
// LiveTrackingDashboardPage — Main Live Tracking Command Center
// client/src/features/Livetracking/pages/LiveTrackingDashboardPage.tsx
// Theme compatible with dark & light modes
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Wifi, AlertTriangle,
  RefreshCw, Activity, Navigation2, Eye, MapPin, History
} from 'lucide-react';
import { toast } from 'sonner';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { LiveTrackingFilterBar } from '../components/LiveTrackingFilterBar';
import { RoutePlaybackModal } from '../components/RoutePlaybackModal';
import { fetchLiveLocations, fetchRouteHistory } from '../api/livetrackingApi';
import { useLiveTrackingSocket } from '../hooks/useLiveTrackingSocket';
import { detectBreakPoints } from '../utils/breakDetector';
import type { LiveEmployee, LiveTrackingFilters } from '../types/livetracking.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';

function isTrackableEmployee(emp: LiveEmployee): boolean {
  const dept = (emp.department || '').toLowerCase();
  const desig = (emp.designation || '').toLowerCase();
  const name = (emp.name || '').toLowerCase();

  // HR & Admin accounts are tracking managers — they are not field employees to be tracked
  if (dept === 'hr' || dept === 'human resources' || dept.includes('admin')) return false;
  if (desig.includes('hr') || desig.includes('admin') || desig.includes('management')) return false;
  if (name.includes('aditya joshi')) return false;

  return true;
}

function applyFilters(employees: LiveEmployee[], filters: LiveTrackingFilters): LiveEmployee[] {
  return employees.filter((emp) => {
    // 0. Exclude HR/Admin accounts completely
    if (!isTrackableEmployee(emp)) return false;

    // 1. Search Query (matches Name, Employee Code, Department, Designation, or Reporting Manager)
    const q = (filters.search || '').trim().toLowerCase();
    if (q) {
      const nameMatch = (emp.name || '').toLowerCase().includes(q);
      const codeMatch = (emp.employee_code || '').toLowerCase().includes(q);
      const deptMatch = (emp.department || '').toLowerCase().includes(q);
      const desigMatch = (emp.designation || '').toLowerCase().includes(q);
      const mgrMatch = (emp.reporting_manager || '').toLowerCase().includes(q);
      if (!nameMatch && !codeMatch && !deptMatch && !desigMatch && !mgrMatch) return false;
    }

    // 2. Department Filter
    if (filters.department) {
      const empDept = (emp.department || '').trim().toLowerCase();
      const filterDept = filters.department.trim().toLowerCase();
      if (empDept !== filterDept) return false;
    }

    // 3. Designation Filter
    if (filters.designation) {
      const empDesig = (emp.designation || '').trim().toLowerCase();
      const filterDesig = filters.designation.trim().toLowerCase();
      if (empDesig !== filterDesig) return false;
    }

    // 4. Reporting Manager Filter
    if (filters.reportingManager) {
      const empMgr = (emp.reporting_manager || '').trim().toLowerCase();
      const filterMgr = filters.reportingManager.trim().toLowerCase();
      if (empMgr !== filterMgr) return false;
    }

    // 5. Attendance Status Filter
    if (filters.attendanceStatus) {
      const empAtt = (emp.attendance_status || 'absent').trim().toLowerCase();
      const filterAtt = filters.attendanceStatus.trim().toLowerCase();
      if (empAtt !== filterAtt) return false;
    }

    // 6. Connection Status Filter (ONLINE / OFFLINE)
    if (filters.connectionStatus && filters.connectionStatus !== 'all') {
      const empConn = String(emp.connection_status || 'OFFLINE').trim().toUpperCase();
      const filterConn = String(filters.connectionStatus).trim().toUpperCase();
      if (empConn !== filterConn) return false;
    }

    // 7. Location Status Filter (ON / OFF)
    if (filters.locationStatus && filters.locationStatus !== 'all') {
      const empLoc = String(emp.location_status || 'OFF').trim().toUpperCase();
      const filterLoc = String(filters.locationStatus).trim().toUpperCase();
      if (empLoc !== filterLoc) return false;
    }

    return true;
  });
}

export const LiveTrackingDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  // Detect HR/Admin role from authStore
  const isHROrAdmin = useMemo(() => {
    const roles: string[] = Array.isArray(user?.roles) ? [...user.roles] : [];
    const adminPatterns = ['admin', 'hr', 'organization_admin', 'hr_manager', 'hr_admin', 'super_admin'];
    return roles.some((r) =>
      adminPatterns.some((p) => String(r).toLowerCase().replace(/[\s-]+/g, '_').includes(p))
    );
  }, [user]);

  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [filters, setFilters] = useState<LiveTrackingFilters>({
    search: '',
    department: '',
    designation: '',
    reportingManager: '',
    attendanceStatus: '',
    connectionStatus: 'all',
    locationStatus: 'all',
  });
  const [historyEmployee, setHistoryEmployee] = useState<LiveEmployee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<LiveEmployee | null>(null);

  // ── Load initial snapshot ───────────────────────────────
  const loadSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchLiveLocations();

      // Pre-fetch today's route trails for active employees
      const todayStr = new Date().toISOString().slice(0, 10);
      const enrichedData = await Promise.all(
        data.map(async (emp) => {
          if (!emp.employee_id) return emp;
          try {
            const history = await fetchRouteHistory(emp.employee_id, todayStr);
            if (history && history.length > 0) {
              const breaks = detectBreakPoints(history);
              return { ...emp, routeTrail: history, breakPoints: breaks };
            }
          } catch {
            // fallback if history fetch fails
          }
          if (emp.latitude != null && emp.longitude != null) {
            const initialPoint = {
              latitude: emp.latitude,
              longitude: emp.longitude,
              speed: null,
              recorded_at: emp.last_ping_at || new Date().toISOString(),
            };
            return { ...emp, routeTrail: [initialPoint], breakPoints: [] };
          }
          return emp;
        })
      );

      setEmployees(enrichedData);
      setLastRefreshed(new Date());

      // Auto-focus single employee mode on load (prefers Yash Kale or first active employee)
      setSelectedEmployee((prev) => {
        if (prev) return prev;
        const yash = enrichedData.find((e) => (e.name || '').toLowerCase().includes('yash') && e.latitude != null);
        if (yash) return yash;
        const firstValid = enrichedData.find((e) => e.latitude != null && e.longitude != null);
        return firstValid || enrichedData[0] || null;
      });
    } catch {
      toast.error('Failed to load live employee locations');
    } finally {
      setLoading(false);
    }
  }, []);

  const { selectedCompanyId } = useCompanyStore();

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot, selectedCompanyId]);

  // ── Real-time socket updates ────────────────────────────
  const { isConnected } = useLiveTrackingSocket({
    token,
    employees,
    setEmployees,
    onLocationOff: (_, name) => {
      toast.warning(`⚠️ ${name} turned OFF location tracking!`, { duration: 8000 });
    },
    onLocationOn: (_, name) => {
      toast.success(`✅ ${name} resumed location tracking.`, { duration: 5000 });
    },
    onOffline: (_, name) => {
      toast.info(`📴 ${name} went offline.`, { duration: 4000 });
    },
    onOnline: (_, name) => {
      toast.success(`🟢 ${name} is back online.`, { duration: 3000 });
    },
  });

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const online = employees.filter((e) => e.connection_status === 'ONLINE').length;
    const locationOff = employees.filter((e) => e.location_status === 'OFF' && e.connection_status === 'ONLINE').length;
    const present = employees.filter((e) => e.attendance_status === 'present').length;
    return { total: employees.length, online, locationOff, present };
  }, [employees]);

  // ── Filtered employees for map and list ────────────────
  const filtered = useMemo(() => applyFilters(employees, filters), [employees, filters]);

  return (
    <div className="min-h-screen bg-background text-foreground space-y-4 p-4 sm:p-6 font-sans">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Navigation2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">Live Employee Tracking</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Real-time organization GPS map & route playback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Connection status badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#22c55e]' : 'bg-rose-500'
              }`}
            />
            <span className={isConnected ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 font-bold'}>
              {isConnected ? 'Live Socket Connected' : 'Reconnecting...'}
            </span>
          </div>

          <span className="text-muted-foreground hidden md:inline font-mono">
            Updated {lastRefreshed.toLocaleTimeString('en-IN')}
          </span>

          {/* History button — HR/Admin only */}
          {isHROrAdmin && (
            <button
              onClick={() => navigate('/admin/live-tracking/history')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition-all"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          )}

          <button
            onClick={loadSnapshot}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Roster', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Online Active', value: stats.online, icon: <Wifi className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Location OFF Alerts', value: stats.locationOff, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Present Today', value: stats.present, icon: <Activity className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
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
              <div className="text-xl font-black text-foreground">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground font-semibold">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filter Bar ─────────────────────────────────── */}
      <LiveTrackingFilterBar
        filters={filters}
        onChange={setFilters}
        employees={employees}
      />

      {/* ── Main Content: Map + Sidebar ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-320px)] min-h-[520px]">
        {/* Map Column (2-cols) */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl overflow-hidden relative shadow-2xs flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-primary font-bold text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading live map data...
              </div>
            </div>
          )}
          <LiveTrackingMap
            employees={filtered}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onViewHistory={(emp) => {
              setSelectedEmployee(emp);
              setHistoryEmployee(emp);
            }}
            onClearSelection={() => setSelectedEmployee(null)}
          />
        </div>

        {/* Employee Roster Sidebar (1-col) */}
        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden flex flex-col shadow-2xs">
          <div className="p-3.5 border-b border-border/60 flex items-center justify-between bg-muted/30">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" /> Employees ({filtered.length})
            </span>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">● Online</span>
              <span className="text-rose-500">● Offline</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            <AnimatePresence>
              {filtered.map((emp) => (
                <EmployeeListCard
                  key={emp.employee_id}
                  employee={emp}
                  isSelected={selectedEmployee?.employee_id === emp.employee_id}
                  onSelect={() => setSelectedEmployee(emp)}
                  onViewHistory={() => setHistoryEmployee(emp)}
                />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && !loading && (
              <div className="text-center text-muted-foreground p-8 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No employees match the current filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Route Playback Modal ─────────────────────────── */}
      {historyEmployee && (
        <RoutePlaybackModal
          employee={historyEmployee}
          onClose={() => setHistoryEmployee(null)}
        />
      )}
    </div>
  );
};

// ── Employee List Card ────────────────────────────────────
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

const EmployeeListCard: React.FC<{
  employee: LiveEmployee;
  isSelected: boolean;
  onSelect: () => void;
  onViewHistory: () => void;
}> = ({ employee, isSelected, onSelect, onViewHistory }) => {
  const isOnline = employee.connection_status === 'ONLINE';
  const isLocationOn = employee.location_status === 'ON';
  const avatarSrc = formatAvatarUrl(employee.avatar_url);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={onSelect}
      className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
        isSelected
          ? 'bg-primary/10 border-primary shadow-xs'
          : 'bg-background hover:bg-muted/50 border-border/70'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={employee.name}
              className={`w-9 h-9 rounded-full object-cover border-2 ${
                isOnline ? 'border-emerald-500' : 'border-muted-foreground/30'
              }`}
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black border-2 ${
                isOnline ? 'border-emerald-500' : 'border-muted-foreground/30'
              }`}
            >
              {employee.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Status dot */}
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-xs text-foreground truncate">{employee.name}</div>
          <div className="text-[10px] text-muted-foreground truncate font-medium">
            {employee.designation || 'Staff'} {employee.department ? `• ${employee.department}` : ''}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
              isLocationOn
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            📡 {employee.location_status}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory();
            }}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-2.5 h-2.5" /> History
          </button>
        </div>
      </div>

      {employee.last_ping_at && (
        <div className="text-[9px] text-muted-foreground font-mono mt-1.5">
          Last ping: {new Date(employee.last_ping_at).toLocaleTimeString('en-IN')}
        </div>
      )}
    </motion.div>
  );
};
