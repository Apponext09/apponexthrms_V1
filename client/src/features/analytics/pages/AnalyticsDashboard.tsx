import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  FileText,
  Users,
  Calendar,
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AnalyticsDashboard() {
  const navigate = useNavigate();

  const reportCategories = [
    {
      id: 'attendance',
      title: 'Attendance Reports',
      description: 'Filter attendance records, view tabular shift timing logs, day status badges, and mobile GPS tracking logs.',
      icon: Clock,
      color: 'text-[#2b82b9] bg-sky-100 dark:bg-sky-950/60',
      href: '/analytics/attendance',
      badge: 'Active Module',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'timelog',
      title: 'Timelog Report',
      description: 'Track billable vs non-billable project timelogs, task work logs, and manager approval statuses.',
      icon: FileText,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/60',
      href: '/analytics/timelog',
      badge: 'Active Module',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      id: 'leave',
      title: 'Leave Analytics',
      description: 'Analyze leave patterns, balance utilization, seasonal trends, and department leave distribution.',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950/60',
      href: '#',
      comingSoon: true,
    },
    {
      id: 'headcount',
      title: 'Headcount Analysis',
      description: 'Track employee headcount growth, department breakdown, tenure metrics, and turnover rates.',
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/60',
      href: '#',
      comingSoon: true,
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      description: 'Review OKR progress, appraisal cycle summaries, 360 review ratings, and competency maps.',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60',
      href: '/performance/analytics',
      comingSoon: false,
    },
    {
      id: 'payroll',
      title: 'Payroll Analytics',
      description: 'Analyze salary budgets, tax deductions, allowances distribution, and compensation trends.',
      icon: DollarSign,
      color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/60',
      href: '#',
      comingSoon: true,
    },
    {
      id: 'ai-insights',
      title: 'AI Insights (Premium)',
      description: 'Get AI-driven HR recommendations, attrition risk predictions, and automated workforce planning.',
      icon: Zap,
      color: 'text-amber-500 bg-amber-100 dark:bg-amber-950/60',
      href: '#',
      comingSoon: true,
      premium: true,
    },
  ];

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            <span>Reports & Analytics Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Access organized HR report categories, attendance logs, timelogs, and organizational insights.
          </p>
        </div>
      </div>

      {/* Grid of Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.id}
              className="hover:shadow-soft-md transition-all flex flex-col justify-between border-border/80 group"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-2xl ${item.color} shadow-2xs group-hover:scale-105 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {item.badge ? (
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  ) : item.premium ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Premium
                    </span>
                  ) : item.comingSoon ? (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Coming Soon
                    </span>
                  ) : null}
                </div>

                <div>
                  <CardTitle className="text-lg font-bold text-foreground">{item.title}</CardTitle>
                  <CardDescription className="mt-2 text-xs leading-relaxed">
                    {item.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <Button
                  variant={item.comingSoon ? 'outline' : 'default'}
                  disabled={item.comingSoon}
                  onClick={() => !item.comingSoon && navigate(item.href)}
                  className={`w-full h-9 text-xs font-bold space-x-2 ${
                    !item.comingSoon ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''
                  }`}
                >
                  <span>{item.comingSoon ? 'Coming Soon' : 'View Report'}</span>
                  {!item.comingSoon && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
