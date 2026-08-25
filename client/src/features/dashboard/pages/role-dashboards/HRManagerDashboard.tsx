import { Users, TrendingUp, AlertTriangle, CheckCircle2, UserPlus, Clock, Briefcase, Target } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const attendanceData = [
  { day: 'Mon', rate: 94 },
  { day: 'Tue', rate: 92 },
  { day: 'Wed', rate: 96 },
  { day: 'Thu', rate: 91 },
  { day: 'Fri', rate: 88 },
];

const departmentData = [
  { name: 'Engineering', employees: 45 },
  { name: 'Sales', employees: 28 },
  { name: 'HR', employees: 8 },
  { name: 'Finance', employees: 12 },
  { name: 'Operations', employees: 17 },
];

export function HRManagerDashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">HR Operations Dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor organizational metrics and critical alerts</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Employees"
          value="305"
          delta={8}
          deltaLabel="new joiners this quarter"
          variant="default"
        />
        <StatCard
          icon={Clock}
          label="Attendance Rate"
          value="92.5%"
          delta={-1.2}
          deltaLabel="from last week"
          variant="warning"
        />
        <StatCard
          icon={AlertTriangle}
          label="Absent Today"
          value="12"
          delta={0}
          deltaLabel="employees"
          variant="danger"
        />
        <StatCard
          icon={Briefcase}
          label="Open Positions"
          value="6"
          delta={-2}
          deltaLabel="offers extended"
          variant="success"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trend (This Week)</CardTitle>
              <CardDescription>Daily attendance rate percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[80, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>Immediate attention required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Payroll Processing Delayed</p>
                    <p className="text-sm text-muted-foreground">3 employees pending salary verification</p>
                  </div>
                  <Badge variant="destructive">Urgent</Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Compliance Deadline Approaching</p>
                    <p className="text-sm text-muted-foreground">Annual certifications due in 5 days</p>
                  </div>
                  <Badge variant="secondary">Alert</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Department Employee Count</CardTitle>
              <CardDescription>Employees by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="employees" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Payroll Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payroll Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-sm font-medium text-foreground">Last Run: Jan 5</p>
                <p className="text-xs text-muted-foreground">Next: Feb 5</p>
              </div>
              <p className="text-sm">
                <span className="font-medium">Status:</span>
                <Badge variant="secondary" className="ml-2">Processed</Badge>
              </p>
              <Button variant="outline" className="w-full">View Payroll</Button>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Marked Attendance</p>
                <p className="text-2xl font-semibold text-foreground">293/305</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-semibold text-warning">8</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">Late Check-ins</p>
                <p className="text-2xl font-semibold text-danger">4</p>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <div className="p-2 rounded bg-danger/5 border border-danger/20">
                  <p className="font-medium text-foreground">Certifications</p>
                  <p className="text-xs text-muted-foreground">Due in 5 days</p>
                </div>
                <div className="p-2 rounded bg-warning/5 border border-warning/20">
                  <p className="font-medium text-foreground">Policy Review</p>
                  <p className="text-xs text-muted-foreground">Renewal date: Feb 1</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees in Probation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">In Probation</CardTitle>
              <CardDescription>3 employees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div className="p-2 rounded bg-muted/30">
                  <p className="font-medium">Alex Kumar</p>
                  <p className="text-xs text-muted-foreground">Ends: March 15</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="font-medium">Priya Singh</p>
                  <p className="text-xs text-muted-foreground">Ends: Feb 28</p>
                </div>
              </div>
              <Button variant="outline" className="w-full text-xs">View All</Button>
            </CardContent>
          </Card>

          {/* New Joiners */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Joiners (This Month)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium text-foreground">8 new employees</p>
                <p className="text-xs text-muted-foreground">5 in Engineering, 3 in Sales</p>
              </div>
              <Button variant="outline" className="w-full">View Onboarding Status</Button>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming HR Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-foreground">Review Cycle Q2</p>
                <p className="text-xs text-muted-foreground">Starts April 15</p>
              </div>
              <div className="border-t border-border pt-3 text-sm">
                <p className="font-medium text-foreground">Town Hall Meeting</p>
                <p className="text-xs text-muted-foreground">April 10 • 2:00 PM</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                All Employees
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                HR Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="h-4 w-4 mr-2" />
                Recruitment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
