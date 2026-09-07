import { useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import {
  useDashboardCustomizationStore,
  ALL_AVAILABLE_REPORTS,
  ALL_AVAILABLE_QUICK_ACTIONS,
  FIXED_KPIS,
  ALL_AVAILABLE_KPIS,
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
  pendingApprovals: '/leaves/approvals',
  newHires: '/recruitment/offers',
  onLeaveToday: '/approvals/dashboard',
  reportingOfficers: '/org-structure',
};

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuthStore();
  const { selectedCompanyId, selectedCompanyName } = useCompanyStore();
  const { data: dashboardData, isLoading } = useAdminDashboard();
  const { config } = useDashboardCustomizationStore();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

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
  const recentEmployees = dashboardData?.recentEmployees || [];

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
      totalHeadcount: { value: isLoading ? '...' : String(totalEmployees), icon: Users },
      activeDepartments: { value: isLoading ? '...' : String(totalDepartments), icon: Building2 },
      officeLocations: { value: isLoading ? '...' : String(totalLocations), icon: MapPin },
      monthlyPayrollCost: { value: formattedPayrollCost, icon: Wallet },
    };

    return FIXED_KPIS.map((kpi) => ({
      id: kpi.id,
      label: kpi.label,
      path: kpi.path,
      ...vals[kpi.id],
    }));
  }, [isLoading, totalEmployees, totalDepartments, totalLocations, formattedPayrollCost]);

  // ── Optional KPI cards (enabled via customization) ──────────────────────────
  const optionalKpiValues: Record<string, { value: string; icon: any; label: string; path: string }> = {
    openJobs: { label: 'Open Job Postings', value: isLoading ? '...' : String(openJobsCount), icon: Briefcase, path: OPTIONAL_KPI_PATHS.openJobs },
    pendingApprovals: { label: 'Pending Approvals', value: isLoading ? '...' : String(pendingApprovals), icon: Clock, path: OPTIONAL_KPI_PATHS.pendingApprovals },
    newHires: { label: 'New Hires', value: isLoading ? '...' : String(newHires), icon: UserPlus, path: OPTIONAL_KPI_PATHS.newHires },
    onLeaveToday: { label: 'On Leave Today', value: isLoading ? '...' : String(onLeaveToday), icon: Palmtree, path: OPTIONAL_KPI_PATHS.onLeaveToday },
    reportingOfficers: { label: 'Reporting Officer', value: isLoading ? '...' : String(reportingOfficers), icon: UserCheck, path: OPTIONAL_KPI_PATHS.reportingOfficers },
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
  ]);

  // Filtered active Quick Actions
  const activeQuickActions = useMemo(() => {
    return (config.enabledQuickActionIds || [])
      .map((id) => ALL_AVAILABLE_QUICK_ACTIONS.find((qa) => qa.id === id))
      .filter(Boolean);
  }, [config.enabledQuickActionIds]);

  return (
    <div className="org-admin-dashboard space-y-5 pb-6">
      {/* Header section */}
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

      {/* ── Fixed KPI Row (always pinned, not customizable) ─────────────────── */}
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

      {/* ── Optional KPI Row (enabled from customization tab) ───────────────── */}
      {activeOptionalKpis.length > 0 && (
        <section aria-label="Additional KPI metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Employee Growth Trend Card */}
          {config.showGrowthTrendChart && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-balance text-sm font-bold">Employee Growth Trend</CardTitle>
                    <CardDescription className="mt-1 text-pretty text-xs">
                      Live workforce trajectory over recent months
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0 text-[11px] font-semibold tabular-nums">
                    <TrendingUp className="mr-1 size-3 text-emerald-500" /> {totalEmployees} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEmpGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          color: 'hsl(var(--popover-foreground))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          fontSize: '12px',
                          boxShadow: '0 8px 24px rgba(11, 29, 61, 0.12)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="employees"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorEmpGrowth)"
                        name="Headcount"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-5" aria-label="Organization details and shortcuts">
          {/* Active Company / Organization Details Card */}
          {config.showEntityDetails && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Entity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 px-5 pb-5 pt-0 text-xs">
                <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                  <span className="text-muted-foreground">Company Name</span>
                  <span className="truncate font-bold text-foreground">{companyName}</span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                  <span className="text-muted-foreground">Primary Location</span>
                  <span className="truncate font-semibold text-foreground">{primaryLocation}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-border py-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="border-success/20 bg-success/10 text-[10px] font-bold text-success">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4 pt-3">
                  <span className="text-muted-foreground">Total Staff</span>
                  <span className="font-bold text-foreground tabular-nums">{totalEmployees} Members</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Employee Roster */}
          {config.showRecentRoster && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-bold">Recent Employee Roster</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/org-structure')}
                    className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary cursor-pointer"
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 px-5 pb-5 pt-0">
                {isLoading ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">Loading employees...</p>
                ) : !recentEmployees.length ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">No employees found.</p>
                ) : (
                  recentEmployees.slice(0, config.recentRosterLimit || 5).map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-2.5 text-xs cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors group"
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
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Management Shortcuts */}
          {config.showQuickActions && activeQuickActions.length > 0 && (
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
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
