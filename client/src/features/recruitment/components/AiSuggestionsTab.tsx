import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, Search, UserCheck, Eye, RefreshCw, CheckCircle2, 
  AlertTriangle, XCircle, ArrowUpDown, Filter, Award, ChevronRight, Briefcase, FileText, Download
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AiAnalysisModal } from './AiAnalysisModal';

interface AiSuggestionsTabProps {
  initialJobId?: string | number;
}

export const AiSuggestionsTab: React.FC<AiSuggestionsTabProps> = ({ initialJobId }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId ? String(initialJobId) : '');
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [isShortlistingBulk, setIsShortlistingBulk] = useState(false);

  // Filters
  const [limitFilter, setLimitFilter] = useState<string>('50');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [selectedCandidateForModal, setSelectedCandidateForModal] = useState<any | null>(null);
  const [selectedModalTab, setSelectedModalTab] = useState<'analysis' | 'cv'>('analysis');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Fetch all Jobs
  useEffect(() => {
    apiClient.get('/recruitment/jobs?pageSize=100')
      .then(res => {
        let items: any[] = [];
        if (Array.isArray(res.data?.data)) items = res.data.data;
        else if (Array.isArray(res.data?.data?.items)) items = res.data.data.items;
        else if (Array.isArray(res.data)) items = res.data;

        setJobs(items);
        if (!selectedJobId && items.length > 0) {
          setSelectedJobId(String(items[0].id));
        }
      })
      .catch(err => {
        console.error('Failed to load jobs', err);
      });
  }, []);

  // Fetch AI Suggestions when selected job, limit, or status changes
  const fetchSuggestions = () => {
    if (!selectedJobId) return;
    setIsLoading(true);

    apiClient.get(`/recruitment/jobs/${selectedJobId}/ai-suggestions`, {
      params: {
        limit: limitFilter,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
      }
    })
      .then(res => {
        if (res.data?.success && res.data.data) {
          setData(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load AI suggestions', err);
        toast.error('Failed to load AI screening suggestions');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchSuggestions();
    }
  }, [selectedJobId, limitFilter, statusFilter]);

  // Run or re-run AI screening on all candidates
  const handleRunScreening = async () => {
    if (!selectedJobId) return;
    setIsScreening(true);
    try {
      const res = await apiClient.post(`/recruitment/jobs/${selectedJobId}/ai-screen`);
      toast.success(res.data?.message || 'AI Screening completed successfully');
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to run AI screening', err);
      toast.error(err?.response?.data?.message || 'Failed to trigger AI screening');
    } finally {
      setIsScreening(false);
    }
  };

  // Bulk Shortlist All Eligible Candidates
  const handleShortlistAllEligible = async () => {
    if (!selectedJobId || !data?.suggestions) return;
    const eligibleIds = data.suggestions
      .filter((c: any) => c.isEligible && !c.isShortlisted)
      .map((c: any) => c.candidateId);

    if (eligibleIds.length === 0) {
      toast.info('No un-shortlisted eligible candidates found in the current view.');
      return;
    }

    setIsShortlistingBulk(true);
    try {
      const res = await apiClient.post(`/recruitment/jobs/${selectedJobId}/ai-bulk-shortlist`, {
        candidateIds: eligibleIds,
      });
      toast.success(res.data?.message || `Successfully shortlisted ${eligibleIds.length} candidate(s)`);
      fetchSuggestions();
    } catch (err: any) {
      console.error('Failed to bulk shortlist', err);
      toast.error(err?.response?.data?.message || 'Failed to bulk shortlist candidates');
    } finally {
      setIsShortlistingBulk(false);
    }
  };

  const stats = data?.stats;
  const settings = data?.settings;
  const suggestions = data?.suggestions || [];

  // Filter by local search query
  const filteredSuggestions = suggestions.filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.skills?.toLowerCase().includes(q) ||
      item.currentCompany?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Controls: Job Selector + Global Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Job Opening</label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="h-9 w-[260px] md:w-[320px] text-xs font-medium bg-background border-border">
                <SelectValue placeholder="Choose a Job Opening" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)} className="text-xs">
                    {job.job_title || job.jobTitle} ({job.job_code || job.jobCode || `JOB-${job.id}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScreening}
            disabled={isScreening || !selectedJobId}
            className="h-9 text-xs font-medium border-border"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isScreening && "animate-spin text-indigo-600")} />
            {isScreening ? 'Running AI Screening...' : 'Re-run Screening'}
          </Button>

          <Button
            size="sm"
            onClick={handleShortlistAllEligible}
            disabled={isShortlistingBulk || !selectedJobId || (stats?.totalEligible || 0) === 0}
            className="h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            {isShortlistingBulk ? 'Shortlisting...' : `Shortlist All Eligible (${stats?.totalEligible || 0})`}
          </Button>
        </div>
      </div>

      {/* AI Screening Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Candidates Analyzed */}
        <Card className="rounded-lg shadow-none border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Candidates Analyzed</p>
            <p className="text-2xl font-extrabold text-foreground">{stats?.totalAnalyzed ?? 0}</p>
            <p className="text-[10px] text-muted-foreground font-mono">In organization pool</p>
          </CardContent>
        </Card>

        {/* Card 2: ATS Threshold */}
        <Card className="rounded-lg shadow-none border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ATS Threshold</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {stats?.atsThreshold ?? 85}%
              </p>
              <span className="text-xs font-bold text-emerald-600">
                ({stats?.totalAtsPassed ?? 0} Passed)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">Min ATS score rule</p>
          </CardContent>
        </Card>

        {/* Card 3: JD Match Threshold */}
        <Card className="rounded-lg shadow-none border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">JD Match Threshold</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {stats?.jdMatchThreshold ?? 80}%
              </p>
              <span className="text-xs font-bold text-emerald-600">
                ({stats?.totalJdMatchPassed ?? 0} Passed)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">Min JD match rule</p>
          </CardContent>
        </Card>

        {/* Card 4: AI Shortlisted / Eligible */}
        <Card className="rounded-lg shadow-none border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Eligible / Shortlisted</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {stats?.totalEligible ?? 0}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">
              {stats?.totalShortlisted ?? 0} in pipeline
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Review Required */}
        <Card className="rounded-lg shadow-none border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Review Required</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
              {stats?.totalReview ?? 0}
            </p>
            <p className="text-[10px] text-amber-600 font-medium">Near threshold cutoff</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Ranking Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border">
        {/* Preset Limit Buttons: [Top 5] [Top 50] [Top 100] [All] */}
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Suggestions:</span>
          {['5', '50', '100', 'all'].map((lim) => (
            <Button
              key={lim}
              variant={limitFilter === lim ? "default" : "outline"}
              size="sm"
              onClick={() => setLimitFilter(lim)}
              className={cn(
                "h-7 px-3 text-xs font-medium rounded-md",
                limitFilter === lim && "bg-primary text-primary-foreground font-bold shadow-sm"
              )}
            >
              {lim === 'all' ? 'All Candidates' : `Top ${lim}`}
            </Button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
            <Input
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-8 text-xs bg-background border-border"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-32 text-xs bg-background border-border">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="eligible" className="text-xs">Eligible</SelectItem>
              <SelectItem value="shortlisted" className="text-xs">Shortlisted</SelectItem>
              <SelectItem value="review" className="text-xs">Review</SelectItem>
              <SelectItem value="below threshold" className="text-xs">Below Threshold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ranked Suggestions Table */}
      <Card className="rounded-lg shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-center text-xs font-bold uppercase">Rank</TableHead>
                <TableHead className="text-xs font-bold uppercase">Candidate Name</TableHead>
                <TableHead className="text-xs font-bold uppercase">Current Company & Exp</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase w-28">
                  ATS Score
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase w-28">
                  JD Match
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase w-24">Final Fit</TableHead>
                <TableHead className="text-center text-xs font-bold uppercase">Screening Status</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Computing ATS and JD match rankings...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                    No candidate matches found for this job and filter selection.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuggestions.map((candidate: any) => {
                  const isEligible = candidate.isEligible;
                  const isShortlisted = candidate.isShortlisted;
                  const isReview = candidate.status === 'Review';

                  return (
                    <TableRow key={candidate.candidateId} className="hover:bg-muted/30 transition-colors">
                      {/* Rank */}
                      <TableCell className="text-center font-mono font-bold text-xs text-foreground">
                        <span className={cn(
                          "w-6 h-6 rounded-full inline-flex items-center justify-center",
                          candidate.rank === 1 ? "bg-amber-100 text-amber-900 border border-amber-300 font-extrabold" :
                          candidate.rank === 2 ? "bg-slate-200 text-slate-800" :
                          candidate.rank === 3 ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground"
                        )}>
                          #{candidate.rank}
                        </span>
                      </TableCell>

                      {/* Candidate Name & Info */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCandidateForModal(candidate);
                              setSelectedModalTab('analysis');
                              setIsAnalysisModalOpen(true);
                            }}
                          >
                            {candidate.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{candidate.email}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateForModal(candidate);
                              setSelectedModalTab('cv');
                              setIsAnalysisModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold hover:underline cursor-pointer pt-0.5"
                          >
                            <FileText className="w-3 h-3" /> View Uploaded CV
                          </button>
                        </div>
                      </TableCell>

                      {/* Company & Experience */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs text-foreground font-medium">{candidate.currentCompany || 'Fresher / Independent'}</p>
                          <p className="text-[11px] text-muted-foreground">{candidate.experience} • {candidate.qualification || 'Graduate'}</p>
                        </div>
                      </TableCell>

                      {/* ATS Score (Separated Layer 1) */}
                      <TableCell className="text-center">
                        <div className="space-y-1 inline-block text-center">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-extrabold border",
                            candidate.atsScore >= (settings?.atsThreshold || 85)
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : candidate.atsScore >= (settings?.atsThreshold || 85) - 15
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          )}>
                            {candidate.atsScore}%
                          </span>
                          <div className="w-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                            <div
                              className={cn(
                                "h-1 rounded-full",
                                candidate.atsScore >= 85 ? "bg-emerald-500" : candidate.atsScore >= 70 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${candidate.atsScore}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* JD Match Score (Separated Layer 2) */}
                      <TableCell className="text-center">
                        <div className="space-y-1 inline-block text-center">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-extrabold border",
                            candidate.jdMatchScore >= (settings?.jdMatchThreshold || 80)
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : candidate.jdMatchScore >= (settings?.jdMatchThreshold || 80) - 15
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          )}>
                            {candidate.jdMatchScore}%
                          </span>
                          <div className="w-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                            <div
                              className={cn(
                                "h-1 rounded-full",
                                candidate.jdMatchScore >= 80 ? "bg-emerald-500" : candidate.jdMatchScore >= 65 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${candidate.jdMatchScore}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Final Combined Fit */}
                      <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                        {candidate.finalScore}%
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1",
                          isShortlisted ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300" :
                          isEligible ? "bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300" :
                          isReview ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300" :
                          "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {isShortlisted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isEligible && !isShortlisted && <Sparkles className="w-3 h-3 text-indigo-600" />}
                          {isReview && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {candidate.status}
                        </span>
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidateForModal(candidate);
                              setSelectedModalTab('cv');
                              setIsAnalysisModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs font-medium border-border hover:bg-accent text-foreground flex items-center gap-1"
                            title="View Uploaded Resume / CV"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            View CV
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidateForModal(candidate);
                              setSelectedModalTab('analysis');
                              setIsAnalysisModalOpen(true);
                            }}
                            className="h-7 px-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            AI Analysis
                          </Button>

                          {!isShortlisted && isEligible && (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  await apiClient.post(`/recruitment/jobs/${selectedJobId}/ai-bulk-shortlist`, {
                                    candidateIds: [candidate.candidateId],
                                  });
                                  toast.success(`Shortlisted ${candidate.name} successfully`);
                                  fetchSuggestions();
                                } catch (e) {
                                  toast.error('Failed to shortlist');
                                }
                              }}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Shortlist
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* AI Analysis Modal */}
      {selectedCandidateForModal && (
        <AiAnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => {
            setIsAnalysisModalOpen(false);
            setSelectedCandidateForModal(null);
          }}
          candidateId={selectedCandidateForModal.candidateId}
          jobId={selectedJobId ? parseInt(selectedJobId, 10) : null}
          candidateName={selectedCandidateForModal.name}
          jobTitle={data?.job?.jobTitle}
          initialTab={selectedModalTab}
          onShortlistSuccess={fetchSuggestions}
        />
      )}
    </div>
  );
};
