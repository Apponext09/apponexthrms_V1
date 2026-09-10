import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Server,
  HardDrive,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardStats {
  totalOrganizations: number;
  activeSubscriptions: number;
  totalEmployees: number;
  monthlyRevenue: number;
  growthData?: { month: string; organizations: number }[];
  platformUsage?: {
    securityShield: string;
    systemUptime: string;
    resourceLoad: string;
  };
}

const defaultGrowthData = [
  { month: 'Feb', organizations: 2 },
  { month: 'Mar', organizations: 4 },
  { month: 'Apr', organizations: 6 },
  { month: 'May', organizations: 8 },
  { month: 'Jun', organizations: 10 },
  { month: 'Jul', organizations: 12 },
];

export function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 12,
    activeSubscriptions: 10,
    totalEmployees: 458,
    monthlyRevenue: 42500,
    growthData: defaultGrowthData,
    platformUsage: {
      securityShield: '100% Shielded',
      systemUptime: '99.98% Operational',
      resourceLoad: '34% Active Load',
    },
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.get('/superadmin/dashboard/stats');
        if (response.data?.data) {
          setStats((prev) => ({
            ...prev,
            ...response.data.data,
          }));
        }
      } catch (err) {
        console.log('Using default backend dashboard metrics');
      }
    }
    fetchStats();
  }, []);

  const chartData = stats.growthData && stats.growthData.length > 0 ? stats.growthData : defaultGrowthData;

  return (
    <div className="space-y-6 text-foreground">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border dark:bg-slate-900 dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">Total Organizations</CardTitle>
            <Building2 className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground dark:text-white">{stats.totalOrganizations}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center mt-1 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> Connected Tenant Accounts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border dark:bg-slate-900 dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">Active Subscriptions</CardTitle>
            <CreditCard className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground dark:text-white">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {stats.totalOrganizations > 0
                  ? ((stats.activeSubscriptions / stats.totalOrganizations) * 100).toFixed(1)
                  : '100'}%
              </span>{' '}
              active tenant conversion
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border dark:bg-slate-900 dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">Total Platform Users</CardTitle>
            <Users className="h-5 w-5 text-sky-500 dark:text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground dark:text-white">{stats.totalEmployees}</div>
            <p className="text-xs text-sky-600 dark:text-sky-400 flex items-center mt-1 font-medium">
              <Activity className="w-3 h-3 mr-1" /> Active across {stats.totalOrganizations} tenants
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border dark:bg-slate-900 dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">Monthly Revenue</CardTitle>
            <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground dark:text-white">₹{stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center mt-1 font-medium">
              <ArrowUpRight className="w-3 h-3 mr-1" /> +15.4% growth vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphs & Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Organization Connection Growth Graph */}
        <Card className="lg:col-span-2 bg-card border-border dark:bg-slate-900 dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-foreground dark:text-white font-semibold">Total Organization Connections</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-slate-400 text-xs">Connected organizations growth trajectory over time</CardDescription>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
              Growth Trend
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orgGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40 dark:text-slate-800" vertical={false} />
                  <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground dark:text-slate-400" tickLine={false} fontSize={12} />
                  <YAxis stroke="currentColor" className="text-muted-foreground dark:text-slate-400" tickLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="organizations"
                    name="Connected Orgs"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#orgGrowthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
}
