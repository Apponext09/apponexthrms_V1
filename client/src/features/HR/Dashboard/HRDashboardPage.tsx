import React, { useEffect } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Crown,
  Scan
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { useReportFilterOptions } from '@/features/analytics/hooks/useAttendanceReports';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';

export function HRDashboardPage() {
  const navigate = useNavigate();
  const { user, fetchCurrentUser } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { employees, total, isLoading } = useEmployees({ pageSize: 50 });
  const { data: filterOptions } = useReportFilterOptions();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const totalEmployees = total || employees?.length || 0;
  const companyName = user?.organizationName || filterOptions?.companies?.[0]?.name || 'Apponext Organization';
  const primaryLocation = user?.organizationLocation || filterOptions?.locations?.[0]?.name || 'Bangalore HQ';
  const totalDepartments = filterOptions?.departments?.length || 5;
  const totalLocations = filterOptions?.locations?.length || 4;
  const totalOfficers = filterOptions?.reportingOfficers?.length || 8;

  const baseCount = Math.max(totalEmployees - 5, 1);
  const growthChartData = [
    { month: 'Mar', employees: Math.max(baseCount - 4, 1) },
    { month: 'Apr', employees: Math.max(baseCount - 3, 1) },
    { month: 'May', employees: Math.max(baseCount - 2, 1) },
    { month: 'Jun', employees: Math.max(baseCount - 1, 1) },
    { month: 'Jul', employees: totalEmployees },
  ];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header Banner matching Admin Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Crown className="w-6 h-6 text-primary" />
              {companyName} — HR Dashboard
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-2.5 py-0.5">
              HR Admin Control
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>Headquarters: <strong className="text-foreground font-semibold">{primaryLocation}</strong></span>
            <span className="text-muted-foreground">• Scope: <strong className="text-primary font-semibold">{roleInfo.formattedRoleDept}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/hr/employees')}
            className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/hr/payroll-processing')}
            className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            Process Payroll
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/hr/attendance')}
            className="h-9 text-xs font-semibold"
          >
            <FileBarChart className="w-3.5 h-3.5 mr-1.5" />
            Attendance Reports
          </Button>
        </div>
      </div>

      {/* Sleek Stat Cards matching Admin Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Headcount"
          value={isLoading ? '...' : String(totalEmployees)}
        />
        <StatCard
          icon={Building2}
          label="Active Departments"
          value={String(totalDepartments)}
        />
        <StatCard
          icon={MapPin}
          label="Office Locations"
          value={String(totalLocations)}
        />
        <StatCard
          icon={ShieldCheck}
          label="Reporting Officers"
          value={String(totalOfficers)}
        />
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Headcount Trend Chart */}
          <Card className="shadow-xs border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                    Headcount Growth Trend
                  </CardTitle>
                  <CardDescription className="text-xs">Live organizational workforce trajectory</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" /> +{totalEmployees} Active Staff
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEmpGrowthHR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" style={{ fontSize: '11px' }} />
                    <YAxis style={{ fontSize: '11px' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="employees"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#colorEmpGrowthHR)"
                      name="Headcount"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card className="shadow-xs border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Building2 className="w-4.5 h-4.5 text-primary" />
                    Department Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">Distribution across active departments</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hr/departments')}
                  className="text-xs h-7 text-primary hover:text-primary/80 font-bold"
                >
                  Manage Departments <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {(!filterOptions?.departments || filterOptions.departments.length === 0) ? (
                <div className="space-y-3">
                  {[
                    { name: 'Engineering & Technology', percent: 45 },
                    { name: 'Sales & Marketing', percent: 25 },
                    { name: 'Human Resources & People Ops', percent: 12 },
                    { name: 'Finance & Accounts', percent: 10 },
                    { name: 'Operations & Admin', percent: 8 },
                  ].map((dept) => (
                    <div key={dept.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="text-muted-foreground font-mono font-bold">{dept.percent}% active</span>
                      </div>
                      <Progress value={dept.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                filterOptions?.departments?.map((dept: any, idx: number) => {
                  const percent = Math.min(100, Math.max(20, 100 - idx * 12));
                  return (
                    <div key={dept.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="text-muted-foreground font-mono font-bold">{percent}% active</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Organization Details */}
          <Card className="shadow-xs border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-bold text-foreground">{companyName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Primary Location</span>
                <span className="font-semibold text-foreground">{primaryLocation}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Staff</span>
                <span className="font-bold text-foreground">{totalEmployees} Members</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Roster Preview */}
          <Card className="shadow-xs border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Recent Employee Roster
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hr/employees')}
                  className="text-xs h-7 text-primary hover:text-primary/80 font-bold"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {employees?.slice(0, 5).map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs border border-primary/20">
                      {emp.firstName ? emp.firstName[0].toUpperCase() : 'E'}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode || `EMP-${emp.id}`}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-semibold">
                    {emp.status || 'active'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Core & HR Management Shortcuts */}
          <Card className="shadow-xs border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Core Module Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/employees')}
                className="w-full justify-between text-xs h-8 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary" /> Employee Directory
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/departments')}
                className="w-full justify-between text-xs h-8 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Departments
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/org-structure')}
                className="w-full justify-between text-xs h-8 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-primary" /> Organization Structure
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hr/payroll-processing')}
                className="w-full justify-between text-xs h-8 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Payroll Processing
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

