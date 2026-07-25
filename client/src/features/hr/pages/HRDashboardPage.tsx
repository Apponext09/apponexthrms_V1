import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import {
  Users, Clock, AlertTriangle, CheckCircle2, Briefcase,
  CreditCard, TrendingUp, UserPlus, ArrowRight, FileText,
  RefreshCw, Building2, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const attendanceData = [
  { day: 'Mon', rate: 94 }, { day: 'Tue', rate: 92 },
  { day: 'Wed', rate: 96 }, { day: 'Thu', rate: 91 }, { day: 'Fri', rate: 88 },
];

const quickActions = [
  { label: 'Add Employee', icon: UserPlus, href: '/hr/employees', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  { label: 'Run Payroll', icon: CreditCard, href: '/hr/payroll-processing', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
  { label: 'Leave Approvals', icon: CheckCircle2, href: '/hr/leaves/approvals', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' },
  { label: 'Open Jobs', icon: Briefcase, href: '/hr/recruitment/jobs', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' },
  { label: 'Org Structure', icon: Building2, href: '/hr/org-structure', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { label: 'Salary Revisions', icon: TrendingUp, href: '/hr/salary-structure', color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' },
];

import { getUserRoleAndDept } from '@/lib/userProfile';

export function HRDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { employees } = useEmployees({ pageSize: 500 });
  const activeEmployees = employees.filter((e: any) => e.status === 'active').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-semibold">
                {roleInfo.roleTitle}
              </Badge>
              <span className="text-rose-100 text-xs font-medium">• {roleInfo.departmentName} Department</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-rose-100 text-sm mt-1">Here's what needs your attention across HR and organization today.</p>
          </div>
          <Button
            onClick={() => navigate('/hr/employees')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm text-sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Employees', value: employees.length, sub: `${activeEmployees} active`,
            icon: Users, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20',
          },
          {
            label: 'Attendance Rate', value: '92.5%', sub: '↓ 1.2% from last week',
            icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            label: 'Pending Approvals', value: '7', sub: 'Leave requests',
            icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20',
          },
          {
            label: 'Open Positions', value: '6', sub: '2 offers extended',
            icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
              >
                <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-foreground leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts + Right sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Trend */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Attendance Trend — This Week</CardTitle>
              <CardDescription>Daily attendance rate (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[80, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="rate" stroke="#e11d48" strokeWidth={2.5} dot={{ fill: '#e11d48', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">🚨 Action Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: 'Payroll Processing Delayed', sub: '3 employees pending salary verification', badge: 'Urgent', badgeVariant: 'destructive' as const, border: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30' },
                { title: 'Compliance Deadline Approaching', sub: 'Annual certifications due in 5 days', badge: 'Alert', badgeVariant: 'secondary' as const, border: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30' },
                { title: '7 Leave Requests Pending', sub: 'Awaiting your approval', badge: 'Pending', badgeVariant: 'secondary' as const, border: 'border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30' },
              ].map((alert) => (
                <div key={alert.title} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${alert.border}`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.sub}</p>
                    </div>
                  </div>
                  <Badge variant={alert.badgeVariant} className="shrink-0 text-[10px]">{alert.badge}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right — Summary sidebar */}
        <div className="space-y-4">
          {/* Today's Summary */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Present', value: '293', color: 'text-emerald-600' },
                { label: 'On Leave', value: '8', color: 'text-amber-600' },
                { label: 'Absent', value: '4', color: 'text-red-600' },
                { label: 'Late Check-ins', value: '4', color: 'text-orange-600' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payroll status */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Payroll Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Last Run: Jan 5</p>
                <p className="text-[11px] text-muted-foreground">Next: Feb 5</p>
              </div>
              <Button variant="outline" className="w-full text-xs" onClick={() => navigate('/hr/payroll-processing')}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Process Payroll
              </Button>
            </CardContent>
          </Card>

          {/* New Joiners */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">New Joiners This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-foreground">8</p>
              <p className="text-xs text-muted-foreground mt-1">5 Engineering · 3 Sales</p>
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={() => navigate('/hr/employees/onboarding')}>
                View Onboarding <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Open Positions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-foreground">6</p>
              <p className="text-xs text-muted-foreground mt-1">2 offers extended</p>
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={() => navigate('/hr/recruitment/jobs')}>
                View Jobs <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
