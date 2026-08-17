import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCandidates, useCreateCandidate, useUpdateCandidate, useDeleteCandidate, useJobs } from '../hooks';
import { useRecruitmentStore } from '../store/useRecruitmentStore';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Search, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, Settings, Users, Eye, Clipboard, CheckCircle, Link2,
  FileText, ExternalLink, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BulkCandidateImportModal } from '../components/BulkCandidateImportModal';

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
  { key: 'ai_score', label: 'AI Score' },
];

export const CandidateManagement: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [viewingCandidate, setViewingCandidate] = useState<any>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<any>(null);

  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate(editingCandidate?.id || 0);
  const deleteCandidate = useDeleteCandidate();
  const { data: jobsResponse } = useJobs();
  
  // Table State
  const [activeTab, setActiveTab] = useState<'all' | 'applied' | 'interview' | 'offer'>('all');
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
    return ['source', 'ai_score', 'years_of_experience'];
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeLinkPopoverId, setActiveLinkPopoverId] = useState<number | null>(null);
  const [selectedJobIdForLink, setSelectedJobIdForLink] = useState<string>('');

  const { data: candidatesResponse, isLoading, refetch } = useCandidates({
    page: currentPage,
    pageSize: entriesPerPage,
    search: searchQuery,
    status: activeTab === 'all' ? undefined : activeTab
  });

  const candidates = candidatesResponse?.data || [];
  const jobs = Array.isArray(jobsResponse?.data) ? jobsResponse.data : (Array.isArray(jobsResponse?.data?.items) ? jobsResponse.data.items : (Array.isArray(jobsResponse) ? jobsResponse : []));
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
      candidateId,
      jobId: Number(selectedJobIdForLink),
      appliedFromSource: 'Candidate Management',
      applicationStatus: 'applied'
    })
    .then(res => {
      if (res.data?.success) {
        toast.success('Candidate successfully linked to Job!');
        setActiveLinkPopoverId(null);
        setSelectedJobIdForLink('');
      } else {
        toast.error(res.data?.message || 'Failed to link candidate');
      }
    })
    .catch(err => {
      console.error('Failed to create application', err);
      toast.error('Failed to link candidate');
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

  const handleExport = () => {
    toast.success('Export started');
    // Implement CSV export logic here
  };

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 bg-slate-50/50 min-h-[calc(100vh-4rem)]">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Candidate Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage, review, and link candidates to job openings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            type="button"
            variant="outline"
            onClick={() => setIsBulkImportOpen(true)}
            className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold shadow-2xs text-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-indigo-600" />
            Bulk Import (CSV / Excel)
          </Button>

          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Candidate
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
      <div className="flex flex-col relative w-full">
        {/* Search Bar */}
        <div className="absolute right-4 top-2 z-20 w-64">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm h-9 text-sm rounded-full"
            />
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex items-center gap-1 mb-[-1px]">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-white text-slate-800 border-t-blue-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            All Candidates
          </button>
          <button
            onClick={() => { setActiveTab('applied'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'applied'
                ? 'bg-white text-slate-800 border-t-amber-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            Applied
          </button>
          <button
            onClick={() => { setActiveTab('interview'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'interview'
                ? 'bg-white text-slate-800 border-t-green-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            Interviewing
          </button>
          <button
            onClick={() => { setActiveTab('offer'); setCurrentPage(1); }}
            className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
              activeTab === 'offer'
                ? 'bg-white text-slate-800 border-t-purple-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
                : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            Offered
          </button>
        </div>

        {/* Result Card Wrapper */}
        <div className="bg-white border border-slate-200 rounded-b-xl rounded-tr-xl p-5 shadow-sm">
          
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'all' ? 'bg-blue-500' : activeTab === 'applied' ? 'bg-amber-500' : activeTab === 'interview' ? 'bg-green-500' : 'bg-purple-500'}`}></span> Result
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
              Showing {totalEntries === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalEntries)} of {totalEntries} entries
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
          <div className="overflow-x-auto border border-slate-200 rounded-lg w-full pb-[200px]">
            <table className="w-full text-sm text-left border-collapse min-w-[1000px] mrf-table">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Candidate Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5 text-center">Status</th>
                  
                  {/* Dynamically configured columns */}
                  {visibleColumns.map((colKey) => {
                    const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === colKey);
                    return (
                      <th key={colKey} className={cn("p-3.5", colKey === 'ai_score' && "text-center")}>
                        {col?.label || colKey}
                      </th>
                    );
                  })}
                  
                  <th className="p-3.5 text-center">Link Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {isLoading ? (
                  <tr>
                    <td colSpan={5 + visibleColumns.length} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                        Loading candidates...
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5 + visibleColumns.length} className="p-8 text-center text-slate-400 italic">
                      No Candidates found matching the criteria
                    </td>
                  </tr>
                ) : (
                  candidates.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="p-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingCandidate(item)} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingCandidate(item)} className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50"><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setCandidateToDelete(item)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-700">
                          {((item.first_name || item.firstName)
                            ? `${item.first_name || item.firstName || ''} ${item.last_name || item.lastName || ''}`.trim()
                            : (item.name || item.candidate_name || item.candidateName || (item.email ? item.email.split('@')[0] : 'Candidate')))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">{item.email}</td>
                      <td className="p-3.5 text-center">
                        <span className={cn(
                          "px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md",
                          ['offer', 'hired'].includes(item.status) ? 'bg-green-100 text-green-700' :
                          ['rejected', 'dropped'].includes(item.status) ? 'bg-red-100 text-red-700' :
                          item.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {item.status || 'Applied'}
                        </span>
                      </td>

                      {/* Dynamic Columns */}
                      {visibleColumns.map(colKey => {
                        const val = item[colKey];
                        const isScore = colKey === 'ai_score';
                        const isSource = colKey === 'source';

                        if (isSource) {
                          const hasResumeBank = Boolean(item.resume_tracker_id || item.resume_bank_id);
                          return (
                            <td key={colKey} className="p-3.5">
                              {hasResumeBank ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200" title={`Sourced from Resume Bank (${item.resume_tracker_id || 'ID:' + item.resume_bank_id})`}>
                                  <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>Resume Bank</span>
                                  {item.resume_tracker_id && (
                                    <span className="text-[10px] text-purple-600 font-mono font-bold">[{item.resume_tracker_id}]</span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  {val || 'Direct Apply'}
                                </span>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={colKey} className={cn("p-3.5", isScore && "text-center")}>
                            {isScore ? (
                              <span className="font-bold text-slate-700">{val ? `${val}/100` : '-'}</span>
                            ) : (
                              val || '-'
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3.5 text-center relative">
                        {/* Link to Job Button / Popover trigger */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLinkPopoverId(prev => prev === item.id ? null : item.id);
                            setSelectedJobIdForLink('');
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 shadow-sm cursor-pointer transition-colors"
                          title="Link to Job"
                        >
                          <Link2 className="w-4 h-4" />
                        </div>

                        {/* Link to Job Popover */}
                        {activeLinkPopoverId === item.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-[50%] top-[40%] bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-left z-50 min-w-[280px] text-slate-700 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-2 mb-3">Link Candidate to Job</h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Select Job Opening</label>
                                <select
                                  value={selectedJobIdForLink}
                                  onChange={(e) => setSelectedJobIdForLink(e.target.value)}
                                  className="w-full border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                                >
                                  <option value="">-- Choose Job Opening --</option>
                                  {(Array.isArray(jobs) ? jobs : []).map((job: any) => {
                                    const code = job.job_code || job.jobCode || job.mr_number || `JOB-${job.id}`;
                                    const title = job.job_title || job.position_title || job.title || job.positionTitle || 'Software Developer';
                                    return (
                                      <option key={job.id} value={job.id}>
                                        [{code}] {title}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              <div className="pt-2 border-t border-slate-100 flex gap-2">
                                <button
                                  onClick={() => setActiveLinkPopoverId(null)}
                                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 px-2 rounded text-[10px] text-center cursor-pointer transition-colors uppercase tracking-wider"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleLinkToJob(item.id)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded text-[10px] text-center cursor-pointer transition-colors uppercase tracking-wider"
                                >
                                  Apply to Job
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {candidates.length > 0 && (
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

      {isCreating && (
        <CandidateFormModal
          jobs={jobs}
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
    </div>
  );
};

interface CandidateFormModalProps {
  onClose: () => void;
  onSubmit: (data: any, jobId?: number) => void;
  initialData?: any;
  jobs?: any[];
}

const CandidateFormModal: React.FC<CandidateFormModalProps> = ({ onClose, onSubmit, initialData, jobs }) => {
  const [formData, setFormData] = useState({
    firstName: initialData?.first_name || '',
    lastName: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    alternativePhone: initialData?.alternative_phone || '',
    gender: initialData?.gender || 'Male',
    maritalStatus: initialData?.marital_status || initialData?.maritalStatus || 'Unmarried',
    qualification: initialData?.qualification || '',
    skills: initialData?.skills || '',
    dateOfBirth: initialData?.dob || initialData?.date_of_birth || '',
    yearsOfExperience: initialData?.years_of_experience || 0,
    currentCompany: initialData?.current_company || '',
    currentSalary: initialData?.current_salary || '',
    expectedSalary: initialData?.expected_salary || '',
    noticePeriodDays: initialData?.notice_period_days || 0,
    linkedinUrl: initialData?.linkedin_url || '',
    portfolioUrl: initialData?.portfolio_url || '',
    source: initialData?.source || 'direct_apply',
  });
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['yearsOfExperience', 'noticePeriodDays', 'currentSalary', 'expectedSalary'].includes(name) 
        ? (value ? parseFloat(value) : '') 
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
            
            // Clean up empty fields to prevent Zod validation errors
            const payload: any = { ...formData };
            if (payload.currentSalary === '') delete payload.currentSalary;
            if (payload.expectedSalary === '') delete payload.expectedSalary;
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
                  <Input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="bg-white border-slate-200 focus-visible:ring-blue-500 shadow-sm" />
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
          Are you sure you want to delete <strong>{candidate.first_name} {candidate.last_name}</strong>? This action cannot be undone.
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
    } catch {
      toast.error('Failed to add skill');
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/skills/${id}`);
      fetchSkills();
    } catch {
      toast.error('Failed to delete skill');
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
    } catch {
      toast.error('Failed to add education record');
    }
  };

  const handleDeleteEdu = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/education/${id}`);
      fetchEducation();
    } catch {
      toast.error('Failed to delete education record');
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
    } catch {
      toast.error('Failed to add experience record');
    }
  };

  const handleDeleteExp = async (id: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/experience/${id}`);
      fetchExperience();
    } catch {
      toast.error('Failed to delete experience record');
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
      fetchDocuments();
    } catch {
      toast.error('Failed to upload document');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await apiClient.delete(`/recruitment/candidates/${candidate.id}/documents/${docId}`);
      fetchDocuments();
    } catch {
      toast.error('Failed to delete document');
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
                  <p className="font-medium text-slate-800">{candidate.first_name} {candidate.last_name}</p>
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
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Experience</p>
                  <p className="font-medium text-slate-800">{candidate.years_of_experience || 0} years</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Status</p>
                  <p className="font-medium text-slate-800 uppercase text-xs">{candidate.status || 'Applied'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Company</p>
                  <p className="font-medium text-slate-800">{candidate.current_company || 'N/A'}</p>
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
                  skills.map((s) => (
                    <div key={s.id} className="flex justify-between items-center p-2 border rounded text-xs bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{s.skill_name}</span>
                        <span className="ml-2 text-slate-500 uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{s.proficiency}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {s.years_of_experience && <span className="text-slate-600">{s.years_of_experience} yrs</span>}
                        <button onClick={() => handleDeleteSkill(s.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
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
                  education.map((e) => (
                    <div key={e.id} className="p-2 border rounded text-xs bg-slate-50 relative flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">{e.degree} in {e.field_of_study || 'N/A'}</p>
                        <p className="text-slate-500 text-[10px]">{e.institution || 'N/A'} {e.graduation_year ? `(${e.graduation_year})` : ''}</p>
                      </div>
                      <button onClick={() => handleDeleteEdu(e.id)} className="text-red-500 hover:text-red-700 mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
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
                  experience.map((e) => (
                    <div key={e.id} className="p-2 border rounded text-xs bg-slate-50 relative flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">{e.job_title || 'N/A'} at {e.company_name}</p>
                        <p className="text-slate-500 text-[10px]">{e.start_date} to {e.is_current ? 'Present' : e.end_date || 'N/A'}</p>
                        {e.description && <p className="text-slate-600 mt-1 italic">{e.description}</p>}
                      </div>
                      <button onClick={() => handleDeleteExp(e.id)} className="text-red-500 hover:text-red-700 mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'documents' && (
            <div className="space-y-4">
              <form onSubmit={handleFileUpload} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-[10px]">Upload Document</Label>
                  <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="h-8 text-xs" />
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
                  documents.map((d) => (
                    <div key={d.id} className="flex justify-between items-center p-2 border rounded text-xs bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{d.file_name}</span>
                        <span className="ml-2 text-slate-500 uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{d.document_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-[10px]" 
                          onClick={() => {
                            const rawApiUrl = (import.meta as any).env.VITE_API_URL || `http://${window.location.hostname}:5000/api/v1`;
                            const base = rawApiUrl.replace('/api/v1', '');
                            window.open(`${base}${d.file_url}`);
                          }}
                        >
                          View
                        </Button>
                        <button onClick={() => handleDeleteDoc(d.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>

                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

