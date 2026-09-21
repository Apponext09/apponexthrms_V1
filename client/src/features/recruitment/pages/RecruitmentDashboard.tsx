import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard, RecruitmentDashboardFilters } from '../hooks/useAnalytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Briefcase, Users, MessageSquare, Send, CheckCircle2, TrendingUp, 
  Layers, Calendar, PieChart as PieIcon, BarChart2, Clock, Sparkles, 
  ArrowUpRight, Plus, Filter, RotateCcw, X, Building2, Award, 
  ChevronRight, ArrowRight, Percent, UserCheck, ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PIPELINE_COLORS: Record<string, string> = {
  Applied: '#3b82f6',
  Screening: '#8b5cf6',
  Assessment: '#a855f7',
  Interview: '#f59e0b',
  Offer: '#6366f1',
  Hired: '#10b981',
  Rejected: '#ef4444',
};

const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const dataObj = entry?.payload || {};
    const color = entry?.color || entry?.fill || dataObj?.color || '#3b82f6';
    const displayLabel = dataObj?.stage || dataObj?.name || label || 'Metrics';

    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-xl px-4 py-2.5 text-xs shadow-2xl font-medium z-50">
        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }} />
          <span>{displayLabel}</span>
        </p>
        {payload.map((p: any, index: number) => {
          const pName = p.name || p.dataKey || 'Count';
          const pVal = p.value !== undefined ? p.value : 0;
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs py-0.5">
              <span className="text-slate-300 capitalize font-medium">{pName}:</span>
              <span className="font-bold text-white pl-2">{pVal}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const RecruitmentDashboard: React.FC = () => {
  const navigate = useNavigate();

  // ── Filter State ──────────────────────────────────────────────────────────
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isHrRoute = window.location.pathname.startsWith('/hr');
  const basePath = isHrRoute ? '/hr/recruitment' : '/recruitment';

  // Construct query filters payload
  const activeFilters = useMemo<RecruitmentDashboardFilters>(() => ({
    departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    jobId: selectedJob !== 'all' ? selectedJob : undefined,
    gradeId: selectedGrade !== 'all' ? selectedGrade : undefined,
    timeRange: selectedTimeRange !== 'all' ? selectedTimeRange : undefined,
    startDate: selectedTimeRange === 'custom' && startDate ? startDate : undefined,
    endDate: selectedTimeRange === 'custom' && endDate ? endDate : undefined,
  }), [selectedDepartment, selectedJob, selectedGrade, selectedTimeRange, startDate, endDate]);

  const { data: dashboardResponse, isLoading: dashboardLoading, isFetching, refetch } = useDashboard(activeFilters);

  const dashboard = dashboardResponse?.data || dashboardResponse;

  const stats = dashboard?.stats || {
    totalOpenJobs: 0,
    totalApplications: 0,
    appliedCount: 0,
    screeningCount: 0,
    assessmentCount: 0,
    interviewCount: 0,
    offerCount: 0,
    hiredCount: 0,
    rejectedCount: 0,
    timeToHire: 0,
    conversionRate: 0,
  };

  const funnel = dashboard?.funnel || {
    applied: stats.appliedCount || 0,
    screening: stats.screeningCount || 0,
    assessment: stats.assessmentCount || 0,
    interview: stats.interviewCount || 0,
    offer: stats.offerCount || 0,
    hired: stats.hiredCount || 0,
    rejected: stats.rejectedCount || 0,
  };

  const conversions = dashboard?.conversions || {
    appliedToScreening: 0,
    screeningToInterview: 0,
    interviewToOffer: 0,
    offerToHired: 0,
    appliedToHired: 0,
  };

  const recentApplications = dashboard?.recentApplications || [];
  const filterOptions = dashboard?.filterOptions || { departments: [], jobs: [], grades: [] };
  const departmentBreakdown = dashboard?.departmentBreakdown || [];

  // Active filter count
  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDepartment !== 'all') count++;
    if (selectedJob !== 'all') count++;
    if (selectedGrade !== 'all') count++;
    if (selectedTimeRange !== 'all') count++;
    return count;
  }, [selectedDepartment, selectedJob, selectedGrade, selectedTimeRange]);

  const handleResetFilters = () => {
    setSelectedDepartment('all');
    setSelectedJob('all');
    setSelectedGrade('all');
    setSelectedTimeRange('all');
    setStartDate('');
    setEndDate('');
  };

  // Pipeline Bar Chart Data
  const pipelineBarData = useMemo(() => {
    const applied = Number(stats.appliedCount ?? funnel.applied ?? 0);
    const screening = Number(stats.screeningCount ?? funnel.screening ?? 0);
    const assessment = Number(stats.assessmentCount ?? funnel.assessment ?? 0);
    const interview = Number(stats.interviewCount ?? funnel.interview ?? 0);
    const offer = Number(stats.offerCount ?? funnel.offer ?? 0);
    const hired = Number(stats.hiredCount ?? funnel.hired ?? 0);
    const rejected = Number(stats.rejectedCount ?? funnel.rejected ?? 0);

    return [
      { stage: 'Applied', count: applied, color: PIPELINE_COLORS.Applied },
      { stage: 'Screening', count: screening, color: PIPELINE_COLORS.Screening },
      { stage: 'Assessment', count: assessment, color: PIPELINE_COLORS.Assessment },
      { stage: 'Interview', count: interview, color: PIPELINE_COLORS.Interview },
      { stage: 'Offer', count: offer, color: PIPELINE_COLORS.Offer },
      { stage: 'Hired', count: hired, color: PIPELINE_COLORS.Hired },
      { stage: 'Rejected', count: rejected, color: PIPELINE_COLORS.Rejected },
    ];
  }, [stats, funnel]);

  // Sourcing Pie Data
  const sourcingPieData = useMemo(() => {
    const rawSources = dashboard?.sourceMetrics;
    if (Array.isArray(rawSources) && rawSources.length > 0) {
      return rawSources.filter((item: any) => Number(item?.value || item?.count || 0) > 0);
    }
    if (rawSources && typeof rawSources === 'object') {
      const entries = Object.entries(rawSources);
      if (entries.length > 0) {
        return entries.map(([key, val]: [string, any]) => ({
          name: !key || key === 'null' || key === 'undefined' ? 'Direct Apply' : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: Number(val?.totalCandidates || val?.appliedCount || val?.value || val || 0),
        })).filter(item => item.value > 0);
      }
    }
    if (stats.totalApplications > 0) {
      return [{ name: 'Direct Sourcing', value: stats.totalApplications }];
    }
    return [];
  }, [dashboard, stats.totalApplications]);

  // Monthly Trend Data
  const monthlyTrendData = useMemo(() => {
    if (Array.isArray(dashboard?.monthlyTrends) && dashboard.monthlyTrends.length > 0) {
      return dashboard.monthlyTrends;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const idx = (currentMonthIdx - 5 + i + 12) % 12;
      return months[idx];
    });

    return last6Months.map(m => ({
      month: m,
      applications: 0,
      hires: 0,
    }));
  }, [dashboard]);

  return (
    <div className="recruitment-page min-w-0 space-y-4">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="recruitment-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Recruitment Analytics & Insights
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time database intelligence across requisitions, candidate pipeline, sourcing, and conversions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-2 rounded-xl border border-border/80 text-xs font-semibold text-foreground shadow-2xs">
            <Clock className="w-4 h-4 text-primary" />
            <span>Avg. Time-to-Hire: <strong className="text-primary font-bold">{stats.timeToHire || 0} Days</strong></span>
          </div>

          <Button
            size="sm"
            onClick={() => navigate(`${basePath}/mrf-request`)}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> New Requisition
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${basePath}/applicant-tracker`)}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted cursor-pointer whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" /> Pipeline Board
          </Button>
        </div>
      </div>

      {/* ── Interactive Multi-Criteria Filter Bar ──────────────────────────── */}
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                <Filter className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-foreground tracking-tight">
                Filter Recruitment Data
              </span>
              {appliedFilterCount > 0 && (
                <Badge variant="default" className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {appliedFilterCount} Active
                </Badge>
              )}
            </div>

            {appliedFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-[11px] font-bold text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 gap-1 px-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset All Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Department Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Department
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {filterOptions.departments?.map((dept: any) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position / Job Requisition Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> Position / Job
              </label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {filterOptions.jobs?.map((job: any) => (
                    <SelectItem key={job.id} value={String(job.id)}>
                      {job.job_title || job.jobTitle || 'Job'} {job.job_code || job.jobCode ? `(${job.job_code || job.jobCode})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-primary" /> Grade
              </label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {filterOptions.grades?.map((grade: any) => (
                    <SelectItem key={grade.id} value={String(grade.id)}>
                      {grade.name} ({grade.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Period Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Time Period
              </label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border font-medium">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Inputs if Custom selected */}
          {selectedTimeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-40 rounded-xl bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-40 rounded-xl bg-background"
                />
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          {appliedFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground font-semibold">Active:</span>

              {selectedDepartment !== 'all' && (
                <Badge variant="secondary" className="text-xs font-semibold gap-1.5 py-1 px-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  Dept: {filterOptions.departments?.find((d: any) => String(d.id) === selectedDepartment)?.name || selectedDepartment}
                  <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedDepartment('all')} />
                </Badge>
              )}

              {selectedJob !== 'all' && (
                <Badge variant="secondary" className="text-xs font-semibold gap-1.5 py-1 px-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Job: {filterOptions.jobs?.find((j: any) => String(j.id) === selectedJob)?.job_title || filterOptions.jobs?.find((j: any) => String(j.id) === selectedJob)?.jobTitle || selectedJob}
                  <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedJob('all')} />
                </Badge>
              )}

              {selectedGrade !== 'all' && (
                <Badge variant="secondary" className="text-xs font-semibold gap-1.5 py-1 px-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Grade: {filterOptions.grades?.find((g: any) => String(g.id) === selectedGrade)?.name || selectedGrade}
                  <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedGrade('all')} />
                </Badge>
              )}

              {selectedTimeRange !== 'all' && (
                <Badge variant="secondary" className="text-xs font-semibold gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Time: {selectedTimeRange.replace('_', ' ').toUpperCase()}
                  <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => { setSelectedTimeRange('all'); setStartDate(''); setEndDate(''); }} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPI Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Open Positions */}
        <Card className="bg-card border-border shadow-sm rounded-xl hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Open Positions</p>
              <p className="text-3xl font-black text-foreground">{stats.totalOpenJobs}</p>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold px-2 py-0.5">
                Active Requisitions
              </Badge>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Applications */}
        <Card className="bg-card border-border shadow-sm rounded-xl hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Applications</p>
              <p className="text-3xl font-black text-foreground">{stats.totalApplications}</p>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold px-2 py-0.5">
                In Active Pipeline
              </Badge>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* In Interview */}
        <Card className="bg-card border-border shadow-sm rounded-xl hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Interview</p>
              <p className="text-3xl font-black text-foreground">{stats.interviewCount}</p>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold px-2 py-0.5">
                Panel Rounds
              </Badge>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Offers Released */}
        <Card className="bg-card border-border shadow-sm rounded-xl hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Offers Released</p>
              <p className="text-3xl font-black text-foreground">{stats.offerCount}</p>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-bold px-2 py-0.5">
                Compensation Offers
              </Badge>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Hired / Joined */}
        <Card className="bg-card border-border shadow-sm rounded-xl hover:shadow-md transition-all group overflow-hidden relative sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hired & Joined</p>
              <p className="text-3xl font-black text-foreground">{stats.hiredCount}</p>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5">
                Conv: {stats.conversionRate || 0}%
              </Badge>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 1: Pipeline Stage Distribution (Bar) & Sourcing Channels (Pie) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Bar Chart */}
        <Card className="bg-card border-border shadow-sm rounded-xl lg:col-span-2 overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Applicant Pipeline Stage Distribution
            </CardTitle>
            <span className="text-xs text-muted-foreground font-medium">Candidate Volume by Stage</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineBarData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 600 }} className="text-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.06)', radius: 8 }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {pipelineBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sourcing Channel Pie Chart */}
        <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Sourcing Channels
            </CardTitle>
            <span className="text-xs text-muted-foreground font-medium">Share Breakdown</span>
          </CardHeader>
          <CardContent className="p-6">
            {sourcingPieData.length > 0 ? (
              <>
                <div className="h-52 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourcingPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sourcingPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/60 text-xs">
                  {sourcingPieData.slice(0, 6).map((src: any, i: number) => (
                    <div key={src.name || i} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/40 border border-border/50">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                      <span className="text-muted-foreground font-medium truncate text-[11px]">{src.name}</span>
                      <span className="text-foreground font-bold ml-auto text-xs">{src.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <PieIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-foreground">No Sourcing Data</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                  Candidate sourcing channels will appear once applications are received.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Applications & Hires Growth Trend + Stage Conversions ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Inflow Area Chart */}
        <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Applications & Hires Growth Trend
            </CardTitle>
            <span className="text-xs text-muted-foreground font-medium">6-Month Trend</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHires" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 600 }} className="text-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
                  <Area type="monotone" dataKey="hires" name="Hires" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHires)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate Funnel Metrics */}
        <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Stage-wise Conversion Funnel
            </CardTitle>
            <span className="text-xs text-muted-foreground font-medium">Progression %</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <FunnelStep label="Applied to Screening" rate={conversions.appliedToScreening || 0} count={`${funnel.screening}/${funnel.applied}`} color="bg-blue-500" />
              <FunnelStep label="Screening to Interview" rate={conversions.screeningToInterview || 0} count={`${funnel.interview}/${funnel.screening}`} color="bg-purple-500" />
              <FunnelStep label="Interview to Offer" rate={conversions.interviewToOffer || 0} count={`${funnel.offer}/${funnel.interview}`} color="bg-amber-500" />
              <FunnelStep label="Offer to Hired" rate={conversions.offerToHired || 0} count={`${funnel.hired}/${funnel.offer}`} color="bg-emerald-500" />
              <FunnelStep label="Overall Funnel Conversion (Applied → Hired)" rate={conversions.appliedToHired || 0} count={`${funnel.hired}/${stats.totalApplications || funnel.applied || 0}`} color="bg-primary" isHighlight />
            </div>
          </CardContent>
        </Card>
      </div>



      {/* ── Recent Applications Table ────────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Recent Candidate Submissions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Showing latest candidate applications matching filter criteria</p>
          </div>
          {recentApplications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${basePath}/applicant-tracker`)}
              className="text-xs font-bold gap-1 rounded-xl h-8 text-primary border-primary/20 hover:bg-primary/5 cursor-pointer"
            >
              View Full Pipeline ({recentApplications.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border/60 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-6">Candidate Name</th>
                  <th className="py-3 px-6">Applied Position</th>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6 text-center">Pipeline Status</th>
                  <th className="py-3 px-6 text-right">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground italic">
                      No applications match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  recentApplications.slice(0, 15).map((app: any) => {
                    const candidateName = app.candidate_name || app.candidateName || 'Candidate';
                    const email = app.candidate_email || app.candidateEmail || '';
                    const position = app.position_title || app.positionTitle || app.job_code || 'General Requisition';
                    const department = app.department_name || app.departmentName || '-';
                    const status = (app.application_status || app.applicationStatus || 'applied').toLowerCase();
                    const appliedAt = app.applied_at || app.appliedAt || app.created_at;

                    const initials = candidateName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CA';

                    return (
                      <tr key={app.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs">{candidateName}</div>
                              {email && <div className="text-[11px] text-muted-foreground font-mono">{email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-xs font-semibold text-foreground">
                          {position}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-muted-foreground font-medium">
                          {department}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <Badge variant="outline" className={`capitalize text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            status === 'hired'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : status === 'offer'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                              : status === 'interview'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : status === 'screening' || status === 'assessment'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                              : status === 'rejected' || status === 'withdrawn'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          }`}>
                            {status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-6 text-xs text-right text-muted-foreground font-mono">
                          {appliedAt ? format(new Date(appliedAt), 'MMM dd, yyyy') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {recentApplications.length > 15 && (
            <div className="p-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Showing 1 to 15 of {recentApplications.length} entries</span>
              <button
                onClick={() => navigate(`${basePath}/applicant-tracker`)}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                Open Full Candidate Pipeline &rarr;
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface FunnelStepProps {
  label: string;
  rate: number;
  count: string;
  color: string;
  isHighlight?: boolean;
}

const FunnelStep: React.FC<FunnelStepProps> = ({ label, rate, count, color, isHighlight }) => {
  return (
    <div className={`p-3 rounded-xl border ${isHighlight ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50'} space-y-1.5`}>
      <div className="flex justify-between items-center text-xs font-bold text-foreground">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">{count}</span>
          <span className={`font-black ${isHighlight ? 'text-primary' : 'text-foreground'}`}>{rate}%</span>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(rate, 2))}%` }}
        />
      </div>
    </div>
  );
};
