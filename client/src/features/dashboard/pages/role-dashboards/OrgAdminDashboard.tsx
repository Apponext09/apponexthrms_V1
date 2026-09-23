import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  MapPin,
  UserPlus,
  FileBarChart,
  Settings,
  CreditCard,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Clock,
  Briefcase,
  Package,
  Wallet,
  Coffee,
  Navigation,
  IndianRupee,
  Flame,
  FilePlus,
  CheckCircle,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  Filter,
  DollarSign,
  UserRoundCheck,
  ReceiptIndianRupee,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import {
  useDashboardCustomizationStore,
  ALL_AVAILABLE_REPORTS,
  ALL_AVAILABLE_QUICK_ACTIONS,
  FIXED_KPIS,
} from '@/features/dashboard/store/dashboardCustomizationStore';

const panelClass = 'rounded-xl border-border bg-card shadow-soft-xs hover:shadow-soft-xs';

const ICON_MAP: Record<string, any> = {
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Clock,
  Briefcase,
  UserPlus,
  Package,
  Wallet,
  FileBarChart,
  Coffee,
  Navigation,
  IndianRupee,
  Flame,
  CreditCard,
  FilePlus,
  CheckCircle,
  Settings,
};

// ─── Fixed KPI paths (always-on pinned row) ───────────────────────────────────
const FIXED_KPI_PATHS: Record<string, string> = {
  totalHeadcount: '/org-structure',
  activeDepartments: '/masters?tab=department',
  officeLocations: '/settings/company-profile',
  monthlyPayrollCost: '/payroll',
};

// ─── Optional KPI paths ───────────────────────────────────────────────────────
const OPTIONAL_KPI_PATHS: Record<string, string> = {
  openJobs: '/recruitment/jobs',
  pendingApprovals: '/approvals/dashboard',
  newHires: '/employees',
  onLeaveToday: '/attendance',
  reportingOfficers: '/org-structure',
};

// Color palettes for multi-series graphs
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#10b981', // Emerald
  Late: '#f59e0b',    // Amber
  HalfDay: '#f97316', // Orange
  WFH: '#8b5cf6',     // Violet
  OnLeave: '#0ea5e9', // Sky
  Absent: '#ef4444',  // Rose
};

const DEPT_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
const STAGE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedCompanyName } = useCompanyStore();
  const { data: dashboardData, isLoading, isError, refetch } = useAdminDashboard();
  const { config } = useDashboardCustomizationStore();

  const [activeModuleFilter, setActiveModuleFilter] = useState<'all' | 'attendance' | 'workforce' | 'payroll' | 'recruitment' | 'expenses'>('all');

  const companyInfo = dashboardData?.companyInfo;
  const companyName = companyInfo?.name || selectedCompanyName || user?.organizationName || 'Organization';
  const primaryLocation = companyInfo?.location || user?.organizationLocation || 'Not Specified';

  // ── Fixed KPI values ────────────────────────────────────────────────────────
  const totalEmployees = dashboardData?.kpis?.totalHeadcount ?? 0;
  const totalDepartments = dashboardData?.kpis?.activeDepartments ?? 0;
  const totalLocations = dashboardData?.kpis?.officeLocations ?? 0;
  const monthlyPayrollVal = dashboardData?.kpis?.monthlyPayrollCost ?? 0;

  const formattedPayrollCost = useMemo(() => {
    if (isLoading) return '...';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(monthlyPayrollVal);
  }, [monthlyPayrollVal, isLoading]);

  // ── Optional KPI values ─────────────────────────────────────────────────────
  const openJobsCount = dashboardData?.kpis?.openJobs ?? 0;
  const pendingApprovals = dashboardData?.kpis?.pendingApprovals ?? 0;
  const newHires = dashboardData?.kpis?.newHires ?? 0;
  const onLeaveToday = dashboardData?.kpis?.onLeaveToday ?? 0;
  const reportingOfficers = dashboardData?.kpis?.reportingOfficers ?? 0;

  const growthChartData = dashboardData?.growthTrend || [];
  const departmentBreakdown = dashboardData?.departmentBreakdown || [];
  const recentEmployees = dashboardData?.recentEmployees || [];

  // Real Module Analytics Data
  const attendanceAnalytics = dashboardData?.attendanceAnalytics;
  const leaveAnalytics = dashboardData?.leaveAnalytics;
  const payrollAnalytics = dashboardData?.payrollAnalytics;
  const recruitmentAnalytics = dashboardData?.recruitmentAnalytics;
  const expenseAnalytics = dashboardData?.expenseAnalytics;
  const workforceAnalytics = dashboardData?.workforceAnalytics;

  // Prepared Attendance Donut Data
  const todayAttendanceDonut = useMemo(() => {
    if (!attendanceAnalytics?.today) return [];
    const t = attendanceAnalytics.today;
    return [
      { name: 'Present', value: t.present, color: ATTENDANCE_COLORS.Present },
      { name: 'Late', value: t.late, color: ATTENDANCE_COLORS.Late },
      { name: 'Half Day', value: t.halfDay, color: ATTENDANCE_COLORS.HalfDay },
      { name: 'WFH', value: t.wfh, color: ATTENDANCE_COLORS.WFH },
      { name: 'On Leave', value: t.onLeave, color: ATTENDANCE_COLORS.OnLeave },
      { name: 'Absent', value: t.absent, color: ATTENDANCE_COLORS.Absent },
    ].filter((item) => item.value > 0);
  }, [attendanceAnalytics]);

  // Selected report details for the header button
  const activeReport = useMemo(() => {
    return (
      ALL_AVAILABLE_REPORTS.find((r) => r.id === config.selectedReportId) || ALL_AVAILABLE_REPORTS[0]
    );
  }, [config.selectedReportId]);

  const ReportIcon = ICON_MAP[activeReport.iconName] || FileBarChart;

  // ── Fixed KPI cards (always shown) ─────────────────────────────────────────
  const fixedKpiCards = useMemo(() => {
    const vals: Record<string, { value: string; icon: any }> = {
      totalHeadcount: { value: isLoading ? '...' : isError ? '—' : String(totalEmployees), icon: Users },
      activeDepartments: { value: isLoading ? '...' : isError ? '—' : String(totalDepartments), icon: Building2 },
      officeLocations: { value: isLoading ? '...' : isError ? '—' : String(totalLocations), icon: MapPin },
      monthlyPayrollCost: { value: isError ? '—' : formattedPayrollCost, icon: Wallet },
    };

    return FIXED_KPIS.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      path: kpi.path,
      ...vals[kpi.id],
    }));
  }, [isLoading, isError, totalEmployees, totalDepartments, totalLocations, formattedPayrollCost]);

  // ── Optional KPI cards (enabled via customization) ──────────────────────────
  const optionalKpiValues: Record<string, { value: string; icon: any; label: string; path: string }> = {
    openJobs: { label: 'Open Job Postings', value: isLoading ? '...' : isError ? '—' : String(openJobsCount), icon: Briefcase, path: OPTIONAL_KPI_PATHS.openJobs },
    pendingApprovals: { label: 'Pending Approvals', value: isLoading ? '...' : isError ? '—' : String(pendingApprovals), icon: Clock, path: OPTIONAL_KPI_PATHS.pendingApprovals },
    newHires: { label: 'New Hires This Month', value: isLoading ? '...' : isError ? '—' : String(newHires), icon: UserPlus, path: OPTIONAL_KPI_PATHS.newHires },
    onLeaveToday: { label: 'On Leave Today', value: isLoading ? '...' : isError ? '—' : String(onLeaveToday), icon: Palmtree, path: OPTIONAL_KPI_PATHS.onLeaveToday },
    reportingOfficers: { label: 'Reporting Officers', value: isLoading ? '...' : isError ? '—' : String(reportingOfficers), icon: UserCheck, path: OPTIONAL_KPI_PATHS.reportingOfficers },
  };

  const activeOptionalKpis = useMemo(() => {
    return (config.enabledKpiIds || [])
      .map((id) => ({ id, ...optionalKpiValues[id] }))
      .filter((k) => k && k.label);
  }, [
    config.enabledKpiIds,
    isLoading,
    openJobsCount,
    pendingApprovals,
    newHires,
    onLeaveToday,
    reportingOfficers,
    isError,
  ]);

  // Filtered active Quick Actions
  const activeQuickActions = useMemo(() => {
    return (config.enabledQuickActionIds || [])
      .map((id) => ALL_AVAILABLE_QUICK_ACTIONS.find((qa) => qa.id === id))
      .filter(Boolean);
  }, [config.enabledQuickActionIds]);

  return (
    <div className="org-admin-dashboard space-y-5 pb-8">
      {/* ── Header Section ── */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-soft-xs sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {companyName} Dashboard
            </h1>
            
          </div>
          <p className="flex items-center gap-2 text-pretty text-xs text-muted-foreground">
            <MapPin className="size-3.5 flex-shrink-0 text-primary" />
            <span>
              Location: <strong className="font-semibold text-foreground">{primaryLocation}</strong>
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.showHeaderAttendanceReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(activeReport.path)}
              className="h-9 rounded-lg bg-card px-3 text-xs font-semibold cursor-pointer gap-1.5"
            >
              <ReportIcon className="size-3.5" />
              {activeReport.title}
            </Button>
          )}
        </div>
      </section>

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          <span>Dashboard metrics could not be loaded. Values are unavailable, not zero.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs">Retry</Button>
        </div>
      )}

      {/* ── Fixed KPI Row ── */}
      {config.showKpiSection && (
        <section aria-label="Core organization overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fixedKpiCards.map(({ id, icon: Icon, label, value, path }) => (
            <Card
              key={id}
              className={`${panelClass} cursor-pointer group transition-all hover:ring-2 hover:ring-primary/30`}
              onClick={() => navigate(path)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">
                    {value}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* ── Optional KPI Row ── */}
      {activeOptionalKpis.length > 0 && (
        <section
          aria-label="Additional KPI metrics"
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            activeOptionalKpis.length === 5
              ? 'md:grid-cols-3 lg:grid-cols-5'
              : activeOptionalKpis.length === 3
              ? 'lg:grid-cols-3'
              : 'lg:grid-cols-4'
          }`}
        >
          {activeOptionalKpis.map(({ id, icon: Icon, label, value, path }) => (
            <Card
              key={id}
              className={`${panelClass} cursor-pointer group transition-all hover:ring-2 hover:ring-primary/20 border-dashed`}
              onClick={() => navigate(path)}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">
                    {value}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* ── Module Category Switcher Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2 pt-1">
        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 mr-2">
          <Filter className="size-3.5" /> Modules:
        </span>
        {[
          { id: 'all', label: 'All Modules (Overview)', icon: Layers },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Clock },
          { id: 'payroll', label: 'Payroll & Expenses', icon: Wallet },
          { id: 'workforce', label: 'Workforce & Org', icon: Users },
          { id: 'recruitment', label: 'Recruitment & Talent', icon: Briefcase },
        ].map((m) => {
          const Icon = m.icon;
          const isActive = activeModuleFilter === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModuleFilter(m.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── SECTION 1: ATTENDANCE & LEAVE ANALYTICS ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'attendance') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Clock className="size-4 text-primary" /> Attendance & Leave Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/attendance')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              View Full Attendance <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Today's Live Attendance Status */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Today's Attendance</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Live status breakdown of staff today
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {attendanceAnalytics?.today?.attendanceRate || 0}% Present
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2">
                {todayAttendanceDonut.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                    <Clock className="size-8 mb-2 opacity-40" />
                    <span>No attendance recorded for today yet</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="h-44 w-44 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={todayAttendanceDonut}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {todayAttendanceDonut.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--popover))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full text-xs">
                      {todayAttendanceDonut.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/40">
                          <span className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-muted-foreground truncate">{item.name}</p>
                            <p className="font-bold text-foreground">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7-Day Attendance Trend */}
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">7-Day Attendance Trajectory</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Daily presence and late arrivals over the last week
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    Past 7 Days
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!attendanceAnalytics?.weeklyTrend || attendanceAnalytics.weeklyTrend.length === 0 || !attendanceAnalytics.weeklyTrend.some((d) => d.present > 0 || d.late > 0 || d.absent > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                    <Clock className="size-8 mb-2 opacity-40 text-emerald-500" />
                    <span className="font-semibold text-foreground">No Attendance Records This Week</span>
                    <span className="text-muted-foreground mt-0.5">Web or biometric check-ins will populate this trend</span>
                  </div>
                ) : (
                  <div className="h-48 w-full pt-2 min-h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceAnalytics.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="late" name="Late Arrivals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leave Types & 6-Month Leave Trend */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Leaves by Type */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palmtree className="size-4 text-sky-500" /> Leave Distribution by Type
                </CardTitle>
                <CardDescription className="text-xs">
                  Approved applications categorised by leave policy
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!leaveAnalytics?.byType || leaveAnalytics.byType.length === 0 || !leaveAnalytics.byType.some((x) => x.approvedCount > 0 || x.pendingCount > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-44 text-muted-foreground text-xs">
                    <Palmtree className="size-8 mb-2 opacity-40 text-sky-500" />
                    <span className="font-semibold text-foreground">No Leave Requests Logged</span>
                    <span className="text-muted-foreground mt-0.5">Applied leave requests will appear categorized here</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {leaveAnalytics.byType.slice(0, 5).map((lt, idx) => {
                      const maxCount = Math.max(...leaveAnalytics.byType.map((x) => x.approvedCount), 1);
                      const pct = Math.round((lt.approvedCount / maxCount) * 100);
                      return (
                        <div key={lt.leaveTypeId || idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ backgroundColor: lt.color || DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                              {lt.name} ({lt.code})
                            </span>
                            <span className="font-bold text-foreground tabular-nums">
                              {lt.approvedCount} approved &bull; <span className="text-amber-500">{lt.pendingCount} pending</span>
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(pct, 4)}%`,
                                backgroundColor: lt.color || DEPT_COLORS[idx % DEPT_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6-Month Leave Usage Trend */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> 6-Month Leave Application Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly volume of submitted vs approved leaves
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!leaveAnalytics?.monthlyTrend || !leaveAnalytics.monthlyTrend.some((d) => d.applied > 0 || d.approved > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                    <Activity className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">No Leave History Recorded</span>
                    <span className="text-muted-foreground mt-0.5">Applied vs approved trajectory will plot monthly</span>
                  </div>
                ) : (
                  <div className="h-48 w-full pt-2 min-h-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={leaveAnalytics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line type="monotone" dataKey="applied" name="Applied" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 2: PAYROLL & EXPENSES ANALYTICS ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'payroll') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Wallet className="size-4 text-emerald-600" /> Payroll & Expense Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/payroll')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              Go to Payroll Portal <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* 6-Month Payroll Payout Trajectory */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">6-Month Payroll Trajectory</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Gross salary vs Net payout disbursements (₹)
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 border-emerald-200">
                    INR (₹)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!payrollAnalytics?.monthlyTrend || !payrollAnalytics.monthlyTrend.some((d) => d.grossSalary > 0 || d.netSalary > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-xs">
                    <Wallet className="size-8 mb-2 opacity-40 text-emerald-600" />
                    <span className="font-semibold text-foreground">No Payroll Records Generated</span>
                    <span className="text-muted-foreground mt-0.5">Process monthly payroll or add salary structures</span>
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payrollAnalytics.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                        />
                        <Tooltip
                          formatter={(val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val))}
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="grossSalary" name="Gross Salary" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="netSalary" name="Net Payout" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="deductions" name="Deductions" fill="#ea580c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6-Month Expense Reimbursement Trend */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <ReceiptIndianRupee className="size-4 text-primary" /> Expense Spending & Approvals
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Month-wise expense reimbursements (₹)
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/expenses')}
                    className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                  >
                    View Claims
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!expenseAnalytics?.monthlyTrend || !expenseAnalytics.monthlyTrend.some((d) => d.claimedAmount > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-xs">
                    <ReceiptIndianRupee className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">No Reimbursement Claims Submitted</span>
                    <span className="text-muted-foreground mt-0.5">Staff travel and operational claims will appear here</span>
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expenseAnalytics.monthlyTrend} margin={{ top: 16, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                        />
                        <Tooltip
                          formatter={(val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val))}
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="claimedAmount" name="Reimbursements (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 3: WORKFORCE & ORGANIZATION ANALYTICS ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'workforce') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Users className="size-4 text-primary" /> Workforce & Organization Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/org-structure')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              View Org Structure <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Employee Growth Trajectory */}
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-balance text-sm font-bold">Workforce Growth Trajectory</CardTitle>
                    <CardDescription className="mt-1 text-pretty text-xs">
                      Live workforce trajectory over recent 6 months
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0 text-[11px] font-semibold tabular-nums">
                    <TrendingUp className="mr-1 size-3 text-emerald-500" /> {totalEmployees} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {(!growthChartData || growthChartData.length === 0 || !growthChartData.some((d) => d.employees > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-xs">
                    <Users className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">No Employee Growth Data</span>
                    <span className="text-muted-foreground mt-0.5">Workforce trajectory will plot as staff members are added</span>
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorEmpGrowth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            color: 'hsl(var(--popover-foreground))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Area type="monotone" dataKey="employees" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorEmpGrowth)" name="Headcount" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Headcount Breakdown */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Building2 className="size-4 text-primary" /> Headcount by Department
                </CardTitle>
                <CardDescription className="text-xs">
                  Active staff distribution across departments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {departmentBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-xs">
                    <Building2 className="size-8 mb-2 opacity-40" />
                    <span>No departments created yet</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 pt-2 max-h-56 overflow-y-auto pr-1">
                    {departmentBreakdown.map((dept, idx) => (
                      <div key={dept.id || idx} className="flex items-center justify-between gap-3 py-3 text-xs first:pt-1 last:pb-1">
                        <span className="font-semibold text-foreground truncate">{dept.name}</span>
                        <span className="shrink-0 font-bold text-foreground tabular-nums">
                          {Number(dept.count ?? 0)} <span className="font-normal text-muted-foreground">employees</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gender Distribution */}
          <div>
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Gender Diversity</CardTitle>
                <CardDescription className="text-xs">Employee distribution by gender</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-1">
                {(!workforceAnalytics?.byGender || workforceAnalytics.byGender.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-2">No gender data</p>
                ) : (
                  <div className="h-64 w-full pt-2 min-h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workforceAnalytics.byGender} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="gender" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: number) => [value, 'Employees']}
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="count" position="top" fill="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                          {workforceAnalytics.byGender.map((_, index) => (
                            <Cell key={`gender-bar-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 4: RECRUITMENT & TALENT PIPELINE ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'recruitment') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Briefcase className="size-4 text-primary" /> Recruitment & Talent Pipeline
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/recruitment/jobs')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              View Recruitment Hub <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Candidate Pipeline Funnel */}
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Candidate Pipeline Funnel</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Active applicants distributed across hiring stages
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    {openJobsCount} Active Jobs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!recruitmentAnalytics?.pipelineStages || !recruitmentAnalytics.pipelineStages.some((s) => s.count > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-xs">
                    <Briefcase className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">No Active Candidates in Pipeline</span>
                    <span className="text-muted-foreground mt-0.5">Applications received for open jobs will appear in the pipeline stages</span>
                  </div>
                ) : (
                  <div className="h-52 w-full pt-2 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recruitmentAnalytics.pipelineStages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                          {recruitmentAnalytics.pipelineStages.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Positions by Department */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Open Positions by Department</CardTitle>
                <CardDescription className="text-xs">
                  Active job openings requiring staffing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!recruitmentAnalytics?.openJobsByDept || recruitmentAnalytics.openJobsByDept.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                    <Briefcase className="size-8 mb-2 opacity-40" />
                    <span>No active job openings published</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    {recruitmentAnalytics.openJobsByDept.map((job, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                        <span className="font-semibold text-foreground truncate max-w-[160px]">{job.departmentName}</span>
                        <Badge variant="outline" className="font-bold text-primary border-primary/30">
                          {job.openCount} Open
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 5: ROSTER, ENTITY DETAILS & QUICK SHORTCUTS ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Employee Roster */}
        {config.showRecentRoster && (
          <Card className={`${panelClass} lg:col-span-2`}>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UserRoundCheck className="size-4 text-primary" /> Recent Employee Roster
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/org-structure')}
                  className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary cursor-pointer"
                >
                  View All Employees
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
              {isLoading ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Loading employees...</p>
              ) : !recentEmployees.length ? (
                <p className="py-3 text-center text-xs text-muted-foreground">No employees found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recentEmployees.slice(0, 6).map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5 text-xs cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                          {emp.firstName ? emp.firstName[0].toUpperCase() : 'E'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground tabular-nums">
                            {emp.employeeCode} &bull; {emp.departmentName}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0 text-[10px] capitalize">
                        {emp.status || 'active'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <aside className="space-y-5" aria-label="Organization details and shortcuts">
          {/* Active Entity Details Card */}
          {config.showEntityDetails && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Organization Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 px-5 pb-5 pt-0 text-xs">
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="text-muted-foreground">Company Name</span>
                  <span className="truncate font-bold text-foreground">{companyName}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="text-muted-foreground">Primary Location</span>
                  <span className="truncate font-semibold text-foreground">{primaryLocation}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border py-2.5">
                  <span className="text-muted-foreground">Total Staff</span>
                  <span className="font-bold text-foreground tabular-nums">{totalEmployees} Members</span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2.5">
                  <span className="text-muted-foreground">Active Departments</span>
                  <span className="font-bold text-foreground tabular-nums">{totalDepartments} Depts</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Management Shortcuts */}
          {config.showQuickActions && activeQuickActions.length > 0 && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Quick Management Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 pt-0">
                {activeQuickActions.map((qa: any) => {
                  const QAIcon = ICON_MAP[qa.iconName] || Settings;
                  return (
                    <Button
                      key={qa.id}
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(qa.path)}
                      className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <QAIcon className="size-3.5 text-primary" /> {qa.label}
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
