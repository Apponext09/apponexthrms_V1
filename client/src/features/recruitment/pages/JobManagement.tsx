import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob, usePublishJob } from '../hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Search, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, Settings, Briefcase, Eye, CheckCircle, AlertTriangle, Link2, Palette, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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

  const { data: jobsResponse, isLoading, refetch } = useJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(editingJob?.id || 0);
  const deleteJob = useDeleteJob();
  const publishJob = usePublishJob();
  
  // Table State
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'ai_suggestions'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['jobType', 'experienceLevel']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeStatusPopoverId, setActiveStatusPopoverId] = useState<number | null>(null);

  const jobs = jobsResponse?.data || [];

  // Filter Data
  const filteredData = useMemo(() => {
    return jobs.filter((job: any) => {
      // Tab filter
      const isClosed = job.status === 'closed';
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
      const errMsg = error?.response?.data?.details 
        ? Object.entries(error.response.data.details).map(([k, v]: any) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : (error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to save job');
      toast.error(errMsg);
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
    const headers = ['Job Code', 'Job Title', 'Status', 'Positions', 'Job Type', 'Experience Level', 'Employment Type'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map((j: any) => {
        const code = j.jobCode || j.job_code || '';
        const title = j.jobTitle || j.job_title || '';
        const status = j.status || '';
        const positions = j.noOfPositions || j.no_of_positions || 0;
        const type = j.jobType || j.job_type || '';
        const exp = j.experienceLevel || j.experience_level || '';
        const empType = j.employmentType || j.employment_type || '';
        return `"${code}","${title}","${status}","${positions}","${type}","${exp}","${empType}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job_management_${activeTab}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Jobs exported successfully');
  };

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Job Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage open, closed, and published job postings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              setEditingJob(null);
              setIsCreating(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all duration-200 text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Job
          </Button>
          
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm transition-all"
            >
              <Settings className="w-4 h-4" />
            </Button>
            {/* Settings Popover */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure Columns</h4>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {ALL_CONFIGURABLE_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="ml-2 text-sm text-slate-600">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative">
        
        {/* Search Input */}
        {activeTab !== 'ai_suggestions' && (
          <div className="absolute right-4 top-2 z-20 w-64">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm h-9 text-sm rounded-full"
              />
            </div>
          </div>
        )}

        {/* Tabs Row */}
        <div className="flex items-center gap-1 mb-[-1px]">
          <button
            onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'active'
                ? 'bg-white text-slate-800 border-t-blue-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            Active Jobs
          </button>
          <button
            onClick={() => { setActiveTab('closed'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'closed'
                ? 'bg-white text-slate-800 border-t-slate-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            Closed Jobs
          </button>
        </div>

        {/* Result Card Wrapper */}
        <div className="bg-white border border-slate-200 rounded-b-xl rounded-tr-xl p-5 shadow-sm">
            
            {/* Result Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'active' ? 'bg-blue-500' : 'bg-slate-400'}`}></span> Result
              </h3>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="text-slate-600 hover:text-slate-800 flex items-center gap-2 border-slate-200 hover:bg-slate-50 shadow-sm h-9"
              >
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>

            {/* Show Entries & Quick Text */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 text-xs text-slate-500 gap-2">
              <div className="font-medium">
                Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
              </div>
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg w-full">
              <table className="w-full text-sm text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Job Code</th>
                    <th className="p-3.5">Job Title</th>
                    <th className="p-3.5 text-center">Status</th>
                    
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
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5 + visibleColumns.length} className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                          Loading jobs...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5 + visibleColumns.length} className="p-8 text-center text-slate-400 italic">
                        No Jobs found matching the criteria
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                        <td className="p-3.5">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setViewingJob(item)}
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              title="View Job Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingJob(item)}
                              className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              title="Edit Job"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleCopyCareerLink(item)}
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Copy Career Page Apply Link"
                            >
                              <Link2 className="w-4 h-4 text-indigo-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setJobToDelete(item)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Job"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{item.jobCode || item.job_code}</td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800">{item.jobTitle || item.job_title}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {stripHtml(item.jobDescription || item.job_description).substring(0, 60)}... 
                            <button onClick={() => setViewingJob(item)} className="text-blue-600 font-semibold hover:underline ml-1">
                              Read more
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-center relative">
                          {/* Status Button / Popover trigger */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusPopoverId(prev => prev === item.id ? null : item.id);
                            }}
                            className={cn(
                              "inline-flex items-center justify-center p-1.5 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-105",
                              item.status === 'published' ? 'bg-green-100 text-green-600' :
                              item.status === 'draft' ? 'bg-amber-100 text-amber-600' :
                              'bg-slate-100 text-slate-500'
                            )}
                            title="Change Status"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>

                          {/* Status Popover */}
                          {activeStatusPopoverId === item.id && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-[70%] top-[40%] bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-left z-50 min-w-[220px] text-slate-700 select-none animate-in fade-in zoom-in-95 duration-150"
                            >
                              <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-2 mb-3">Job Status</h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Current Status:</span>
                                  <span className="font-semibold uppercase tracking-wider">{item.status}</span>
                                </div>
                              </div>
                              
                              {item.status === 'draft' && (
                                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                                  <button
                                    onClick={() => handlePublish(item.id)}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-2 rounded text-[10px] text-center cursor-pointer transition-colors uppercase tracking-wider"
                                  >
                                    Publish Job
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Dynamic Columns */}
                        {visibleColumns.map(colKey => (
                          <td key={colKey} className="p-3.5">
                            {item[colKey] || item[colKey.replace(/([A-Z])/g, '_$1').toLowerCase()] || '-'}
                          </td>
                        ))}

                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {item.noOfPositions || item.no_of_positions}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-sm">
                <div className="text-slate-500 font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Button
                        key={i + 1}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`h-8 w-8 p-0 ${
                          currentPage === i + 1 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' 
                            : 'text-slate-600 border-slate-200 hover:bg-slate-50'
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
      </div>

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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" />
              {viewingJob?.jobTitle || viewingJob?.job_title} ({viewingJob?.jobCode || viewingJob?.job_code})
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto bg-white flex-1 text-sm text-slate-700 prose prose-sm max-w-none space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg not-prose text-xs">
              <div>
                <span className="text-slate-500 block">Positions:</span>
                <span className="font-bold text-slate-800">{viewingJob?.noOfPositions || viewingJob?.no_of_positions}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="font-bold uppercase text-slate-800">{viewingJob?.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Job Type:</span>
                <span className="font-bold text-slate-800">{viewingJob?.jobType || viewingJob?.job_type || 'Full Time'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Employment:</span>
                <span className="font-bold text-slate-800">{viewingJob?.employmentType || viewingJob?.employment_type || 'Onsite'}</span>
              </div>
            </div>

            <h4 className="text-sm font-bold text-slate-800 border-b pb-1">Job Description</h4>
            <div dangerouslySetInnerHTML={{ __html: viewingJob?.jobDescription || viewingJob?.job_description || '<p class="text-slate-400 italic">No description provided.</p>' }} />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <Button onClick={() => handleCopyCareerLink(viewingJob)} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 text-xs font-semibold">
              <Link2 className="w-4 h-4 text-indigo-600" /> Copy Career Apply Link
            </Button>
            <Button onClick={() => setViewingJob(null)} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-100">Close</Button>
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

const CreateJobModal: React.FC<CreateJobModalProps> = ({ initialData, onClose, onSubmit }) => {
  const [isFresher, setIsFresher] = useState(
    initialData ? (initialData.experienceLevel === 'entry' || initialData.minExperienceYears === 0) : false
  );
  
  const [formData, setFormData] = useState({
    mrfRequestId: initialData?.mrfRequestId || initialData?.mrf_request_id || undefined,
    jobCode: initialData?.jobCode || initialData?.job_code || '',
    jobTitle: initialData?.jobTitle || initialData?.job_title || '',
    jobDescription: initialData?.jobDescription || initialData?.job_description || '',
    jobType: initialData?.jobType || initialData?.job_type || 'full_time',
    experienceLevel: initialData?.experienceLevel || initialData?.experience_level || 'mid',
    minExperienceYears: initialData?.minExperienceYears || initialData?.min_experience_years || undefined,
    maxExperienceYears: initialData?.maxExperienceYears || initialData?.max_experience_years || undefined,
    currency: initialData?.currency || 'INR',
    employmentType: initialData?.employmentType || initialData?.employment_type || 'onsite',
    noOfPositions: initialData?.noOfPositions || initialData?.no_of_positions || 1,
    expiryDate: initialData?.expiryDate || initialData?.expiry_date || initialData?.targetClosureDate || initialData?.target_closure_date || '',
    departmentId: initialData?.departmentId || initialData?.department_id || undefined,
  });

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
        ? parseInt(value, 10) 
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
      let mappedJobType = 'full_time';
      const rawType = (mrf.employment_type || mrf.employmentType || '').toLowerCase();
      if (rawType.includes('part')) mappedJobType = 'part_time';
      else if (rawType.includes('contract')) mappedJobType = 'contract';
      else if (rawType.includes('intern')) mappedJobType = 'internship';
      else if (rawType.includes('full')) mappedJobType = 'full_time';

      setFormData(prev => ({
        ...prev,
        mrfRequestId: mrf.id,
        jobTitle: mrf.position_title || mrf.positionTitle || prev.jobTitle,
        jobDescription: mrf.job_description || mrf.jobDescription || prev.jobDescription,
        noOfPositions: Number(mrf.number_of_positions || mrf.numberOfPositions) || prev.noOfPositions || 1,
        departmentId: mrf.department_id || mrf.departmentId ? Number(mrf.department_id || mrf.departmentId) : prev.departmentId,
        jobType: mappedJobType,
        employmentType: prev.employmentType || 'onsite',
        expiryDate: mrf.expiry_date || mrf.expiryDate || mrf.target_closure_date || mrf.targetClosureDate || prev.expiryDate,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Job Opening' : 'Create New Job'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{initialData ? 'Update opening requirements and AI screening rules.' : 'Fill in the details and configure AI ATS screening rules.'}</p>
          </div>
          <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="create-job-form" onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...formData,
              aiSettings,
            });
          }} className="space-y-5">

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-2">
              <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Link to MRF Requisition</label>
              <select
                value={formData.mrfRequestId || ''}
                onChange={(e) => handleMrfSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm font-medium text-slate-700"
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
              <p className="text-[10px] text-blue-600">Selecting an MRF will auto-fill job details based on manager requests. Pending MRFs will be automatically approved upon job creation.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Code <span className="text-red-500">*</span></label>
                <Input
                  name="jobCode"
                  placeholder="e.g. SE-001"
                  value={formData.jobCode}
                  onChange={handleChange}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Title <span className="text-red-500">*</span></label>
                <Input
                  name="jobTitle"
                  placeholder="e.g. Senior Node.js Developer"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Description <span className="text-red-500">*</span></label>
              <TipTapRichTextEditor
                content={formData.jobDescription}
                onChange={(html) => setFormData(prev => ({ ...prev, jobDescription: html }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Job Type</label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Experience Requirement</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs font-bold ${isFresher ? 'text-blue-600' : 'text-slate-400'}`}>Fresher</span>
                    <div 
                      className={`w-10 h-5 rounded-full p-1 transition-colors ${isFresher ? 'bg-blue-100' : 'bg-slate-300'}`}
                      onClick={() => {
                        setIsFresher(!isFresher);
                        if (!isFresher) {
                          setFormData(prev => ({ ...prev, experienceLevel: 'entry', minExperienceYears: 0, maxExperienceYears: 1 }));
                        }
                      }}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${!isFresher ? 'translate-x-5 bg-blue-500' : ''}`}></div>
                    </div>
                    <span className={`text-xs font-bold ${!isFresher ? 'text-blue-600' : 'text-slate-400'}`}>Experienced</span>
                  </label>
                </div>
                
                {!isFresher && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      type="number"
                      name="minExperienceYears"
                      placeholder="Min (Yrs)"
                      value={formData.minExperienceYears || ''}
                      onChange={handleChange}
                      className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                      min={0}
                    />
                    <Input
                      type="number"
                      name="maxExperienceYears"
                      placeholder="Max (Yrs)"
                      value={formData.maxExperienceYears || ''}
                      onChange={handleChange}
                      className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                      min={0}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Employment Type</label>
                <select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                >
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Positions <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  name="noOfPositions"
                  value={formData.noOfPositions}
                  onChange={handleChange}
                  min={1}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Application Deadline / Expiry Date</label>
                <Input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate || ''}
                  onChange={handleChange}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Currency</label>
                <Input
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-500 shadow-sm uppercase"
                  maxLength={3}
                />
              </div>
            </div>



          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-job-form"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> {initialData ? 'Update Job' : 'Create Job'}
          </Button>
        </div>

      </div>
    </div>
  );
};
