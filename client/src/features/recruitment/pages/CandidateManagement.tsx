import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCandidates, useCreateCandidate, useUpdateCandidate, useDeleteCandidate, useJobs } from '../hooks';
import { useRecruitmentStore } from '../store/useRecruitmentStore';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, Settings, Users, Eye, Clipboard, CheckCircle, Link2,
  FileText, ExternalLink, FileSpreadsheet, Sparkles, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { downloadCsvFile } from '@/lib/downloadCsv';
import { BulkCandidateImportModal } from '../components/BulkCandidateImportModal';
import { AiAnalysisModal } from '../components/AiAnalysisModal';

interface ColumnConfig {
  key: string;
  label: string;
}

const ALL_CONFIGURABLE_COLUMNS: ColumnConfig[] = [
  { key: 'phone', label: 'Phone' },
  { key: 'current_company', label: 'Current Company' },
  { key: 'years_of_experience', label: 'Experience (Yrs)' },
  { key: 'expected_salary', label: 'Expected Salary' },
  { key: 'source', label: 'Source' },
  { key: 'ats_score', label: 'ATS Score' },
  { key: 'jd_match_score', label: 'JD Match Score' },
];

const pipelineRank = (status: string) => {
  const s = String(status || 'applied').toLowerCase();
  if (['rejected', 'dropped', 'withdrawn'].includes(s)) return 4;
  if (['offer', 'offered', 'hired'].includes(s)) return 3;
  if (['interview', 'interviewing', 'assessment'].includes(s)) return 2;
  return 1;
};

const canMovePipelineStatus = (fromStatus: string, toStatus: string) => {
  if (fromStatus === toStatus) return true;
  const fromRank = pipelineRank(fromStatus);
  const toRank = pipelineRank(toStatus);
  if (fromRank >= 4) return false;
  if (toStatus === 'rejected') return fromRank < 4;
  return toRank > fromRank;
};

const tabForStatus = (status: string): 'applied' | 'interview' | 'offer' | 'rejected' => {
  const rank = pipelineRank(status);
  if (rank >= 4) return 'rejected';
  if (rank === 3) return 'offer';
  if (rank === 2) return 'interview';
  return 'applied';
};

export const CandidateManagement: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [viewingCandidate, setViewingCandidate] = useState<any>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);

  // AI Modal State
  const [selectedCandidateForAiModal, setSelectedCandidateForAiModal] = useState<any | null>(null);
  const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);

  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate(editingCandidate?.id || 0);
  const deleteCandidate = useDeleteCandidate();
  const { data: jobsResponse } = useJobs({ pageSize: 500 });
  const queryClient = useQueryClient();
  
  // Table State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('candidate_management_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved column settings', e);
    }
    return ['source', 'ats_score', 'jd_match_score', 'years_of_experience'];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeLinkPopoverId, setActiveLinkPopoverId] = useState<number | null>(null);
  const [selectedJobIdForLink, setSelectedJobIdForLink] = useState<string>('');

  const { data: candidatesResponse, isLoading, refetch } = useCandidates({
    page: currentPage,
    pageSize: entriesPerPage,
    search: searchQuery,
  });

  const candidates = candidatesResponse?.data || [];
  const jobs = Array.isArray(jobsResponse?.data) ? jobsResponse.data : (Array.isArray(jobsResponse?.data?.items) ? jobsResponse.data.items : (Array.isArray(jobsResponse) ? jobsResponse : []));

  const activePublishedJobs = useMemo(() => {
    if (!jobs || !Array.isArray(jobs)) return [];
    return jobs.filter((job: any) => {
      const status = String(job.status || '').toLowerCase();
      if (status === 'closed' || status === 'archived') return false;
      return true;
    });
  }, [jobs]);

  const totalEntries = candidatesResponse?.meta?.total || 0;
  const totalPages = candidatesResponse?.meta?.totalPages || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);

  const handleCreateCandidate = async (formData: any, jobId?: number) => {
    try {
      const candidateRes = await createCandidate.mutateAsync(formData);
      
      if (jobId && candidateRes?.data?.id) {
        await apiClient.post('/recruitment/applications', {
          candidateId: candidateRes.data.id,
          jobId: jobId,
          applicationStatus: 'applied'
        });
        toast.success('Candidate created and linked to job successfully');
      } else {
        toast.success('Candidate Added Successfully');
      }
      
      setIsCreating(false);
      refetch();
    } catch (error: any) {
      console.error('Failed to create candidate:', error);
      const data = error?.response?.data;
      let errorMessage = data?.error?.message || 'Failed to create candidate';
      
      // If it's a Zod validation error, extract the field errors
      if (data?.error?.details?.body) {
        const fields = Object.keys(data.error.details.body);
        if (fields.length > 0) {
          errorMessage = `${fields[0]}: ${data.error.details.body[fields[0]][0]}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEditCandidate = async (formData: any) => {
    try {
      await updateCandidate.mutateAsync(formData);
      setEditingCandidate(null);
      toast.success('Candidate Updated Successfully');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      refetch();
    } catch (error: any) {
      console.error('Failed to update candidate:', error);
      const data = error?.response?.data;
      let errorMessage = data?.error?.message || 'Failed to update candidate';
      
      if (data?.error?.details?.body) {
        const fields = Object.keys(data.error.details.body);
        if (fields.length > 0) {
          errorMessage = `${fields[0]}: ${data.error.details.body[fields[0]][0]}`;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    try {
      await deleteCandidate.mutateAsync(id);
      setCandidateToDelete(null);
      toast.success('Candidate Deleted Successfully');
      refetch();
    } catch (error: any) {
      console.error('Failed to delete candidate:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to delete candidate';
      toast.error(errorMessage);
    }
  };

  const handleLinkToJob = (candidateId: number) => {
    if (!selectedJobIdForLink) {
      toast.error('Please select a job opening first');
      return;
    }
    apiClient.post('/recruitment/applications', {
      candidateId: Number(candidateId),
      jobId: Number(selectedJobIdForLink),
      appliedFromSource: 'Candidate Management'
    })
    .then(res => {
      if (res.data?.success) {
        toast.success('Candidate successfully linked to Job!');
        setActiveLinkPopoverId(null);
        setSelectedJobIdForLink('');
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      } else {
        toast.error(res.data?.message || 'Failed to link candidate');
      }
    })
    .catch(err => {
      console.error('Failed to create application', err);
      toast.error(formatApiError(err, 'Failed to link candidate'));
    });
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const updated = prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key];
      try {
        localStorage.setItem('candidate_management_visible_columns', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save column settings', e);
      }
      return updated;
    });
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/recruitment/candidates', {
        params: {
          page: 1,
          pageSize: 1000,
          search: searchQuery || undefined,
        },
      });
      const rows = res.data?.data || [];
      if (!rows.length) {
        toast.error('No candidate records available to export');
        return;
      }
      downloadCsvFile(
        `candidate_management_export.csv`,
        ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Source', 'Company', 'Experience', 'ATS Score'],
        rows.map((c: any) => [
          c.firstName || c.first_name || '',
          c.lastName || c.last_name || '',
          c.email || '',
          c.phone || '',
          c.status || '',
          c.source || '',
          c.currentCompany || c.current_company || '',
          c.yearsOfExperience ?? c.years_of_experience ?? '',
          c.atsScore ?? c.ats_score ?? '',
        ])
      );
      toast.success('Candidates CSV downloaded');
    } catch (err) {
      console.error('Failed to export candidates', err);
      toast.error('Failed to export candidates');
    }
  };

  const handlePipelineStatusChange = async (candidateId: number, currentStatus: string, status: string) => {
    if (!canMovePipelineStatus(currentStatus, status)) {
      toast.error('Pipeline can only move forward. Offered / rejected candidates cannot return to Interview.');
      return;
    }
    try {
      await apiClient.patch(`/recruitment/candidates/${candidateId}`, { status });
      await queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setCurrentPage(1);
      toast.success(`Candidate moved to ${status}`);
    } catch (err: any) {
      console.error('Failed to update candidate status', err);
      toast.error(formatApiError(err, 'Failed to update candidate pipeline status'));
    }
  };

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      
      {/* ── Top Header Section ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-visible">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Candidate Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage, review ATS profiles, and link candidates to published job requisitions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <Button 
            type="button"
            variant="outline"
            onClick={() => setIsBulkImportOpen(true)}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Bulk Import
          </Button>

          <Button 
            onClick={() => setIsCreating(true)}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Candidate
          </Button>
          
          <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-xl border-border hover:bg-muted text-muted-foreground shadow-2xs"
                title="Configure Table Columns"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-64 p-0 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 bg-muted/50 border-b border-border">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">Configure Columns</h4>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto space-y-1">
                {ALL_CONFIGURABLE_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center p-2 hover:bg-muted/60 rounded-lg cursor-pointer text-xs font-medium text-foreground transition-colors">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 mr-2"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        {/* Toolbar: Search Bar & Export */}
        <CardHeader className="p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background border-border text-xs rounded-xl h-9"
            />
          </div>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 rounded-xl h-9 border-border hover:bg-muted shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table Container */}
          <div className="overflow-x-auto w-full min-h-[220px]">
            <table className="w-full text-sm text-left border-collapse min-w-[1000px] mrf-table">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border/60 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-5">Actions</th>
                  <th className="py-3.5 px-5">Candidate Name</th>
                  <th className="py-3.5 px-5">Email & Contact</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  
                  {/* Dynamically configured columns */}
                  {visibleColumns.map((colKey) => {
                    const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === colKey);
                    return (
                      <th key={colKey} className={cn("py-3.5 px-5", colKey === 'ai_score' && "text-center")}>
                        {col?.label || colKey}
                      </th>
                    );
                  })}
                  
                  <th className="py-3.5 px-5 text-center">Link Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {isLoading ? (
                  <tr>
                    <td colSpan={5 + visibleColumns.length} className="p-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Loading candidates...
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5 + visibleColumns.length} className="p-12 text-center text-muted-foreground text-xs italic">
                      No Candidates found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  candidates.map((item: any) => {
                    const fullName = ((item.first_name || item.firstName)
                      ? `${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || ''}`.trim()
                      : (item.name || item.candidate_name || item.candidateName || (item.email ? item.email.split('@')[0] : 'Candidate')));
                    
                    const initials = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'CA';
                    const statusStr = (item.status || 'applied').toLowerCase();

                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setViewingCandidate(item)} 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10" 
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingCandidate(item)} 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10" 
                              title="Edit Candidate"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setCandidateToDelete(item)} 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10" 
                              title="Delete Candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <div className="font-bold text-foreground text-xs">
                              {fullName}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-muted-foreground font-mono">
                          <div>{item.email}</div>
                          {item.phone && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{item.phone}</div>}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={cn(
                              "inline-block px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full border",
                              ['offer', 'hired'].includes(statusStr) ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                              ['rejected', 'dropped', 'withdrawn'].includes(statusStr) ? 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10' :
                              statusStr === 'interview' ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' :
                              'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10'
                            )}
                          >
                            {['applied', 'screening'].includes(statusStr) ? 'Applied' :
                             statusStr === 'interview' ? 'Interview' :
                             ['offer', 'hired'].includes(statusStr) ? 'Offered' :
                             ['rejected', 'dropped', 'withdrawn'].includes(statusStr) ? 'Rejected' :
                             (item.status || 'Applied')}
                          </span>
                        </td>

                        {/* Dynamic Columns */}
                        {visibleColumns.map(colKey => {
                          const val = item[colKey];
                          const isSource = colKey === 'source';

                          if (colKey === 'ats_score') {
                            const score = item.ats_score ?? item.atsScore;
                            return (
                              <td key={colKey} className="py-3.5 px-5 text-center">
                                {score !== null && score !== undefined ? (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-mono font-bold border inline-block",
                                    score >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                    score >= 70 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                  )}>
                                    {score}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs font-mono">-</span>
                                )}
                              </td>
                            );
                          }

                          if (colKey === 'jd_match_score') {
                            const score = item.jd_match_score ?? item.jdMatchScore;
                            return (
                              <td key={colKey} className="py-3.5 px-5 text-center">
                                {score !== null && score !== undefined ? (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-mono font-bold border inline-block",
                                    score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                                    score >= 65 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                  )}>
                                    {score}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs font-mono">-</span>
                                )}
                              </td>
                            );
                          }

                          if (isSource) {
                            const hasResumeBank = Boolean(item.resume_tracker_id || item.resume_bank_id);
                            return (
                              <td key={colKey} className="py-3.5 px-5">
                                {hasResumeBank ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30" title={`Sourced from Resume Bank (${item.resume_tracker_id || 'ID:' + item.resume_bank_id})`}>
                                    <FileText className="w-3 h-3 text-purple-500 shrink-0" />
                                    <span>Resume Bank</span>
                                    {item.resume_tracker_id && (
                                      <span className="text-[10px] font-mono font-bold">[{item.resume_tracker_id}]</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize",
                                    val === 'internal_opening' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                                    val === 'other' ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30" :
                                    "bg-muted text-muted-foreground border-border"
                                  )}>
                                    {val === 'internal_opening' ? 'Internal Opening' :
                                     val === 'direct_apply' ? 'Direct Application' :
                                     val === 'employee_referral' ? 'Employee Referral' :
                                     val === 'recruitment_agency' ? 'Recruitment Agency' :
                                     val === 'job_board' ? 'Job Board' :
                                     val === 'other' ? 'Other' :
                                     (val ? String(val).replace(/_/g, ' ') : 'Direct Apply')}
                                  </span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td key={colKey} className="py-3.5 px-5 text-xs text-foreground font-medium">
                              {val || '-'}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-5 text-center">
                          {/* Link to Job Button / Radix Popover with Portal */}
                          {(() => {
                            const rawApplied = item.applied_job_ids ?? item.appliedJobIds;
                            const appliedJobIds: number[] = rawApplied
                              ? String(rawApplied).split(',').map(Number).filter(Boolean)
                              : (item.linked_job_id || item.linkedJobId ? [Number(item.linked_job_id || item.linkedJobId)] : []);
                            
                            const linkedJobId = item.linked_job_id || item.linkedJobId || item.job_id || item.jobId || (appliedJobIds.length > 0 ? appliedJobIds[0] : null);

                            // Available dropdown jobs for this candidate (active jobs + any linked/applied job)
                            const candidateDropdownJobs = (() => {
                              const list = [...activePublishedJobs];
                              if (linkedJobId && !list.some((j: any) => Number(j.id) === Number(linkedJobId))) {
                                const matchedJob = jobs.find((j: any) => Number(j.id) === Number(linkedJobId));
                                if (matchedJob) {
                                  list.unshift(matchedJob);
                                } else {
                                  list.unshift({ id: linkedJobId, jobCode: 'JOB', jobTitle: 'Linked Opening' });
                                }
                              }
                              return list;
                            })();

                            const isSelectedJobApplied = selectedJobIdForLink ? appliedJobIds.includes(Number(selectedJobIdForLink)) : false;

                            return (
                              <Popover
                                open={activeLinkPopoverId === item.id}
                                onOpenChange={(isOpen) => {
                                  setActiveLinkPopoverId(isOpen ? item.id : null);
                                  if (isOpen) {
                                    const defaultJobId = linkedJobId 
                                      ? String(linkedJobId) 
                                      : (candidateDropdownJobs[0]?.id ? String(candidateDropdownJobs[0].id) : (activePublishedJobs[0]?.id ? String(activePublishedJobs[0].id) : ''));
                                    setSelectedJobIdForLink(defaultJobId);
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <button 
                                    type="button"
                                    className="inline-flex items-center justify-center p-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary shadow-2xs cursor-pointer transition-colors"
                                    title="Link to Job"
                                  >
                                    <Link2 className="w-4 h-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent 
                                  align="end" 
                                  side="bottom" 
                                  sideOffset={8} 
                                  className="w-80 p-4 bg-card border border-border rounded-2xl shadow-2xl z-[9999] text-foreground"
                                >
                                  <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Link Candidate to Job</h4>
                                    <button 
                                      type="button"
                                      onClick={() => setActiveLinkPopoverId(null)}
                                      className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">Target Job Opening</label>
                                      <select
                                        value={selectedJobIdForLink}
                                        onChange={(e) => setSelectedJobIdForLink(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
                                      >
                                        {candidateDropdownJobs.length === 0 && (
                                          <option value="">-- No published jobs available --</option>
                                        )}
                                        {candidateDropdownJobs.map((job: any) => {
                                          const isApplied = appliedJobIds.includes(Number(job.id));
                                          return (
                                            <option key={job.id} value={String(job.id)}>
                                              {job.jobCode || job.job_code || 'JOB'} - {job.jobTitle || job.job_title || 'Untitled'} {isApplied ? '✓ (Currently Applied)' : ''}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </div>

                                    {isSelectedJobApplied && (
                                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <span>Candidate is already linked & applied to this job.</span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setActiveLinkPopoverId(null)}
                                        className="flex-1 bg-muted hover:bg-muted/80 text-muted-foreground font-bold py-2 px-2 rounded-xl text-[11px] text-center cursor-pointer transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSelectedJobApplied || !selectedJobIdForLink}
                                        onClick={() => handleLinkToJob(item.id)}
                                        className={cn(
                                          "flex-1 font-bold py-2 px-2 rounded-xl text-[11px] text-center transition-colors uppercase tracking-wider shadow-xs",
                                          isSelectedJobApplied || !selectedJobIdForLink
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                                            : "bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                                        )}
                                      >
                                        {isSelectedJobApplied ? 'Already Linked' : 'Apply to Job'}
                                      </button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {candidates.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4.5 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground gap-3">
              <div className="font-medium">
                Showing <span className="font-bold text-foreground">{totalEntries === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(endIndex, totalEntries)}</span> of <span className="font-bold text-foreground">{totalEntries}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 rounded-xl border-border hover:bg-muted text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`h-8 w-8 p-0 rounded-xl text-xs font-bold ${
                        currentPage === i + 1 
                          ? 'bg-primary text-primary-foreground shadow-xs' 
                          : 'border-border hover:bg-muted text-foreground'
                      }`}
                    >
                      {i + 1}
                    </Button>
                  )).slice(
                    Math.max(0, currentPage - 3), 
                    Math.min(totalPages, currentPage + 2)
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 rounded-xl border-border hover:bg-muted text-foreground disabled:opacity-40"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreating && (
        <CandidateFormModal
          jobs={activePublishedJobs}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateCandidate}
        />
      )}

      {editingCandidate && (
        <CandidateFormModal
          initialData={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSubmit={handleEditCandidate}
        />
      )}

      {candidateToDelete && (
        <DeleteConfirmationModal
          candidate={candidateToDelete}
          onClose={() => setCandidateToDelete(null)}
          onConfirm={() => handleDeleteCandidate(candidateToDelete.id)}
        />
      )}

      {viewingCandidate && (
        <ViewCandidateModal
          candidate={viewingCandidate}
          onClose={() => setViewingCandidate(null)}
        />
      )}

      <BulkCandidateImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={refetch}
      />

      {/* AI ATS & Match Analysis Modal */}
      {selectedCandidateForAiModal && (
        <AiAnalysisModal
          isOpen={isAiAnalysisModalOpen}
          onClose={() => {
            setIsAiAnalysisModalOpen(false);
            setSelectedCandidateForAiModal(null);
          }}
          candidateId={selectedCandidateForAiModal.id}
          jobId={selectedCandidateForAiModal.job_id || selectedCandidateForAiModal.jobId || (jobs[0]?.id || 1)}
          candidateName={selectedCandidateForAiModal.name || `${selectedCandidateForAiModal.first_name || ''} ${selectedCandidateForAiModal.last_name || ''}`.trim()}
          jobTitle={selectedCandidateForAiModal.job_title || selectedCandidateForAiModal.jobTitle}
          onShortlistSuccess={refetch}
        />
      )}
    </div>
  );
};

interface CandidateFormModalProps {
  onClose: () => void;
  onSubmit: (data: any, jobId?: number) => void;
  initialData?: any;
  jobs?: any[];
}

const pickValue = (...values: any[]) => values.find((v) => v !== undefined && v !== null && v !== '') ?? '';
const toDateInputValue = (value: any) => {
  if (!value) return '';
  const str = String(value).trim();
  if (!str) return '';
  // If already pure YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // If it's an ISO timestamp with time component (e.g. "2026-02-13T18:30:00.000Z")
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return str.slice(0, 10);
};

const CandidateFormModal: React.FC<CandidateFormModalProps> = ({ onClose, onSubmit, initialData, jobs }) => {
  const existingResumeUrl = pickValue(initialData?.resumeUrl, initialData?.resume_url);
  const [resumeFileName, setResumeFileName] = useState(
    existingResumeUrl ? String(existingResumeUrl).split('/').pop() || 'Resume on file' : ''
  );
  const [formData, setFormData] = useState({
    firstName: pickValue(initialData?.firstName, initialData?.first_name),
    lastName: pickValue(initialData?.lastName, initialData?.last_name),
    email: pickValue(initialData?.email),
    phone: pickValue(initialData?.phone),
    alternativePhone: pickValue(initialData?.alternativePhone, initialData?.alternative_phone),
    gender: pickValue(initialData?.gender, 'Male'),
    maritalStatus: pickValue(initialData?.maritalStatus, initialData?.marital_status, 'Unmarried'),
    qualification: pickValue(initialData?.qualification),
    skills: pickValue(initialData?.skills),
    dateOfBirth: toDateInputValue(pickValue(initialData?.dateOfBirth, initialData?.dob, initialData?.date_of_birth)),
    yearsOfExperience: parseFloat(String(initialData?.yearsOfExperience ?? initialData?.years_of_experience ?? 0)) || 0,
    currentCompany: pickValue(initialData?.currentCompany, initialData?.current_company),
    currentSalary: initialData?.currentSalary ?? initialData?.current_salary ? parseFloat(String(initialData.currentSalary ?? initialData.current_salary)) : '',
    expectedSalary: initialData?.expectedSalary ?? initialData?.expected_salary ? parseFloat(String(initialData.expectedSalary ?? initialData.expected_salary)) : '',
    noticePeriodDays: initialData?.noticePeriodDays ?? initialData?.notice_period_days ? parseInt(String(initialData.noticePeriodDays ?? initialData.notice_period_days), 10) : 0,
    linkedinUrl: pickValue(initialData?.linkedinUrl, initialData?.linkedin_url),
    portfolioUrl: pickValue(initialData?.portfolioUrl, initialData?.portfolio_url),
    source: pickValue(initialData?.source, 'direct_apply'),
    resumeUrl: existingResumeUrl || '',
  });
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) {
      toast.error('Please upload a PDF or Word resume');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, resumeUrl: String(reader.result || '') }));
      setResumeFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['yearsOfExperience', 'noticePeriodDays', 'currentSalary', 'expectedSalary'].includes(name) 
        ? (value !== '' ? parseFloat(value) : '') 
        : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Candidate Profile' : 'Add New Candidate'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete the professional profile details below.</p>
          </div>
          <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
          <form id="create-candidate-form" onSubmit={(e) => {
            e.preventDefault();
            
            // Clean up and cast typed fields to prevent Zod validation errors
            const payload: any = { ...formData };
            if (payload.yearsOfExperience !== '' && payload.yearsOfExperience !== undefined && payload.yearsOfExperience !== null) {
              payload.yearsOfExperience = Number(payload.yearsOfExperience);
            } else {
              payload.yearsOfExperience = 0;
            }
            if (payload.currentSalary !== '' && payload.currentSalary !== undefined && payload.currentSalary !== null) {
              payload.currentSalary = Number(payload.currentSalary);
            } else {
              delete payload.currentSalary;
            }
            if (payload.expectedSalary !== '' && payload.expectedSalary !== undefined && payload.expectedSalary !== null) {
              payload.expectedSalary = Number(payload.expectedSalary);
            } else {
              delete payload.expectedSalary;
            }
            if (payload.noticePeriodDays !== '' && payload.noticePeriodDays !== undefined && payload.noticePeriodDays !== null) {
              payload.noticePeriodDays = Number(payload.noticePeriodDays);
            } else {
              delete payload.noticePeriodDays;
            }
            if (payload.linkedinUrl === '') delete payload.linkedinUrl;
            if (payload.portfolioUrl === '') delete payload.portfolioUrl;
            if (payload.currentCompany === '') delete payload.currentCompany;
            if (payload.alternativePhone === '') delete payload.alternativePhone;
            if (payload.dateOfBirth === '') delete payload.dateOfBirth;
            
            // Map invalid legacy sources to valid enum values just in case state is stale
            if (payload.source === 'linkedin' || payload.source === 'naukri') {
              payload.source = 'job_board';
            }
            
            onSubmit(payload, selectedJobId ? Number(selectedJobId) : undefined);
          }} className="space-y-8">
            
            {/* Section: Personal Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name <span className="text-red-500">*</span></label>
                  <Input name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name <span className="text-red-500">*</span></label>
                  <Input name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email <span className="text-red-500">*</span></label>
                  <Input type="email" name="email" placeholder="john.doe@example.com" value={formData.email} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone <span className="text-red-500">*</span></label>
                    <Input type="tel" name="phone" placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Alt Phone</label>
                    <Input type="tel" name="alternativePhone" placeholder="Optional" value={formData.alternativePhone} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Gender <span className="text-red-500">*</span></label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Marital Status <span className="text-red-500">*</span></label>
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Date of Birth</label>
                  <Input 
                    type="date" 
                    name="dateOfBirth" 
                    value={formData.dateOfBirth} 
                    onChange={handleChange} 
                    max={new Date().toISOString().slice(0, 10)}
                    className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" 
                  />
                </div>
              </div>
            </div>

            {/* Section: Professional Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Professional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Qualification <span className="text-red-500">*</span></label>
                  <Input name="qualification" placeholder="e.g. B.Tech / BE, MBA, MCA, Graduate" value={formData.qualification} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Skills <span className="text-red-500">*</span></label>
                  <Input name="skills" placeholder="e.g. React, Node.js, Python, HR Management" value={formData.skills} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Company</label>
                  <Input name="currentCompany" placeholder="e.g. Acme Corp" value={formData.currentCompany} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Years of Experience</label>
                  <Input type="number" name="yearsOfExperience" placeholder="e.g. 5" value={formData.yearsOfExperience} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" min="0" max="50" step="0.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Salary (LPA)</label>
                    <Input type="number" name="currentSalary" placeholder="e.g. 12" value={formData.currentSalary} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" min="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Expected Salary (LPA)</label>
                    <Input type="number" name="expectedSalary" placeholder="e.g. 15" value={formData.expectedSalary} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" min="0" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Notice Period (Days)</label>
                  <Input type="number" name="noticePeriodDays" placeholder="e.g. 30, 60, 90" value={formData.noticePeriodDays} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" min="0" max="180" />
                </div>
              </div>
            </div>

            {/* Section: Sourcing */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Sourcing & Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Source <span className="text-red-500">*</span></label>
                  <select name="source" value={formData.source} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm" required>
                    <option value="direct_apply">Direct Application</option>
                    <option value="job_board">Job Board (LinkedIn, Naukri, etc)</option>
                    <option value="employee_referral">Employee Referral</option>
                    <option value="recruitment_agency">Recruitment Agency</option>
                    <option value="bulk_import">Bulk Import</option>
                    <option value="resume_bank">Resume Bank</option>
                    <option value="internal_opening">Internal Opening</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">LinkedIn Profile URL</label>
                  <Input type="url" name="linkedinUrl" placeholder="https://linkedin.com/in/..." value={formData.linkedinUrl} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Resume / Portfolio Link</label>
                  <Input type="url" name="portfolioUrl" placeholder="Google Drive, Dropbox, Portfolio link..." value={formData.portfolioUrl} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Candidate Resume</label>
                  <label className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                    <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">
                        {resumeFileName ? 'Resume selected' : 'Upload PDF or Word resume'}
                      </p>
                      <p className={cn('text-[11px] truncate', resumeFileName ? 'text-emerald-600 font-medium' : 'text-slate-500')}>
                        {resumeFileName || 'No file uploaded yet'}
                      </p>
                    </div>
                    <input type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden" onChange={handleResumeUpload} />
                  </label>
                </div>
                {!initialData && jobs && jobs.length > 0 && (
                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Link to Job Opening</label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    >
                      <option value="">-- Optional: choose a published job --</option>
                      {jobs.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.jobCode || job.job_code} - {job.jobTitle || job.job_title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-600 hover:bg-slate-100">
            Cancel
          </Button>
          <Button type="submit" form="create-candidate-form" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
            <CheckCircle className="w-4 h-4 mr-2" /> {initialData ? 'Update Profile' : 'Save Candidate'}
          </Button>
        </div>

      </div>
    </div>
  );
};

interface DeleteConfirmationModalProps {
  candidate: any;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ candidate, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Candidate?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to delete <strong>{candidate.firstName || candidate.first_name} {candidate.lastName || candidate.last_name}</strong>? This permanently removes the candidate from the database.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="px-6">Cancel</Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-6">Delete</Button>
        </div>
      </div>
    </div>
  );
};

interface ViewCandidateModalProps {
  candidate: any;
  onClose: () => void;
}

const ViewCandidateModal: React.FC<ViewCandidateModalProps> = ({ candidate, onClose }) => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'skills' | 'education' | 'experience' | 'documents'>('profile');
  
  // Data lists
  const [skills, setSkills] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // Form states
  const [newSkill, setNewSkill] = useState({ skillName: '', proficiency: 'intermediate', yearsOfExperience: '' });
  const [newEdu, setNewEdu] = useState({ degree: '', fieldOfStudy: '', institution: '', graduationYear: '' });
  const [newExp, setNewExp] = useState({ companyName: '', jobTitle: '', startDate: '', endDate: '', isCurrent: false, description: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('resume');
  const [fileInputKey, setFileInputKey] = useState(0);

  const fetchSkills = () => {
    apiClient.get(`/recruitment/candidates/${candidate.id}/skills`)
      .then(res => res.data?.success && setSkills(res.data.data))
      .catch(err => console.error('Failed to fetch skills', err));
  };

  const fetchEducation = () => {
    apiClient.get(`/recruitment/candidates/${candidate.id}/education`)
      .then(res => res.data?.success && setEducation(res.data.data))
      .catch(err => console.error('Failed to fetch education', err));
  };

  const fetchExperience = () => {
    apiClient.get(`/recruitment/candidates/${candidate.id}/experience`)
      .then(res => res.data?.success && setExperience(res.data.data))
      .catch(err => console.error('Failed to fetch experience', err));
  };

  const fetchDocuments = () => {
    apiClient.get(`/recruitment/candidates/${candidate.id}/documents`)
      .then(res => res.data?.success && setDocuments(res.data.data))
      .catch(err => console.error('Failed to fetch documents', err));
  };

  React.useEffect(() => {
    if (activeSubTab === 'skills') fetchSkills();
    if (activeSubTab === 'education') fetchEducation();
    if (activeSubTab === 'experience') fetchExperience();
    if (activeSubTab === 'documents') fetchDocuments();
  }, [activeSubTab]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.skillName) return;
    try {
      await apiClient.post(`/recruitment/candidates/${candidate.id}/skills`, {
        skillName: newSkill.skillName,
        proficiency: newSkill.proficiency,
        yearsOfExperience: newSkill.yearsOfExperience ? parseFloat(newSkill.yearsOfExperience) : null
      });
      toast.success('Skill added');
      setNewSkill({ skillName: '', proficiency: 'intermediate', yearsOfExperience: '' });
      fetchSkills();
    } catch (err: any) {
      console.error('Failed to add skill', err);
      toast.error(formatApiError(err, 'Failed to add skill'));
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/skills/${id}`);
      fetchSkills();
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to delete skill'));
    }
  };

  const handleAddEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdu.degree) return;
    try {
      await apiClient.post(`/recruitment/candidates/${candidate.id}/education`, {
        degree: newEdu.degree,
        fieldOfStudy: newEdu.fieldOfStudy || null,
        institution: newEdu.institution || null,
        graduationYear: newEdu.graduationYear ? parseInt(newEdu.graduationYear, 10) : null
      });
      toast.success('Education record added');
      setNewEdu({ degree: '', fieldOfStudy: '', institution: '', graduationYear: '' });
      fetchEducation();
    } catch (err: any) {
      console.error('Failed to add education record', err);
      toast.error(formatApiError(err, 'Failed to add education record'));
    }
  };

  const handleDeleteEdu = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/education/${id}`);
      fetchEducation();
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to delete education record'));
    }
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.companyName) return;
    try {
      await apiClient.post(`/recruitment/candidates/${candidate.id}/experience`, {
        companyName: newExp.companyName,
        jobTitle: newExp.jobTitle || null,
        startDate: newExp.startDate || null,
        endDate: newExp.endDate || null,
        isCurrent: newExp.isCurrent,
        description: newExp.description || null
      });
      toast.success('Experience record added');
      setNewExp({ companyName: '', jobTitle: '', startDate: '', endDate: '', isCurrent: false, description: '' });
      fetchExperience();
    } catch (err: any) {
      console.error('Failed to add experience record', err);
      toast.error(formatApiError(err, 'Failed to add experience record'));
    }
  };

  const handleDeleteExp = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/experience/${id}`);
      fetchExperience();
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to delete experience record'));
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('documentType', documentType);
    try {
      await apiClient.post(`/recruitment/candidates/${candidate.id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded');
      setUploadFile(null);
      setFileInputKey(k => k + 1);
      fetchDocuments();
    } catch (err: any) {
      console.error('Failed to upload document', err);
      toast.error(formatApiError(err, 'Failed to upload document'));
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/documents/${docId}`);
      fetchDocuments();
    } catch (err: any) {
      toast.error(formatApiError(err, 'Failed to delete document'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Candidate details & Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><ChevronLeft className="w-4 h-4" /></Button>
        </div>
        
        {/* Sub-tabs header */}
        <div className="px-6 border-b border-slate-100 flex gap-4 text-xs font-semibold bg-slate-50 py-2">
          {['profile', 'skills', 'education', 'experience', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`capitalize pb-2 px-1 border-b-2 transition-all ${activeSubTab === tab ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {activeSubTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Name</p>
                  <p className="font-medium text-slate-800">{candidate.firstName || candidate.first_name} {candidate.lastName || candidate.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Email</p>
                  <p className="font-medium text-slate-800">{candidate.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Phone</p>
                  <p className="font-medium text-slate-800">{candidate.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="font-medium text-slate-800">{toDateInputValue(candidate.dateOfBirth || candidate.dob || candidate.date_of_birth) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Experience</p>
                  <p className="font-medium text-slate-800">{candidate.years_of_experience || candidate.yearsOfExperience || 0} years</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Qualification</p>
                  <p className="font-medium text-slate-800">{candidate.qualification || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Status</p>
                  <p className="font-medium text-slate-800 uppercase text-xs">{candidate.status || 'Applied'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Company</p>
                  <p className="font-medium text-slate-800">{candidate.current_company || candidate.currentCompany || 'N/A'}</p>
                </div>
              </div>

              {/* Sourcing Section */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Sourcing & Resumebank</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Source:</span>
                    <span className="font-semibold text-slate-800">{candidate.source || 'Direct Apply'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Resume Bank ID:</span>
                    <span className="font-semibold text-slate-800">{candidate.resume_bank_id || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'skills' && (
            <div className="space-y-4">
              <form onSubmit={handleAddSkill} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-[10px]">Skill Name</Label>
                  <Input value={newSkill.skillName} onChange={e => setNewSkill(s => ({ ...s, skillName: e.target.value }))} className="h-8 text-xs" placeholder="e.g. React" />
                </div>
                <div className="w-28">
                  <Label className="text-[10px]">Proficiency</Label>
                  <Select value={newSkill.proficiency} onValueChange={(val) => setNewSkill(s => ({ ...s, proficiency: val }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <Label className="text-[10px]">Exp (Yrs)</Label>
                  <Input type="number" step="0.5" value={newSkill.yearsOfExperience} onChange={e => setNewSkill(s => ({ ...s, yearsOfExperience: e.target.value }))} className="h-8 text-xs" placeholder="e.g. 2" />
                </div>
                <Button type="submit" size="sm" className="h-8 text-xs">Add</Button>
              </form>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {skills.length === 0 ? <p className="text-xs text-slate-500 text-center">No skills added yet.</p> : (
                  skills.map((s) => {
                    const skillName = s.skillName || s.skill_name || s.name || '';
                    const proficiency = s.proficiency || s.proficiencyLevel || s.proficiency_level || 'intermediate';
                    const yoe = s.yearsOfExperience ?? s.years_of_experience;
                    return (
                      <div key={s.id} className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{skillName}</span>
                          <span className="text-slate-600 uppercase text-[10px] bg-slate-200/80 font-bold px-2 py-0.5 rounded">
                            {proficiency}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {yoe !== null && yoe !== undefined && yoe !== '' && (
                            <span className="text-slate-600 font-medium">{yoe} yrs</span>
                          )}
                          <button 
                            type="button"
                            onClick={() => handleDeleteSkill(s.id)} 
                            className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'education' && (
            <div className="space-y-4">
              <form onSubmit={handleAddEdu} className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label className="text-[10px]">Degree *</Label>
                  <Input value={newEdu.degree} onChange={e => setNewEdu(d => ({ ...d, degree: e.target.value }))} className="h-8 text-xs" placeholder="e.g. B.Tech" />
                </div>
                <div>
                  <Label className="text-[10px]">Field of Study</Label>
                  <Input value={newEdu.fieldOfStudy} onChange={e => setNewEdu(d => ({ ...d, fieldOfStudy: e.target.value }))} className="h-8 text-xs" placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <Label className="text-[10px]">Institution</Label>
                  <Input value={newEdu.institution} onChange={e => setNewEdu(d => ({ ...d, institution: e.target.value }))} className="h-8 text-xs" placeholder="e.g. IIT Delhi" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px]">Graduation Year</Label>
                    <Input type="number" value={newEdu.graduationYear} onChange={e => setNewEdu(d => ({ ...d, graduationYear: e.target.value }))} className="h-8 text-xs" placeholder="2023" />
                  </div>
                  <Button type="submit" size="sm" className="h-8 text-xs self-end">Add</Button>
                </div>
              </form>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {education.length === 0 ? <p className="text-xs text-slate-500 text-center">No education records added yet.</p> : (
                  education.map((e) => {
                    const fieldOfStudy = e.fieldOfStudy || e.field_of_study;
                    const gradYear = e.graduationYear || e.graduation_year;
                    return (
                      <div key={e.id} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 relative flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-800">{e.degree} {fieldOfStudy ? `in ${fieldOfStudy}` : ''}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{e.institution || 'N/A'} {gradYear ? `(${gradYear})` : ''}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleDeleteEdu(e.id)} 
                          className="text-red-500 hover:text-red-700 mt-1 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Education"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'experience' && (
            <div className="space-y-4">
              <form onSubmit={handleAddExp} className="space-y-3 p-3 border rounded bg-slate-50">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-[10px]">Company Name *</Label>
                    <Input value={newExp.companyName} onChange={e => setNewExp(x => ({ ...x, companyName: e.target.value }))} className="h-8 text-xs" placeholder="e.g. Google" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Job Title</Label>
                    <Input value={newExp.jobTitle} onChange={e => setNewExp(x => ({ ...x, jobTitle: e.target.value }))} className="h-8 text-xs" placeholder="e.g. Software Engineer" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Start Date</Label>
                    <Input type="date" value={newExp.startDate} onChange={e => setNewExp(x => ({ ...x, startDate: e.target.value }))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">End Date</Label>
                    <Input type="date" value={newExp.endDate} onChange={e => setNewExp(x => ({ ...x, endDate: e.target.value }))} className="h-8 text-xs" disabled={newExp.isCurrent} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input type="checkbox" id="isCurrent" checked={newExp.isCurrent} onChange={e => setNewExp(x => ({ ...x, isCurrent: e.target.checked }))} />
                  <label htmlFor="isCurrent" className="font-semibold text-slate-700">Currently Work Here</label>
                </div>
                <div>
                  <Label className="text-[10px]">Description</Label>
                  <Input value={newExp.description} onChange={e => setNewExp(x => ({ ...x, description: e.target.value }))} className="h-8 text-xs" placeholder="Role and achievements description..." />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="h-8 text-xs">Add Experience</Button>
                </div>
              </form>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {experience.length === 0 ? <p className="text-xs text-slate-500 text-center">No experience records added yet.</p> : (
                  experience.map((e) => {
                    const jobTitle = e.jobTitle || e.job_title || e.designation || '';
                    const companyName = e.companyName || e.company_name || '';
                    const startDate = e.startDate || e.start_date || '';
                    const endDate = e.endDate || e.end_date || '';
                    const isCurrent = Boolean(e.isCurrent ?? e.is_current ?? e.currentlyWorking ?? e.currently_working);
                    return (
                      <div key={e.id} className="p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 relative flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-800">{jobTitle ? `${jobTitle} at ` : ''}{companyName}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5">{startDate || 'N/A'} to {isCurrent ? 'Present' : (endDate || 'N/A')}</p>
                          {e.description && <p className="text-slate-600 mt-1 italic">{e.description}</p>}
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleDeleteExp(e.id)} 
                          className="text-red-500 hover:text-red-700 mt-1 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Experience"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'documents' && (
            <div className="space-y-4">
              <form onSubmit={handleFileUpload} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-[10px]">Upload Document</Label>
                  <Input key={fileInputKey} type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="h-8 text-xs" />
                </div>
                <div className="w-28">
                  <Label className="text-[10px]">Doc Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resume">Resume</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="id_proof">ID Proof</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="sm" className="h-8 text-xs">Upload</Button>
              </form>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {documents.length === 0 ? <p className="text-xs text-slate-500 text-center">No documents uploaded yet.</p> : (
                  documents.map((d) => {
                    const fileUrl = d.fileUrl || d.file_url || d.documentUrl || d.document_url || '';
                    let fileName = d.fileName || d.file_name;
                    if (!fileName && fileUrl) {
                      const parts = fileUrl.split('/');
                      fileName = parts[parts.length - 1]?.replace(/^\d+-/, '');
                    }
                    if (!fileName) fileName = 'Document';
                    const docType = d.documentType || d.document_type || 'file';
                    return (
                      <div key={d.id} className="flex justify-between items-center p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{fileName}</span>
                          <span className="text-slate-600 uppercase text-[10px] bg-slate-200/80 font-bold px-2 py-0.5 rounded">{docType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] cursor-pointer" 
                            onClick={() => {
                              if (!fileUrl) {
                                toast.error('Document file URL not available');
                                return;
                              }
                              if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
                                window.open(fileUrl, '_blank');
                                return;
                              }
                              const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
                              const base = rawApiUrl.replace('/api/v1', '');
                              const formattedPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
                              window.open(`${base}${formattedPath}`, '_blank');
                            }}
                          >
                            View
                          </Button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteDoc(d.id)} 
                            className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

