import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import { Users, Clock, CheckCircle2, BarChart3, ArrowRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

import { getUserRoleAndDept } from '@/lib/userProfile';

export function TeamLeadDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { employees, isEmployeesLoading, dashboard, isDashboardLoading } = useManager();

  const stats = [
    { label: 'Team Size', value: isDashboardLoading ? '…' : dashboard.headcount, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Present Today', value: Math.max(0, (isDashboardLoading ? 0 : dashboard.headcount) - 1), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'On Leave', value: '1', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Pending Approvals', value: '2', icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-semibold">
                {roleInfo.roleTitle}
              </Badge>
              <span className="text-emerald-100 text-xs font-medium">• {roleInfo.departmentName} Department</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Hi, {user?.firstName}! 👋</h1>
            <p className="text-emerald-100 text-sm mt-1">Here's your team's status and performance overview.</p>
          </div>
          <Button
            onClick={() => navigate('/team-lead/members')}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 text-sm"
          >
            <Users className="h-4 w-4 mr-2" /> View Team
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'My Team', href: '/team-lead/members', color: 'from-emerald-500 to-emerald-600' },
          { label: 'Leave Approvals', href: '/team-lead/leaves/approvals', color: 'from-amber-500 to-amber-600' },
          { label: 'My Attendance', href: '/attendance/my-attendance', color: 'from-blue-500 to-blue-600' },
          { label: 'Goals', href: '/performance/goals', color: 'from-violet-500 to-violet-600' },
          { label: 'Reviews', href: '/performance/reviews', color: 'from-pink-500 to-pink-600' },
          { label: 'My Approvals', href: '/approvals', color: 'from-teal-500 to-teal-600' },
        ].map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.href)}
            className={`flex items-center justify-between gap-2 p-4 rounded-xl bg-gradient-to-r ${link.color} text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left`}
          >
            <span className="font-semibold text-sm">{link.label}</span>
            <ArrowRight className="h-4 w-4 opacity-70 shrink-0" />
          </button>
        ))}
      </div>

      {/* Team snapshot */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-bold">Team Snapshot</CardTitle>
            </div>
            <button onClick={() => navigate('/team-lead/members')} className="text-xs text-emerald-600 hover:underline">
              View all →
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isEmployeesLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {employees.slice(0, 10).map((emp: any) => {
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center flex-shrink-0 border">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Employee'}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 uppercase font-semibold shrink-0">
                      {emp.status || 'active'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
