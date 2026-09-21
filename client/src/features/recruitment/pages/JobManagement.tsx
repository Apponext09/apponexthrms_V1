import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob, usePublishJob } from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { 
  Search, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, Settings, Briefcase, Eye, CheckCircle, AlertTriangle, Link2, Palette, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatApiError } from '@/lib/apiError';
import { downloadCsvFile } from '@/lib/downloadCsv';
import { TipTapRichTextEditor } from '@/features/settings/components/TipTapRichTextEditor';
import { AiSuggestionsTab } from '../components/AiSuggestionsTab';

const stripHtml = (html: string | null | undefined) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

interface ColumnConfig {
  key: string;
  label: string;
}

const ALL_CONFIGURABLE_COLUMNS: ColumnConfig[] = [
  { key: 'jobType', label: 'Job Type' },
  { key: 'experienceLevel', label: 'Experience Level' },
  { key: 'currency', label: 'Currency' },
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'createdAt', label: 'Created At' },
];

export const JobManagement: React.FC = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [selectedJobForAi, setSelectedJobForAi] = useState<string | number | undefined>(undefined);

  const { data: jobsResponse, isLoading, refetch } = useJobs({ pageSize: 500 });
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(editingJob?.id || 0);
  const deleteJob = useDeleteJob();
  const publishJob = usePublishJob();
  
  // Table State
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['jobType', 'experienceLevel']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeStatusPopoverId, setActiveStatusPopoverId] = useState<number | null>(null);

  const jobs = jobsResponse?.data || [];

  const todayDate = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const isJobClosed = (job: any) => {
    const status = String(job.status || '').toLowerCase();
    if (status === 'closed' || status === 'archived') return true;
    const deadline = String(job.expiryDate || job.expiry_date || '').slice(0, 10);
    return Boolean(deadline && deadline <= todayDate);
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return jobs.filter((job: any) => {
      // Tab filter
      const isClosed = isJobClosed(job);
      if (activeTab === 'active' && isClosed) return false;
      if (activeTab === 'closed' && !isClosed) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          job.job_code?.toLowerCase().includes(query) ||
          job.jobCode?.toLowerCase().includes(query) ||
          job.job_title?.toLowerCase().includes(query) ||
          job.jobTitle?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [jobs, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleCreateJob = async (formData: any) => {
    try {
      if (editingJob) {
        await updateJob.mutateAsync(formData);
        toast.success('Job Updated Successfully');
        setEditingJob(null);
      } else {
        await createJob.mutateAsync(formData);
        toast.success('Job Created Successfully');
        setIsCreating(false);
      }
      refetch();
    } catch (error: any) {
      console.error('Failed to save job:', error);
      toast.error(formatApiError(error, 'Failed to save job'));
    }
  };

  const handleCopyCareerLink = (job: any) => {
    const reqId = job.mrfRequestId || job.mrf_request_id || job.id;
    const applyUrl = `${window.location.origin}/liberation/103/${reqId}/aHc9PQ`;
    navigator.clipboard.writeText(applyUrl);
    toast.success(`Career Page apply form link for "${job.jobTitle || job.job_title}" copied to clipboard!`);
  };

  const handleDuplicateJob = async (job: any) => {
    try {
      const cloneData = {
        mrfRequestId: job.mrfRequestId || job.mrf_request_id || undefined,
        jobCode: `${job.jobCode || job.job_code || 'JOB'}-COPY-${Date.now().toString().slice(-4)}`,
        jobTitle: `${job.jobTitle || job.job_title} (Copy)`,
        jobDescription: job.jobDescription || job.job_description || '',
        jobType: job.jobType || job.job_type || 'full_time',
        experienceLevel: job.experienceLevel || job.experience_level || 'mid',
        minExperienceYears: job.minExperienceYears || job.min_experience_years || 0,
        maxExperienceYears: job.maxExperienceYears || job.max_experience_years || 5,
        currency: job.currency || 'INR',
        employmentType: job.employmentType || job.employment_type || 'onsite',
        noOfPositions: job.noOfPositions || job.no_of_positions || 1,
        expiryDate: job.expiryDate || job.expiry_date || todayDate,
      };

      await createJob.mutateAsync(cloneData);
      toast.success(`Job duplicated as "${cloneData.jobTitle}"`);
      refetch();
    } catch (err) {
      console.error('Failed to duplicate job', err);
      toast.error('Failed to duplicate job');
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await deleteJob.mutateAsync(jobToDelete.id);
      toast.success('Job deleted successfully');
      setJobToDelete(null);
      refetch();
    } catch (err) {
      console.error('Failed to delete job', err);
      toast.error('Failed to delete job');
    }
  };

  const handlePublish = async (jobId: number) => {
    try {
      await publishJob.mutateAsync(jobId);
      toast.success('Job Published Successfully');
      setActiveStatusPopoverId(null);
      refetch();
    } catch (error) {
      console.error('Failed to publish job:', error);
      toast.error('Failed to publish job');
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No job records available to export');
      return;
    }
    downloadCsvFile(
      `job_management_${activeTab}_export.csv`,
      ['Job Code', 'Job Title', 'Status', 'Positions', 'Job Type', 'Experience Level', 'Employment Type', 'Application Deadline'],
      filteredData.map((j: any) => [
        j.jobCode || j.job_code || '',
        j.jobTitle || j.job_title || '',
        j.status || '',
        j.noOfPositions || j.no_of_positions || 0,
        j.jobType || j.job_type || '',
        j.experienceLevel || j.experience_level || '',
        j.employmentType || j.employment_type || '',
        String(j.expiryDate || j.expiry_date || '').slice(0, 10),
      ])
    );
    toast.success('Jobs CSV downloaded');
  };

  return (
    <div className="recruitment-page flex-1 min-w-0 space-y-4">
      
      {/* ── Top Header Section ────────────────────────────────────────────────── */}
      <div className="recruitment-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Job Openings & Requisitions
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage active, draft, and closed job postings across all organization departments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto">
          <Button 
            onClick={() => {
              setEditingJob(null);
              setIsCreating(true);
            }}
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Job
          </Button>
          
          <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-xl border-border hover:bg-muted text-muted-foreground shadow-2xs cursor-pointer"
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
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        {/* Controls Toolbar: Tabs & Search */}
        <CardHeader className="p-5 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="recruitment-segments flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/60 w-fit">
            <button
              onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Jobs ({jobs.filter((j: any) => !isJobClosed(j)).length})
            </button>
            <button
              onClick={() => { setActiveTab('closed'); setCurrentPage(1); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'closed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Closed Jobs ({jobs.filter((j: any) => isJobClosed(j)).length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search job title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table Container */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse min-w-[900px]">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border/60 text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-5">Actions</th>
                  <th className="py-3.5 px-5">Job Code</th>
                  <th className="py-3.5 px-5">Job Title & Description</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                    
                    {/* Dynamically configured columns */}
                    {visibleColumns.map((colKey) => {
                      const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === colKey);
                      return (
                        <th key={colKey} className="p-3.5">
                          {col?.label || colKey}
                        </th>
                      );
                    })}

                    <th className="p-3.5 text-center">Positions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-foreground">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5 + visibleColumns.length} className="p-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          Loading jobs...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5 + visibleColumns.length} className="p-12 text-center text-muted-foreground text-xs italic">
                        No Jobs found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setViewingJob(item)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                              title="View Job Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingJob(item)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                              title="Edit Job"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCopyCareerLink(item)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10"
                              title="Copy Career Page Apply Link"
                            >
                              <Link2 className="w-4 h-4 text-indigo-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setJobToDelete(item)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-mono font-bold text-xs text-foreground">{item.jobCode || item.job_code}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-xs">{item.jobTitle || item.job_title}</span>
                            {/* Visibility Badge */}
                            {(() => {
                              const isInt = Boolean(item.isInternal ?? item.is_internal);
                              const isExt = Boolean(item.isPublishedExternal ?? item.is_published_external ?? true);
                              if (isInt && isExt) {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title="Internal IJP + External Career Portal">🏢+🌐 Both</span>;
                              }
                              if (isInt) {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title="Internal Job Posting (Employee Portal Only)">🏢 IJP Only</span>;
                              }
                              if (isExt) {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Public Career Portal">🌐 External</span>;
                              }
                              return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-500/10 text-slate-500 border border-slate-500/20">🔒 Unlisted</span>;
                            })()}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {stripHtml(item.jobDescription || item.job_description).substring(0, 75)}... 
                            <button onClick={() => setViewingJob(item)} className="text-primary font-bold hover:underline ml-1 inline">
                              Read more
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {/* Status Button / Popover trigger */}
                          {(() => {
                            const effectiveStatus = isJobClosed(item) ? 'closed' : (item.status || 'draft');
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div 
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-2xs cursor-pointer transition-transform hover:scale-105",
                                      effectiveStatus === 'published' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                      effectiveStatus === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                                      'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30'
                                    )}
                                    title="Change Status"
                                  >
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      effectiveStatus === 'published' ? 'bg-emerald-500' :
                                      effectiveStatus === 'draft' ? 'bg-amber-500' :
                                      'bg-slate-400'
                                    )} />
                                    {effectiveStatus}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent 
                                  align="center" 
                                  side="top" 
                                  sideOffset={8}
                                  className="w-56 p-4 rounded-xl border border-border bg-card shadow-2xl z-50 text-left text-foreground"
                                >
                                  <h4 className="text-xs font-black text-foreground uppercase border-b border-border pb-2 mb-3">Job Status</h4>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Current Status:</span>
                                      <span className="font-bold uppercase tracking-wider text-foreground">{effectiveStatus}</span>
                                    </div>
                                  </div>
                                  
                                  {effectiveStatus === 'draft' && (
                                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border">
                                      <button
                                        onClick={() => handlePublish(item.id)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2 rounded-lg text-[10px] text-center cursor-pointer transition-colors uppercase tracking-wider"
                                      >
                                        Publish Job
                                      </button>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </td>

                        {/* Dynamic Columns */}
                        {visibleColumns.map(colKey => (
                          <td key={colKey} className="py-3.5 px-5 text-xs text-foreground font-medium">
                            {item[colKey] || item[colKey.replace(/([A-Z])/g, '_$1').toLowerCase()] || '-'}
                          </td>
                        ))}

                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {item.noOfPositions || item.no_of_positions || 1}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground gap-3">
                <div className="font-medium">
                  Showing <span className="font-bold text-foreground">{filteredData.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-foreground">{Math.min(endIndex, filteredData.length)}</span> of <span className="font-bold text-foreground">{filteredData.length}</span> entries
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                      .map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 p-0 rounded-xl text-xs font-bold ${
                            currentPage === pageNum 
                              ? 'bg-primary text-primary-foreground shadow-xs' 
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          {pageNum}
                        </Button>
                      ))}
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

      {/* Create / Edit Modal */}
      {(isCreating || !!editingJob) && (
        <CreateJobModal
          initialData={editingJob}
          onClose={() => {
            setIsCreating(false);
            setEditingJob(null);
          }}
          onSubmit={handleCreateJob}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Delete Job Opening
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete job "{jobToDelete?.jobTitle || jobToDelete?.job_title}" ({jobToDelete?.jobCode || jobToDelete?.job_code})? This action will remove the opening from active recruitment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                deleteJob.mutate(jobToDelete.id, {
                  onSuccess: () => {
                    toast.success('Job Deleted Successfully');
                    setJobToDelete(null);
                    refetch();
                  }
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Job Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={(open) => !open && setViewingJob(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl border-border/80 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/40">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {viewingJob?.jobTitle || viewingJob?.job_title} <span className="text-xs font-mono text-muted-foreground">({viewingJob?.jobCode || viewingJob?.job_code})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto bg-card flex-1 text-sm text-foreground space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-xl border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Positions</span>
                <span className="font-extrabold text-foreground text-sm">{viewingJob?.noOfPositions || viewingJob?.no_of_positions || 1}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Status</span>
                <span className="font-extrabold uppercase text-primary text-xs">{viewingJob?.status || 'Active'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Job Type</span>
                <span className="font-bold text-foreground capitalize">{viewingJob?.jobType || viewingJob?.job_type || 'Full Time'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Employment</span>
                <span className="font-bold text-foreground capitalize">{viewingJob?.employmentType || viewingJob?.employment_type || 'Onsite'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-1.5">Job Description</h4>
              <div 
                className="text-xs leading-relaxed text-muted-foreground prose prose-sm dark:prose-invert max-w-none" 
                dangerouslySetInnerHTML={{ __html: viewingJob?.jobDescription || viewingJob?.job_description || '<p class="italic">No description provided.</p>' }} 
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
            <Button onClick={() => handleCopyCareerLink(viewingJob)} variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 text-xs font-bold rounded-xl h-9">
              <Link2 className="w-4 h-4 text-indigo-500" /> Copy Career Apply Link
            </Button>
            <Button onClick={() => setViewingJob(null)} variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl h-9 text-xs font-bold">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface CreateJobModalProps {
  initialData?: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const extractList = (res: any): any[] => {
  if (!res) return [];
  const body = res?.data?.data !== undefined ? res.data.data : res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.data?.items)) return res.data.data.items;
  return [];
};

const CreateJobModal: React.FC<CreateJobModalProps> = ({ initialData, onClose, onSubmit }) => {
  const [isFresher, setIsFresher] = useState(
    initialData ? (initialData.experienceLevel === 'entry' || initialData.minExperienceYears === 0) : false
  );
  const [isOtherPosition, setIsOtherPosition] = useState(false);
  
  const [formData, setFormData] = useState({
    mrfRequestId: initialData?.mrfRequestId || initialData?.mrf_request_id || undefined,
    jobCode: initialData?.jobCode || initialData?.job_code || '',
    jobTitle: initialData?.jobTitle || initialData?.job_title || '',
    jobDescription: initialData?.jobDescription || initialData?.job_description || '',
    jobType: initialData?.jobType || initialData?.job_type || '',
    experienceLevel: initialData?.experienceLevel || initialData?.experience_level || 'mid',
    minExperienceYears: initialData?.minExperienceYears !== undefined ? initialData.minExperienceYears : (initialData?.min_experience_years !== undefined ? initialData.min_experience_years : undefined),
    maxExperienceYears: initialData?.maxExperienceYears !== undefined ? initialData.maxExperienceYears : (initialData?.max_experience_years !== undefined ? initialData.max_experience_years : undefined),
    currency: initialData?.currency || 'INR',
    employmentType: initialData?.employmentType || initialData?.employment_type || '',
    noOfPositions: initialData?.noOfPositions || initialData?.no_of_positions || 1,
    expiryDate: String(initialData?.expiryDate || initialData?.expiry_date || initialData?.targetClosureDate || initialData?.target_closure_date || '').slice(0, 10),
    departmentId: initialData?.departmentId || initialData?.department_id || undefined,
    isInternal: initialData ? Boolean(initialData.isInternal ?? initialData.is_internal) : false,
    isPublishedExternal: initialData ? Boolean(initialData.isPublishedExternal ?? initialData.is_published_external ?? true) : true,
  });

  // Dynamic Departments from database
  const { data: dbDepartments = [] } = useQuery({
    queryKey: ['settings-departments-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/settings/departments', { params: { pageSize: 500 } });
        const raw = extractList(res);
        const mapped = raw.map((d: any) => ({
          id: Number(d.id),
          name: String(d.name || d.department_name || d.departmentName || d.title || ''),
        })).filter((x: any) => x.id && x.name);

        if (mapped.length > 0) return mapped;

        // Fallback to scope-masters
        const scopeRes = await apiClient.get('/settings/scope-masters');
        const scopeDepts = scopeRes.data?.data?.departments || [];
        return scopeDepts.map((d: any) => ({
          id: Number(d.id),
          name: String(d.name || d.department_name || d.departmentName || d.title || ''),
        })).filter((x: any) => x.id && x.name);
      } catch (e) {
        console.error('Failed to fetch /settings/departments:', e);
        try {
          const scopeRes = await apiClient.get('/settings/scope-masters');
          const scopeDepts = scopeRes.data?.data?.departments || [];
          return scopeDepts.map((d: any) => ({
            id: Number(d.id),
            name: String(d.name || d.department_name || d.departmentName || d.title || ''),
          })).filter((x: any) => x.id && x.name);
        } catch {
          return [];
        }
      }
    }
  });

  // Dynamic Designations / Positions from database
  const { data: dbPositions = [] } = useQuery({
    queryKey: ['settings-designations-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/settings/designations', { params: { pageSize: 1000 } });
        const raw = extractList(res);
        return Array.from(new Set(raw.map((d: any) => String(d.name || d.title || '')).filter(Boolean)));
      } catch {
        return [];
      }
    }
  });

  // Dynamic Employment Types directly from database
  const { data: dbEmploymentTypes = [] } = useQuery({
    queryKey: ['settings-all-employment-types'],
    queryFn: async () => {
      const typesSet = new Set<string>();
      try {
        const res1 = await apiClient.get('/settings/employment-types', { params: { pageSize: 1000, limit: 1000 } });
        const raw1 = extractList(res1);
        raw1.forEach((item: any) => {
          const name = typeof item === 'string' ? item : String(item.name || item.title || item.employee_type || item.employeeType || '').trim();
          if (name) typesSet.add(name);
        });
      } catch (e) {
        console.error('Failed /settings/employment-types', e);
      }

      try {
        const res2 = await apiClient.get('/settings/employment-options');
        const empOpts = res2.data?.data?.employeeTypes || res2.data?.employeeTypes || res2.data?.data?.employmentTypes || res2.data?.employmentTypes || [];
        if (Array.isArray(empOpts)) {
          empOpts.forEach((name: any) => {
            const str = String(name || '').trim();
            if (str) typesSet.add(str);
          });
        }
      } catch (e) {
        console.error('Failed /settings/employment-options', e);
      }

      return Array.from(typesSet);
    }
  });

  // Auto initialize default type from DB if not already set
  useEffect(() => {
    if (dbEmploymentTypes.length > 0) {
      setFormData(prev => ({
        ...prev,
        jobType: prev.jobType || dbEmploymentTypes[0],
        employmentType: prev.employmentType || 'onsite',
      }));
    }
  }, [dbEmploymentTypes]);

  // AI Screening Settings State
  const [aiSettings, setAiSettings] = useState({
    aiScreeningEnabled: true,
    atsEnabled: true,
    atsThreshold: 85,
    jdMatchEnabled: true,
    jdMatchThreshold: 80,
    shortlistingMode: 'ATS_AND_JD' as 'ATS_ONLY' | 'JD_MATCH_ONLY' | 'ATS_AND_JD' | 'WEIGHTED_SCORE' | 'AI_RECOMMENDED',
    atsWeight: 40,
    jdMatchWeight: 60,
    autoShortlistEnabled: false,
    suggestionLimit: 50,
    mandatorySkills: '',
  });

  // Load existing AI Settings if editing
  useEffect(() => {
    if (initialData?.id) {
      apiClient.get(`/recruitment/jobs/${initialData.id}/ai-settings`)
        .then(res => {
          if (res.data?.success && res.data.data) {
            const s = res.data.data;
            setAiSettings({
              aiScreeningEnabled: s.aiScreeningEnabled ?? true,
              atsEnabled: s.atsEnabled ?? true,
              atsThreshold: s.atsThreshold ?? 85,
              jdMatchEnabled: s.jdMatchEnabled ?? true,
              jdMatchThreshold: s.jdMatchThreshold ?? 80,
              shortlistingMode: s.shortlistingMode || 'ATS_AND_JD',
              atsWeight: s.atsWeight ?? 40,
              jdMatchWeight: s.jdMatchWeight ?? 60,
              autoShortlistEnabled: s.autoShortlistEnabled ?? false,
              suggestionLimit: s.suggestionLimit ?? 50,
              mandatorySkills: Array.isArray(s.mandatorySkills) ? s.mandatorySkills.join(', ') : (s.mandatorySkills || ''),
            });
          }
        })
        .catch(() => {});
    }
  }, [initialData]);

  const { data: mrfResponse } = useQuery({
    queryKey: ['mrf-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/recruitment/mrf', { params: { pageSize: 100 } });
      return res.data;
    }
  });
  const mrfRequests = mrfResponse?.data || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'noOfPositions' || name === 'minExperienceYears' || name === 'maxExperienceYears' 
        ? (value === '' ? undefined : parseInt(value, 10)) 
        : value
    }));
  };

  const handleMrfSelect = (mrfIdStr: string) => {
    const mrfId = mrfIdStr ? parseInt(mrfIdStr, 10) : undefined;
    if (!mrfId) {
      setFormData(prev => ({ ...prev, mrfRequestId: undefined }));
      return;
    }
    const mrf = mrfRequests.find((m: any) => m.id === mrfId);
    if (mrf) {
      // 1. Position Name / Job Role from MRF
      const posTitle = String(mrf.position_title || mrf.positionTitle || '').trim();
      setIsOtherPosition(false);

      // 2. Parse experience desired from MRF
      const expStr = String(mrf.experience_desired || mrf.experienceDesired || mrf.experience || '').trim();
      let minExp: number | undefined = undefined;
      let maxExp: number | undefined = undefined;
      let expLevel = 'mid';
      let fresherFlag = false;

      if (expStr) {
        const lower = expStr.toLowerCase();
        if (lower.includes('fresh')) {
          fresherFlag = true;
          minExp = 0;
          maxExp = 1;
          expLevel = 'entry';
        } else {
          const numbers = expStr.match(/\d+(\.\d+)?/g);
          if (numbers && numbers.length >= 2) {
            minExp = parseFloat(numbers[0]);
            maxExp = parseFloat(numbers[1]);
            fresherFlag = (minExp === 0);
            expLevel = minExp === 0 ? 'entry' : minExp < 3 ? 'junior' : minExp <= 6 ? 'mid' : 'senior';
          } else if (numbers && numbers.length === 1) {
            minExp = parseFloat(numbers[0]);
            maxExp = minExp + 2;
            fresherFlag = (minExp === 0);
            expLevel = minExp === 0 ? 'entry' : minExp < 3 ? 'junior' : minExp <= 6 ? 'mid' : 'senior';
          }
        }
        setIsFresher(fresherFlag);
      }

      // 3. Map MRF employment type
      const mrfEmpType = String(mrf.employment_type || mrf.employmentType || '').trim();

      setFormData(prev => ({
        ...prev,
        mrfRequestId: mrf.id,
        jobTitle: posTitle || prev.jobTitle,
        jobType: mrfEmpType || prev.jobType || 'full_time',
        jobDescription: mrf.job_description || mrf.jobDescription || prev.jobDescription,
        noOfPositions: Number(mrf.number_of_positions || mrf.numberOfPositions) || prev.noOfPositions || 1,
        departmentId: mrf.department_id || mrf.departmentId ? Number(mrf.department_id || mrf.departmentId) : prev.departmentId,
        employmentType: prev.employmentType || 'onsite',
        minExperienceYears: minExp !== undefined ? minExp : prev.minExperienceYears,
        maxExperienceYears: maxExp !== undefined ? maxExp : prev.maxExperienceYears,
        experienceLevel: expLevel,
        expiryDate: String(mrf.expiry_date || mrf.expiryDate || mrf.target_closure_date || mrf.targetClosureDate || prev.expiryDate || '').slice(0, 10),
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-border/80">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/40">
          <div>
            <h2 className="text-lg font-black text-foreground">{initialData ? 'Edit Job Opening' : 'Create New Job Opening'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{initialData ? 'Update opening requirements and AI screening rules.' : 'Fill in the details and configure AI ATS screening rules.'}</p>
          </div>
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="create-job-form" onSubmit={(e) => {
            e.preventDefault();
            const deadline = String(formData.expiryDate || '').slice(0, 10);
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!deadline) {
              toast.error('Application deadline is required');
              return;
            }
            if (deadline < today) {
              toast.error('Application deadline must be today or a future date');
              return;
            }
            onSubmit({
              ...formData,
              jobType: formData.jobType || 'full_time',
              employmentType: formData.employmentType || 'onsite',
              expiryDate: deadline,
              aiSettings,
            });
          }} className="space-y-5">

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-primary uppercase tracking-wider block">Link to MRF Requisition</label>
              <select
                value={formData.mrfRequestId || ''}
                onChange={(e) => handleMrfSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-card border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="">-- No MRF (Direct Job) --</option>
                {mrfRequests
                  .filter((m: any) => m.status !== 'Closed' && m.stage !== 'Rejected')
                  .map((mrf: any) => {
                    const mrNum = mrf.mr_number || mrf.mrNumber || `MR-${mrf.id}`;
                    const title = mrf.position_title || mrf.positionTitle || 'Position';
                    const stage = mrf.stage || 'Pending Approval';
                    return (
                      <option key={mrf.id} value={mrf.id}>
                        {mrNum} - {title} ({stage})
                      </option>
                    );
                  })}
              </select>
              <p className="text-[11px] text-muted-foreground">Selecting an MRF will auto-fill job details based on manager requests. Pending MRFs will be automatically approved upon job creation.</p>
            </div>

            {/* ── Visibility & Reach ── */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-border/80 p-4 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">Job Visibility & Candidate Reach</label>
                <p className="text-[11px] text-muted-foreground">Configure where this opening is visible and who is eligible to apply.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Internal Job Posting (IJP) Switch */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, isInternal: !prev.isInternal }))}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    formData.isInternal 
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-900 dark:text-blue-200' 
                      : 'bg-card border-border/70 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={formData.isInternal}
                    onChange={(e) => setFormData(prev => ({ ...prev, isInternal: e.target.checked }))}
                    className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 pointer-events-none"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>🏢 Internal Opening (IJP)</span>
                      {formData.isInternal && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-500 text-white rounded">Active</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Listed in Employee Portal for existing staff to explore and apply.
                    </p>
                  </div>
                </div>

                {/* External Career Portal Switch */}
                <div 
                  onClick={() => setFormData(prev => ({ ...prev, isPublishedExternal: !prev.isPublishedExternal }))}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    formData.isPublishedExternal 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200' 
                      : 'bg-card border-border/70 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={formData.isPublishedExternal}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublishedExternal: e.target.checked }))}
                    className="mt-0.5 rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0 pointer-events-none"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>🌐 Career Portal (External)</span>
                      {formData.isPublishedExternal && <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-500 text-white rounded">Active</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Publicly visible for outside candidates via Career Portal link.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Job Code <span className="text-rose-500">*</span></label>
                <Input
                  name="jobCode"
                  placeholder="e.g. SE-001"
                  value={formData.jobCode}
                  onChange={handleChange}
                  className="bg-background border-border text-xs rounded-xl h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Department</label>
                <select
                  name="departmentId"
                  value={formData.departmentId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs h-9"
                >
                  <option value="">-- Select Department --</option>
                  {dbDepartments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Job Description <span className="text-rose-500">*</span></label>
              <TipTapRichTextEditor
                content={formData.jobDescription}
                onChange={(html) => setFormData(prev => ({ ...prev, jobDescription: html }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Position Name/ Job Role <span className="text-rose-500">*</span>
                  </label>
                  {isOtherPosition && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtherPosition(false);
                        const fallbackPos = dbPositions[0] || '';
                        setFormData(prev => ({ ...prev, jobTitle: fallbackPos }));
                      }}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      ← Select from List
                    </button>
                  )}
                </div>

                {!isOtherPosition ? (
                  <select
                    value={formData.jobTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__OTHER__') {
                        setIsOtherPosition(true);
                        setFormData(prev => ({ ...prev, jobTitle: '' }));
                      } else {
                        setFormData(prev => ({ ...prev, jobTitle: val }));
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs h-9 cursor-pointer"
                    required
                  >
                    <option value="">-- Select Position / Job Role --</option>
                    {formData.jobTitle && !dbPositions.includes(formData.jobTitle) && (
                      <option value={formData.jobTitle}>{formData.jobTitle}</option>
                    )}
                    {dbPositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                    <option value="__OTHER__">Other</option>
                  </select>
                ) : (
                  <Input
                    name="jobTitle"
                    placeholder="Type custom position / job role..."
                    value={formData.jobTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, jobTitle: val }));
                    }}
                    className="bg-background border-border text-xs rounded-xl h-9"
                    required
                    autoFocus
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">Experience Level</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs font-bold ${isFresher ? 'text-primary' : 'text-muted-foreground'}`}>Fresher</span>
                    <div 
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isFresher ? 'bg-primary/30' : 'bg-muted'}`}
                      onClick={() => {
                        const nextVal = !isFresher;
                        setIsFresher(nextVal);
                        if (nextVal) {
                          setFormData(prev => ({ ...prev, experienceLevel: 'entry', minExperienceYears: 0, maxExperienceYears: 1 }));
                        } else {
                          setFormData(prev => ({ ...prev, experienceLevel: 'mid', minExperienceYears: prev.minExperienceYears || 1, maxExperienceYears: prev.maxExperienceYears || 3 }));
                        }
                      }}
                    >
                      <div className={`w-4 h-4 rounded-full bg-primary shadow transition-transform ${!isFresher ? 'translate-x-4 bg-muted-foreground' : ''}`}></div>
                    </div>
                    <span className={`text-xs font-bold ${!isFresher ? 'text-primary' : 'text-muted-foreground'}`}>Experienced</span>
                  </label>
                </div>
                
                {!isFresher && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      type="number"
                      name="minExperienceYears"
                      placeholder="Min (Yrs)"
                      value={formData.minExperienceYears !== undefined && formData.minExperienceYears !== null ? formData.minExperienceYears : ''}
                      onChange={handleChange}
                      className="bg-background border-border text-xs rounded-xl h-9"
                      min={0}
                    />
                    <Input
                      type="number"
                      name="maxExperienceYears"
                      placeholder="Max (Yrs)"
                      value={formData.maxExperienceYears !== undefined && formData.maxExperienceYears !== null ? formData.maxExperienceYears : ''}
                      onChange={handleChange}
                      className="bg-background border-border text-xs rounded-xl h-9"
                      min={0}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Job Type</label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs h-9"
                >
                  {dbEmploymentTypes.length > 0 ? (
                    dbEmploymentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Work Arrangement</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-xl bg-background border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs h-9"
                >
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Open Positions <span className="text-rose-500">*</span></label>
                <Input
                  type="number"
                  name="noOfPositions"
                  value={formData.noOfPositions}
                  onChange={handleChange}
                  min={1}
                  className="bg-background border-border text-xs rounded-xl h-9"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Application Deadline <span className="text-rose-500">*</span></label>
                <Input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate || ''}
                  onChange={handleChange}
                  min={(() => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  })()}
                  className="bg-background border-border text-xs rounded-xl h-9"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/40 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border text-foreground hover:bg-muted rounded-xl h-9 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-job-form"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-9 text-xs shadow-xs gap-1.5"
          >
            <CheckCircle className="w-4 h-4" /> {initialData ? 'Update Job' : 'Create Job'}
          </Button>
        </div>

      </div>
    </div>
  );
};
