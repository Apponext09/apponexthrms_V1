import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTeam } from '@/features/team-lead/hooks/useTeam';
import {
  Users, Clock, CheckCircle2, BarChart3, ArrowRight,
  Scan, Sparkles, UserCheck, ChevronRight, Activity,
  CalendarCheck, Award, FileCheck, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { cn } from '@/lib/utils';

export function TeamLeadDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { dashboard, isDashboardLoading, members, isMembersLoading } = useTeam();

  const totalMembers = dashboard?.totalTeamMembers ?? members.length;
  const activeToday = dashboard?.activeToday ?? Math.max(0, members.length);
  const onLeave = dashboard?.onLeave ?? 0;
  const pendingApprovals = dashboard?.pendingApprovals ?? 0;

  const stats = [
    {
      label: 'Assigned Team Size',
      value: isDashboardLoading ? '—' : totalMembers,
      icon: Users,
      sub: 'Direct report members',
      accent: 'emerald',
      badge: 'Active Roster',
    },
    {
      label: 'Present Today',
      value: isDashboardLoading ? '—' : activeToday,
      icon: Clock,
      sub: 'Team attendance',
      accent: 'blue',
      badge: 'On Duty',
    },
    {
      label: 'On Leave',
      value: isDashboardLoading ? '—' : onLeave,
      icon: CheckCircle2,
      sub: 'Approved time-off',
      accent: 'amber',
      badge: 'Scheduled',
    },
    {
      label: 'Pending Approvals',
      value: isDashboardLoading ? '—' : pendingApprovals,
      icon: BarChart3,
      sub: 'Requires your review',
      accent: 'violet',
      badge: 'Inbox',
    },
  ];

  const quickLinks = [
    { label: 'Face Attendance', desc: 'Scan team attendance', icon: Scan, href: '/team-lead/face-attendance', accent: 'violet' },
    { label: 'My Team Members', desc: 'View direct reports', icon: Users, href: '/team-lead/members', accent: 'emerald' },
    { label: 'Leave Approvals', desc: 'Review leave requests', icon: CheckCircle2, href: '/leaves/approvals', accent: 'amber' },
    { label: 'My Attendance', desc: 'View personal logs', icon: CalendarCheck, href: '/attendance/my-attendance', accent: 'blue' },
    { label: 'Team Goals', desc: 'Track performance OKRs', icon: Target, href: '/performance/goals', accent: 'indigo' },
    { label: 'Performance Reviews', desc: 'Conduct member evaluations', icon: Award, href: '/performance/reviews', accent: 'rose' },
    { label: 'My Approvals', desc: 'Pending decision inbox', icon: FileCheck, href: '/approvals', accent: 'teal' },
  ];

  const accentStyles: Record<string, { bg: string; border: string; text: string; iconBg: string; badge: string }> = {
    emerald: {
      bg: 'bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15',
      border: 'border-emerald-200/80 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300',
      badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
    },
    blue: {
      bg: 'bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-500/10 dark:hover:bg-blue-500/15',
      border: 'border-blue-200/80 dark:border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
    },
    amber: {
      bg: 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/15',
      border: 'border-amber-200/80 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
    },
    violet: {
      bg: 'bg-violet-500/5 hover:bg-violet-500/10 dark:bg-violet-500/10 dark:hover:bg-violet-500/15',
      border: 'border-violet-200/80 dark:border-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300',
      badge: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
    },
    indigo: {
      bg: 'bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15',
      border: 'border-indigo-200/80 dark:border-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300',
      badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
    },
    rose: {
      bg: 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/15',
      border: 'border-rose-200/80 dark:border-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300',
      badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
    },
    teal: {
      bg: 'bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-500/10 dark:hover:bg-teal-500/15',
      border: 'border-teal-200/80 dark:border-teal-500/20',
      text: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300',
      badge: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
    }
  };

  const memberAvatarPalettes = [
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
    'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/80 shadow-xs">
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.16] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 10% 20%, hsl(160 84% 39%) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsl(190 90% 45%) 0%, transparent 45%)',
          }}
        />
        <div className="relative p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                    {roleInfo.roleTitle}
                  </Badge>
                  <span className="text-muted-foreground text-xs font-medium">· {roleInfo.departmentName}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Hi, {user?.firstName || 'Team Lead'} 👋
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Track your assigned team members, daily attendance & leave approvals.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/team-lead/face-attendance')}
                className="text-xs font-semibold gap-2 rounded-xl border-border bg-card hover:bg-muted/70 transition-all shadow-2xs"
              >
                <Scan className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Face Attendance
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/team-lead/members')}
                className="text-xs font-bold gap-2 rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Users className="h-3.5 w-3.5" /> View Team
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const style = accentStyles[stat.accent];
          return (
            <Card
              key={stat.label}
              className={cn(
                'border shadow-2xs hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-default bg-card',
                style.border
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center border shadow-2xs', style.iconBg, style.border)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', style.badge)}>
                    {stat.badge}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none">
                    {stat.value}
                  </p>
                  <p className="text-xs font-bold text-foreground">{stat.label}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Quick Actions Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
              Team Lead Portals & Actions
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full">
              7 Active Workflows
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const style = accentStyles[link.accent];
              return (
                <button
                  key={link.label}
                  onClick={() => navigate(link.href)}
                  className={cn(
                    'flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs group bg-card',
                    style.border,
                    style.bg
                  )}
                >
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center border shadow-2xs flex-shrink-0 group-hover:scale-105 transition-transform', style.iconBg, style.border)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{link.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{link.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Team Snapshot Roster */}
        <div>
          <Card className="border border-border/80 bg-card shadow-2xs h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/60 px-5 pt-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Team Snapshot</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Direct report members</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {members.length} Members
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col justify-between min-h-[340px]">
              {isMembersLoading ? (
                <div className="flex flex-col items-center justify-center my-auto py-12 text-center px-5">
                  <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3 animate-pulse">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">Loading team roster...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto py-12 text-center px-5">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No Direct Reports</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Assigned staff members will be listed here</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[440px] overflow-y-auto">
                  {members.slice(0, 10).map((emp: any, idx: number) => {
                    const firstName = emp.first_name || emp.firstName || '';
                    const lastName = emp.last_name || emp.lastName || '';
                    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
                    const isActive = (emp.status || 'active').toLowerCase() === 'active';
                    const colorClass = memberAvatarPalettes[idx % memberAvatarPalettes.length];

                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div className={cn(
                          'h-9 w-9 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 border shadow-2xs',
                          colorClass
                        )}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {firstName} {lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {emp.designation || 'Specialist'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn(
                            'h-2 w-2 rounded-full',
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          )} />
                          <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wider',
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          )}>
                            {emp.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {members.length > 0 && (
                <div className="p-3 border-t border-border/60 bg-muted/20 flex-shrink-0">
                  <button
                    onClick={() => navigate('/team-lead/members')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                  >
                    View complete team roster ({members.length})
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
