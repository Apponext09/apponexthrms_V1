import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Briefcase, Building2, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { apiClient } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useEmployee } from '../hooks/useEmployees';
import type { EmployeeLifecycleDetails } from '@/features/HR/EmployeeLifecycle/api/lifecycleApi';
import { ChronologicalLifecycleFlow } from '@/features/HR/EmployeeLifecycle/components/ChronologicalLifecycleFlow';

const STAGES: Record<string, { label: string; badge: string; accent: string }> = {
  candidate: { label: 'Candidate', badge: 'bg-violet-500/15 text-violet-700 border-violet-500/25', accent: 'from-violet-600 to-fuchsia-600' },
  onboarding: { label: 'Onboarding', badge: 'bg-sky-500/15 text-sky-700 border-sky-500/25', accent: 'from-sky-600 to-blue-600' },
  probation: { label: 'Probation', badge: 'bg-amber-500/15 text-amber-700 border-amber-500/25', accent: 'from-amber-500 to-orange-500' },
  active: { label: 'Active', badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25', accent: 'from-emerald-600 to-teal-600' },
  notice: { label: 'Notice period', badge: 'bg-orange-500/15 text-orange-700 border-orange-500/25', accent: 'from-orange-500 to-rose-500' },
  exit: { label: 'Exited', badge: 'bg-rose-500/15 text-rose-700 border-rose-500/25', accent: 'from-rose-600 to-red-600' },
  alumni: { label: 'Alumni', badge: 'bg-slate-500/15 text-slate-700 border-slate-500/25', accent: 'from-slate-600 to-slate-700' },
};

const formatDate = (value?: string | null) => {
  if (!value || value === 'N/A') return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Detail({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value?: string | null }) {
  return <div className="flex gap-3 rounded-xl border border-border/65 bg-background/55 p-3"><span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value || 'Not assigned'}</p></div></div>;
}

export function MyLifecyclePage() {
  const { employee, isLoading: isResolvingEmployee } = useEmployee('me');
  const [details, setDetails] = useState<EmployeeLifecycleDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchLifecycle = useCallback(async () => {
    try {
      setError(null); setIsLoading(true);
      // Server resolves the linked employee from the authenticated account. This works for all self-service roles.
      const response = await apiClient.get('/hr/lifecycle/employees/me');
      setDetails(response.data?.data ?? null);
    } catch (err: any) {
      setDetails(null); setError(err?.response?.data?.message || 'Your lifecycle information could not be loaded.');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (!isResolvingEmployee) fetchLifecycle(); }, [fetchLifecycle, isResolvingEmployee, employee?.id]);
  if (isResolvingEmployee || isLoading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (error || !details) return <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center"><span className="rounded-2xl bg-destructive/10 p-4 text-destructive"><AlertCircle className="h-7 w-7" /></span><h1 className="text-lg font-bold">Lifecycle unavailable</h1><p className="text-sm text-muted-foreground">{error || 'No lifecycle record is available for your employee profile.'}</p><Button variant="outline" onClick={fetchLifecycle} className="gap-2"><RefreshCw className="h-4 w-4" /> Try again</Button></div>;

  const { profile, onboarding, offboarding, transfers = [], lifecycleEvents = [], chronologicalMilestones = [] } = details;
  const stage = STAGES[profile.lifecycleStatus] || STAGES.active;
  const actualOnboarding = onboarding?.id ? onboarding : null;
  return <main className="mx-auto max-w-6xl space-y-5 p-3 sm:p-5 lg:p-6">
    <section className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground shadow-lg sm:px-7"><div className="absolute -right-12 -top-20 h-52 w-52 rounded-full bg-primary-foreground/10" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/70">Employment journey</p><h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">My Lifecycle</h1><p className="mt-2 text-sm text-primary-foreground/80">Your verified employment milestones and current assignment.</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="border-primary-foreground/30 bg-primary-foreground/15 px-3 py-1 text-primary-foreground">{stage.label}</Badge><Button size="sm" variant="secondary" onClick={fetchLifecycle} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button></div></div></section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail icon={CalendarDays} label="Joined" value={formatDate(profile.joiningDate)} /><Detail icon={Briefcase} label="Current role" value={profile.designationName || 'Employee'} /><Detail icon={Building2} label="Department" value={profile.departmentName} /><Detail icon={ArrowLeftRight} label="Transfers" value={String(profile.transfersCount ?? transfers.length)} /></section>
    <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="border-border/80 shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><UserRound className="h-4 w-4" /></span><div><h2 className="text-base font-bold">Current assignment</h2><p className="text-xs text-muted-foreground">Organization details currently recorded for you.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Detail icon={Building2} label="Company" value={profile.companyName} /><Detail icon={MapPin} label="Work location" value={profile.locationName} /><Detail icon={UserRound} label="Reporting manager" value={profile.reportingManager || profile.reportingManagerName} /><Detail icon={ShieldCheck} label="Lifecycle status" value={stage.label} /></div></CardContent></Card><Card className="border-border/80 shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span><div><h2 className="text-base font-bold">Onboarding progress</h2><p className="text-xs text-muted-foreground">Confirmed HR records only.</p></div></div>{actualOnboarding ? <div className="space-y-3 text-sm"><p><span className="text-muted-foreground">Orientation:</span> {actualOnboarding.orientationCompleted ? 'Completed' : 'Pending'}</p><p><span className="text-muted-foreground">Documents:</span> {actualOnboarding.documentsVerified ? 'Verified' : 'Pending verification'}</p><p><span className="text-muted-foreground">Probation end:</span> {formatDate(actualOnboarding.probationEndDate)}</p></div> : <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">No onboarding record has been added yet.</p>}</CardContent></Card></section>
    {chronologicalMilestones.length > 0 && <ChronologicalLifecycleFlow milestones={chronologicalMilestones} employeeName={profile.name || `${profile.firstName} ${profile.lastName}`} employeeCode={profile.employeeCode} />}
    {(transfers.length > 0 || lifecycleEvents.length > 0 || offboarding) && <section className="grid gap-5 lg:grid-cols-2">{transfers.length > 0 && <Card className="border-border/80"><CardContent className="p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-bold"><ArrowLeftRight className="h-4 w-4 text-primary" /> Transfer history</h2><div className="space-y-3">{transfers.map(t => <div key={t.id} className="rounded-xl border border-border/70 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-semibold capitalize">{t.transferType.replace(/_/g, ' ')}</span><span className="text-xs text-muted-foreground">{formatDate(t.effectiveDate)}</span></div><p className="mt-2 text-xs text-muted-foreground">{t.fromDepartmentName} → {t.toDepartmentName}</p>{t.transferReason && <p className="mt-1 text-xs text-muted-foreground">{t.transferReason}</p>}</div>)}</div></CardContent></Card>}{lifecycleEvents.length > 0 && <Card className="border-border/80"><CardContent className="p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-bold"><Clock3 className="h-4 w-4 text-primary" /> Status history</h2><div className="space-y-3">{lifecycleEvents.map(event => <div key={event.id} className="flex gap-3 text-sm"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /><div><p className="font-semibold capitalize">{event.fromStatus || 'Started'} → {event.toStatus}</p><p className="text-xs text-muted-foreground">{formatDate(event.transitionDate)}{event.notes ? ` · ${event.notes}` : ''}</p></div></div>)}</div></CardContent></Card>}</section>}
  </main>;
}
