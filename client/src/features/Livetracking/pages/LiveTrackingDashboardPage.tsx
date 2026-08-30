// ============================================================
// LiveTrackingDashboardPage — Main Live Tracking Command Center
// client/src/features/Livetracking/pages/LiveTrackingDashboardPage.tsx
// Theme compatible with dark & light modes
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Navigation2, History, Users, Signal, SignalZero, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { RoutePlaybackModal } from '../components/RoutePlaybackModal';
import { fetchLiveLocations, fetchRouteHistory } from '../api/livetrackingApi';
import { useLiveTrackingSocket } from '../hooks/useLiveTrackingSocket';
import { detectBreakPoints } from '../utils/breakDetector';
import type { LiveEmployee } from '../types/livetracking.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';

function getLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput.replace(' ', 'T')) : new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/** Returns true if an employee is ONLINE & GPS ON, but their last ping is older than thresholdMs */
function isStaleSignal(emp: LiveEmployee, thresholdMs = 5 * 60 * 1000): boolean {
  if (!emp) return false;
  // If GPS is OFF or employee is OFFLINE, it's not a lost signal (GPS is turned off / logged out)
  if (emp.location_status === 'OFF' || emp.connection_status === 'OFFLINE') return false;
  if (!emp.last_ping_at) return true;
  try {
    const timeStr = typeof emp.last_ping_at === 'string' ? emp.last_ping_at.replace(' ', 'T') : emp.last_ping_at;
    const last = new Date(timeStr).getTime();
    if (isNaN(last)) return true;
    return Date.now() - last > thresholdMs;
  } catch {
    return true;
  }
}

function isCheckedInEmployee(rawEmp: any): boolean {
  const dept = (rawEmp.department || '').toLowerCase();
  if (dept === 'hr' || dept === 'human resources') return false;

  const checkInTime = rawEmp.checkInTime ?? rawEmp.check_in_time;
  const checkOutTime = rawEmp.checkOutTime ?? rawEmp.check_out_time;

  // 1. MUST HAVE CHECKED IN TODAY
  if (!checkInTime || String(checkInTime).trim() === '') return false;

  // 2. MUST NOT HAVE CHECKED OUT TODAY (Must be actively checked-in right now)
  if (checkOutTime != null && String(checkOutTime).trim() !== '') return false;

  return true;
}

export const LiveTrackingDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  // Detect HR/Admin/CEO role from authStore
  const isHROrAdmin = useMemo(() => {
    const roles: string[] = Array.isArray(user?.roles) ? [...user.roles] : [];
    if ((user as any)?.role) roles.push((user as any).role);
    const adminPatterns = ['admin', 'hr', 'organization_admin', 'hr_manager', 'hr_admin', 'super_admin', 'ceo', 'owner', 'director', 'executive'];
    return roles.some((r) =>
      adminPatterns.some((p) => String(r).toLowerCase().replace(/[\s-]+/g, '_').includes(p))
    );
  }, [user]);

  // Get history route based on current user role
  const getHistoryRoute = useMemo(() => {
    const roles: string[] = Array.isArray(user?.roles) ? [...user.roles] : [];
    const roleStr = roles.map((r) => String(r).toLowerCase().replace(/[\s-]+/g, '_')).join(',');

    if (roleStr.includes('hr_manager') || roleStr.includes('hr_admin') || roleStr.includes('organization_admin') || roleStr.includes('super_admin')) {
      return '/admin/live-tracking/history';
    } else if (roleStr.includes('manager') || roleStr.includes('department_head')) {
      return '/manager/live-tracking/history';
    } else if (roleStr.includes('team_lead')) {
      return '/team-lead/live-tracking/history';
    }
    return '/admin/live-tracking/history';
  }, [user]);

  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [historyEmployee, setHistoryEmployee] = useState<LiveEmployee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<LiveEmployee | null>(null);

  // Derived stats (computed from employees list — no extra state)
  const stats = useMemo(() => ({
    total: employees.length,
    online: employees.filter((e) => e.connection_status === 'ONLINE').length,
    gpsOn: employees.filter((e) => e.location_status === 'ON').length,
    stale: employees.filter((e) => isStaleSignal(e)).length,
  }), [employees]);

  // ── Load initial & continuous snapshot ───────────────────────────────
  const loadSnapshot = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchLiveLocations();

      // Normalize camelCase and snake_case properties
      const normalizedData = (data || []).map((item: any) => ({
        ...item,
        employee_id: item.employee_id ?? item.employeeId ?? item.id,
        check_in_time: item.check_in_time ?? item.checkInTime,
        attendance_status: item.attendance_status ?? item.attendanceStatus,
        location_status: item.location_status ?? item.locationStatus,
        connection_status: item.connection_status ?? item.connectionStatus,
        last_ping_at: item.last_ping_at ?? item.lastPingAt,
      }));

      // Filter to show STRICTLY ONLY employees who punched attendance TODAY
      const dataToUse = normalizedData.filter(isCheckedInEmployee);

      // Pre-fetch today's route trails safely for active employees
      const todayStr = new Date().toISOString().slice(0, 10);
      const enrichedData = await Promise.all(
        dataToUse.map(async (emp) => {
          const empId = emp.employee_id;
          if (!empId) return emp;
          try {
            const history = await fetchRouteHistory(empId, todayStr).catch(() => []);
            if (history && history.length > 0) {
              const breaks = detectBreakPoints(history);
              return { ...emp, routeTrail: history, breakPoints: breaks };
            }
          } catch {
            // fallback if history fetch fails
          }
          if (emp.latitude != null && emp.longitude != null) {
            const initialPoint = {
              latitude: Number(emp.latitude),
              longitude: Number(emp.longitude),
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

      // Auto-select the first checked-in employee for single-employee focus
      setSelectedEmployee((prev) => {
        if (prev && enrichedData.some((e) => (e.employee_id ?? (e as any).id) === (prev.employee_id ?? (prev as any).id))) {
          return prev;
        }
        return enrichedData[0] || null;
      });
    } catch {
      // Ignore background poll errors quietly
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const { selectedCompanyId } = useCompanyStore();

  useEffect(() => {
    // Load snapshot ONCE on mount to seed initial route trails + live list.
    // After this, all real-time state changes are driven purely by the Socket.IO
    // useLiveTrackingSocket hook. The 3-second HTTP polling loop has been removed
    // to prevent stale HTTP data from overwriting live socket-updated state.
    loadSnapshot(true);
  }, [loadSnapshot, selectedCompanyId]);

  // ── Employee map list: Show all employees on map by default, or focus on selected single employee ──
  const mapEmployees = useMemo(() => {
    if (!selectedEmployee) return employees;
    const updated = employees.find((e) => (e.employee_id ?? (e as any).id) === (selectedEmployee.employee_id ?? (selectedEmployee as any).id));
    return updated ? [updated] : [selectedEmployee];
  }, [selectedEmployee, employees]);

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

  return (
    <div className="h-[calc(100vh-70px)] bg-background text-foreground space-y-2 p-2 font-sans flex flex-col overflow-hidden">
      {/* ── Compact Header & Dropdown Controls ─────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 bg-card border border-border/80 px-4 py-2.5 rounded-xl shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Navigation2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">Live Employee Tracking</h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Real-time GPS • Socket.IO driven • MapLibre GL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Single-Employee Focus Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 border border-border/80 rounded-lg px-2.5 py-1">
            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={(selectedEmployee?.employee_id ?? (selectedEmployee as any)?.id) || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSelectedEmployee(null);
                } else {
                  const found = employees.find((emp) => String(emp.employee_id ?? (emp as any).id) === val);
                  if (found) setSelectedEmployee(found);
                }
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
            >
              {employees.length === 0 ? (
                <option value="">No staff checked in today</option>
              ) : (
                employees.map((emp) => {
                  const idVal = emp.employee_id ?? (emp as any).id;
                  const stale = isStaleSignal(emp);
                  return (
                    <option key={idVal} value={idVal}>
                      {stale ? '⚠️' : '📍'} {emp.name} {emp.designation ? `(${emp.designation})` : ''}{stale ? ' — Signal Lost' : ''}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {/* Live Socket Connection Status */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-500 shadow-[0_0_8px_#22c55e] animate-pulse'
                : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
            }`} />
            <span className={`font-bold text-[11px] ${
              isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
            }`}>
              {isConnected ? 'Live Socket Connected' : 'Socket Disconnected'}
            </span>
          </div>

          <span className="text-muted-foreground hidden md:inline font-mono text-[11px]">
            Seeded {lastRefreshed.toLocaleTimeString('en-IN')}
          </span>

          {/* History button — HR/Admin/CEO */}
          {isHROrAdmin && (
            <button
              onClick={() => navigate('/admin/live-tracking/history')}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg font-bold text-xs transition-all"
            >
              <History className="w-3.5 h-3.5" />
              History
            </button>
          )}

          <button
            onClick={() => loadSnapshot(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-bold text-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Live Stats Bar ─────────────────────────────────── */}
      {employees.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-card border border-border/60 rounded-lg px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-black text-foreground">{stats.total}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-emerald-500/20 rounded-lg px-3 py-1.5">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-500">{stats.online}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Online</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-sky-500/20 rounded-lg px-3 py-1.5">
            <Navigation2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-black text-sky-500">{stats.gpsOn}</span>
            <span className="text-[11px] text-muted-foreground font-medium">GPS ON</span>
          </div>
          {stats.stale > 0 && (
            <div className="flex items-center gap-1.5 bg-card border border-rose-500/20 rounded-lg px-3 py-1.5">
              <SignalZero className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-black text-rose-500">{stats.stale}</span>
              <span className="text-[11px] text-muted-foreground font-medium">Signal Lost (&gt;5m)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main Bounded Container for Map (Locked into screen container) ─────────────────── */}
      <div className="w-full flex-1 min-h-[450px] max-h-[calc(100vh-135px)] bg-card border border-border/80 rounded-xl overflow-hidden relative shadow-2xs z-0 flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="text-primary font-bold text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading live map data...
            </div>
          </div>
        )}
        {!loading && employees.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 max-w-md text-center">
            <span>📍</span>
            <span>No employees have punched attendance today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}). Field staff will appear on map once checked in.</span>
          </div>
        )}
        <LiveTrackingMap
          employees={mapEmployees}
          selectedEmployee={selectedEmployee}
          onSelectEmployee={(emp) => setSelectedEmployee(emp)}
          onViewHistory={(emp) => {
            setSelectedEmployee(emp);
            setHistoryEmployee(emp);
          }}
          onClearSelection={() => setSelectedEmployee(null)}
        />
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

