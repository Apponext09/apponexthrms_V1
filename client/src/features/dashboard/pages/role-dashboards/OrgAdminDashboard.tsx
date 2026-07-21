import { BarChart3, Users, TrendingUp, Briefcase, Lock, Zap } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const employeeGrowthData = [
  { month: 'Jan', employees: 220, target: 200 },
  { month: 'Feb', employees: 235, target: 220 },
  { month: 'Mar', employees: 247, target: 240 },
  { month: 'Apr', employees: 270, target: 270 },
  { month: 'May', employees: 285, target: 290 },
  { month: 'Jun', employees: 305, target: 310 },
];

export function OrgAdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Organization Dashboard</h1>
        <p className="text-muted-foreground mt-1">Organizational overview and strategic analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Employees"
          value="305"
          delta={35}
          deltaLabel="YoY growth"
          variant="default"
        />
        <StatCard
          icon={TrendingUp}
          label="Employee Growth"
          value="85/100"
          delta={0}
          deltaLabel="annual target"
          variant="success"
        />
        <StatCard
          icon={Briefcase}
          label="Open Positions"
          value="6"
          delta={-2}
          deltaLabel="offers in progress"
          variant="warning"
        />
        <StatCard
          icon={Lock}
          label="License Usage"
          value="95%"
          delta={5}
          deltaLabel="of available modules"
          variant="danger"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Growth Trend</CardTitle>
              <CardDescription>Actual vs target headcount (Last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={employeeGrowthData}>
                  <defs>
                    <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="employees" stroke="hsl(var(--primary))" fill="url(#colorEmployees)" name="Actual" />
                  <Area type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" fill="none" name="Target" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
              <CardDescription>Headcount distribution across departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">Engineering</p>
                  <span className="text-sm text-muted-foreground">45 / 50</span>
                </div>
                <Progress value={90} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">Sales</p>
                  <span className="text-sm text-muted-foreground">28 / 30</span>
                </div>
                <Progress value={93} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">Operations</p>
                  <span className="text-sm text-muted-foreground">17 / 20</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">Finance</p>
                  <span className="text-sm text-muted-foreground">12 / 15</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">HR</p>
                  <span className="text-sm text-muted-foreground">8 / 10</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* License & Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Module License Usage</p>
                <Progress value={95} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">95% of 100</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-2">Storage Used</p>
                <Progress value={62} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">62 GB of 100 GB</p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-semibold text-success">94%</p>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                <p className="text-2xl font-semibold text-primary">4.2/5.0</p>
              </div>
              <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
                <p className="text-sm text-muted-foreground">Vacancy Rate</p>
                <p className="text-2xl font-semibold text-warning">2.0%</p>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Score</CardTitle>
              <CardDescription>Organization health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-success/20"></div>
                  <span className="text-2xl font-bold text-success">92%</span>
                </div>
                <div className="flex-1 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Policies:</span>
                    <Badge variant="outline">✓ Complete</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Certifications:</span>
                    <Badge variant="outline">✓ Current</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Premium Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-accent/5 rounded">
                <span className="text-sm font-medium">AI Insights</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm font-medium">Advanced Analytics</span>
                <Badge variant="secondary">Inactive</Badge>
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
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Manage Licenses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
