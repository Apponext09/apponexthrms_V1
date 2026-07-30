import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, CheckCircle2, BarChart3, Briefcase,
  TrendingUp, Award, ArrowRight, Send, Scan,
  ChevronRight, Activity, Sparkles, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
      toast.success('Recommendation submitted successfully!');
      setRecommendDetails('');
      setSelectedEmp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit recommendation');
    }
  };

  const stats = [
    {
      label: 'Total Team Size',
      value: isDashboardLoading ? '—' : dashboard.headcount,
      icon: Users,
      sub: 'Active department members',
      accent: 'violet',
      badge: 'Active',
    },
    {
      label: 'Leave Requests',
      value: '3',
      icon: CheckCircle2,
      sub: '1 pending approval',
      accent: 'amber',
      badge: 'Action Needed',
    },
    {
      label: 'Active PIPs',
      value: isDashboardLoading ? '—' : dashboard.activePIPs,
      icon: Activity,
      sub: 'Performance tracking',
      accent: 'rose',
      badge: 'Monitored',
    },
    {
      label: 'Hiring Requisitions',
      value: isDashboardLoading ? '—' : dashboard.pendingHiringRequests,
      icon: Briefcase,
      sub: 'Open department roles',
      accent: 'emerald',
      badge: 'Open',
    },
  ];

  const quickLinks = [
    { label: 'My Team', desc: 'Manage department members', icon: Users, href: '/manager/team', accent: 'violet' },
    { label: 'Leave Approvals', desc: 'Review pending requests', icon: CheckCircle2, href: '/manager/leave-approvals', accent: 'amber' },
    { label: 'Performance', desc: 'Goals & annual reviews', icon: TrendingUp, href: '/manager/performance', accent: 'emerald' },
    { label: 'Hiring Requisitions', desc: 'Request new headcount', icon: Briefcase, href: '/manager/hiring', accent: 'blue' },
  ];

  const accentStyles: Record<string, { bg: string; border: string; text: string; iconBg: string; badge: string }> = {
    violet: {
      bg: 'bg-violet-500/5 hover:bg-violet-500/10 dark:bg-violet-500/10 dark:hover:bg-violet-500/15',
      border: 'border-violet-200/80 dark:border-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300',
      badge: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
    },
    amber: {
      bg: 'bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/15',
      border: 'border-amber-200/80 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300',
      badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
    },
    rose: {
      bg: 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/15',
      border: 'border-rose-200/80 dark:border-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300',
      badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
    },
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
    }
  };

  const memberAvatarPalettes = [
    'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
    'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
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
            backgroundImage: 'radial-gradient(circle at 10% 20%, hsl(265 85% 60%) 0%, transparent 40%), radial-gradient(circle at 90% 80%, hsl(217 91% 60%) 0%, transparent 45%)',
          }}
        />
        <div className="relative p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full gap-1">
                    <Sparkles className="h-3 w-3" />
                    {roleInfo.roleTitle}
                  </Badge>
                  <span className="text-muted-foreground text-xs font-medium">· {roleInfo.departmentName}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Welcome back, {user?.firstName || 'Manager'}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Overview of department operational metrics, leave requests & team performance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/manager/face-attendance')}
                className="text-xs font-semibold gap-2 rounded-xl border-border bg-card hover:bg-muted/70 transition-all shadow-2xs"
              >
                <Scan className="h-3.5 w-3.5 text-primary" /> Face Attendance
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/manager/team')}
                className="text-xs font-bold gap-2 rounded-xl shadow-xs"
              >
                <Users className="h-3.5 w-3.5" /> View Department
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

      {/* ── Main Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Proposal Form & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Promotion / Transfer Recommendation Form */}
          <Card className="border border-border/80 bg-card shadow-2xs">
            <CardHeader className="pb-4 border-b border-border/60 px-5 pt-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Award className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Promotion / Transfer Proposal
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Submit formal recommendation for HR & executive approval
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 px-2.5 py-0.5 rounded-full">
                  Dept Head Authorization
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Select Team Member
                    </label>
                    <select
                      value={selectedEmp}
                      onChange={(e) => setSelectedEmp(e.target.value)}
                      className="w-full text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-2xs"
                    >
                      <option value="">— Choose employee —</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.designation || 'Specialist'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Proposal Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['promotion', 'transfer'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setRecommendType(t)}
                          className={cn(
                            'py-2 rounded-xl border text-xs font-bold capitalize transition-all duration-150',
                            recommendType === t
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
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
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Justification & Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={recommendDetails}
                    onChange={(e) => setRecommendDetails(e.target.value)}
                    placeholder="Provide business rationale, key performance achievements, or proposed new role details..."
                    className="w-full text-xs sm:text-sm rounded-xl border border-input bg-background text-foreground p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none shadow-2xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingRecommendation || !selectedEmp || !recommendDetails}
                  className="w-full rounded-xl font-bold text-xs gap-2 shadow-xs transition-all py-2.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmittingRecommendation ? 'Submitting Proposal...' : 'Submit Proposal'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Portal Navigation */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
              Quick Management Portals
            </h3>
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
        </div>

        {/* Right Column: Department Team Roster */}
        <div>
          <Card className="border border-border/80 bg-card shadow-2xs h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/60 px-5 pt-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Department Members</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Roster overview</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {employees.length} Members
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col justify-between min-h-[360px]">
              {employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center my-auto py-12 text-center px-5">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No Department Members</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Assigned staff will be displayed here</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[460px] overflow-y-auto">
                  {employees.slice(0, 15).map((emp: any, idx: number) => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                    const isActive = (emp.status || 'active').toLowerCase() === 'active';
                    const colorClass = memberAvatarPalettes[idx % memberAvatarPalettes.length];
                    const isLead = (emp.roleTag || '').toLowerCase().includes('lead') || (emp.designation || '').toLowerCase().includes('lead');

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
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground truncate">
                              {emp.firstName} {emp.lastName}
                            </p>
                            {isLead && (
                              <Badge className="text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-1 py-0 h-4">
                                Lead
                              </Badge>
                            )}
                          </div>
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

              {employees.length > 0 && (
                <div className="p-3 border-t border-border/60 bg-muted/20 flex-shrink-0">
                  <button
                    onClick={() => navigate('/manager/team')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    View complete department roster ({employees.length})
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
