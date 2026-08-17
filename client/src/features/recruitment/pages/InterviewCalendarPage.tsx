import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Video, Clock, User, Star, Search, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, Filter, Building2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export const InterviewCalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user } = useAuthStore();

  const userRole = (user as any)?.role || '';
  const userRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];

  const isAdminOrHr = userRole === 'organization_admin' || 
                      userRole === 'hr_manager' || 
                      userRole === 'admin' || 
                      userRole === 'hr' ||
                      userRoles.includes('organization_admin') || 
                      userRoles.includes('hr_manager');

  const isEmployeeView = !isAdminOrHr || location.pathname.startsWith('/employee');

  const [searchQuery, setSearchQuery] = useState('');

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

  const [assignedOnly, setAssignedOnly] = useState(false);
  const activeAssignedOnly = isEmployeeView ? true : assignedOnly;

  // Query today's interviews
  const { data: todayResponse, isLoading: todayLoading } = useQuery({
    queryKey: ['interviews-today', activeAssignedOnly],
    queryFn: async () => {
      const res = await api.get('/recruitment/interviews/today', {
        params: { assignedOnly: activeAssignedOnly ? 'true' : 'false' }
      });
      return res.data?.data || [];
    }
  });

  // Query upcoming interview schedule
  const { data: scheduleResponse, isLoading: scheduleLoading } = useQuery({
    queryKey: ['interviews-schedule', activeAssignedOnly],
    queryFn: async () => {
      const res = await api.get('/recruitment/interviews/schedule', {
        params: { assignedOnly: activeAssignedOnly ? 'true' : 'false' }
      });
      return res.data?.data || [];
    }
  });

  const todayInterviews: any[] = todayResponse || [];
  const upcomingInterviews: any[] = scheduleResponse || [];

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

  const filteredToday = filterListBySearch(todayInterviews);
  const filteredUpcoming = filterListBySearch(upcomingInterviews);

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
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-medium px-2 py-0.5 text-[11px] rounded-full">{status || 'Scheduled'}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'CD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEmployeeView ? "My Assigned Interview Schedule" : "Interview Schedule & Rating Portal"}
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2.5 py-0.5">
              {isEmployeeView ? "Employee Portal" : "Recruitment Desk"}
            </Badge>
          </div>
          <p className="text-slate-500 text-xs md:text-sm">
            {isEmployeeView 
              ? "Track your assigned candidate interviews, enter video rooms, and record performance ratings." 
              : "Company-wide interview scheduling, panel member assignments, video links, and scorecard feedback."}
          </p>
        </div>

        {/* Admin/HR only Toggle */}
        {!isEmployeeView && (
          <div className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto relative z-10">
            <button
              type="button"
              onClick={() => setAssignedOnly(true)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                assignedOnly 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <User className="w-3.5 h-3.5" /> My Assigned
            </button>
            <button
              type="button"
              onClick={() => setAssignedOnly(false)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                !assignedOnly 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> All Company
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Meetings</p>
            <p className="text-2xl font-bold text-slate-900">{todayInterviews.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Schedule</p>
            <p className="text-2xl font-bold text-slate-900">{upcomingInterviews.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Mode</p>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              {activeAssignedOnly ? "My Panel Assigned" : "Company Schedule"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Schedules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Today's Schedule */}
          <Card className="border border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 flex flex-row items-center justify-between py-3.5 px-5 border-b border-slate-200/70">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Today's Interviews ({todayInterviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {todayLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading today's schedule...</div>
              ) : filteredToday.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <p className="font-medium">{isEmployeeView ? "No interviews assigned to you for today." : (assignedOnly ? "No interviews directly assigned to you for today." : "No interviews scheduled for today.")}</p>
                  {!isEmployeeView && assignedOnly && (
                    <button 
                      onClick={() => setAssignedOnly(false)}
                      className="text-blue-600 hover:underline font-bold text-xs cursor-pointer"
                    >
                      🌐 Switch to View All Company Interviews
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredToday.map((int: any) => {
                    const candidateName = int.candidate_name || int.candidateName || int.name || (int.first_name ? `${int.first_name} ${int.last_name || ''}` : 'Candidate');
                    const initials = getInitials(candidateName);
                    const panelNames = int.interviewer_names || int.interviewer || 'Unassigned';

                    return (
                      <div key={int.id} className="p-4 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar Circle */}
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs border border-indigo-200/60 mt-0.5">
                            {initials}
                          </div>

                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {candidateName}
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase tracking-wider border border-slate-200/60">
                                {int.interview_type || 'General'}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="flex items-center gap-1 font-medium text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> {int.scheduled_date || int.scheduledDate || 'N/A'}
                              </span>
                              <span className="font-medium text-slate-600">Round {int.interview_round || int.interviewRound || 1}</span>
                              <span className="flex items-center gap-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                <User className="w-3 h-3 text-slate-400" /> Panel: {panelNames}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {int.meeting_url && (
                            <Button 
                              size="sm" 
                              onClick={() => window.open(int.meeting_url)} 
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 h-8 text-xs cursor-pointer shadow-sm rounded-lg"
                            >
                              <Video className="w-3.5 h-3.5" /> Join Room
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openRatingModal(int.id, candidateName)} 
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 font-semibold flex items-center gap-1.5 h-8 text-xs cursor-pointer rounded-lg"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Rate & Feedback
                          </Button>
                          {getStatusBadge(int.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Upcoming Interviews Table */}
          <Card className="border border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-5 border-b border-slate-200/70">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Upcoming Interview Schedule ({filteredUpcoming.length})
              </CardTitle>

              {/* Search Filter Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search candidate or panel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 pr-2 bg-white border-slate-200 rounded-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/90">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3">Candidate</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3">Type & Round</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3">Assigned Panel</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3">Scheduled Date</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-3">Status</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right py-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {scheduleLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        Loading upcoming schedule...
                      </TableCell>
                    </TableRow>
                  ) : filteredUpcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                        {isEmployeeView ? (
                          <p className="font-medium">No upcoming interviews assigned to you.</p>
                        ) : (assignedOnly ? (
                          <div className="space-y-1.5">
                            <p className="font-medium">No upcoming interviews directly assigned to you.</p>
                            <button onClick={() => setAssignedOnly(false)} className="text-blue-600 hover:underline font-bold text-xs cursor-pointer">🌐 Switch to View All Company Interviews</button>
                          </div>
                        ) : "No upcoming interviews scheduled.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUpcoming.map((int: any) => {
                      const candidateName = int.candidate_name || int.candidateName || int.name || `Candidate #${int.candidate_id}`;
                      const initials = getInitials(candidateName);
                      const panelNames = int.interviewer_names || int.interviewer || 'Unassigned';

                      return (
                        <TableRow key={int.id} className="hover:bg-slate-50/80 transition-all">
                          {/* Candidate Cell */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0 border border-slate-200/80">
                                {initials}
                              </div>
                              <span className="font-bold text-slate-900 text-xs">{candidateName}</span>
                            </div>
                          </TableCell>

                          {/* Round & Type Cell */}
                          <TableCell className="py-3">
                            <div className="text-xs space-y-0.5">
                              <div className="font-semibold text-slate-800 capitalize">{int.interview_type || 'General'}</div>
                              <div className="text-[11px] text-slate-500 font-medium">Round {int.interview_round || int.interviewRound || 1}</div>
                            </div>
                          </TableCell>

                          {/* Assigned Panel Cell */}
                          <TableCell className="py-3">
                            <span className="text-xs text-slate-700 font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200/60 inline-block">
                              {panelNames}
                            </span>
                          </TableCell>

                          {/* Scheduled Date Cell */}
                          <TableCell className="py-3 text-xs text-slate-600 font-medium">
                            {int.scheduled_date || int.scheduledDate || 'N/A'}
                          </TableCell>

                          {/* Status Cell */}
                          <TableCell className="py-3">
                            {getStatusBadge(int.status)}
                          </TableCell>

                          {/* Actions Cell */}
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {int.meeting_url && (
                                <Button size="sm" variant="outline" onClick={() => window.open(int.meeting_url)} className="h-7 text-[11px] font-bold border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1 cursor-pointer rounded-md">
                                  <Video className="w-3 h-3 text-blue-600" /> Join Link
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openRatingModal(int.id, candidateName)} 
                                className="h-7 text-[11px] bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-bold flex items-center gap-1 cursor-pointer rounded-md"
                              >
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Rating
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

        {/* Right Column: Guidelines */}
        <div className="space-y-6">
          <Card className="border border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/60 py-3.5 px-5 border-b border-slate-200/70">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Interviewer Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-[10px]">1</span>
                  Prepare Feedback Scorecard
                </p>
                <p className="pl-6 text-[11px] text-slate-500">Provide clear observations and score ratings immediately after completing the candidate interview round.</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-[10px]">2</span>
                  Record Hiring Decision
                </p>
                <p className="pl-6 text-[11px] text-slate-500">Final recruiter decision is compiled once all panel interviewers submit their respective rating scorecards.</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-blue-600" /> Meeting Room Assistance
                </p>
                <p className="text-slate-500">Facing video link or room connectivity issues? Contact HR recruitment panel desk.</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                      className={`w-6 h-6 ${
                        star <= ratingModal.overallRating 
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
    </div>
  );
};
