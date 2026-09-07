import { Users, AlertCircle, CheckCircle2, Clock, TrendingUp, Calendar } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const attendanceData = [
  { name: 'Present', value: 18 },
  { name: 'Absent', value: 2 },
  { name: 'On Leave', value: 3 },
  { name: 'WFH', value: 2 },
];

const teamPerformance = [
  { name: 'Sarah', tasks: 45, completed: 42 },
  { name: 'John', tasks: 38, completed: 36 },
  { name: 'Mike', tasks: 52, completed: 48 },
  { name: 'Emily', tasks: 41, completed: 40 },
];

const COLORS = ['hsl(var(--success))', 'hsl(var(--danger))', 'hsl(var(--warning))', 'hsl(var(--primary))'];

export function ManagerDashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor your team's performance and attendance</p>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Team Size"
          value="25"
          delta={2}
          deltaLabel="new joiners this month"
          variant="default"
        />
        <StatCard
          icon={CheckCircle2}
          label="Present Today"
          value="18"
          delta={-2}
          deltaLabel="2 on leave"
          variant="success"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Approvals"
          value="7"
          delta={3}
          deltaLabel="leave requests"
          variant="warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Team Performance"
          value="92%"
          delta={4}
          deltaLabel="up from last month"
          variant="success"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>7 requests waiting for your action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Leave Request - John Doe</p>
                  <p className="text-sm text-muted-foreground">April 12-14 (3 days)</p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Expense Report - Sarah</p>
                  <p className="text-sm text-muted-foreground">₹1,250 - Conference</p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Time Off - Mike Chen</p>
                  <p className="text-sm text-muted-foreground">April 5 (Personal)</p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
              <Button className="w-full mt-2">View All Approvals</Button>
            </CardContent>
          </Card>

          {/* Team Attendance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Current team status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-success">18</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-danger">2</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-warning">3</p>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-primary">2</p>
                  <p className="text-sm text-muted-foreground">WFH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Employees on Leave Today */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">On Leave Today</CardTitle>
              <CardDescription>3 team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>Emily Rodriguez</span>
                  <Badge variant="outline">Annual</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>James Wilson</span>
                  <Badge variant="outline">Sick</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>Sophie Chen</span>
                  <Badge variant="outline">Personal</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Regularization Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Regularization Requests</CardTitle>
              <CardDescription>Awaiting approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="font-medium">Marcus Anderson</p>
                    <p className="text-xs text-muted-foreground">Late Check-in</p>
                  </div>
                  <Badge variant="secondary">1h late</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-2">Review All</Button>
            </CardContent>
          </Card>

          {/* Upcoming Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium text-foreground">4 reviews due</p>
                <p className="text-xs text-muted-foreground">This quarter</p>
              </div>
              <Button variant="outline" className="w-full">Start Review</Button>
            </CardContent>
          </Card>

          {/* Team Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available:</span>
                <span className="font-medium">21/25</span>
              </div>
              <div className="bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-success h-full" style={{ width: '84%' }}></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">4 team members unavailable today</p>
            </CardContent>
          </Card>

          {/* Upcoming Birthdays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Birthdays</CardTitle>
              <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>Alex Thompson</span>
                  <Badge variant="outline">Jan 22</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span>Nina Patel</span>
                  <Badge variant="outline">Jan 25</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-2">Send Wishes</Button>
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
                View Team
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Attendance Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Team Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
