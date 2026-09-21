import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, CheckCircle2, XCircle, PauseCircle, Clock, AlertCircle, Star, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';

export const InterviewerRatingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Rating Modal state
  const [submitRatingModal, setSubmitRatingModal] = useState({
    isOpen: false,
    interviewId: '',
    candidateName: '',
    overallRating: 5,
    technicalScore: 4,
    communicationScore: 4,
    recommendation: 'hire',
    feedbackText: '',
    isSubmitting: false,
  });

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    interviewId: number | null;
    candidateName: string;
    decision: 'advance' | 'reject' | 'hold';
    notes: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    interviewId: null,
    candidateName: '',
    decision: 'advance',
    notes: '',
    isSubmitting: false,
  });

  const loadData = () => {
    setLoading(true);
    apiClient.get('/recruitment/interviews/feedback')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped = res.data.data.map((item: any) => {
            const rawDate = item.createdAt || item.created_at || item.submittedAt || item.submitted_at || '';
            let dateStr = 'N/A';
            if (rawDate) {
              try {
                const d = new Date(rawDate);
                dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : String(rawDate).split('T')[0];
              } catch (e) {
                dateStr = String(rawDate).split('T')[0];
              }
            }

            return {
              id: item.id,
              interviewId: item.interviewId || item.interview_id,
              applicationId: item.applicationId || item.application_id,
              candidateName: item.candidateName || item.candidate_name || 'N/A',
              contact: item.candidatePhone || item.candidate_phone || item.contact || 'N/A',
              email: item.candidateEmail || item.candidate_email || item.email || 'N/A',
              interviewerName: item.interviewerName || item.interviewer_name || item.interviewer || 'N/A',
              rating: item.overallRating || item.overall_rating || item.rating || 0,
              technicalRating: item.technicalRating || item.technical_rating || item.technicalScore,
              communicationRating: item.communicationRating || item.communication_rating || item.communicationScore,
              feedback: item.feedbackText || item.feedback_text || item.feedback || item.comments || 'No comment',
              wouldRecommend: item.wouldRecommend !== undefined ? item.wouldRecommend : item.would_recommend,
              interviewStatus: item.interviewStatus || item.interview_status || 'completed',
              interviewRound: item.interviewRound || item.interview_round || 1,
              applicationStatus: item.applicationStatus || item.application_status || 'interview',
              interviewDecision: item.interviewDecision || item.interview_decision || null,
              date: dateStr
            };
          });
          setData(mapped);
        }
      })
      .catch(err => {
        setData([]);
        if (import.meta.env.DEV && err?.response?.status !== 403) {
          console.warn('Unable to load ratings list:', err?.message || err);
        }
      })
      .finally(() => setLoading(false));
  };

  const [roundFilter, setRoundFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchTerm('');
    setRoundFilter('all');
    setCurrentPage(1);
  };

  const openDecisionModal = (interviewId: number, candidateName: string, decision: 'advance' | 'reject' | 'hold') => {
    setActionModal({
      isOpen: true,
      interviewId,
      candidateName,
      decision,
      notes: '',
      isSubmitting: false,
    });
  };

  const submitDecision = async () => {
    if (!actionModal.interviewId) return;

    setActionModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      await apiClient.post(`/recruitment/interviews/${actionModal.interviewId}/decision`, {
        decision: actionModal.decision,
        notes: actionModal.notes,
      });

      setActionModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
      loadData();
    } catch (err: any) {
      console.error('Failed to submit interview decision', err);
      window.appAlert(err.response?.data?.message || 'Failed to submit interview decision');
      setActionModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Live filter computation
  const filteredData = useMemo(() => {
    return data.filter(rating => {
      if (roundFilter !== 'all' && String(rating.interviewRound) !== String(roundFilter)) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const lowerTerm = searchTerm.toLowerCase();
      return (
        rating.candidateName.toLowerCase().includes(lowerTerm) ||
        rating.contact.includes(lowerTerm) ||
        rating.email.toLowerCase().includes(lowerTerm) ||
        rating.interviewerName.toLowerCase().includes(lowerTerm)
      );
    });
  }, [searchTerm, roundFilter, data]);

  const handleExport = () => {
    const headers = ['Candidate Name', 'Round', 'Contact Number', 'Email ID', 'Interviewer Name', 'Rating', 'Feedback', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(r => `"${r.candidateName}","Round ${r.interviewRound}","${r.contact}","${r.email}","${r.interviewerName}","${r.rating}","${r.feedback}","${r.interviewStatus}","${r.date}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interviewer_ratings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination calculations
  const totalEntries = filteredData.length;
  const pageSizeNumber = parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSizeNumber));
  
  const startIndex = (currentPage - 1) * pageSizeNumber;
  const endIndex = Math.min(startIndex + pageSizeNumber, totalEntries);
  
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="recruitment-page flex-1 min-w-0 space-y-4">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="recruitment-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 shadow-xs">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Interviewer Rating & Scorecards
            </h1>
            <p className="text-xs text-muted-foreground">
              Review candidate ratings, technical & communication scores, and record final hiring decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto">
          <Button 
            onClick={() => setSubmitRatingModal({
              isOpen: true,
              interviewId: '',
              candidateName: '',
              overallRating: 5,
              technicalScore: 4,
              communicationScore: 4,
              recommendation: 'hire',
              feedbackText: '',
              isSubmitting: false,
            })} 
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Submit Scorecard
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Filters Section ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="space-y-1.5 flex-1 w-full">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Search Feedback</label>
              <Input 
                placeholder="Search candidate, phone, email, or interviewer..."
                value={searchTerm} 
                onChange={(e) => handleSearchChange(e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl w-full"
              />
            </div>

            <div className="space-y-1.5 w-full md:w-56">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Interview Round</label>
              <select
                value={roundFilter}
                onChange={(e) => {
                  setRoundFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 text-xs bg-background border border-border rounded-xl px-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold text-foreground cursor-pointer"
              >
                <option value="all">All Rounds</option>
                <option value="1">Round 1 (Technical / Screening)</option>
                <option value="2">Round 2 (Managerial / Coding)</option>
                <option value="3">Round 3 (Executive / HR)</option>
                <option value="4">Round 4</option>
                <option value="5">Round 5</option>
              </select>
            </div>

            <div className="w-full md:w-auto">
              <Button onClick={handleReset} variant="outline" className="h-9 px-4 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground w-full md:w-auto">
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Results Section ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/60 gap-4">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Candidate Feedback & Decision Actions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} records</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Show</span>
            <Select value={pageSize} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-8 w-20 text-xs bg-background border-border rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground font-medium">entries</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1100px] border-collapse">
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground whitespace-nowrap">Candidate</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Contact & Email</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Interviewer</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap text-center">Scorecard</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground max-w-xs">Feedback Remarks</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap text-center">Interview State</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground whitespace-nowrap text-right">Actions / Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading feedback records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((rating) => {
                    const isDecisionMade = Boolean(rating.interviewDecision) || rating.applicationStatus === 'offer' || rating.applicationStatus === 'hired' || rating.applicationStatus === 'rejected';
                    const initials = (rating.candidateName || 'CA').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <TableRow key={rating.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-xs">{rating.candidateName}</div>
                              <span className="text-[10px] text-primary font-bold">Round {rating.interviewRound}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                          <div className="text-xs font-mono">{rating.contact}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{rating.email}</div>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-xs font-semibold text-foreground">{rating.interviewerName}</TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                            {rating.rating} <Star className="w-3 h-3 fill-amber-500" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 max-w-xs">
                          <p className="text-xs text-foreground truncate font-medium" title={rating.feedback}>{rating.feedback}</p>
                          <span className="text-[10px] text-muted-foreground font-mono">Date: {rating.date}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 whitespace-nowrap text-center">
                          {isDecisionMade ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Decision: {rating.interviewDecision || rating.applicationStatus}
                            </span>
                          ) : rating.interviewStatus === 'completed' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Feedback In — Decision Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Feedback Submitted
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-5 whitespace-nowrap text-right">
                          {isDecisionMade ? (
                            <span className="text-xs text-muted-foreground font-medium italic">Completed</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => openDecisionModal(rating.interviewId, rating.candidateName, 'advance')}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 rounded-lg shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Advance
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDecisionModal(rating.interviewId, rating.candidateName, 'reject')}
                                className="h-7 px-2.5 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold flex items-center gap-1 rounded-lg cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDecisionModal(rating.interviewId, rating.candidateName, 'hold')}
                                className="h-7 px-2.5 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold flex items-center gap-1 rounded-lg cursor-pointer"
                              >
                                <PauseCircle className="w-3 h-3" /> Hold
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      No feedback records found matching the criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalEntries > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground gap-3">
                <div className="font-medium">
                  Page <span className="font-bold text-foreground">{currentPage}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-xl border-border hover:bg-muted text-foreground disabled:opacity-40"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-xl border-border hover:bg-muted text-foreground disabled:opacity-40"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decision Confirmation Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              {actionModal.decision === 'advance' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {actionModal.decision === 'reject' && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
              {actionModal.decision === 'hold' && <PauseCircle className="w-5 h-5 text-amber-600 shrink-0" />}
              <h3 className="text-base font-bold text-slate-800">
                {actionModal.decision === 'advance' && 'Advance Candidate to Offer'}
                {actionModal.decision === 'reject' && 'Reject Candidate Application'}
                {actionModal.decision === 'hold' && 'Put Application on Hold'}
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Candidate: <span className="font-semibold text-slate-800">{actionModal.candidateName}</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {actionModal.decision === 'reject' ? 'Rejection Reason (Optional)' : 'Review Notes (Optional)'}
              </label>
              <Textarea
                placeholder={
                  actionModal.decision === 'advance' ? 'e.g., Recommended for Senior Developer position at ₹12,00,000 (₹12 LPA)' :
                  actionModal.decision === 'reject' ? 'e.g., Needs more hands-on microservices architecture experience' :
                  'e.g., Strong candidate, awaiting completion of other interview slots'
                }
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                className="text-xs min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                disabled={actionModal.isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submitDecision}
                disabled={actionModal.isSubmitting}
                className={`text-xs text-white ${
                  actionModal.decision === 'advance' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  actionModal.decision === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {actionModal.isSubmitting ? 'Recording...' : `Confirm ${actionModal.decision.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Rating & Feedback Modal */}
      {submitRatingModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Submit Interviewer Rating & Feedback
              </h3>
              <button 
                onClick={() => setSubmitRatingModal(prev => ({ ...prev, isOpen: false }))} 
                className="text-slate-400 hover:text-slate-600 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Interview Record ID or Candidate Name</label>
                <Input
                  placeholder="Enter Interview ID (e.g. 1, 2) or Candidate Name"
                  value={submitRatingModal.interviewId}
                  onChange={(e) => setSubmitRatingModal(prev => ({ ...prev, interviewId: e.target.value }))}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Overall Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSubmitRatingModal(prev => ({ ...prev, overallRating: star }))}
                      className="p-1 cursor-pointer transition-transform hover:scale-125"
                    >
                      <Star 
                        className={`w-5 h-5 ${
                          star <= submitRatingModal.overallRating 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-slate-300'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-600 text-xs">{submitRatingModal.overallRating} / 5 Stars</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Hiring Recommendation</label>
                <select
                  value={submitRatingModal.recommendation}
                  onChange={(e) => setSubmitRatingModal(prev => ({ ...prev, recommendation: e.target.value as any }))}
                  className="w-full h-8 border border-slate-300 rounded px-2 bg-white text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="strong_hire">Strong Hire — Highly Recommended</option>
                  <option value="hire">Hire — Recommended</option>
                  <option value="neutral">Neutral — Borderline</option>
                  <option value="do_not_hire">Do Not Hire — Not Recommended</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[10px]">Technical Score (1-5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={submitRatingModal.technicalScore}
                    onChange={(e) => setSubmitRatingModal(prev => ({ ...prev, technicalScore: parseInt(e.target.value) || 1 }))}
                    className="h-7 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-[10px]">Communication Score (1-5)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={submitRatingModal.communicationScore}
                    onChange={(e) => setSubmitRatingModal(prev => ({ ...prev, communicationScore: parseInt(e.target.value) || 1 }))}
                    className="h-7 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Detailed Feedback / Comments</label>
                <Textarea
                  rows={3}
                  placeholder="Enter candidate observations, technical strengths & weaknesses..."
                  value={submitRatingModal.feedbackText}
                  onChange={(e) => setSubmitRatingModal(prev => ({ ...prev, feedbackText: e.target.value }))}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubmitRatingModal(prev => ({ ...prev, isOpen: false }))}
                disabled={submitRatingModal.isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submitRatingModal.isSubmitting || !submitRatingModal.interviewId}
                onClick={async () => {
                  setSubmitRatingModal(prev => ({ ...prev, isSubmitting: true }));
                  try {
                    await apiClient.post('/recruitment/interviews/feedback', {
                      interviewId: parseInt(submitRatingModal.interviewId, 10) || 1,
                      overallRating: submitRatingModal.overallRating,
                      technicalScore: submitRatingModal.technicalScore,
                      communicationScore: submitRatingModal.communicationScore,
                      wouldRecommend: submitRatingModal.recommendation === 'strong_hire' || submitRatingModal.recommendation === 'hire',
                      feedbackText: submitRatingModal.feedbackText || 'Technical round evaluation completed.',
                      comments: submitRatingModal.feedbackText
                    });
                    setSubmitRatingModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
                    loadData();
                  } catch (err: any) {
                    window.appAlert(err.response?.data?.message || 'Failed to submit rating feedback');
                    setSubmitRatingModal(prev => ({ ...prev, isSubmitting: false }));
                  }
                }}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {submitRatingModal.isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

