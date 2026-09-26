// ============================================================
// LiveTrackingDashboardPage — Main Live Tracking Command Center
// client/src/features/Livetracking/pages/LiveTrackingDashboardPage.tsx
// Palette: white surfaces · soft blue canvas · navy text · blue accents
// Font: Plus Jakarta Sans
// ============================================================
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Navigation2,
  History,
  Users,
  Signal,
  SignalZero,
  MapPin,
  ChevronDown,
  Crosshair,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { LiveTrackingMap } from "../components/LiveTrackingMap";
import { RoutePlaybackModal } from "../components/RoutePlaybackModal";
import {
  fetchLiveLocations,
  fetchLiveTrails,
  fetchRouteHistory,
} from "../api/livetrackingApi";
import { useLiveTrackingSocket } from "../hooks/useLiveTrackingSocket";
import { liveTrackingStore } from "../store/liveTrackingStore";
import { localDateStr } from "../utils/dates";
import type { LiveEmployee } from "../types/livetracking.types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCompanyStore } from "@/features/settings/store/companyStore";
import { Button } from "@/components/ui/button";

function getLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  try {
    const d =
      typeof dateInput === "string"
        ? new Date(dateInput.replace(" ", "T"))
        : new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}

/** Returns true if an employee is ONLINE & GPS ON, but their last ping is older than thresholdMs */
function isStaleSignal(
  emp: LiveEmployee,
  thresholdMs = 5 * 60 * 1000,
): boolean {
  if (!emp) return false;
  // If GPS is OFF or employee is OFFLINE, it's not a lost signal (GPS is turned off / logged out)
  if (emp.location_status === "OFF" || emp.connection_status === "OFFLINE")
    return false;
  if (!emp.last_ping_at) return true;
  try {
    const timeStr =
      typeof emp.last_ping_at === "string"
        ? emp.last_ping_at.replace(" ", "T")
        : emp.last_ping_at;
    const last = new Date(timeStr).getTime();
    if (isNaN(last)) return true;
    return Date.now() - last > thresholdMs;
  } catch {
    return true;
  }
}

/** Points per employee used to seed the overview map; the selected employee loads the full day */
const OVERVIEW_TRAIL_POINTS = 300;
/** Roster labels (online / GPS / "x m ago") are synced from the live store at this cadence */
const ROSTER_SYNC_MS = 5000;

function normalizeLiveRow(item: any): LiveEmployee {
  return {
    ...item,
    employee_id: item.employee_id ?? item.employeeId ?? item.id,
    check_in_time: item.check_in_time ?? item.checkInTime,
    attendance_status: item.attendance_status ?? item.attendanceStatus,
    location_status: item.location_status ?? item.locationStatus,
    connection_status: item.connection_status ?? item.connectionStatus,
    last_ping_at: item.last_ping_at ?? item.lastPingAt,
  };
}

/** Seed the live store with today's routes for these employees (one request) */
async function seedTrails(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const trails = await fetchLiveTrails(ids, localDateStr(), OVERVIEW_TRAIL_POINTS);
    for (const [id, points] of Object.entries(trails)) {
      liveTrackingStore.seedRoute(
        Number(id),
        points.map(([lat, lng, ts]) => ({ lat, lng, ts })),
      );
    }
  } catch {
    // Routes are cosmetic on first paint — live deltas still draw from here on
  }
}

function isCheckedInEmployee(rawEmp: any): boolean {
  const dept = (rawEmp.department || "").toLowerCase();
  if (dept === "hr" || dept === "human resources") return false;

  const checkInTime = rawEmp.checkInTime ?? rawEmp.check_in_time;
  const checkOutTime = rawEmp.checkOutTime ?? rawEmp.check_out_time;

  // 1. MUST HAVE CHECKED IN TODAY
  if (!checkInTime || String(checkInTime).trim() === "") return false;

  // 2. MUST NOT HAVE CHECKED OUT TODAY (Must be actively checked-in right now)
  if (checkOutTime != null && String(checkOutTime).trim() !== "") return false;

  return true;
}

/** UI-only helper: compact "time since last ping" label */
function pingLabel(value?: string | Date | null): string {
  if (!value) return "no ping";
  try {
    const str = typeof value === "string" ? value.replace(" ", "T") : value;
    const t = new Date(str as any).getTime();
    if (isNaN(t)) return "no ping";
    const diff = Math.max(0, Date.now() - t);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "no ping";
  }
}

/** UI-only helper: initials avatar text */
function initialsOf(name?: string): string {
  if (!name) return "–";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const LiveTrackingDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const historyPath = location.pathname.startsWith("/hr/")
    ? "/hr/live-tracking/history"
    : location.pathname.startsWith("/manager/")
      ? "/manager/live-tracking/history"
      : location.pathname.startsWith("/team-lead/")
        ? "/team-lead/live-tracking/history"
        : "/live-tracking/history";
  const token = localStorage.getItem("accessToken");

  // Detect HR/Admin/CEO role from authStore
  const isHROrAdmin = useMemo(() => {
    const roles: string[] = Array.isArray(user?.roles) ? [...user.roles] : [];
    if ((user as any)?.role) roles.push((user as any).role);
    // Exact match, mirroring the server — a substring match treated any role
    // containing "admin"/"executive"/"director" as HR.
    const hrAdminRoles = new Set([
      "super_admin",
      "organization_admin",
      "org_admin",
      "admin",
      "hr_admin",
      "hr_manager",
      "hr",
      "ceo",
      "owner",
    ]);
    return roles.some((r) =>
      hrAdminRoles.has(
        String(r)
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_"),
      ),
    );
  }, [user]);

  // Get history route based on current user role
  const getHistoryRoute = useMemo(() => {
    const roles: string[] = Array.isArray(user?.roles) ? [...user.roles] : [];
    const roleStr = roles
      .map((r) =>
        String(r)
          .toLowerCase()
          .replace(/[\s-]+/g, "_"),
      )
      .join(",");

    if (
      roleStr.includes("hr_manager") ||
      roleStr.includes("hr_admin") ||
      roleStr.includes("organization_admin") ||
      roleStr.includes("super_admin")
    ) {
      return "/admin/live-tracking/history";
    } else if (
      roleStr.includes("manager") ||
      roleStr.includes("department_head")
    ) {
      return "/manager/live-tracking/history";
    } else if (roleStr.includes("team_lead")) {
      return "/team-lead/live-tracking/history";
    }
    return "/admin/live-tracking/history";
  }, [user]);

  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [historyEmployee, setHistoryEmployee] = useState<LiveEmployee | null>(
    null,
  );
  const [selectedEmployee, setSelectedEmployee] = useState<LiveEmployee | null>(
    null,
  );
  const [follow, setFollow] = useState(false);
  const employeesRef = useRef<LiveEmployee[]>([]);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  // Derived stats (computed from employees list — no extra state)
  const stats = useMemo(
    () => ({
      total: employees.length,
      online: employees.filter((e) => e.connection_status === "ONLINE").length,
      gpsOn: employees.filter((e) => e.location_status === "ON").length,
      stale: employees.filter((e) => isStaleSignal(e)).length,
    }),
    [employees],
  );

  // ── Load initial & continuous snapshot ───────────────────────────────
  // ── Load the roster + seed today's routes ─────────────────────────────
  // Positions/routes live in the live store (outside React); `employees` is
  // the roster metadata. A full reload replaces both; `onlyNew` merges in
  // employees that checked in after the page loaded.
  const loadSnapshot = useCallback(async (isInitial = false, onlyNew = false) => {
    try {
      if (isInitial) setLoading(true);
      const data = await fetchLiveLocations();

      // Filter to show STRICTLY ONLY employees who punched attendance TODAY
      const roster = (data || []).map(normalizeLiveRow).filter(isCheckedInEmployee);
      const known = new Set(employeesRef.current.map((e) => Number(e.employee_id)));
      const incoming = onlyNew ? roster.filter((e) => !known.has(Number(e.employee_id))) : roster;

      if (!onlyNew) liveTrackingStore.retain(roster.map((e) => Number(e.employee_id)));
      incoming.forEach((emp) => liveTrackingStore.upsertSnapshot(emp));

      if (onlyNew) {
        if (incoming.length) setEmployees((prev) => [...prev, ...incoming]);
      } else {
        setEmployees(roster);
        setLastRefreshed(new Date());
        // Keep the current selection only if that employee is still on the roster
        setSelectedEmployee((prev) =>
          prev && roster.some((e) => Number(e.employee_id) === Number(prev.employee_id)) ? prev : null,
        );
      }

      await seedTrails(incoming.map((e) => Number(e.employee_id)));
    } catch {
      // Ignore background poll errors quietly
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const { selectedCompanyId } = useCompanyStore();

  useEffect(() => {
    // Load snapshot ONCE on mount (and on company switch) to seed the roster and
    // today's routes. After this, positions are driven by Socket.IO deltas.
    liveTrackingStore.reset();
    loadSnapshot(true);
  }, [loadSnapshot, selectedCompanyId]);

  // Someone we don't know yet sent a location (checked in after load) — merge them in
  const unknownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRosterMerge = useCallback(() => {
    if (unknownTimerRef.current) return;
    unknownTimerRef.current = setTimeout(() => {
      unknownTimerRef.current = null;
      loadSnapshot(false, true);
    }, 5000);
  }, [loadSnapshot]);
  useEffect(() => () => {
    if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
  }, []);

  // ── Selected employee: load the full-resolution route for today ───────
  const selectedIdNum = selectedEmployee ? Number(selectedEmployee.employee_id) : null;
  useEffect(() => {
    setFollow(false);
    if (!selectedIdNum) return;
    let cancelled = false;
    fetchRouteHistory(selectedIdNum, localDateStr())
      .then((history) => {
        if (cancelled || !history?.length) return;
        liveTrackingStore.seedRoute(
          selectedIdNum,
          history.map((p) => ({
            lat: Number(p.latitude),
            lng: Number(p.longitude),
            ts: new Date(String(p.recorded_at).replace(" ", "T")).getTime(),
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedIdNum]);

  // ── Roster labels follow the live store (throttled — not per GPS update) ─
  useEffect(() => {
    const timer = setInterval(() => {
      setEmployees((prev) => {
        let changed = false;
        const next = prev.map((emp) => {
          const track = liveTrackingStore.get(Number(emp.employee_id));
          if (!track) return emp;
          const lastPing = track.lastPingAt ? new Date(track.lastPingAt).toISOString() : emp.last_ping_at;
          if (
            emp.location_status === track.locationStatus &&
            emp.connection_status === track.connectionStatus &&
            emp.last_ping_at === lastPing
          ) {
            return emp;
          }
          changed = true;
          return {
            ...emp,
            location_status: track.locationStatus,
            connection_status: track.connectionStatus,
            last_ping_at: lastPing,
            latitude: track.lat,
            longitude: track.lng,
          };
        });
        return changed ? next : prev;
      });
    }, ROSTER_SYNC_MS);
    return () => clearInterval(timer);
  }, []);

  const nameOf = (id: number) =>
    employeesRef.current.find((e) => Number(e.employee_id) === id)?.name ?? `Employee #${id}`;

  // ── Real-time socket updates ────────────────────────────
  const { isConnected } = useLiveTrackingSocket({
    token,
    onUnknownEmployees: scheduleRosterMerge,
    // Deltas sent while we were disconnected are gone — reseed routes quietly
    onReconnect: () => seedTrails(employeesRef.current.map((e) => Number(e.employee_id))),
    onLocationOff: (id) => {
      toast.warning(`${nameOf(id)} turned OFF location tracking`, { duration: 8000 });
    },
    onLocationOn: (id) => {
      toast.success(`${nameOf(id)} resumed location tracking`, { duration: 5000 });
    },
    onOffline: (id) => {
      toast.info(`${nameOf(id)} went offline`, { duration: 4000 });
    },
    onOnline: (id) => {
      toast.success(`${nameOf(id)} is back online`, { duration: 3000 });
    },
  });

  const selectedId =
    selectedEmployee?.employee_id ?? (selectedEmployee as any)?.id ?? "";

  return (
    <div
      className="live-tracking-root -m-4 flex min-h-[calc(100dvh-10rem)] flex-col gap-4 bg-[#F2F7FD] p-4 text-[#0B2545] sm:-m-6 sm:p-6 lg:min-h-[calc(100dvh-9rem)] dark:bg-background dark:text-foreground"
      style={{
        fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="shrink-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5 dark:border-border dark:bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Navigation2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-balance text-xl font-bold text-[#0B2545] dark:text-foreground">
                Live Employee Tracking
              </h1>
              <p className="mt-1 text-pretty text-sm text-[#4A6285] dark:text-muted-foreground">
                See checked-in employees and their latest location updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile / tablet focus selector (roster rail replaces this on desktop) */}
            <div className="relative lg:hidden">
              <Users className="w-3.5 h-3.5 text-[#1B6BFF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label="Focus on an employee"
                value={selectedId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedEmployee(null);
                  } else {
                    const found = employees.find(
                      (emp) =>
                        String(emp.employee_id ?? (emp as any).id) === val,
                    );
                    if (found) setSelectedEmployee(found);
                  }
                }}
                className="appearance-none bg-[#F5F9FF] border border-[#DCE7F7] rounded-xl h-9 pl-9 pr-8 text-xs font-semibold text-[#0B2B57] focus:outline-none focus:ring-2 focus:ring-[#1B6BFF]/25 focus:border-[#1B6BFF] cursor-pointer max-w-[230px] truncate dark:border-border dark:bg-muted dark:text-foreground"
              >
                {employees.length === 0 ? (
                  <option value="">No staff checked in today</option>
                ) : (
                  employees.map((emp) => {
                    const idVal = emp.employee_id ?? (emp as any).id;
                    const stale = isStaleSignal(emp);
                    return (
                      <option key={idVal} value={idVal}>
                        {emp.name}
                        {emp.designation ? ` · ${emp.designation}` : ""}
                        {stale ? " — Signal Lost" : ""}
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B86AB] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Socket status */}
            <div
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-[11.5px] font-bold ${
                isConnected
                  ? "bg-[#EAF6F0] border-[#BFE3D2] text-[#12795A]"
                  : "bg-[#FDEDEE] border-[#F5C5C8] text-[#B3272F]"
              }`}
            >
              <span className="relative flex w-2 h-2">
                <span
                  className={`relative inline-flex w-2 h-2 rounded-full ${
                    isConnected ? "bg-[#18A37E]" : "bg-[#D64550]"
                  }`}
                />
              </span>
              {isConnected ? "Live" : "Disconnected"}
            </div>

            <span className="hidden xl:inline text-[11px] font-medium text-[#6B86AB] tabular-nums">
              Seeded {lastRefreshed.toLocaleTimeString("en-IN")}
            </span>

            {isHROrAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(historyPath)}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <History className="w-3.5 h-3.5 text-[#1B6BFF]" />
                History
              </Button>
            )}

            <Button
              type="button"
              onClick={() => loadSnapshot(true)}
              disabled={loading}
              className="h-9 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* ── Stats strip ────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<MapPin className="w-4 h-4" />}
          value={stats.total}
          label="Checked in"
          tone="navy"
        />
        <StatCard
          icon={<Signal className="w-4 h-4" />}
          value={stats.online}
          label="Online"
          tone="green"
        />
        <StatCard
          icon={<Navigation2 className="w-4 h-4" />}
          value={stats.gpsOn}
          label="GPS on"
          tone="blue"
        />
        <StatCard
          icon={<SignalZero className="w-4 h-4" />}
          value={stats.stale}
          label="Signal lost >5m"
          tone={stats.stale > 0 ? "red" : "muted"}
        />
      </div>

      {/* ── Workspace: roster rail + map ───────────────────── */}
      <div className="flex min-h-[32rem] flex-1 gap-3">
        {/* Roster rail (desktop) */}
        <aside className="hidden lg:flex w-[286px] shrink-0 flex-col bg-white border border-[#DCE7F7] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(11,43,87,0.05)] dark:border-border dark:bg-card">
          <div className="px-4 py-3 border-b border-[#EDF3FC] flex items-center justify-between dark:border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1B6BFF]" />
              <span className="text-[13px] font-extrabold text-[#0B2B57] dark:text-foreground">
                Field Roster
              </span>
              <span className="text-[11px] font-bold text-[#1B6BFF] bg-[#EAF1FF] rounded-md px-1.5 py-0.5">
                {employees.length}
              </span>
            </div>
            {selectedEmployee && (
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="text-[11px] font-bold text-[#1B6BFF] hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {employees.length === 0 && !loading && (
              <div className="px-3 py-8 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#EAF1FF] flex items-center justify-center mb-2 dark:bg-primary/15">
                  <MapPin className="w-4 h-4 text-[#1B6BFF]" />
                </div>
                <p className="text-[12px] font-semibold text-[#0B2B57] dark:text-foreground">
                  Nobody checked in
                </p>
                <p className="text-[11px] text-[#6B86AB] mt-1">
                  Field staff appear here as soon as they punch attendance.
                </p>
              </div>
            )}

            {employees.map((emp) => {
              const idVal = emp.employee_id ?? (emp as any).id;
              const active = String(idVal) === String(selectedId);
              const stale = isStaleSignal(emp);
              const online = emp.connection_status === "ONLINE";
              const gpsOff = emp.location_status === "OFF";

              return (
                <div
                  key={idVal}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  onClick={() => setSelectedEmployee(emp)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedEmployee(emp);
                    }
                  }}
                  className={`group cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${
                    active
                      ? "bg-[#EAF1FF] border-[#B9D2FF]"
                      : "bg-white border-transparent hover:bg-[#F5F9FF] hover:border-[#E3EDFA] dark:bg-card dark:hover:bg-muted dark:hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11.5px] font-extrabold ${
                          active
                            ? "bg-[#1B6BFF] text-white"
                            : "bg-[#EEF4FC] text-[#3E6390]"
                        }`}
                      >
                        {initialsOf(emp.name)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          stale
                            ? "bg-[#D64550]"
                            : online
                              ? "bg-[#18A37E]"
                              : "bg-[#A8BBD4]"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-[#0B2B57] truncate dark:text-foreground">
                        {emp.name}
                      </p>
                      <p className="text-[11px] text-[#6B86AB] font-medium truncate">
                        {emp.designation || "Field staff"}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`View route history for ${emp.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployee(emp);
                        setHistoryEmployee(emp);
                      }}
                      title="Route playback"
                      className="shrink-0 w-7 h-7 rounded-lg border border-[#DCE7F7] bg-white flex items-center justify-center text-[#3E6390] hover:text-[#1B6BFF] hover:border-[#B9D2FF] transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <Tag tone={stale ? "red" : online ? "green" : "muted"}>
                      {stale ? "Signal lost" : online ? "Online" : "Offline"}
                    </Tag>
                    <Tag tone={gpsOff ? "amber" : "blue"}>
                      {gpsOff ? "GPS off" : "GPS on"}
                    </Tag>
                    <span className="text-[10.5px] font-semibold text-[#8AA0BC] ml-auto tabular-nums">
                      {pingLabel(emp.last_ping_at as any)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-[#EDF3FC] text-[10.5px] font-medium text-[#8AA0BC] flex items-center gap-1.5 dark:border-border dark:text-muted-foreground">
            <Crosshair className="w-3 h-3" />
            Select a name to highlight their route and follow them.
          </div>
        </aside>

        {/* Map surface */}
        <section
          aria-label="Live employee map"
          className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-border dark:bg-card"
        >
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 dark:bg-background/75">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#0B2B57] bg-white border border-[#DCE7F7] rounded-xl px-4 py-2.5 shadow-sm dark:border-border dark:bg-card dark:text-foreground">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1B6BFF]" />
                Loading live map data…
              </div>
            </div>
          )}

          {!loading && employees.length === 0 && (
            <div className="absolute left-1/2 top-4 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-2.5 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-[#1B6BFF] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#0B2545]">
                  No employees have punched attendance today (
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  ). Field staff will appear once checked in.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadSnapshot(true)}
                  className="mt-3 h-8 text-xs"
                >
                  Refresh locations
                </Button>
              </div>
            </div>
          )}

          {/* Focus indicator overlay */}
          {selectedEmployee && (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl border border-blue-100 bg-white/95 py-1.5 pl-2.5 pr-1.5 shadow-sm">
              <Crosshair className="w-3.5 h-3.5 text-[#1B6BFF]" />
              <span className="text-[11.5px] font-bold text-[#0B2B57] max-w-[180px] truncate">
                Focused · {selectedEmployee.name}
              </span>
              <button
                type="button"
                aria-pressed={follow}
                onClick={() => setFollow((f) => !f)}
                className={`text-[11px] font-bold rounded-lg px-2 py-0.5 transition-colors ${
                  follow
                    ? "bg-[#1B6BFF] text-white"
                    : "text-[#1B6BFF] hover:bg-[#EAF1FF]"
                }`}
              >
                Follow: {follow ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="text-[11px] font-bold text-[#1B6BFF] hover:bg-[#EAF1FF] rounded-lg px-2 py-0.5 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          <LiveTrackingMap
            employees={employees}
            selectedEmployee={selectedEmployee}
            follow={follow}
            onFollowChange={setFollow}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onViewHistory={(emp) => {
              setSelectedEmployee(emp);
              setHistoryEmployee(emp);
            }}
            onClearSelection={() => setSelectedEmployee(null)}
          />
        </section>
      </div>

      {/* ── Route Playback Modal ───────────────────────────── */}
      {historyEmployee && (
        <RoutePlaybackModal
          employee={historyEmployee}
          onClose={() => setHistoryEmployee(null)}
        />
      )}
    </div>
  );
};

/* ── Presentational subcomponents (UI only) ─────────────── */

const toneMap = {
  navy: { chip: "bg-[#EEF4FC] text-[#3E6390]", value: "text-[#0B2B57]" },
  blue: { chip: "bg-[#EAF1FF] text-[#1B6BFF]", value: "text-[#1B6BFF]" },
  green: { chip: "bg-[#EAF6F0] text-[#12795A]", value: "text-[#12795A]" },
  red: { chip: "bg-[#FDEDEE] text-[#B3272F]", value: "text-[#B3272F]" },
  amber: { chip: "bg-[#FDF3E4] text-[#9A6410]", value: "text-[#9A6410]" },
  muted: { chip: "bg-[#F1F5FA] text-[#8AA0BC]", value: "text-[#8AA0BC]" },
} as const;

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: keyof typeof toneMap;
}> = ({ icon, value, label, tone }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${toneMap[tone].chip}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xl font-bold leading-none tabular-nums text-[#0B2545] dark:text-foreground">
        {value}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#4A6285] dark:text-muted-foreground">
        {label}
      </p>
    </div>
  </div>
);

const Tag: React.FC<{
  tone: keyof typeof toneMap;
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <span
    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${toneMap[tone].chip}`}
  >
    {children}
  </span>
);
