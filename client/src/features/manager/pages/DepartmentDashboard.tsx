import React, { useState } from 'react';
import { useManager } from '../hooks/useManager';
import { 
  Building2, Users, Award, TrendingUp, HelpCircle, 
  Send, Briefcase, Sparkles 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DepartmentDashboard() {
  const { 
    dashboard, isDashboardLoading, 
    employees, isEmployeesLoading, 
    submitRecommendation, isSubmittingRecommendation,
    submitHiringRequest, isSubmittingHiringRequest
  } = useManager();

  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [recommendType, setRecommendType] = useState<'promotion' | 'transfer'>('promotion');
  const [recommendDetails, setRecommendDetails] = useState<string>('');

  const [hiringDesignation, setHiringDesignation] = useState<string>('Marketing Associate');
  const [hiringJustification, setHiringJustification] = useState<string>('');

  const handleRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !recommendDetails) {
      toast.error('Please select an employee and enter details.');
      return;
    }

    try {
      await submitRecommendation({
        employeeId: parseInt(selectedEmp, 10),
        type: recommendType,
        details: recommendDetails,
      });
      toast.success('Recommendation submitted successfully');
      setRecommendDetails('');
      setSelectedEmp('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit recommendation');
    }
  };

  const handleHiring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hiringJustification) {
      toast.error('Please enter hiring justification.');
      return;
    }

    try {
      await submitHiringRequest({
        designationId: 1,
        justification: hiringJustification,
      });
      toast.success('Hiring request submitted to HR');
      setHiringJustification('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit hiring request');
    }
  };

  const memberColors = [
    'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300',
    'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.12] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 50%, hsl(271 91% 65%) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, hsl(221 83% 53%) 0%, transparent 50%)',
          }}
        />
        <div className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Department Control
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Department Resource Planning</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Manage department requisitions, budget utilization, and promotion proposals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Headcount */}
        <Card className="border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Headcount</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {isDashboardLoading ? '—' : dashboard.headcount}
              </p>
            </div>
            <div className="h-9 w-9 bg-card/70 dark:bg-card/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Hiring Requests */}
        <Card className="border border-violet-100 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/10 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Hiring Requests</span>
              <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                {isDashboardLoading ? '—' : dashboard.pendingHiringRequests}
              </p>
            </div>
            <div className="h-9 w-9 bg-card/70 dark:bg-card/40 text-violet-600 dark:text-violet-400 rounded-lg flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Active PIPs */}
        <Card className="border border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/10 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Active PIPs</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {isDashboardLoading ? '—' : dashboard.activePIPs}
              </p>
            </div>
            <div className="h-9 w-9 bg-card/70 dark:bg-card/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm">
              <HelpCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* Budget Utilization */}
        <Card className="border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Budget Utilization</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {isDashboardLoading ? '—' : `${dashboard.budgetUtilization}%`}
              </p>
            </div>
            <div className="h-9 w-9 bg-card/70 dark:bg-card/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — Forms */}
        <div className="lg:col-span-2 space-y-5">

          {/* Requisition Planning */}
          <Card className="border border-border shadow-none bg-card">
            <CardHeader className="pb-3 border-b border-border px-5 pt-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">New Resource Planning Requisitions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleHiring} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proposed Designation</label>
                  <select 
                    value={hiringDesignation}
                    onChange={(e) => setHiringDesignation(e.target.value)}
                    className="w-full text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="Marketing Associate">Marketing Associate</option>
                    <option value="Senior Marketing Executive">Senior Marketing Executive</option>
                    <option value="SEO Specialist">SEO Specialist</option>
                    <option value="Content Lead">Content Lead</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Business Justification</label>
                  <textarea
                    rows={3}
                    placeholder="Describe why this vacancy is required, workload trends, and expected ROI..."
                    value={hiringJustification}
                    onChange={(e) => setHiringJustification(e.target.value)}
                    className="w-full text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingHiringRequest || !hiringJustification}
                  className="w-full rounded-xl font-bold gap-2 shadow-sm transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Requisition Request
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Proposals Form */}
          <Card className="border border-border shadow-none bg-card">
            <CardHeader className="pb-3 border-b border-border px-5 pt-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                  <Award className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">Promotion & Transfer Proposals</CardTitle>
              </div>
              <Badge className="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/20 text-[10px] font-semibold">
                Dept Head Scope
              </Badge>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleRecommend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Colleague</label>
                    <select 
                      value={selectedEmp}
                      onChange={(e) => setSelectedEmp(e.target.value)}
                      className="w-full text-sm rounded-xl border border-input bg-background text-foreground px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    >
                      <option value="">— Choose employee —</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Justification Details</label>
                  <textarea
                    rows={3}
                    placeholder="Enter business justification, performance highlights, proposed grade..."
                    value={recommendDetails}
                    onChange={(e) => setRecommendDetails(e.target.value)}
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

        </div>

        {/* Right column — Department Directory */}
        <div className="lg:col-span-1">
          <Card className="border border-border shadow-none bg-card">
            <CardHeader className="pb-3 border-b border-border px-5 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">Department Members</CardTitle>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {employees.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isEmployeesLoading ? (
                <div className="text-center py-12 text-xs text-muted-foreground">Loading department...</div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No employees in department.</div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto">
                  {employees.map((emp: any, idx: number) => {
                    const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                    const colorClass = memberColors[idx % memberColors.length];
                    const isActive = (emp.status || 'active').toLowerCase() === 'active';

                    return (
                      <div key={emp.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0">
                        <div className={cn('h-8 w-8 rounded-lg font-bold text-[11px] flex items-center justify-center flex-shrink-0', colorClass)}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{emp.designation || 'Employee'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                          <span className={cn('text-[9px] font-bold uppercase', isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                            {emp.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

