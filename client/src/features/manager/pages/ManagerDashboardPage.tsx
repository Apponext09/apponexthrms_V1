import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, CheckCircle2, BarChart3, Briefcase,
  TrendingUp, Award, ArrowRight, Send, Scan,
  ChevronRight, Activity, Sparkles, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { cn } from '@/lib/utils';

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);
  const { dashboard, isDashboardLoading, employees, submitRecommendation, isSubmittingRecommendation } = useManager();

  const [selectedEmp, setSelectedEmp] = useState('');
  const [recommendType, setRecommendType] = useState<'promotion' | 'transfer'>('promotion');
  const [recommendDetails, setRecommendDetails] = useState('');

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !recommendDetails) { toast.error('Select an employee and enter details.'); return; }
    try {
      await submitRecommendation({ employeeId: parseInt(selectedEmp), type: recommendType, details: recommendDetails });
      toast.success('Recommendation submitted!');
      setRecommendDetails('');
      setSelectedEmp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const stats = [
    {
      label: 'Team Size',
      value: isDashboardLoading ? '—' : dashboard.headcount,
      icon: Users,
      sub: 'Total members',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      border: 'border-violet-100 dark:border-violet-500/20',
      dot: 'bg-violet-500',
    },
    {
      label: 'Leave Requests',
      value: '3',
      icon: CheckCircle2,
      sub: '1 pending review',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-100 dark:border-amber-500/20',
      dot: 'bg-amber-500',
    },
    {
      label: 'Active PIPs',
      value: isDashboardLoading ? '—' : dashboard.activePIPs,
      icon: Activity,
      sub: 'Performance tracked',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      border: 'border-rose-100 dark:border-rose-500/20',
      dot: 'bg-rose-500',
    },
    {
      label: 'Hiring Requests',
      value: isDashboardLoading ? '—' : dashboard.pendingHiringRequests,
      icon: Briefcase,
      sub: 'Open positions',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-100 dark:border-emerald-500/20',
      dot: 'bg-emerald-500',
    },
  ];

  const quickLinks = [
    { label: 'My Team', desc: 'View all members', icon: Users, href: '/manager/team', accent: 'violet' },
    { label: 'Leave Approvals', desc: 'Pending requests', icon: CheckCircle2, href: '/manager/leave-approvals', accent: 'amber' },
    { label: 'Performance', desc: 'Goals & reviews', icon: TrendingUp, href: '/manager/performance', accent: 'emerald' },
    { label: 'Hiring Request', desc: 'Open requisitions', icon: Briefcase, href: '/manager/hiring', accent: 'blue' },
  ];

  const accentMap: Record<string, string> = {
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20',
  };

  const iconAccentMap: Record<string, string> = {
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  const memberColors = [
    'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300',
    'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
    'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300',
  ];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.12] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 15% 50%, hsl(271 91% 65%) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, hsl(221 83% 53%) 0%, transparent 50%)',
          }}
        />
        <div className="relative p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {roleInfo.roleTitle}
                  </Badge>
                  <span className="text-muted-foreground text-xs">· {roleInfo.departmentName}</span>
                </div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Good day, {user?.firstName}!
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Here's your department overview and team metrics.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/manager/face-attendance')}
                className="text-xs font-semibold gap-2 rounded-xl border-border bg-card hover:bg-muted/60 transition-colors"
              >
                <Scan className="h-3.5 w-3.5" /> Face Attendance
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/manager/team')}
                className="text-xs font-bold gap-2 rounded-xl shadow-sm"
              >
                <Users className="h-3.5 w-3.5" /> View Team
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={cn(
                'border shadow-none hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-default',
                stat.border,
                stat.bg
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-card/70 dark:bg-card/40 flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm flex-shrink-0">
                    <Icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                  <span className={cn('h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0', stat.dot)} />
                </div>
                <p className="text-2xl font-black text-foreground tracking-tight leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Proposal Form */}
          <Card className="border border-border shadow-none bg-card">
            <CardHeader className="pb-3 border-b border-border px-5 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Promotion / Transfer Proposal
                  </CardTitle>
                </div>
                <Badge className="text-[10px] bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/20 font-semibold">
                  Dept Head Scope
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Team Member
                    </label>
                    <select
                      value={selectedEmp}
                      onChange={(e) => setSelectedEmp(e.target.value)}
                      className="w-full text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="">— Choose employee —</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Type
                    </label>
                    <div className="flex gap-2">
                      {(['promotion', 'transfer'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setRecommendType(t)}
                          className={cn(
                            'flex-1 py-2 rounded-xl border text-xs font-bold capitalize transition-all',
                            recommendType === t
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-input hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Justification
                  </label>
                  <textarea
                    rows={3}
                    value={recommendDetails}
                    onChange={(e) => setRecommendDetails(e.target.value)}
                    placeholder="Business justification, performance highlights, proposed grade..."
                    className="w-full text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingRecommendation || !selectedEmp || !recommendDetails}
                  className="w-full rounded-xl font-bold gap-2 shadow-sm transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Recommendation
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.label}
                    onClick={() => navigate(link.href)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-sm group',
                      accentMap[link.accent]
                    )}
                  >
                    <div className="h-8 w-8 rounded-lg bg-card/60 dark:bg-card/20 flex items-center justify-center border border-white/50 dark:border-white/10 flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <Icon className={cn('h-4 w-4', iconAccentMap[link.accent])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{link.label}</p>
                      <p className="text-[10px] opacity-60 truncate">{link.desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-40 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — Team Members */}
        <div>
          <Card className="border border-border shadow-none bg-card">
            <CardHeader className="pb-3 border-b border-border px-5 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">Department Members</CardTitle>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {employees.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-5">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No team members</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Members appear here once assigned</p>
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto">
                  {employees.slice(0, 15).map((emp: any, idx: number) => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                    const isActive = (emp.status || 'active').toLowerCase() === 'active';
                    const colorClass = memberColors[idx % memberColors.length];
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0"
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-lg font-bold text-[11px] flex items-center justify-center flex-shrink-0',
                          colorClass
                        )}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {emp.designation || 'Employee'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          )} />
                          <span className={cn(
                            'text-[9px] font-bold uppercase',
                            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          )}>
                            {emp.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {employees.length > 15 && (
                    <button
                      onClick={() => navigate('/manager/team')}
                      className="w-full flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                    >
                      View all {employees.length} members
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
