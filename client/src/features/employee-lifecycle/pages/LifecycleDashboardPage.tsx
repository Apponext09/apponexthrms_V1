import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  LogOut,
  Archive,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

const LIFECYCLE_SUMMARY = {
  candidates: 45,
  preboarding: 3,
  onboarding: 5,
  probation: 8,
  confirmed: 120,
  active: 285,
  promoted: 12,
  transferred: 8,
  resigned: 2,
  exited: 1,
  alumni: 45,
};

const COLORS = {
  candidates: 'hsl(var(--primary))',
  preboarding: 'hsl(var(--warning))',
  onboarding: 'hsl(var(--info))',
  probation: 'hsl(var(--accent))',
  confirmed: 'hsl(var(--success))',
  active: 'hsl(var(--success))',
  promoted: 'hsl(var(--primary))',
  transferred: 'hsl(var(--primary))',
  resigned: 'hsl(var(--warning))',
  exited: 'hsl(var(--danger))',
  alumni: 'hsl(var(--muted-foreground))',
};

const chartData = [
  { stage: 'Candidates', count: LIFECYCLE_SUMMARY.candidates },
  { stage: 'Preboarding', count: LIFECYCLE_SUMMARY.preboarding },
  { stage: 'Onboarding', count: LIFECYCLE_SUMMARY.onboarding },
  { stage: 'Probation', count: LIFECYCLE_SUMMARY.probation },
  { stage: 'Confirmed', count: LIFECYCLE_SUMMARY.confirmed },
  { stage: 'Active', count: LIFECYCLE_SUMMARY.active },
];

const pieData = [
  { name: 'Active', value: LIFECYCLE_SUMMARY.active, fill: COLORS.active },
  { name: 'Probation', value: LIFECYCLE_SUMMARY.probation, fill: COLORS.probation },
  { name: 'Confirmed', value: LIFECYCLE_SUMMARY.confirmed, fill: COLORS.confirmed },
  { name: 'Alumni', value: LIFECYCLE_SUMMARY.alumni, fill: COLORS.alumni },
];

export function LifecycleDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const pendingActions = [
    { type: 'Offer Approval', count: 3, color: 'warning' },
    { type: 'Probation Review', count: 2, color: 'accent' },
    { type: 'Exit Clearance', count: 1, color: 'danger' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Lifecycle Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track employee journey from recruitment to alumni
          </p>
        </div>
        <Button onClick={() => navigate('/lifecycle/candidates')} size="lg">
          <Users className="h-4 w-4 mr-2" />
          Manage Candidates
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Candidates"
          value={String(LIFECYCLE_SUMMARY.candidates)}
          delta={8}
          deltaLabel="this month"
          variant="default"
        />
        <StatCard
          icon={Calendar}
          label="In Onboarding"
          value={String(LIFECYCLE_SUMMARY.onboarding + LIFECYCLE_SUMMARY.preboarding)}
          delta={-1}
          deltaLabel="completed this week"
          variant="warning"
        />
        <StatCard
          icon={Clock}
          label="In Probation"
          value={String(LIFECYCLE_SUMMARY.probation)}
          delta={2}
          deltaLabel="ending this month"
          variant="accent"
        />
        <StatCard
          icon={LogOut}
          label="Pending Resignation"
          value={String(LIFECYCLE_SUMMARY.resigned)}
          delta={0}
          deltaLabel="processing"
          variant="danger"
        />
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Actions</CardTitle>
          <CardDescription>Items requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingActions.map((action) => (
              <div key={action.type} className={`p-4 rounded-lg bg-${action.color}/5 border border-${action.color}/20`}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{action.type}</p>
                  <Badge variant="secondary">{action.count}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Action required</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => navigate('/approvals')}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Overview */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Distribution</CardTitle>
                <CardDescription>Current employee status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recruitment Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Pipeline</CardTitle>
                <CardDescription>Candidates by stage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Lifecycle Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                  <p className="text-sm text-muted-foreground">Avg Onboarding Time</p>
                  <p className="text-2xl font-bold text-success mt-2">14 days</p>
                </div>
                <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="text-sm text-muted-foreground">Avg Probation Period</p>
                  <p className="text-2xl font-bold text-warning mt-2">90 days</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Confirmation Rate</p>
                  <p className="text-2xl font-bold text-primary mt-2">98%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground">Alumni Network</p>
                  <p className="text-2xl font-bold text-foreground mt-2">45 members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recruitment Pipeline</CardTitle>
              <CardDescription>Track candidates through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stage: 'Applied', count: 45, icon: FileText },
                  { stage: 'Shortlisted', count: 28, icon: CheckCircle2 },
                  { stage: 'Interviewed', count: 15, icon: Users },
                  { stage: 'Offered', count: 8, icon: FileText },
                  { stage: 'Hired', count: 5, icon: CheckCircle2 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.stage} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium">{item.stage}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{item.count}</span>
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${(item.count / 45) * 100}px` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Lifecycle Timeline</CardTitle>
              <CardDescription>Key milestones for employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { stage: 'Recruitment', days: '0-30', description: 'Candidate search and interviews' },
                  { stage: 'Offer', days: '30-35', description: 'Offer creation and acceptance' },
                  { stage: 'Preboarding', days: '35-45', description: 'Document collection and setup' },
                  { stage: 'Onboarding', days: '45-60', description: 'First day and initial training' },
                  { stage: 'Probation', days: '60-150', description: 'Performance evaluation period' },
                  { stage: 'Confirmation', days: '150+', description: 'Confirmation to permanent status' },
                ].map((milestone, index) => (
                  <div key={milestone.stage} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      {index < 5 && <div className="w-0.5 h-16 bg-primary/20" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-foreground">{milestone.stage}</h4>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        Day {milestone.days}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Users className="h-5 w-5" />
              <span>Add Candidate</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Calendar className="h-5 w-5" />
              <span>Schedule Interview</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileText className="h-5 w-5" />
              <span>Create Offer</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <CheckCircle2 className="h-5 w-5" />
              <span>Confirm Employee</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
