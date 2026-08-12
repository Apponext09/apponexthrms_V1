import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { lifecycleApi, EmployeeLifecycleDetails } from '@/features/HR/EmployeeLifecycle/api/lifecycleApi';
import { ChronologicalLifecycleFlow } from '@/features/HR/EmployeeLifecycle/components/ChronologicalLifecycleFlow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Sparkles,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

export function MyLifecyclePage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const myEmployeeId = user?.employeeId || user?.id || 0;

  const [details, setDetails] = useState<EmployeeLifecycleDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch logged-in employee's own lifecycle details
  useEffect(() => {
    if (myEmployeeId) {
      setLoading(true);
      lifecycleApi.getDetails(myEmployeeId)
        .then((data) => setDetails(data))
        .catch((err) => console.error('Failed to load employee lifecycle:', err))
        .finally(() => setLoading(false));
    }
  }, [myEmployeeId]);

  // Sync tab with pathname if navigated via sub-routes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/onboarding')) {
      setActiveTab('onboarding');
    } else if (path.includes('/offboarding')) {
      setActiveTab('offboarding');
    } else if (path.includes('/transfers')) {
      setActiveTab('transfers');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status.toLowerCase()) {
      case 'onboarding':
        return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Onboarding</Badge>;
      case 'probation':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Probation</Badge>;
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Active Workforce</Badge>;
      case 'notice':
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">In Notice Period</Badge>;
      case 'exit':
      case 'alumni':
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Offboarded</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 rounded-full">{status.toUpperCase()}</Badge>;
    }
  };

  if (loading || !details) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-3 font-sans">
        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground">Loading your personal lifecycle record...</p>
      </div>
    );
  }

  const initials = details.profile.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 select-none">
      {/* ─── CLEAN MINIMAL HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            My Employee Lifecycle
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View your complete employment timeline, onboarding audit, career transfers, and exit records.
          </p>
        </div>
        <div>
          {getStatusBadge(details.profile.lifecycleStatus)}
        </div>
      </div>

      {/* ─── MINIMAL PROFILE BANNER CARD ─── */}
      <Card className="border border-border/60 rounded-3xl p-5 bg-gradient-to-r from-card via-card/90 to-card shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-indigo-500/20 shadow-sm shrink-0">
              <AvatarImage src={details.profile.avatarUrl} alt={details.profile.name} className="object-cover" />
              <AvatarFallback className="bg-indigo-600 text-white font-black text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight">{details.profile.name}</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{details.profile.employeeCode}</span> • {details.profile.designationName} ({details.profile.departmentName})
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                  <Calendar className="w-3 h-3" /> Joined: {details.profile.joiningDate}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                  <MapPin className="w-3 h-3" /> Location: {details.profile.locationName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── MINIMAL SEGMENTED TABS BAR ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="bg-card border border-border/70 rounded-2xl p-1.5 shadow-xs">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-transparent gap-1.5 h-auto p-0">
            <TabsTrigger
              value="overview"
              className="rounded-xl text-xs font-extrabold py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-2"
            >
              <Users className="w-4 h-4" /> Overview & Timeline
            </TabsTrigger>
            <TabsTrigger
              value="onboarding"
              className="rounded-xl text-xs font-extrabold py-2.5 data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-2"
            >
              <UserPlus className="w-4 h-4" /> Onboarding Audit
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="rounded-xl text-xs font-extrabold py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" /> Transfers ({details.transfers.length})
            </TabsTrigger>
            <TabsTrigger
              value="offboarding"
              className="rounded-xl text-xs font-extrabold py-2.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-2"
            >
              <UserMinus className="w-4 h-4" /> Offboarding & Exit
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── TAB 1: OVERVIEW & TIMELINE ─── */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          <Card className="border border-border/60 rounded-2xl p-4 bg-card shadow-xs">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" /> Employment Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Department</span>
                <span className="font-extrabold text-foreground block mt-1">{details.profile.departmentName}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Designation</span>
                <span className="font-extrabold text-foreground block mt-1">{details.profile.designationName}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Transfers Count</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{details.transfers.length} Recorded</span>
              </div>
            </div>
          </Card>

          <ChronologicalLifecycleFlow
            milestones={details.chronologicalMilestones || []}
            employeeName={details.profile.name}
            employeeCode={details.profile.employeeCode}
          />
        </TabsContent>

        {/* ─── TAB 2: ONBOARDING AUDIT ─── */}
        <TabsContent value="onboarding" className="mt-0 space-y-4">
          <Card className="border border-border/60 rounded-2xl p-5 bg-card shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-500" /> Onboarding & Selection Record
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interviewer Name</span>
                <span className="font-extrabold text-foreground block mt-1">{details.onboarding?.interviewerName || 'HR Team'}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Onboarded By (HR)</span>
                <span className="font-extrabold text-foreground block mt-1">{details.onboarding?.onboardedByName || 'HR Admin'}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Date</span>
                <span className="font-extrabold text-foreground block mt-1">{details.onboarding?.interviewDate || details.profile.joiningDate || 'N/A'}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Rating</span>
                <span className="font-extrabold text-emerald-600 block mt-1">{details.onboarding?.interviewRating || '4.5 / 5'}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Joining Date</span>
                <span className="font-extrabold text-foreground block mt-1">{details.profile.joiningDate}</span>
              </div>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Probation Status</span>
                <span className="font-extrabold text-foreground block mt-1">{details.onboarding?.probationEndDate || 'Confirmed'}</span>
              </div>
            </div>

            {details.onboarding?.interviewNotes && (
              <div className="p-3.5 bg-muted/20 rounded-xl border border-border/50 text-xs">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Selection Remarks</span>
                <p className="text-foreground font-medium">{details.onboarding.interviewNotes}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${details.onboarding?.orientationCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                <span>Orientation Completed</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${details.onboarding?.documentsVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                <span>Documents Verified</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${details.onboarding?.welcomeKitIssued ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                <span>Welcome Kit Issued</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: TRANSFERS ─── */}
        <TabsContent value="transfers" className="mt-0 space-y-4">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-500" /> Career Transfers ({details.transfers.length})
          </h3>
          {details.transfers.length === 0 ? (
            <Card className="border border-border/60 rounded-2xl p-8 text-center bg-card shadow-xs">
              <p className="text-xs text-muted-foreground font-medium">No department or location transfers recorded for your account.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {details.transfers.map((t) => (
                <Card key={t.id} className="border border-border/60 rounded-2xl p-4 bg-card shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-extrabold text-[10px]">
                      {t.transferType.toUpperCase().replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-extrabold text-foreground">Effective: {t.effectiveDate}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Department</span>
                      <span className="font-extrabold block mt-1">{t.fromDepartmentName} → <span className="text-indigo-600 font-extrabold">{t.toDepartmentName}</span></span>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Designation</span>
                      <span className="font-extrabold block mt-1">{t.fromDesignationName} → <span className="text-indigo-600 font-extrabold">{t.toDesignationName}</span></span>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Location</span>
                      <span className="font-extrabold block mt-1">{t.fromLocationName} → <span className="text-indigo-600 font-extrabold">{t.toLocationName}</span></span>
                    </div>
                    <div className="p-2.5 bg-muted/20 rounded-xl border border-border/50">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Manager</span>
                      <span className="font-extrabold block mt-1">{t.fromManagerName} → <span className="text-indigo-600 font-extrabold">{t.toManagerName}</span></span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB 4: OFFBOARDING ─── */}
        <TabsContent value="offboarding" className="mt-0 space-y-4">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-rose-500" /> Offboarding & Exit Record
          </h3>
          {!details.offboarding ? (
            <Card className="border border-border/60 rounded-2xl p-8 text-center bg-card shadow-xs">
              <p className="text-xs text-emerald-600 font-bold">You are an active employee in good standing. No exit record present.</p>
            </Card>
          ) : (
            <Card className="border border-border/60 rounded-2xl p-4 bg-card shadow-xs space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Exit Type</span>
                  <span className="font-extrabold text-foreground block mt-1 capitalize">{details.offboarding.exitType}</span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Resignation Date</span>
                  <span className="font-extrabold text-foreground block mt-1">{details.offboarding.resignationDate || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Notice Period</span>
                  <span className="font-extrabold text-foreground block mt-1">{details.offboarding.noticePeriodDays} Days</span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Relieving Date</span>
                  <span className="font-extrabold text-foreground block mt-1">{details.offboarding.relievingDate || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Last Working Day</span>
                  <span className="font-extrabold text-foreground block mt-1">{details.offboarding.lastWorkingDay || 'N/A'}</span>
                </div>
                <div className="p-3 bg-muted/20 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">F&F Settlement</span>
                  <span className="font-extrabold text-indigo-600 block mt-1 capitalize">{details.offboarding.fnfStatus}</span>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
