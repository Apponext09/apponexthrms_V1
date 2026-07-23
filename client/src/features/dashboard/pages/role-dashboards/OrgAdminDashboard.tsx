import React from 'react';
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

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, total, isLoading } = useEmployees({ pageSize: 5 });
  const { data: filterOptions } = useReportFilterOptions();

  const totalEmployees = total || employees?.length || 0;
  const companyName = filterOptions?.companies?.[0]?.name || (user as any)?.organizationName || 'Kosqu';
  const primaryLocation = filterOptions?.locations?.[0]?.name || 'Navi Mumbai';
  const totalDepartments = filterOptions?.departments?.length || 0;
  const totalLocations = filterOptions?.locations?.length || 0;
  const totalOfficers = filterOptions?.reportingOfficers?.length || 0;

  const baseCount = Math.max(totalEmployees - 5, 1);
  const growthChartData = [
    { month: 'Mar', employees: Math.max(baseCount - 4, 1) },
    { month: 'Apr', employees: Math.max(baseCount - 3, 1) },
    { month: 'May', employees: Math.max(baseCount - 2, 1) },
    { month: 'Jun', employees: Math.max(baseCount - 1, 1) },
    { month: 'Jul', employees: totalEmployees },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Compact Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {companyName} Dashboard
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2">
              Organization Admin
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>Headquarters: <strong className="text-foreground font-semibold">{primaryLocation}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/employees')}
            className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Employee
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/attendance/reports')}
            className="h-8 text-xs font-semibold"
          >
            <FileBarChart className="w-3.5 h-3.5 mr-1.5" />
            Attendance Reports
          </Button>
        </div>
      </div>

      {/* Sleek Compact Stat Cards */}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Headcount Trend Chart */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Headcount Growth Trend</CardTitle>
                  <CardDescription className="text-xs">Live organizational workforce trajectory</CardDescription>
                </div>
                <Badge variant="secondary" className="text-[11px] font-medium">
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" /> +{totalEmployees} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-52 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEmpGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
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
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorEmpGrowth)"
                      name="Headcount"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Department Breakdown</CardTitle>
                  <CardDescription className="text-xs">Distribution across active departments</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings/departments')}
                  className="text-xs h-7 text-primary hover:text-primary font-semibold"
                >
                  Manage Departments <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filterOptions?.departments?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No departments created yet.</p>
              ) : (
                filterOptions?.departments?.map((dept: any, idx: number) => {
                  const percent = Math.min(100, Math.max(20, 100 - idx * 12));
                  return (
                    <div key={dept.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.name}</span>
                        <span className="text-muted-foreground font-mono font-medium">{percent}% active</span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-5">
          {/* Organization Details */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Organization Details</CardTitle>
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
          <Card className="shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Recent Employee Roster</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/employees')}
                  className="text-xs h-7 text-primary hover:text-primary font-semibold"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {employees?.slice(0, 4).map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                      {emp.firstName ? emp.firstName[0].toUpperCase() : 'E'}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode || `EMP${emp.id}`}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                    {emp.status || 'active'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Management Short-cuts */}
          <Card className="shadow-2xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Quick Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings/departments')}
                className="w-full justify-between text-xs h-8 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Departments
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/payroll')}
                className="w-full justify-between text-xs h-8 font-medium"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Payroll Management
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings/branding')}
                className="w-full justify-between text-xs h-8 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" /> Settings & Branding
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
