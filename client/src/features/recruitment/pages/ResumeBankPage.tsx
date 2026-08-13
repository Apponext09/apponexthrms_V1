import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Search, Upload, Plus, Briefcase, CheckCircle2, ArrowRight, FileText, ExternalLink } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

const INITIAL_FILTERS = {
  trackerId: '',
  search: '',
  source: 'all',
  position: 'all',
  status: 'all'
};

export const ResumeBankPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('source');
  
  const [resumesData, setResumesData] = useState<any[]>([]);
  const [logsData, setLogsData] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Pagination State for Tab 1
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Pagination State for Tab 3 (Logs)
  const [logPageSize, setLogPageSize] = useState('10');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [totalLogEntries, setTotalLogEntries] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // Bulk Upload File State
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);

  // Shortlist Modal State
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [selectedResumeForShortlist, setSelectedResumeForShortlist] = useState<any | null>(null);
  const [quickJobId, setQuickJobId] = useState<string>('');
  const [shortlistingId, setShortlistingId] = useState<number | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Male', email: '', contactType: 'Mobile', contact: '',
    address1: '', address2: '', country: '', zipcode: '', state: '', city: '',
    maritalStatus: '', company: '', qualification: '', university: '',
    relevantExp: '', totalExp: '', skills: '', jobId: ''
  });
  const [formError, setFormError] = useState('');
  const [candidateResumeFile, setCandidateResumeFile] = useState<File | null>(null);

  const fetchJobs = () => {
    apiClient.get('/recruitment/jobs?pageSize=100')
      .then(res => {
        let items: any[] = [];
        if (Array.isArray(res.data?.data)) {
          items = res.data.data;
        } else if (Array.isArray(res.data?.data?.items)) {
          items = res.data.data.items;
        } else if (Array.isArray(res.data)) {
          items = res.data;
        }

        if (items.length === 0) {
          apiClient.get('/public/job-reference/openings')
            .then(openRes => {
              const openItems = Array.isArray(openRes.data?.data) ? openRes.data.data : [];
              setJobsList(openItems);
            })
            .catch(() => setJobsList([]));
        } else {
          setJobsList(items);
        }
      })
      .catch(err => {
        console.error('Failed to load jobs list from recruitment endpoint, attempting fallback', err);
        apiClient.get('/public/job-reference/openings')
          .then(openRes => {
            const openItems = Array.isArray(openRes.data?.data) ? openRes.data.data : [];
            setJobsList(openItems);
          })
          .catch(() => setJobsList([]));
      });
  };

  const fetchResumes = () => {
    setIsLoadingResumes(true);
    apiClient.get('/recruitment/resume-bank', {
      params: {
        page: currentPage,
        pageSize: pageSize,
        trackerId: filters.trackerId || undefined,
        search: filters.search || undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        position: filters.position !== 'all' ? filters.position : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
      }
    })
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped = res.data.data.map((item: any) => ({
            id: item.id,
            trackerId: item.trackerId || item.tracker_id || '-',
            name: item.candidateName || item.candidate_name || '-',
            dob: item.candidateDob || item.candidate_dob || '-',
            gender: item.candidateGender || item.candidate_gender || item.gender || '-',
            email: item.candidateEmail || item.candidate_email || '-',
            contact: item.candidatePhone || item.candidate_phone || '-',
            qualification: item.candidateQualification || item.candidate_qualification || item.qualification || '-',
            company: item.candidateCompany || item.candidate_company || '-',
            experience: item.candidateExperience !== undefined && item.candidateExperience !== null 
              ? `${item.candidateExperience} Years` 
              : (item.candidate_experience ? `${item.candidate_experience} Years` : '-'),
            source: item.source || '-',
            position: item.position || '-',
            jobId: item.jobId || item.job_id || null,
            jobTitle: item.jobTitle || item.job_title || null,
            jobCode: item.jobCode || item.job_code || null,
            status: item.status || '-',
            resumeUrl: item.candidateResumeUrl || item.candidate_resume_url || item.resumeUrl || item.resume_url || item.resume || null
          }));
          setResumesData(mapped);
          setFilteredData(mapped);
          
          if (res.data.meta) {
            setTotalEntries(res.data.meta.total || mapped.length);
            setTotalPages(res.data.meta.totalPages || 1);
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch resume bank entries', err);
        toast.error('Failed to load resume bank entries');
      })
      .finally(() => setIsLoadingResumes(false));
  };

  const fetchLogs = () => {
    setIsLoadingLogs(true);
    apiClient.get('/recruitment/resume-bank/upload-logs', {
      params: {
        page: logCurrentPage,
        pageSize: logPageSize
      }
    })
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mappedLogs = res.data.data.map((item: any) => ({
            id: item.id,
            date: item.createdAt ? new Date(item.createdAt).toLocaleString() : (item.created_at ? new Date(item.created_at).toLocaleString() : '-'),
            uploadedBy: item.uploadedBy || item.uploaded_by || 'System',
            fileName: item.fileName || item.file_name || '-',
            total: item.totalRecords || item.total_records || 0,
            success: item.successCount || item.success_count || 0,
            failed: item.failedCount || item.failed_count || 0,
            status: item.status || '-'
          }));
          setLogsData(mappedLogs);
          if (res.data.meta) {
            setTotalLogEntries(res.data.meta.total || mappedLogs.length);
            setLogTotalPages(res.data.meta.totalPages || 1);
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch upload logs', err);
        toast.error('Failed to load upload logs');
      })
      .finally(() => setIsLoadingLogs(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'source') {
      fetchResumes();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, currentPage, pageSize, logCurrentPage, logPageSize]);

  const handleShortlist = (resumeId: number, targetJobId?: number) => {
    if (!targetJobId) {
      const resume = resumesData.find(r => r.id === resumeId);
      setSelectedResumeForShortlist(resume || null);
      setQuickJobId(resume?.jobId ? String(resume.jobId) : '');
      setIsShortlistModalOpen(true);
      return;
    }

    setShortlistingId(resumeId);
    apiClient.post(`/recruitment/resume-bank/${resumeId}/shortlist`, { jobId: targetJobId })
      .then(res => {
        if (res.data?.success) {
          toast.success('Candidate shortlisted and moved to Applicant Pipeline!');
          setIsShortlistModalOpen(false);
          fetchResumes();
        } else {
          toast.error(res.data?.message || 'Failed to shortlist candidate');
        }
      })
      .catch(err => {
        console.error('Failed to shortlist', err);
        toast.error(err?.response?.data?.message || 'Failed to shortlist candidate');
      })
      .finally(() => setShortlistingId(null));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchResumes();
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    setIsLoadingResumes(true);
    apiClient.get('/recruitment/resume-bank', {
      params: { page: 1, pageSize }
    })
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped = res.data.data.map((item: any) => ({
            id: item.id,
            trackerId: item.trackerId || item.tracker_id || '-',
            name: item.candidateName || item.candidate_name || '-',
            dob: item.candidateDob || item.candidate_dob || '-',
            gender: item.candidateGender || item.candidate_gender || '-',
            email: item.candidateEmail || item.candidate_email || '-',
            contact: item.candidatePhone || item.candidate_phone || '-',
            qualification: item.candidateQualification || item.candidate_qualification || '-',
            company: item.candidateCompany || item.candidate_company || '-',
            experience: item.candidateExperience !== undefined && item.candidateExperience !== null 
              ? `${item.candidateExperience} Years` 
              : (item.candidate_experience ? `${item.candidate_experience} Years` : '-'),
            source: item.source || '-',
            position: item.position || '-',
            jobId: item.jobId || item.job_id || null,
            jobTitle: item.jobTitle || item.job_title || null,
            jobCode: item.jobCode || item.job_code || null,
            status: item.status || '-'
          }));
          setResumesData(mapped);
          setFilteredData(mapped);
          if (res.data.meta) {
            setTotalEntries(res.data.meta.total || mapped.length);
            setTotalPages(res.data.meta.totalPages || 1);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoadingResumes(false));
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    setFormError('');

    const selectedJob = jobsList.find((j: any) => String(j.id) === String(formData.jobId));
    const jobPositionTitle = selectedJob ? (selectedJob.job_title || selectedJob.position_title || 'Software Developer') : 'Software Developer';

    const savePayload: any = {
      name: formData.name,
      dob: formData.dob || undefined,
      gender: formData.gender,
      email: formData.email,
      contact: formData.contact || undefined,
      addressLine1: formData.address1 || undefined,
      addressLine2: formData.address2 || undefined,
      country: formData.country || undefined,
      zipcode: formData.zipcode || undefined,
      state: formData.state || undefined,
      city: formData.city || undefined,
      maritalStatus: formData.maritalStatus || undefined,
      company: formData.company || undefined,
      qualification: formData.qualification || undefined,
      university: formData.university || undefined,
      totalExp: formData.totalExp || undefined,
      skills: formData.skills || undefined,
      source: 'Direct Upload',
      position: jobPositionTitle,
      jobId: formData.jobId ? Number(formData.jobId) : undefined
    };

    const processSave = (finalPayload: any) => {
      apiClient.post('/recruitment/resume-bank', finalPayload)
        .then(res => {
          if (res.data?.success) {
            toast.success('Candidate added to Resume Bank successfully!');
            setIsAddModalOpen(false);
            setCandidateResumeFile(null);
            setFormData({
              name: '', dob: '', gender: 'Male', email: '', contactType: 'Mobile', contact: '',
              address1: '', address2: '', country: '', zipcode: '', state: '', city: '',
              maritalStatus: '', company: '', qualification: '', university: '',
              relevantExp: '', totalExp: '', skills: '', jobId: ''
            });
            fetchResumes();
          } else {
            toast.error(res.data?.message || 'Failed to add candidate');
          }
        })
        .catch(err => {
          console.error('Failed to save candidate', err);
          toast.error(err.response?.data?.message || 'Failed to add candidate');
        });
    };

    if (candidateResumeFile) {
      const reader = new FileReader();
      reader.onload = (uploadEvt) => {
        savePayload.resumeUrl = uploadEvt.target?.result as string;
        processSave(savePayload);
      };
      reader.readAsDataURL(candidateResumeFile);
    } else {
      processSave(savePayload);
    }
  };

  const handleBulkUpload = () => {
    if (!selectedExcelFile) {
      toast.error('Please select an Excel or CSV file to upload.');
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append('file', selectedExcelFile);

    apiClient.post('/recruitment/resume-bank/bulk-upload', formDataObj, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Upload processing started successfully!');
          setSelectedExcelFile(null);
          setActiveTab('logs');
          fetchLogs();
        } else {
          toast.error(res.data?.message || 'Failed to process bulk upload');
        }
      })
      .catch(err => {
        console.error('Failed to upload candidates', err);
        toast.error('Failed to process bulk upload');
      });
  };

  const handleExportResumes = () => {
    const headers = ['Name', 'Date of Birth', 'Gender', 'Email ID', 'Contact Number', 'Qualification', 'Current Company', 'Total Experience'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(c => `"${c.name}","${c.dob}","${c.gender}","${c.email}","${c.contact}","${c.qualification}","${c.company}","${c.experience}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume_bank.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportLogs = () => {
    const headers = ['Upload Date', 'Uploaded By', 'File Name', 'Total Records', 'Success', 'Failed', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logsData.map(c => `"${c.date}","${c.uploadedBy}","${c.fileName}","${c.total}","${c.success}","${c.failed}","${c.status}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_logs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSample = () => {
    const headers = ['Name', 'Gender', 'Email Id', 'Date of Birth', 'Contact Number', 'Address Line 1', 'Address Line 2', 'Country', 'Zipcode', 'State', 'City', 'Marital Status', 'Current Company', 'Qualification', 'University', 'Relevant Experience', 'Total Experience', 'Skills'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadDetails = () => {
    const headers = ['Name', 'Date of Birth', 'Gender', 'Email ID', 'Contact Number', 'Qualification', 'Current Company', 'Total Experience'];
    const csvContent = [
      headers.join(','),
      ...resumesData.map(c => `"${c.name}","${c.dob}","${c.gender}","${c.email}","${c.contact}","${c.qualification}","${c.company}","${c.experience}"`)
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all_candidates_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination for Tab 1
  const pageSizeNumber = parseInt(pageSize, 10);
  const startIndex = (currentPage - 1) * pageSizeNumber;
  const endIndex = startIndex + filteredData.length;
  const paginatedData = filteredData;

  // Pagination for Tab 3
  const logPageSizeNumber = parseInt(logPageSize, 10);
  const logStartIndex = (logCurrentPage - 1) * logPageSizeNumber;
  const logEndIndex = logStartIndex + logsData.length;
  const paginatedLogs = logsData;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="source">Resume Source Screen</TabsTrigger>
          <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="logs">Bulk Uploaded Log</TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUME SOURCE SCREEN */}
        <TabsContent value="source" className="space-y-6">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="py-3 border-b border-border">
              <CardTitle className="text-sm font-normal text-foreground">Resume Bank</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Tracker ID</label>
                  <Input 
                    placeholder="Search By Tracker ID..."
                    value={filters.trackerId} 
                    onChange={(e) => handleFilterChange('trackerId', e.target.value)} 
                    className="h-8 text-xs bg-background border-input rounded-sm"
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Search</label>
                  <Input 
                    placeholder="Search By Name or Contact Number or Email ID..."
                    value={filters.search} 
                    onChange={(e) => handleFilterChange('search', e.target.value)} 
                    className="h-8 text-xs bg-background border-input rounded-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Application From</label>
                  <Select value={filters.source} onValueChange={(val) => handleFilterChange('source', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select Source</SelectItem>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Refer By Employee">Refer By Employee</SelectItem>
                      <SelectItem value="MRS Admin User">MRS Admin User</SelectItem>
                      <SelectItem value="Guest User">Guest User</SelectItem>
                      <SelectItem value="Candidate">Candidate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Position Title</label>
                  <Select value={filters.position} onValueChange={(val) => handleFilterChange('position', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      <SelectItem value="ACCOUNTANT">ACCOUNTANT</SelectItem>
                      <SelectItem value="BACK OFFICE EXECUTIVE">BACK OFFICE EXECUTIVE</SelectItem>
                      <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                      <SelectItem value="HR EXECUTIVE">HR EXECUTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Status</label>
                  <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                    <SelectTrigger className="h-8 text-xs bg-background border-input rounded-sm">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Choose</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Selected">Selected</SelectItem>
                      <SelectItem value="Selected-Approved By CEO">Selected-Approved By CEO</SelectItem>
                      <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2 pt-1 lg:col-span-4 mt-2">
                  <Button onClick={handleSearch} className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs rounded-sm">
                    Search
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="h-8 px-4 text-xs rounded-sm bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none">
                    Reset Filter
                  </Button>
                  <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="h-8 px-4 text-xs rounded-sm">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Candidate
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportResumes} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-card border-b border-border flex justify-between items-center text-xs text-foreground/90">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setCurrentPage(1); }}>
                    <SelectTrigger className="h-6 w-16 px-1.5 text-xs bg-background border-input rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  entries
                </div>
              </div>
              
              <div className="bg-background overflow-x-auto w-full">
                <Table className="w-full min-w-[1100px]">
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap pl-4">Candidate</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Job Opening</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Contact / Email</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Gender</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Qualification</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Company & Exp</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-right pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((candidate) => (
                        <TableRow key={candidate.id} className="border-border bg-card text-card-foreground hover:bg-muted/50">
                          <TableCell className="text-xs py-2 whitespace-nowrap font-medium pl-4">
                            <div>
                              <span className="font-semibold text-foreground">{candidate.name}</span>
                              <span className="block text-[10px] text-muted-foreground">{candidate.trackerId}</span>
                              {candidate.resumeUrl ? (
                                <a
                                  href={candidate.resumeUrl.startsWith('http') || candidate.resumeUrl.startsWith('data:') ? candidate.resumeUrl : `http://${window.location.hostname}:5000${candidate.resumeUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-bold mt-0.5 hover:underline"
                                >
                                  <FileText className="w-3 h-3" /> View Resume
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                  <FileText className="w-3 h-3 text-slate-400" /> Form Data
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            {candidate.jobTitle ? (
                              <div className="flex items-center gap-1 text-blue-600 font-medium">
                                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                <span>{candidate.jobCode ? `[${candidate.jobCode}] ` : ''}{candidate.jobTitle}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">{candidate.position && candidate.position !== 'None' && candidate.position !== '-' ? candidate.position : 'Unassigned'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <div className="text-foreground">{candidate.email}</div>
                            <div className="text-[10px] text-muted-foreground">{candidate.contact}</div>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{candidate.gender}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{candidate.qualification}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <div className="text-foreground">{candidate.company !== '-' ? candidate.company : 'N/A'}</div>
                            <div className="text-[10px] text-muted-foreground">{candidate.experience}</div>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              candidate.status === 'Screening' || candidate.status === 'Shortlisted' || candidate.status === 'Interview'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : candidate.status === 'Hired' || candidate.status === 'Offered'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : candidate.status === 'Rejected'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {candidate.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-right pr-4">
                            {candidate.status === 'Screening' || candidate.status === 'Shortlisted' || candidate.status === 'Interview' || candidate.status === 'Offered' || candidate.status === 'Hired' ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Shortlisted
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate('/hr/recruitment/candidates')}
                                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors gap-1 font-medium"
                                >
                                  View Pipeline <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={shortlistingId === candidate.id}
                                onClick={() => handleShortlist(candidate.id, candidate.jobId)}
                                className="h-7 px-2.5 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 shadow-none font-medium transition-colors"
                              >
                                {shortlistingId === candidate.id ? (
                                  'Shortlisting...'
                                ) : (
                                  <span className="flex items-center gap-1">
                                    Shortlist <ArrowRight className="w-3 h-3" />
                                  </span>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalEntries > 0 && (
                <div className="bg-background border-t border-border p-3 flex justify-between items-center text-xs px-4">
                  <div className="text-muted-foreground font-medium">
                    Showing Page {currentPage} of {totalPages} ({totalEntries} total entries)
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BULK UPLOAD */}
        <TabsContent value="upload">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="py-3 border-b border-border text-center">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-center gap-2">
                Upload Candidate List
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Form */}
                <div className="space-y-8">
                  
                  {/* Upload Excel */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-foreground w-24">
                        <span className="text-destructive">*</span> Upload Excel
                      </label>
                      <div className="flex-1">
                        <Input 
                          type="file" 
                          accept=".xlsx,.csv" 
                          className="text-xs h-9 bg-background border-input"
                          onChange={(e) => setSelectedExcelFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-[10px] text-green-600 font-medium mt-1">Max Size : 10MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Files */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-foreground w-24">
                        Upload Files
                      </label>
                      <div className="flex-1">
                        <Input 
                          type="file" 
                          multiple 
                          className="text-xs h-9 bg-background border-input"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleBulkUpload} className="w-full bg-green-600 hover:bg-green-700 text-white h-9 rounded-sm flex gap-2">
                    <Upload className="w-4 h-4" /> Upload
                  </Button>
                </div>

                {/* Right Instructions */}
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadSample} variant="outline" className="h-8 text-xs bg-[#337ab7] text-white hover:bg-[#286090] hover:text-white border-none rounded-sm px-4">
                      Download Sample Excel File
                    </Button>
                    <Button onClick={handleDownloadDetails} variant="outline" className="h-8 text-xs bg-green-600 text-white hover:bg-green-700 hover:text-white border-none rounded-sm px-4">
                      Download Candidates Details
                    </Button>
                  </div>

                  <div className="space-y-4 text-xs text-foreground/90 leading-relaxed">
                    <div>
                      <p className="font-semibold mb-1">Instruction for excel upload :</p>
                      <p><strong>Required Columns :-</strong> Name,Gender</p>
                      <p><strong>Unique Columns :-</strong> Email Id</p>
                      <p><strong>Date Columns</strong> must be in yyyy-mm-dd format.</p>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Instruction for file upload :</p>
                      <p><strong>To upload multiple files :</strong></p>
                      <p>Click control button to select multiple files for uploading. Or</p>
                      <p>Upload zip folder should containing files with filename as one which is put in excel sheet whose data need to be uploaded. eg. ABC_Resume.pdf,XYZ_Sign.png.</p>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BULK UPLOADED LOG */}
        <TabsContent value="logs">
          <Card className="rounded-none shadow-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
              <CardTitle className="text-sm font-normal text-foreground">Result</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportLogs} className="h-7 px-3 text-xs rounded-sm shadow-none">
                <Download className="w-3 h-3 mr-1.5" />
                Export
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-card border-b border-border flex justify-between items-center text-xs text-foreground/90">
                <div>
                  Showing {totalLogEntries > 0 ? logStartIndex + 1 : 0} to {logEndIndex} of {totalLogEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={logPageSize} onValueChange={(val) => { setLogPageSize(val); setLogCurrentPage(1); }}>
                    <SelectTrigger className="h-6 w-16 px-1.5 text-xs bg-background border-input rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  entries
                </div>
              </div>
              
              <div className="bg-background">
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Upload Date</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Uploaded By</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">File Name</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Total Records</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Success Count</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Failed Count</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <TableRow key={log.id} className="border-border bg-card text-card-foreground hover:bg-muted/50">
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.date}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.uploadedBy}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{log.fileName}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.total}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-green-600 font-medium">{log.success}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-red-500 font-medium">{log.failed}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{log.status}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {totalLogEntries > 0 && (
                  <div className="bg-background border-t border-border p-3 flex justify-between items-center text-xs">
                    <div className="text-muted-foreground">
                      Page {logCurrentPage} of {logTotalPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={logCurrentPage === 1} onClick={() => setLogCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs bg-card" disabled={logCurrentPage >= logTotalPages} onClick={() => setLogCurrentPage(prev => Math.min(prev + 1, logTotalPages))}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
      </Tabs>

      {/* ADD CANDIDATE MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Candidate Form</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCandidate} className="space-y-4">
            
            {formError && <div className="text-red-500 text-sm">{formError}</div>}
            
            {/* ROW 1: Name & Job Opening */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Name <span className="text-red-500">*</span></label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="h-8 text-xs" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Target Job Opening</label>
                <Select value={formData.jobId || 'none'} onValueChange={(val) => setFormData({...formData, jobId: val === 'none' ? '' : val})}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="-- Select Job Opening --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- General (No Specific Job) --</SelectItem>
                    {jobsList.map((job: any) => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {job.job_code ? `[${job.job_code}] ` : ''}{job.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* ROW 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Date of Birth</label>
                <Input 
                  type="date"
                  value={formData.dob} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Gender <span className="text-red-500">*</span></label>
                <Select value={formData.gender} onValueChange={(val) => setFormData({...formData, gender: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Male" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* ROW 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Email Id</label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Number</label>
                <div className="flex gap-2">
                  <Select value={formData.contactType} onValueChange={(val) => setFormData({...formData, contactType: val})}>
                    <SelectTrigger className="h-8 text-xs w-28">
                      <SelectValue placeholder="Mobile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={formData.contact} 
                    onChange={e => setFormData({...formData, contact: e.target.value})} 
                    className="h-8 text-xs flex-1" 
                  />
                </div>
              </div>
            </div>

            <div className="text-sm font-semibold border-b pb-1 mt-4">Address</div>

            {/* ROW 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Address Line 1</label>
                <Input value={formData.address1} onChange={e => setFormData({...formData, address1: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Address Line 2</label>
                <Input value={formData.address2} onChange={e => setFormData({...formData, address2: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 5 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Country</label>
                <Select value={formData.country} onValueChange={(val) => setFormData({...formData, country: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Choose">Choose</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Zipcode</label>
                <Input value={formData.zipcode} onChange={e => setFormData({...formData, zipcode: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 6 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">State</label>
                <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">City</label>
                <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 7 */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Marital Status</label>
                <Select value={formData.maritalStatus} onValueChange={(val) => setFormData({...formData, maritalStatus: val})}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unmarried" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unmarried">Unmarried</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Current Company</label>
                <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 8 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Qualification</label>
                <Input value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">University</label>
                <Input value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 9 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Relevant Experience</label>
                <Input value={formData.relevantExp} onChange={e => setFormData({...formData, relevantExp: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Total Experience</label>
                <Input value={formData.totalExp} onChange={e => setFormData({...formData, totalExp: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 10 */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold w-full flex items-center justify-between border-b pb-1">
                  <span>Upload Signature</span>
                </label>
                <div className="pt-2">
                  <Input type="file" accept="image/*" className="h-8 text-xs w-full mb-1" />
                  <div className="text-[10px] text-muted-foreground">(Min Size - 0 MB and Max Size - 1 MB)</div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold w-full flex items-center justify-between border-b pb-1">
                  <span>Upload Resume</span>
                </label>
                <div className="pt-2">
                  <Input 
                    type="file" 
                    accept=".pdf,.doc,.docx" 
                    onChange={(e) => setCandidateResumeFile(e.target.files?.[0] || null)}
                    className="h-8 text-xs w-full mb-1" 
                  />
                  <div className="text-[10px] text-muted-foreground">(Min Size - 0 MB and Max Size - 5 MB)</div>
                </div>
              </div>
            </div>

            {/* ROW 11 */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold">Skills</label>
              <Input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} className="h-8 text-xs" />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK SHORTLIST TO PIPELINE DIALOG */}
      <Dialog open={isShortlistModalOpen} onOpenChange={setIsShortlistModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Shortlist Candidate to Job Opening
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <p className="text-xs text-muted-foreground">
              Select the target job opening to create an application profile for <strong className="text-foreground">{selectedResumeForShortlist?.name}</strong> and advance them into the recruitment pipeline.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Job Opening <span className="text-red-500">*</span></label>
              <select
                value={quickJobId}
                onChange={(e) => setQuickJobId(e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 text-xs bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                <option value="">-- Select Published Job Opening --</option>
                {jobsList.map((job: any) => (
                  <option key={job.id} value={String(job.id)}>
                    {job.job_code || job.jobCode ? `[${job.job_code || job.jobCode}] ` : ''}{job.job_title || job.jobTitle || job.position_title || job.title || 'Job Opening'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsShortlistModalOpen(false)}>Cancel</Button>
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={!quickJobId || shortlistingId === selectedResumeForShortlist?.id}
              onClick={() => selectedResumeForShortlist && handleShortlist(selectedResumeForShortlist.id, Number(quickJobId))}
            >
              {shortlistingId === selectedResumeForShortlist?.id ? 'Shortlisting...' : 'Confirm & Shortlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
