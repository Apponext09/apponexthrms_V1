import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Video, Clock, User, Star, Search, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Filter, Building2, History, Phone, RotateCcw, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export const InterviewCalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuthStore();

  const extractUserName = (u: any) => {
    if (!u) return '';
    const fn = u.first_name || u.firstName || '';
    const ln = u.last_name || u.lastName || '';
    const combined = `${fn} ${ln}`.trim();
    if (combined) return combined;
    return u.name || u.full_name || u.email || '';
  };
  const currentUserName = extractUserName(user) || 'Panel Assigned';

  const userRole = (user as any)?.role || '';
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];

  const isAdminOrHr = userRole === 'organization_admin' ||
    userRole === 'hr' ||
    userRole === 'admin' ||
    userRoles.includes('organization_admin') ||
    userRoles.includes('hr') ||
    userRoles.includes('hr_admin') ||
    userRoles.includes('hr_manager');

  const isEmployeeView = !isAdminOrHr || location.pathname.startsWith('/employee');

  const [searchQuery, setSearchQuery] = useState(location.state?.candidateName || '');

  useEffect(() => {
    if (location.state?.candidateName) {
      setSearchQuery(location.state.candidateName);
    }
  }, [location.state]);
  const [scheduleTab, setScheduleTab] = useState<'upcoming' | 'past'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setRoundFilter('all');
  };

  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Rating Modal state
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    interviewId: number | null;
    candidateName: string;
    overallRating: number;
    technicalScore: number;
    communicationScore: number;
    recommendation: 'strong_hire' | 'hire' | 'neutral' | 'do_not_hire';
    feedbackText: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    interviewId: null,
    candidateName: '',
    overallRating: 5,
    technicalScore: 4,
    communicationScore: 4,
    recommendation: 'hire',
    feedbackText: '',
    isSubmitting: false,
  });

  const openRatingModal = (interviewId: number, candidateName: string) => {
    setRatingModal({
      isOpen: true,
      interviewId,
      candidateName,
      overallRating: 5,
      technicalScore: 4,
      communicationScore: 4,
      recommendation: 'hire',
      feedbackText: '',
      isSubmitting: false,
    });
  };

  const handleRatingSubmit = async () => {
    if (!ratingModal.interviewId) return;
    setRatingModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      await api.post(`/recruitment/interviews/${ratingModal.interviewId}/feedback`, {
        interviewId: ratingModal.interviewId,
        overallRating: ratingModal.overallRating,
        technicalScore: ratingModal.technicalScore,
        communicationScore: ratingModal.communicationScore,
        wouldRecommend: ratingModal.recommendation === 'strong_hire' || ratingModal.recommendation === 'hire',
        feedbackText: ratingModal.feedbackText || 'Good performance in technical interview.',
        comments: ratingModal.feedbackText
      });
      toast.success(`Rating & feedback for ${ratingModal.candidateName} submitted successfully!`);
      setRatingModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
      queryClient.invalidateQueries({ queryKey: ['interviews-today'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-schedule'] });
    } catch (err: any) {
      console.error('Failed to submit rating', err);
      toast.error(err.response?.data?.message || 'Failed to submit interview rating');
      setRatingModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleMarkCompleted = async (interviewId: number, candidateName: string) => {
    try {
      await api.post(`/recruitment/interviews/${interviewId}/complete`);
      toast.success(`Interview for ${candidateName} marked as completed!`);
      queryClient.invalidateQueries({ queryKey: ['interviews-today'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-schedule'] });
    } catch (err: any) {
      console.error('Failed to complete interview', err);
      toast.error(err.response?.data?.message || 'Failed to mark interview as completed');
    }
  };

  const [assignedOnly, setAssignedOnly] = useState(false);
  const activeAssignedOnly = isEmployeeView ? true : assignedOnly;

  // Query today's interviews
  const { data: todayResponse, isLoading: todayLoading } = useQuery({
    queryKey: ['interviews-today', activeAssignedOnly],
    queryFn: async () => {
      try {
        const res = await api.get('/recruitment/interviews/today', {
          params: { assignedOnly: activeAssignedOnly ? 'true' : 'false' }
        });
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data)) return res.data;
        return [];
      } catch (err: any) {
        if (err?.response?.status === 403) return [];
        throw err;
      }
    },
    retry: (failureCount, error: any) => error?.response?.status !== 403 && failureCount < 2,
  });

  // Query upcoming interview schedule
  const { data: scheduleResponse, isLoading: scheduleLoading } = useQuery({
    queryKey: ['interviews-schedule', activeAssignedOnly],
    queryFn: async () => {
      try {
        const res = await api.get('/recruitment/interviews/schedule', {
          params: { assignedOnly: activeAssignedOnly ? 'true' : 'false' }
        });
        if (Array.isArray(res.data?.data)) return res.data.data;
        if (Array.isArray(res.data)) return res.data;
        return [];
      } catch (err: any) {
        if (err?.response?.status === 403) return [];
        throw err;
      }
    },
    retry: (failureCount, error: any) => error?.response?.status !== 403 && failureCount < 2,
  });
  const todayInterviews: any[] = Array.isArray(todayResponse) ? todayResponse : [];
  const rawSchedule: any[] = Array.isArray(scheduleResponse) ? scheduleResponse : [];
  const upcomingInterviews: any[] = rawSchedule.filter((int: any) => int.status !== 'completed' && int.status !== 'cancelled');  // Robust Date parser that accurately handles UTC ISO strings (ends with Z) and local MySQL strings
  const parseSafeDate = (dateStr: any): Date => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    const str = String(dateStr).trim();
    if (str.endsWith('Z')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    }
    if (str.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/)) {
      const parts = str.split(/[ T:]/);
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const h = parseInt(parts[3], 10);
      const min = parseInt(parts[4], 10);
      const s = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(y, m, d, h, min, s);
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Helper for date/time formatting in user's local timezone
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = parseSafeDate(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatMeetingTimeRange = (dateStr: string, durationMin?: number) => {
    if (!dateStr) return 'N/A';
    try {
      const start = parseSafeDate(dateStr);
      const startTime = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const dur = durationMin || 45;
      const end = new Date(start.getTime() + dur * 60000);
      const endTime = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startTime} - ${endTime} (${dur} mins)`;
    } catch (e) {
      return dateStr;
    }
  };

  const nowTime = Date.now();
  const [showPastToday, setShowPastToday] = useState(false);

  // Categorize today's interviews into Active and Completed/Past
  // ONLY interviews explicitly marked status === 'completed' or 'cancelled' go to past.
  // Pending scheduled interviews stay in active schedule regardless of clock time!
  const { activeTodayList, pastTodayList } = React.useMemo(() => {
    const active: any[] = [];
    const past: any[] = [];

    todayInterviews.forEach((int: any) => {
      const isCompletedOrCancelled = int.status === 'completed' || int.status === 'cancelled';

      if (isCompletedOrCancelled) {
        past.push(int);
      } else {
        const startObj = parseSafeDate(int.scheduled_date || int.scheduledDate);
        const scheduledTime = startObj.getTime();
        const durMinutes = Number(int.interview_duration_minutes || int.interviewDurationMinutes || int.duration_minutes || int.durationMinutes || 45);
        const meetingEndTime = scheduledTime + durMinutes * 60 * 1000;

        active.push({
          ...int,
          isOverdue: nowTime > meetingEndTime,
        });
      }
    });

    active.sort((a, b) => {
      const timeA = parseSafeDate(a.scheduled_date || a.scheduledDate).getTime();
      const timeB = parseSafeDate(b.scheduled_date || b.scheduledDate).getTime();
      return timeA - timeB;
    });

    return { activeTodayList: active, pastTodayList: past };
  }, [todayInterviews, nowTime]);

  const filterListBySearch = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => {
      const cName = (item.candidate_name || item.candidateName || item.name || '').toLowerCase();
      const iNames = (item.interviewer_names || item.interviewer || '').toLowerCase();
      const type = (item.interview_type || '').toLowerCase();
      return cName.includes(q) || iNames.includes(q) || type.includes(q);
    });
  };

  const filteredActiveToday = filterListBySearch(activeTodayList);
  const filteredPastToday = filterListBySearch(pastTodayList);

  // Split schedule items into Upcoming vs Past/Completed
  const upcomingList = React.useMemo(() => {
    return rawSchedule.filter((int: any) => int.status !== 'completed' && int.status !== 'cancelled');
  }, [rawSchedule]);

  const pastList = React.useMemo(() => {
    return rawSchedule.filter((int: any) => int.status === 'completed' || int.status === 'cancelled');
  }, [rawSchedule]);

  const currentTabRawList = scheduleTab === 'upcoming' ? upcomingList : pastList;

  const filteredScheduleTable = React.useMemo(() => {
    return currentTabRawList.filter((item: any) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cName = (item.candidate_name || item.candidateName || item.name || '').toLowerCase();
        const iNames = (item.interviewer_names || item.interviewer || '').toLowerCase();
        const type = (item.interview_type || '').toLowerCase();
        const pos = (item.position_title || item.positionTitle || item.job_title || '').toLowerCase();
        const matches = cName.includes(q) || iNames.includes(q) || type.includes(q) || pos.includes(q);
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        const st = (item.status || 'scheduled').toLowerCase();
        if (st !== statusFilter.toLowerCase()) return false;
      }

      // 3. Interview Type Filter
      if (typeFilter !== 'all') {
        const t = (item.interview_type || 'video').toLowerCase();
        if (t !== typeFilter.toLowerCase()) return false;
      }

      // 4. Round Filter
      if (roundFilter !== 'all') {
        const r = String(item.interview_round || item.interviewRound || 1);
        if (r !== roundFilter) return false;
      }

      return true;
    });
  }, [currentTabRawList, searchQuery, statusFilter, typeFilter, roundFilter]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5 text-[11px] rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2.5 py-0.5 text-[11px] rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-semibold px-2.5 py-0.5 text-[11px] rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3 text-rose-500" /> Cancelled</Badge>;
      case 'rescheduled':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold px-2.5 py-0.5 text-[11px] rounded-full flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> Rescheduled</Badge>;
      default:
    }
  };

  const getTypeBadge = (typeStr: string) => {
    const t = (typeStr || 'video').toLowerCase();
    if (t.includes('phone') || t.includes('call')) {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Phone className="w-3 h-3 text-purple-600" /> Phone Call
        </Badge>
      );
    }
    if (t.includes('person') || t.includes('office') || t.includes('in_person')) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Building2 className="w-3 h-3 text-emerald-600" /> In-Person
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
        <Video className="w-3 h-3 text-blue-600" /> Video Room
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'CD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/20 shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {isEmployeeView ? "My Assigned Interview Schedule" : "Interview Schedule & Scorecards"}
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
                {isEmployeeView ? "Employee Portal" : "Recruitment Desk"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isEmployeeView
                ? "Track your assigned candidate interviews, enter video rooms, and record performance ratings."
                : "Company-wide interview scheduling, panel assignments, video room links, and candidate rating scorecards."}
            </p>
          </div>
        </div>

        {/* Action Controls & Toggle */}
        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsGuidelinesOpen(true)}
            className="h-9 px-3.5 text-xs font-bold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-1.5 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Interviewer Guidelines</span>
          </Button>

          {/* Admin/HR only Toggle */}
          {!isEmployeeView && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => setAssignedOnly(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${assignedOnly
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <User className="w-3.5 h-3.5" /> My Assigned
              </button>
              <button
                type="button"
                onClick={() => setAssignedOnly(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${!assignedOnly
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Building2 className="w-3.5 h-3.5" /> All Company
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Stats Overview Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Today's Active Meetings</p>
              <p className="text-2xl font-black text-foreground">{activeTodayList.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Upcoming Schedule</p>
              <p className="text-2xl font-black text-foreground">{upcomingInterviews.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Mode</p>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {activeAssignedOnly ? "My Panel Assigned" : "Company Schedule"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content: Schedules ───────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Card 1: Today's Active Schedule & Next In Line */}
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/40 flex flex-row items-center justify-between py-4 px-6 border-b border-border/60">
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Today's Active Schedule ({filteredActiveToday.length})
            </CardTitle>
            {filteredPastToday.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPastToday(!showPastToday)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                {showPastToday ? "Hide" : "View"} Earlier Today ({filteredPastToday.length})
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {todayLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading today's schedule...</span>
                </div>
              </div>
            ) : filteredActiveToday.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <p className="font-medium">
                  {filteredPastToday.length > 0 
                    ? "All scheduled interviews for earlier today are completed." 
                    : (isEmployeeView ? "No active interviews assigned to you for today." : (assignedOnly ? "No active interviews directly assigned to you for today." : "No active interviews scheduled for today."))}
                </p>
                {filteredPastToday.length > 0 && !showPastToday && (
                  <button
                    onClick={() => setShowPastToday(true)}
                    className="text-primary hover:underline font-bold text-xs cursor-pointer block mx-auto mt-2"
                  >
                    📋 View Earlier Today & Pending Rating Interviews ({filteredPastToday.length})
                  </button>
                )}
                {!isEmployeeView && assignedOnly && (
                  <button
                    onClick={() => setAssignedOnly(false)}
                    className="text-primary hover:underline font-bold text-xs cursor-pointer"
                  >
                    🌐 Switch to View All Company Interviews
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredActiveToday.map((int: any, idx: number) => {
                  const candidateName = int.candidate_name || int.candidateName || int.name || (int.first_name ? `${int.first_name} ${int.last_name || ''}` : 'Candidate');
                  const initials = getInitials(candidateName);
                  const panelNames = int.interviewer_names || int.interviewerNames || int.interviewer || 'Assigned Panel';
                  const timeDisplay = formatMeetingTimeRange(int.scheduled_date || int.scheduledDate, int.interview_duration_minutes || int.durationMinutes);
                  const meetingUrl = int.meeting_url || int.meetingUrl || int.meeting_link || int.meetingLink || int.location || int.google_meet_link || int.zoom_link;

                  return (
                    <div key={int.id} className={`p-4 hover:bg-muted/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${idx === 0 ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/20 mt-0.5">
                          {initials}
                        </div>

                        <div className="space-y-1">
                          <div className="font-bold text-foreground text-sm flex items-center gap-2 flex-wrap">
                            {candidateName}
                            {idx === 0 && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Next In Line
                              </Badge>
                            )}
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              {int.interview_type || 'General'}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                              <Clock className="w-3.5 h-3.5" /> {timeDisplay}
                            </span>
                            <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-[11px]">
                              Round {int.interview_round || int.interviewRound || 1}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                              <User className="w-3 h-3 text-muted-foreground" /> Panel: {panelNames}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                        {meetingUrl ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const url = meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`;
                              window.open(url, '_blank');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 h-8 text-xs cursor-pointer shadow-xs rounded-xl"
                          >
                            <Video className="w-3.5 h-3.5" /> Join Room
                          </Button>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-medium px-2 py-1 rounded-lg">
                            No Video Link Set
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRatingModal(int.id, candidateName)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold flex items-center gap-1.5 h-8 text-xs cursor-pointer rounded-xl"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate & Feedback
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMarkCompleted(int.id, candidateName)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 h-8 text-xs cursor-pointer shadow-xs rounded-xl"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                        </Button>
                        {int.isOverdue && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Running Late / Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsible Section for Completed / Past Interviews */}
            {showPastToday && filteredPastToday.length > 0 && (
              <div className="border-t border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Completed & Past Interviews ({filteredPastToday.length})
                </p>
                <div className="divide-y divide-border/60">
                  {filteredPastToday.map((int: any) => {
                    const candidateName = int.candidate_name || int.candidateName || int.name || 'Candidate';
                    const panelNames = int.interviewer_names || int.interviewerNames || int.interviewer || 'Assigned Panel';
                    const timeDisplay = formatMeetingTimeRange(int.scheduled_date || int.scheduledDate, int.interview_duration_minutes || int.durationMinutes);
                    const meetingUrl = int.meeting_url || int.meetingUrl || int.meeting_link || int.meetingLink || int.location || int.google_meet_link || int.zoom_link;

                    return (
                      <div key={int.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-90 hover:opacity-100 transition-all">
                        <div>
                          <span className="font-bold text-xs text-foreground">{candidateName}</span>
                          <span className="text-[11px] text-muted-foreground ml-2">({timeDisplay}) • Panel: {panelNames}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {meetingUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const url = meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`;
                                window.open(url, '_blank');
                              }}
                              className="h-7 text-[11px] font-bold border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-1 cursor-pointer rounded-lg"
                            >
                              <Video className="w-3 h-3 text-blue-600" /> Meet Link
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRatingModal(int.id, candidateName)}
                            className="h-7 text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 rounded-lg font-bold"
                          >
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Rate & Feedback
                          </Button>
                          {getStatusBadge(int.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Interview Schedule & History Table */}
        <Card className="bg-card border-border/80 shadow-md rounded-2xl overflow-hidden">
          {/* Header Row: Title & Tab Switcher */}
          <CardHeader className="bg-muted/40 border-b border-border/60 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => setScheduleTab('upcoming')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    scheduleTab === 'upcoming'
                      ? 'bg-background text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Upcoming Schedule
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                    scheduleTab === 'upcoming' ? 'bg-primary/10 text-primary font-black' : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {upcomingList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleTab('past')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    scheduleTab === 'past'
                      ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  Past & Completed History
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                    scheduleTab === 'past' ? 'bg-emerald-500/10 text-emerald-600 font-black' : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}>
                    {pastList.length}
                  </span>
                </button>
              </div>

              {/* Company / Assigned Toggle */}
              {!isEmployeeView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignedOnly(!assignedOnly)}
                  className="h-8 text-xs font-bold border-border bg-background hover:bg-muted cursor-pointer rounded-xl flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  {assignedOnly ? 'Directly Assigned To Me' : 'Company Wide View'}
                </Button>
              )}
            </div>

            {/* Toolbar Row: Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search candidate, panel, position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 pr-7 bg-background border-border rounded-xl"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs bg-background border border-border rounded-xl px-2.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Type Filter Dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 text-xs bg-background border border-border rounded-xl px-2.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Interview Types</option>
                <option value="video">Video Call</option>
                <option value="phone">Phone Screening</option>
                <option value="in_person">In-Person</option>
              </select>

              {/* Round Filter Dropdown & Clear Button */}
              <div className="flex items-center gap-2">
                <select
                  value={roundFilter}
                  onChange={(e) => setRoundFilter(e.target.value)}
                  className="w-full h-8 text-xs bg-background border border-border rounded-xl px-2.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Rounds</option>
                  <option value="1">Round 1</option>
                  <option value="2">Round 2</option>
                  <option value="3">Round 3</option>
                  <option value="4">Round 4+</option>
                </select>

                {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || roundFilter !== 'all') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-8 px-2 text-[11px] text-muted-foreground hover:text-rose-600 cursor-pointer rounded-xl flex-shrink-0"
                    title="Reset Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 px-5">Candidate</TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 px-4">Type & Round</TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 px-4">Assigned Panel</TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 px-4">Scheduled Date & Time</TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 px-4">Status</TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right py-3.5 px-5">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {scheduleLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground bg-background">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading interview schedule...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredScheduleTable.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground">No interviews match your selected criteria.</p>
                        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || roundFilter !== 'all') ? (
                          <button onClick={clearFilters} className="text-primary hover:underline font-bold text-xs cursor-pointer">
                            Clear all filters
                          </button>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {scheduleTab === 'upcoming' ? 'No upcoming interviews scheduled.' : 'No past or completed interviews recorded.'}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScheduleTable.map((int: any) => {
                    const candidateName = int.candidate_name || int.candidateName || int.name || `Candidate #${int.candidate_id}`;
                    const initials = getInitials(candidateName);
                    const panelNames = int.interviewer_names || int.interviewerNames || int.interviewer || 'Assigned Panel';
                    const positionTitle = int.position_title || int.positionTitle || int.job_title || '';
                    const meetingUrl = int.meeting_url || int.meetingUrl || int.meeting_link || int.meetingLink || int.location || int.google_meet_link || int.zoom_link;

                    return (
                      <TableRow key={int.id} className="hover:bg-muted/40 transition-all">
                        {/* Candidate Cell */}
                        <TableCell className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground text-xs">{candidateName}</div>
                              {positionTitle ? (
                                <div className="text-[10px] font-semibold text-muted-foreground">{positionTitle}</div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground">Candidate ID: #{int.candidate_id || int.id}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type & Round Cell */}
                        <TableCell className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div>{getTypeBadge(int.interview_type)}</div>
                            <span className="inline-block font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px]">
                              Round {int.interview_round || int.interviewRound || 1}
                            </span>
                          </div>
                        </TableCell>

                        {/* Assigned Panel Cell */}
                        <TableCell className="py-3.5 px-4">
                          <span className="text-xs text-foreground font-semibold bg-muted px-2.5 py-1 rounded-lg border border-border inline-flex items-center gap-1.5">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {panelNames}
                          </span>
                        </TableCell>

                        {/* Scheduled Date & Time Cell */}
                        <TableCell className="py-3.5 px-4 text-xs text-foreground font-medium">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>{formatDateTime(int.scheduled_date || int.scheduledDate)}</span>
                          </div>
                        </TableCell>

                        {/* Status Cell */}
                        <TableCell className="py-3.5 px-4">
                          {getStatusBadge(int.status)}
                        </TableCell>

                        {/* Action Cell */}
                        <TableCell className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {meetingUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const url = meetingUrl.startsWith('http') ? meetingUrl : `https://${meetingUrl}`;
                                  window.open(url, '_blank');
                                }}
                                className="h-7 text-[11px] font-bold border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-1 cursor-pointer rounded-lg"
                              >
                                <Video className="w-3 h-3 text-blue-600" /> Join Link
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRatingModal(int.id, candidateName)}
                              className="h-7 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold flex items-center gap-1 cursor-pointer rounded-lg"
                            >
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {int.status === 'completed' ? 'Evaluation' : 'Rating'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>

      {/* ─── Interviewer Rating & Feedback Modal ────────────────────────── */}
      <Dialog open={ratingModal.isOpen} onOpenChange={(open) => setRatingModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-[480px] bg-white rounded-xl shadow-2xl p-6 text-slate-700 border border-slate-200">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Interview Rating & Feedback — {ratingModal.candidateName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Overall Rating Star Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Overall Performance Rating (1 to 5 Stars)</label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingModal(prev => ({ ...prev, overallRating: star }))}
                    className="p-1 cursor-pointer transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-6 h-6 ${star <= ratingModal.overallRating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                        }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-amber-600 text-sm">{ratingModal.overallRating} / 5 Stars</span>
              </div>
            </div>

            {/* Recommendation Radio Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Hiring Recommendation</label>
              <select
                value={ratingModal.recommendation}
                onChange={(e) => setRatingModal(prev => ({ ...prev, recommendation: e.target.value as any }))}
                className="w-full h-9 border border-slate-300 rounded-lg px-2.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="strong_hire">Strong Hire — Highly Recommended</option>
                <option value="hire">Hire — Recommended</option>
                <option value="neutral">Neutral — Borderline</option>
                <option value="do_not_hire">Do Not Hire — Not Recommended</option>
              </select>
            </div>

            {/* Technical Score & Communication Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-[11px]">Technical Score (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingModal.technicalScore}
                  onChange={(e) => setRatingModal(prev => ({ ...prev, technicalScore: parseInt(e.target.value) || 1 }))}
                  className="w-full h-8 border border-slate-300 rounded-lg px-2 bg-white text-slate-800 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block text-[11px]">Communication Score (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingModal.communicationScore}
                  onChange={(e) => setRatingModal(prev => ({ ...prev, communicationScore: parseInt(e.target.value) || 1 }))}
                  className="w-full h-8 border border-slate-300 rounded-lg px-2 bg-white text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* Comments / Detailed Feedback */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Interviewer Observations & Detailed Feedback</label>
              <textarea
                rows={3}
                placeholder="Enter technical observations, strengths, areas of improvement..."
                value={ratingModal.feedbackText}
                onChange={(e) => setRatingModal(prev => ({ ...prev, feedbackText: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}
              className="h-8 text-xs cursor-pointer rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={ratingModal.isSubmitting}
              onClick={handleRatingSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-8 text-xs px-4 cursor-pointer shadow-sm rounded-lg"
            >
              {ratingModal.isSubmitting ? 'Submitting...' : 'Submit Rating & Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Interviewer Guidelines Modal / Popup ────────────────────────── */}
      <Dialog open={isGuidelinesOpen} onOpenChange={setIsGuidelinesOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl shadow-2xl p-6 text-slate-700 border border-slate-200">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <span>Interviewer Guidelines</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs leading-relaxed">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/80 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px]">1</span>
                Prepare Feedback Scorecard
              </p>
              <p className="pl-7 text-[11px] text-slate-600">
                Provide clear observations, key technical strengths, growth areas, and score ratings immediately after completing the candidate interview round.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
              <p className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px]">2</span>
                Record Hiring Decision
              </p>
              <p className="pl-7 text-[11px] text-slate-600">
                Final recruiter decision is compiled once all panel interviewers submit their respective rating scorecards.
              </p>
            </div>

            {/* Meeting Room Assistance */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-600" /> Meeting Room Assistance
              </p>
              <p className="pl-5 text-slate-500">
                Facing video link or room connectivity issues? Contact HR recruitment panel desk.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              type="button"
              onClick={() => setIsGuidelinesOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-xs px-5 rounded-lg cursor-pointer shadow-xs"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
