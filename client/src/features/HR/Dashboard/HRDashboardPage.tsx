import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  MapPin,
  Clock,
  UserPlus,
  FileBarChart,
  Settings,
  CreditCard,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Palmtree,
  Wallet,
  Briefcase,
  Layers,
  Filter,
  ArrowUpRight,
  UserRoundCheck,
  ReceiptIndianRupee,
  Activity,
  Crown,
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
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useAdminDashboard } from '@/features/dashboard/hooks/useAdminDashboard';
import { getUserRoleAndDept } from '@/lib/userProfile';

const panelClass = 'rounded-xl border border-border bg-card shadow-soft-xs hover:shadow-soft-xs';

const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#10b981',
  Late: '#f59e0b',
  HalfDay: '#f97316',
  WFH: '#8b5cf6',
  OnLeave: '#0ea5e9',
  Absent: '#ef4444',
};

const DEPT_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
const STAGE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#a855f7', '#f59e0b', '#10b981', '#ef4444'];

export function HRDashboardPage() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuthStore();
  const { selectedCompanyName } = useCompanyStore();
  const roleInfo = getUserRoleAndDept(user);
  const { data: dashboardData, isLoading, isError, refetch } = useAdminDashboard();

  const [activeModuleFilter, setActiveModuleFilter] = useState<'all' | 'attendance' | 'workforce' | 'payroll' | 'recruitment' | 'expenses'>('all');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const companyInfo = dashboardData?.companyInfo;
  const companyName = companyInfo?.name || selectedCompanyName || user?.organizationName || 'Organization';
  const primaryLocation = companyInfo?.location || user?.organizationLocation || 'Not Specified';

  // Real KPIs
  const totalEmployees = dashboardData?.kpis?.totalHeadcount ?? 0;
  const totalDepartments = dashboardData?.kpis?.activeDepartments ?? 0;
  const totalLocations = dashboardData?.kpis?.officeLocations ?? 0;
  const reportingOfficers = dashboardData?.kpis?.reportingOfficers ?? 0;
  const openJobsCount = dashboardData?.kpis?.openJobs ?? 0;
  const pendingApprovals = dashboardData?.kpis?.pendingApprovals ?? 0;
  const newHires = dashboardData?.kpis?.newHires ?? 0;
  const onLeaveToday = dashboardData?.kpis?.onLeaveToday ?? 0;
  const monthlyPayrollVal = dashboardData?.kpis?.monthlyPayrollCost ?? 0;

  const formattedPayrollCost = useMemo(() => {
    if (isLoading) return '...';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(monthlyPayrollVal);
  }, [monthlyPayrollVal, isLoading]);

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

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-soft-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              
              {companyName} - HR Dashboard
            </h1>
           
          </div>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>Location: <strong className="text-foreground font-semibold">{primaryLocation}</strong></span>
            
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/hr/employees')}
            className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/hr/payroll/processing')}
            className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Process Payroll
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/hr/attendance')}
            className="h-9 text-xs font-semibold cursor-pointer"
          >
            <FileBarChart className="w-3.5 h-3.5 mr-1.5" />
            Attendance Hub
          </Button>
        </div>
      </div>

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          <span>HR dashboard live metrics could not be loaded.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="h-8 text-xs">Retry</Button>
        </div>
      )}

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${panelClass} cursor-pointer group hover:ring-2 hover:ring-primary/20`} onClick={() => navigate('/hr/employees')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground truncate">Total Headcount</p>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{isLoading ? '...' : totalEmployees}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        <Card className={`${panelClass} cursor-pointer group hover:ring-2 hover:ring-primary/20`} onClick={() => navigate('/hr/departments')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground truncate">Active Departments</p>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{totalDepartments}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        <Card className={`${panelClass} cursor-pointer group hover:ring-2 hover:ring-primary/20`} onClick={() => navigate('/hr/leaves')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/10">
              <Palmtree className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground truncate">On Leave Today</p>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{onLeaveToday}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        <Card className={`${panelClass} cursor-pointer group hover:ring-2 hover:ring-primary/20`} onClick={() => navigate('/hr/payroll')}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/10">
              <Wallet className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground truncate">Monthly Payroll Cost</p>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{formattedPayrollCost}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>
      </div>

      {/* ── Module Category Switcher ── */}
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

      {/* ── SECTION 1: ATTENDANCE & LEAVES ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'attendance') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Clock className="size-4 text-primary" /> Attendance & Leave Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hr/attendance')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              Attendance Hub <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Today's Attendance Donut */}
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Today's Attendance</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Live status breakdown</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
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
                          <Tooltip contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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
                    <CardDescription className="text-xs mt-0.5">Daily presence and late arrivals</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold">Past 7 Days</Badge>
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
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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

          {/* Leave Types & 6-Month Trend */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palmtree className="size-4 text-sky-500" /> Leave Distribution by Type
                </CardTitle>
                <CardDescription className="text-xs">Approved applications categorised by leave policy</CardDescription>
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
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: lt.color || DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> 6-Month Leave Application Trend
                </CardTitle>
                <CardDescription className="text-xs">Monthly volume of submitted vs approved leaves</CardDescription>
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
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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

      {/* ── SECTION 2: PAYROLL & EXPENSES ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'payroll') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Wallet className="size-4 text-emerald-600" /> Payroll & Expense Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hr/payroll')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              Payroll Portal <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">6-Month Payroll Trajectory</CardTitle>
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 border-emerald-200">INR (₹)</Badge>
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
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                        <Tooltip formatter={(val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val))} contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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

            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <ReceiptIndianRupee className="size-4 text-primary" /> Expense Spending & Claims
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/hr/expenses')} className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground">
                    View Claims
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!expenseAnalytics?.monthlyTrend || !expenseAnalytics.monthlyTrend.some((d) => d.claimedAmount > 0 || d.approvedAmount > 0)) ? (
                  <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-xs">
                    <ReceiptIndianRupee className="size-8 mb-2 opacity-40 text-primary" />
                    <span className="font-semibold text-foreground">No Reimbursement Claims Submitted</span>
                    <span className="text-muted-foreground mt-0.5">Staff travel and operational claims will appear here</span>
                  </div>
                ) : (
                  <div className="h-56 w-full pt-2 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={expenseAnalytics.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorClaimedHR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorApprovedHR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                        <Tooltip formatter={(val: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val))} contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Area type="monotone" dataKey="claimedAmount" name="Claimed (₹)" stroke="#3b82f6" strokeWidth={2} fill="url(#colorClaimedHR)" />
                        <Area type="monotone" dataKey="approvedAmount" name="Approved (₹)" stroke="#10b981" strokeWidth={2} fill="url(#colorApprovedHR)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 3: WORKFORCE & ORGANIZATION ── */}
      {(activeModuleFilter === 'all' || activeModuleFilter === 'workforce') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Users className="size-4 text-primary" /> Workforce & Organization Analytics
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hr/org-structure')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              Org Structure <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold">Workforce Growth Trajectory</CardTitle>
                    <CardDescription className="text-xs">Live workforce trajectory over recent 6 months</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold tabular-nums">
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
                          <linearGradient id="colorEmpGrowthHR2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="employees" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorEmpGrowthHR2)" name="Headcount" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Building2 className="size-4 text-primary" /> Headcount by Department
                </CardTitle>
                <CardDescription className="text-xs">Staff distribution across departments</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {departmentBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-xs">
                    <Building2 className="size-8 mb-2 opacity-40" />
                    <span>No departments created yet</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 max-h-56 overflow-y-auto pr-1">
                    {departmentBreakdown.map((dept, idx) => (
                      <div key={dept.id || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[150px]">{dept.name}</span>
                          <span className="font-bold text-foreground tabular-nums">
                            {dept.count} <span className="text-muted-foreground font-normal">({dept.percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(dept.percentage, 5)}%`, backgroundColor: DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                        </div>
                      </div>
                    ))}
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
              onClick={() => navigate('/hr/recruitment')}
              className="text-xs h-7 gap-1 text-primary hover:text-primary"
            >
              Recruitment Hub <ArrowUpRight className="size-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className={`${panelClass} lg:col-span-2`}>
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Candidate Pipeline Funnel</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Active applicants across hiring stages</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold">{openJobsCount} Active Jobs</Badge>
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
                        <Tooltip contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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

            <Card className={panelClass}>
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-sm font-bold">Open Positions by Department</CardTitle>
                <CardDescription className="text-xs">Active vacancies requiring staffing</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                {(!recruitmentAnalytics?.openJobsByDept || recruitmentAnalytics.openJobsByDept.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                    <Briefcase className="size-8 mb-2 opacity-40" />
                    <span>No active vacancies published</span>
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

      {/* ── SECTION 5: ROSTER & SHORTCUTS ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className={`${panelClass} lg:col-span-2`}>
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UserRoundCheck className="size-4 text-primary" /> Recent Employee Roster
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hr/employees')}
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
                    onClick={() => navigate(`/hr/employees/${emp.id}`)}
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

        <aside className="space-y-5">
          <Card className={panelClass}>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold">HR Quick Management Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5 pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/employees')}
                className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2"><Users className="size-3.5 text-primary" /> Employee Directory</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/departments')}
                className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2"><Building2 className="size-3.5 text-primary" /> Department Master</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/attendance')}
                className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2"><Clock className="size-3.5 text-primary" /> Attendance Approvals</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/leaves')}
                className="h-9 w-full justify-between rounded-lg bg-card text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2"><Palmtree className="size-3.5 text-primary" /> Leave Requests</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}


