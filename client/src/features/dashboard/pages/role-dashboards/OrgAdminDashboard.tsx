import { useEffect } from 'react';
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
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

const panelClass = 'rounded-xl border-border bg-card shadow-soft-xs hover:shadow-soft-xs';

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuthStore();
  const { selectedCompanyId, selectedCompanyName } = useCompanyStore();
  const { data: dashboardData, isLoading, refetch } = useAdminDashboard();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const companyInfo = dashboardData?.companyInfo;
  const companyName = companyInfo?.name || selectedCompanyName || user?.organizationName || 'Organization';
  const isParent = companyInfo?.isParent ?? !selectedCompanyId;
  const primaryLocation = companyInfo?.location || user?.organizationLocation || 'Headquarters';

  const totalEmployees = dashboardData?.kpis?.totalHeadcount ?? 0;
  const totalDepartments = dashboardData?.kpis?.activeDepartments ?? 0;
  const totalLocations = dashboardData?.kpis?.officeLocations ?? 0;
  const totalOfficers = dashboardData?.kpis?.reportingOfficers ?? 0;

  const growthChartData = dashboardData?.growthTrend || [];
  const departmentBreakdown = dashboardData?.departmentBreakdown || [];
  const recentEmployees = dashboardData?.recentEmployees || [];

  const overviewStats = [
    { icon: Users, label: 'Total Headcount', value: isLoading ? '...' : String(totalEmployees) },
    { icon: Building2, label: 'Active Departments', value: isLoading ? '...' : String(totalDepartments) },
    { icon: MapPin, label: 'Office Locations', value: isLoading ? '...' : String(totalLocations) },
    { icon: ShieldCheck, label: 'Reporting Officers', value: isLoading ? '...' : String(totalOfficers) },
  ];

  return (
    <div className="org-admin-dashboard space-y-5 pb-6">
      {/* Header section with active Sub-Company / Org context */}
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-soft-xs sm:flex-row sm:items-center">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {companyName} Dashboard
            </h1>
          
          </div>
          <p className="flex items-center gap-2 text-pretty text-xs text-muted-foreground">
            <MapPin className="size-3.5 flex-shrink-0 text-primary" />
            <span>Location: <strong className="font-semibold text-foreground">{primaryLocation}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/employees')}
            className="h-9 rounded-lg px-3 text-xs font-semibold shadow-none"
          >
            <UserPlus className="mr-1.5 size-3.5" />
            Add Employee
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/attendance/reports')}
            className="h-9 rounded-lg bg-card px-3 text-xs font-semibold"
          >
            <FileBarChart className="mr-1.5 size-3.5" />
            Attendance Reports
          </Button>
        </div>
      </section>

      {/* Overview KPI stats grid */}
      <section aria-label="Organization overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map(({ icon: Icon, label, value }) => (
          <Card key={label} className={panelClass}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-extrabold leading-none tracking-tight text-foreground tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Headcount Growth Trend Card */}
          <Card className={panelClass}>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-balance text-sm font-bold">Headcount Growth Trend</CardTitle>
                  <CardDescription className="mt-1 text-pretty text-xs">Live workforce trajectory over recent months</CardDescription>
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
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
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

          {/* Department Breakdown Card */}
          <Card className={panelClass}>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-balance text-sm font-bold">Department Breakdown</CardTitle>
                  <CardDescription className="mt-1 text-pretty text-xs">Employee distribution across active departments</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings/departments')}
                  className="h-8 flex-shrink-0 px-2 text-xs font-semibold text-primary hover:text-primary"
                >
                  Manage <span className="hidden sm:inline">Departments</span><ChevronRight className="ml-0.5 size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 px-5 pb-5 pt-0">
              {isLoading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Loading departments...</p>
              ) : !departmentBreakdown.length ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No departments created yet.</p>
              ) : (
                departmentBreakdown.map((dept) => (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-semibold text-foreground">{dept.name}</span>
                      <span className="flex-shrink-0 font-medium text-muted-foreground tabular-nums">
                        {dept.count} {dept.count === 1 ? 'member' : 'members'} ({dept.percentage}%)
                      </span>
                    </div>
                    <Progress value={dept.percentage} className="h-1.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5" aria-label="Organization details and shortcuts">
          {/* Active Company / Organization Details Card */}
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
                <Badge variant="outline" className="border-success/20 bg-success/10 text-[10px] font-bold text-success">Active</Badge>
              </div>
              <div className="flex items-center justify-between gap-4 pt-3">
                <span className="text-muted-foreground">Total Staff</span>
                <span className="font-bold text-foreground tabular-nums">{totalEmployees} Members</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Employee Roster */}
          <Card className={panelClass}>
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-bold">Recent Employee Roster</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} className="h-8 px-2 text-xs font-semibold text-primary hover:text-primary">
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
                recentEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-2.5 text-xs">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                        {emp.firstName ? emp.firstName[0].toUpperCase() : 'E'}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{emp.firstName} {emp.lastName}</p>
                        <p className="truncate text-[10px] text-muted-foreground tabular-nums">
                          {emp.employeeCode} &bull; {emp.departmentName}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-[10px] capitalize">{emp.status || 'active'}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Management Shortcuts */}
          <Card className={panelClass}>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold">Quick Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5 pt-0">
              <Button variant="outline" size="sm" onClick={() => navigate('/settings/departments')} className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium">
                <span className="flex items-center gap-2"><Building2 className="size-3.5 text-primary" /> Departments</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/payroll')} className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium">
                <span className="flex items-center gap-2"><CreditCard className="size-3.5 text-primary" /> Payroll Management</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings/branding')} className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium">
                <span className="flex items-center gap-2"><Settings className="size-3.5 text-primary" /> Settings &amp; Branding</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
