import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Lock,
  ShoppingBag,
  Palette,
  Code,
  BarChart3,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Server,
  HardDrive,
  Zap,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 48000 },
  { month: 'Apr', revenue: 61000 },
  { month: 'May', revenue: 71000 },
  { month: 'Jun', revenue: 82000 },
];

const topCustomers = [
  { name: 'TechCorp Inc', employees: 450, plan: 'Enterprise', status: 'active' },
  { name: 'Global Solutions Ltd', employees: 320, plan: 'Professional', status: 'active' },
  { name: 'StartupXYZ', employees: 85, plan: 'Starter', status: 'active' },
];

export function PlatformAdminDashboard() {
  const navigate = useNavigate();

  const platformCapabilities = [
    {
      title: 'Billing & Subscriptions',
      description: 'Manage organization subscriptions, invoices, and payment methods',
      icon: CreditCard,
      href: '/platform-admin/billing',
      status: 'coming-soon',
    },
    {
      title: 'Module Licensing',
      description: 'Control which modules are enabled for each organization',
      icon: Lock,
      href: '/platform-admin/licensing',
      status: 'coming-soon',
    },
    {
      title: 'Marketplace',
      description: 'Browse and manage addon applications and extensions',
      icon: ShoppingBag,
      href: '/platform-admin/marketplace',
      status: 'ready',
    },
    {
      title: 'White Label',
      description: 'Customize branding, colors, and domain settings',
      icon: Palette,
      href: '/platform-admin/white-label',
      status: 'coming-soon',
    },
    {
      title: 'Developer Portal',
      description: 'API keys, webhooks, and custom integration management',
      icon: Code,
      href: '/platform-admin/developer',
      status: 'coming-soon',
    },
    {
      title: 'Platform Analytics',
      description: 'Monitor system health, usage, and performance metrics',
      icon: BarChart3,
      href: '/platform-admin/analytics',
      status: 'coming-soon',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Administration</h1>
        <p className="text-muted-foreground mt-1">
          Monitor SaaS platform performance, manage organizations, and configure system-wide settings
        </p>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          label="Active Organizations"
          value="127"
          delta={12}
          deltaLabel="new this month"
          variant="default"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value="12,450"
          delta={325}
          deltaLabel="new signups"
          variant="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value="$82,000"
          delta={15}
          deltaLabel="MoM growth"
          variant="success"
        />
        <StatCard
          icon={AlertCircle}
          label="System Health"
          value="99.8%"
          delta={0.2}
          deltaLabel="uptime"
          variant="success"
        />
      </div>

      {/* Revenue and Health Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
            <CardDescription>Monthly recurring revenue (MRR) growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Platform infrastructure overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">API Server</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Badge variant="outline">Operational</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">99.9% uptime • 45ms avg response</p>
            </div>

            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Database</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Badge variant="outline">Healthy</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Storage: 245GB / 500GB • 85 connections</p>
            </div>

            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Search Engine</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <Badge variant="outline">Operational</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Indexing: 2.1M documents • Latency: 12ms</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Organizations</CardTitle>
          <CardDescription>Largest customers by employee count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCustomers.map((customer) => (
              <div key={customer.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.employees} employees • {customer.plan} plan</p>
                </div>
                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                  {customer.status === 'active' ? 'Active' : 'Paused'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Capabilities */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Platform Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformCapabilities.map((capability) => {
            const Icon = capability.icon;
            const isReady = capability.status === 'ready';

            return (
              <Card
                key={capability.title}
                className={`hover:shadow-soft-md transition-shadow ${
                  !isReady ? 'opacity-75' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-accent" />
                          {capability.title}
                        </CardTitle>
                        {!isReady && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {capability.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!isReady}
                    onClick={() => navigate(capability.href)}
                  >
                    {isReady ? 'Access' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Platform Responsibilities */}
      <Card className="bg-accent/5 border-accent/20">
        <CardHeader>
          <CardTitle className="text-lg">Platform Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Manage multi-tenant subscriptions and billing for all organizations
          </p>
          <p>
            • Control feature availability and module licensing per organization
          </p>
          <p>
            • Provide marketplace for third-party apps and integrations
          </p>
          <p>
            • Enable white-label customization for partners
          </p>
          <p>
            • Offer developer APIs and webhooks for custom integrations
          </p>
          <p>
            • Monitor platform health and system-wide analytics
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
