import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Download, Search, Upload, Briefcase, CheckCircle2, ArrowRight, FileText,
  ExternalLink, Sparkles, Cpu, Zap, Eye, Sliders, Filter, CheckCircle, AlertCircle, FileUp, History
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AiAnalysisModal } from '../components/AiAnalysisModal';
import { AiSuggestionsTab } from '../components/AiSuggestionsTab';
import { ResumeViewerModal, resolveResumeUrl } from '../components/ResumeViewerModal';

const INITIAL_FILTERS = {
  trackerId: '',
  search: '',
  source: 'all',
  position: 'all',
  status: 'Applied'
};

const getResumeViewUrl = (url: string | null | undefined): string => {
  return resolveResumeUrl(url);
};

const getJobTitle = (j: any): string => {
  if (!j) return 'Untitled Job';
  return (
    j.jobTitle ||
    j.job_title ||
    j.positionTitle ||
    j.position_title ||
    j.title ||
    j.position ||
    (j.id || j.job_id ? `Job #${j.id || j.job_id}` : 'Untitled Job')
  );
};

const getJobCode = (j: any): string => {
  if (!j) return '';
  return (
    j.jobCode ||
    j.job_code ||
    j.requisitionCode ||
    j.requisition_code ||
    j.mrNumber ||
    j.mr_number ||
    j.code ||
    ''
  );
};

const getJobId = (j: any): string => {
  if (!j) return '';
  return String(j.id || j.job_id || j.mrf_id || j.jobId || '');
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

  // ────── ATS SCREENING STATE ──────
  const [atsJobId, setAtsJobId] = useState<string>('');
  const [atsManualSkills, setAtsManualSkills] = useState<string>('');
  const [atsMinMatchPct, setAtsMinMatchPct] = useState<string>('0'); // Default to All Matches (0%+ ) so no candidate is hidden
  const [atsTopN, setAtsTopN] = useState<string>('10');
  const [atsSourceFilter, setAtsSourceFilter] = useState<string>('all');
  const [atsResults, setAtsResults] = useState<any[]>([]);
  const [atsJobDetails, setAtsJobDetails] = useState<any>(null);
  const [isLoadingAts, setIsLoadingAts] = useState(false);
  const [totalScannedAts, setTotalScannedAts] = useState<number>(0);
  const [selectedAtsDetail, setSelectedAtsDetail] = useState<any | null>(null);
  const [useGeminiAI, setUseGeminiAI] = useState(false); // Gemini AI toggle

  // ────── ENHANCED BULK UPLOAD STATE ──────
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkJobId, setBulkJobId] = useState<string>('');
  const [bulkSourceTag, setBulkSourceTag] = useState<string>('bulk_import');
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Dynamic filter lists populated from database & job openings
  const availableSources = React.useMemo(() => {
    const set = new Set<string>();
    resumesData.forEach(r => {
      if (r.source && r.source !== '-' && r.source.trim().length > 0) set.add(r.source);
    });
    ['Internal Job Posting (IJP)', 'Referral', 'direct_apply', 'job_board', 'bulk_import', 'Consultant', 'Career Portal', 'Candidate', 'Guest User'].forEach(s => set.add(s));
    return Array.from(set);
  }, [resumesData]);

  const availablePositions = React.useMemo(() => {
    const set = new Set<string>();
    jobsList.forEach(j => {
      const title = j.jobTitle || j.title || j.positionTitle;
      if (title && title !== 'Job Position' && title.trim().length > 0) set.add(title);
    });
    resumesData.forEach(r => {
      if (r.jobTitle && r.jobTitle !== '-' && r.jobTitle.trim().length > 0) set.add(r.jobTitle);
      else if (r.position && r.position !== '-' && r.position !== 'None' && r.position.trim().length > 0) set.add(r.position);
    });
    return Array.from(set);
  }, [jobsList, resumesData]);

  const availableStatuses = React.useMemo(() => {
    const set = new Set<string>();
    resumesData.forEach(r => {
      if (r.status && r.status !== '-' && r.status.trim().length > 0) set.add(r.status);
    });
    ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected', 'On Hold'].forEach(s => set.add(s));
    return Array.from(set);
  }, [resumesData]);
  
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

  // Bulk Upload File State (CSV / Excel)
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);

  // Shortlist Modal State
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [selectedResumeForShortlist, setSelectedResumeForShortlist] = useState<any | null>(null);
  const [quickJobId, setQuickJobId] = useState<string>('');
  const [shortlistingId, setShortlistingId] = useState<number | null>(null);

  // Resume Document Viewer State
  const [selectedResumeForModal, setSelectedResumeForModal] = useState<any | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

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

        if (items.length > 0) {
          setJobsList(items);
          if (!atsJobId && items[0]) setAtsJobId(getJobId(items[0]));
        } else {
          apiClient.get('/recruitment/mrf')
            .then(mrfRes => {
              const mrfItems = Array.isArray(mrfRes.data?.data)
                ? mrfRes.data.data
                : (Array.isArray(mrfRes.data) ? mrfRes.data : []);
              if (mrfItems.length > 0) {
                setJobsList(mrfItems);
                if (!atsJobId && mrfItems[0]) setAtsJobId(getJobId(mrfItems[0]));
              } else {
                apiClient.get('/public/job-reference/openings')
                  .then(openRes => {
                    const openItems = Array.isArray(openRes.data?.data)
                      ? openRes.data.data
                      : (Array.isArray(openRes.data) ? openRes.data : []);
                    setJobsList(openItems);
                    if (openItems.length > 0 && !atsJobId) setAtsJobId(getJobId(openItems[0]));
                  })
                  .catch(() => setJobsList([]));
              }
            })
            .catch(() => setJobsList([]));
        }
      })
      .catch(err => {
        console.error('Failed to load jobs list', err);
        apiClient.get('/recruitment/mrf')
          .then(mrfRes => {
            const mrfItems = Array.isArray(mrfRes.data?.data)
              ? mrfRes.data.data
              : (Array.isArray(mrfRes.data) ? mrfRes.data : []);
            if (mrfItems.length > 0) {
              setJobsList(mrfItems);
              if (!atsJobId && mrfItems[0]) setAtsJobId(getJobId(mrfItems[0]));
            } else {
              apiClient.get('/public/job-reference/openings')
                .then(openRes => {
                  const openItems = Array.isArray(openRes.data?.data)
                    ? openRes.data.data
                    : (Array.isArray(openRes.data) ? openRes.data : []);
                  setJobsList(openItems);
                  if (openItems.length > 0 && !atsJobId) setAtsJobId(getJobId(openItems[0]));
                })
                .catch(() => setJobsList([]));
            }
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
            candidateId: item.candidateId || item.candidate_id || item.id,
            trackerId: item.trackerId || item.tracker_id || '-',
            name: item.candidateName || item.candidate_name || (item.firstName || item.first_name ? `${item.firstName || item.first_name || ''} ${item.lastName || item.last_name || ''}`.trim() : (item.name || '-')),
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
            atsScore: item.atsScore ?? item.ats_score ?? null,
            jdMatchScore: item.jdMatchScore ?? item.jd_match_score ?? null,
            status: item.status || '-',
            skills: item.candidateSkills || item.candidate_skills || item.skills || null,
            university: item.candidateUniversity || item.candidate_university || item.university || null,
            resumeText: item.resumeText || item.resume_text || null,
            resumeUrl: item.resumeFileUrl || item.resume_file_url || item.candidateResumeUrl || item.candidate_resume_url || item.resumeUrl || item.resume_url || item.resume || null
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
            targetJobId: item.targetJobId || item.target_job_id || null,
            atsPassedCount: item.atsPassedCount ?? item.ats_passed_count ?? 0,
            jdMatchPassedCount: item.jdMatchPassedCount ?? item.jd_match_passed_count ?? 0,
            aiShortlistedCount: item.aiShortlistedCount ?? item.ai_shortlisted_count ?? 0,
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

  // ────── ATS SCORING TRIGGER (WITH MIN MATCH % SETTING) ──────
  const handleRunAtsScoring = () => {
    if (!atsJobId) {
      toast.error('Please select a target Job Opening for ATS Screening');
      return;
    }
    setIsLoadingAts(true);
    apiClient.post('/recruitment/resume-bank/ats-score', {
      jobId: atsJobId,
      manualSkills: atsManualSkills,
      topN: atsTopN,
      sourceFilter: atsSourceFilter,
      minMatchPct: atsMinMatchPct, // Passing min match % setting
      useAI: useGeminiAI,          // Gemini AI mode toggle
    })
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setAtsResults(res.data.data);
          if (res.data.meta) {
            setTotalScannedAts(res.data.meta.totalScanned || res.data.data.length);
            setAtsJobDetails(res.data.meta.jobDetails || null);
          }
          toast.success(`ATS Scan Complete! Found ${res.data.data.length} candidate(s) matching ≥ ${atsMinMatchPct}%.`);
        } else {
          toast.error('Failed to run ATS scoring scan');
        }
      })
      .catch(err => {
        console.error('Failed to run ATS scoring', err);
        const errObj = err.response?.data?.error;
        const msg = typeof errObj === 'string' ? errObj : errObj?.message || err.response?.data?.message || 'Failed to run ATS scoring scan';
        toast.error(msg);
      })
      .finally(() => setIsLoadingAts(false));
  };

  // ────── MULTI-FILE BULK UPLOAD TRIGGER (PDF / ZIP / RAR) ──────
  const handleMultiFileUpload = () => {
    if (bulkFiles.length === 0) {
      toast.error('Please select PDF, ZIP, or RAR resume files to upload.');
      return;
    }
    setIsUploadingFiles(true);
    const formDataObj = new FormData();
    for (let i = 0; i < bulkFiles.length; i++) {
      formDataObj.append('files', bulkFiles[i]);
    }
    if (bulkJobId) formDataObj.append('jobId', bulkJobId);
    if (bulkSourceTag) formDataObj.append('source', bulkSourceTag);

    apiClient.post('/recruitment/resume-bank/bulk-upload-files', formDataObj, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(res => {
        const result = res.data?.data;
        const failed = Number(result?.failedCount ?? 0);
        const ok = Number(result?.successCount ?? 0);
        const firstErr = Array.isArray(result?.errors) && result.errors[0]
          ? `${result.errors[0].file || 'file'}: ${result.errors[0].error}`
          : '';

        if (res.data?.success && failed === 0) {
          toast.success(res.data.message || 'Resumes uploaded & parsed successfully!');
        } else if (ok > 0 && failed > 0) {
          toast.warning(res.data.message || `Partial upload: ${ok} ok, ${failed} failed. ${firstErr}`);
        } else {
          toast.error(firstErr || res.data?.message || 'Bulk upload failed. Open Upload Logs for details.');
        }
        setBulkFiles([]);
        setActiveTab('logs');
        fetchLogs();
      })
      .catch(err => {
        console.error('Failed to upload files', err);
        toast.error('Failed to process file upload');
      })
      .finally(() => setIsUploadingFiles(false));
  };

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
            status: item.status || '-',
            resumeUrl: item.resumeFileUrl || item.resume_file_url || item.candidateResumeUrl || item.candidate_resume_url || item.resumeUrl || item.resume_url || item.resume || null
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
    if (!formData.name.trim()) { setFormError('Name is required.'); return; }
    if (!formData.email.trim()) { setFormError('Email is required.'); return; }
    if (!formData.contact.trim()) { setFormError('Contact Number is required.'); return; }
    if (!formData.gender) { setFormError('Gender is required.'); return; }
    if (!formData.maritalStatus) { setFormError('Marital Status is required.'); return; }
    if (!formData.qualification.trim()) { setFormError('Qualification is required.'); return; }
    if (!formData.skills.trim()) { setFormError('Skills is required.'); return; }
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
      toast.error('Please select an Excel or CSV file (.xlsx, .xls, .csv) to upload.');
      return;
    }

    setIsUploadingFiles(true);
    const formDataObj = new FormData();
    formDataObj.append('file', selectedExcelFile);
    if (bulkJobId) {
      formDataObj.append('jobId', bulkJobId);
    }

    apiClient.post('/recruitment/resume-bank/bulk-upload', formDataObj, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(res => {
        if (res.data?.success) {
          toast.success(res.data?.message || 'Excel candidate data processed successfully!');
          setSelectedExcelFile(null);
          setActiveTab('logs');
          fetchLogs();
          fetchResumes();
        } else {
          toast.error(res.data?.message || 'Failed to process bulk upload');
        }
      })
      .catch(err => {
        console.error('Failed to upload candidates', err);
        const errObj = err?.response?.data?.error;
        const msg = typeof errObj === 'string' ? errObj : errObj?.message || err?.response?.data?.message || 'Failed to process bulk upload';
        toast.error(msg);
      })
      .finally(() => {
        setIsUploadingFiles(false);
      });
  };

  const handleExportResumes = () => {
    const headers = ['Name', 'Date of Birth', 'Gender', 'Email ID', 'Contact Number', 'Qualification', 'Current Company', 'Total Experience', 'ATS Score', 'JD Match Score'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(c => `"${c.name}","${c.dob}","${c.gender}","${c.email}","${c.contact}","${c.qualification}","${c.company}","${c.experience}","${c.atsScore || '-'}","${c.jdMatchScore || '-'}"`)
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
    const headers = ['Upload Date', 'Uploaded By', 'File Name', 'Total Records', 'Success', 'Failed', 'ATS Passed', 'JD Match Passed', 'AI Shortlisted', 'Status'];
    const csvContent = [
      headers.join(','),
      ...logsData.map(c => `"${c.date}","${c.uploadedBy}","${c.fileName}","${c.total}","${c.success}","${c.failed}","${c.atsPassedCount || 0}","${c.jdMatchPassedCount || 0}","${c.aiShortlistedCount || 0}","${c.status}"`)
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
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20 shadow-xs">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Resume Bank & ATS Screening
            </h1>
            <p className="text-xs text-muted-foreground">
              Centralized talent pool repository, AI-driven keyword matching, batch resume parser, and candidate scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportResumes} 
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-muted/70 p-1.5 rounded-2xl border border-border/80 flex flex-wrap gap-1">
          <TabsTrigger value="source" className="rounded-xl text-xs font-bold px-4 py-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Resume Source Screen
          </TabsTrigger>
          <TabsTrigger value="ats" className="rounded-xl text-xs font-bold px-4 py-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500 fill-amber-500 animate-pulse" />
            AI ATS Screening & Top-N Rank
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-xl text-xs font-bold px-4 py-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <FileUp className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
            Bulk Upload (PDF / ZIP / Word)
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl text-xs font-bold px-4 py-2 transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
            <History className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
            Bulk Upload Logs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESUME SOURCE SCREEN */}
        <TabsContent value="source" className="space-y-6">
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-visible relative z-30">
            <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/30 rounded-t-2xl">
              <CardTitle className="text-sm font-extrabold text-foreground">Resume Bank Search & Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-6 overflow-visible relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4">Tracker ID</label>
                  <Input 
                    placeholder="Search Tracker ID..."
                    value={filters.trackerId} 
                    onChange={(e) => handleFilterChange('trackerId', e.target.value)} 
                    className="h-9 text-xs bg-background border-border rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4">Candidate / Skill Search</label>
                  <Input 
                    placeholder="Candidate Name, Email, or Skill Keywords..."
                    value={filters.search} 
                    onChange={(e) => handleFilterChange('search', e.target.value)} 
                    className="h-9 text-xs bg-background border-border rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4">Application Source</label>
                  <Select value={filters.source} onValueChange={(val) => handleFilterChange('source', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {availableSources.map((src) => {
                        const formattedLabel = src === 'direct_apply' 
                          ? 'Direct Apply' 
                          : (src === 'job_board' ? 'Job Board' : (src === 'bulk_import' ? 'Bulk Import' : src));
                        return (
                          <SelectItem key={src} value={src}>
                            {formattedLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4">Position Title</label>
                  <Select value={filters.position} onValueChange={(val) => handleFilterChange('position', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder="Choose Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {availablePositions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4">Candidate Status</label>
                  <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                    <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl font-bold">
                      <SelectValue placeholder="Choose Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {availableStatuses.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block leading-4 invisible">Actions</label>
                  <div className="flex items-center gap-2 h-9">
                    <Button onClick={handleSearch} className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      Apply Search Filters
                    </Button>
                    <Button onClick={handleReset} variant="outline" className="h-9 px-4 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground cursor-pointer">
                      Reset Filter
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABLE CONTAINER */}
          <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-border/60">
              <CardTitle className="text-sm font-extrabold text-foreground">Candidates Database ({totalEntries})</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="p-3.5 bg-muted/30 border-b border-border/60 flex justify-between items-center text-xs text-muted-foreground font-medium">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Show</span>
                  <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 px-1.5 text-xs bg-background border-border rounded-lg font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="min-w-[1200px] border-collapse">
                  <TableHeader className="bg-muted/50 border-b border-border/60">
                    <TableRow className="border-border/60">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground whitespace-nowrap">Tracker ID</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Candidate Name & Email</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Source</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Position</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Experience</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap">Contact</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap text-center">Status</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground whitespace-nowrap text-center">Resume File</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground whitespace-nowrap text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {isLoadingResumes ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading candidate resumes...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((item) => {
                        const initials = (item.name || 'CA').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                        return (
                          <TableRow key={item.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                            <TableCell className="text-xs py-3 px-5 font-bold font-mono text-primary whitespace-nowrap">{item.trackerId}</TableCell>
                            <TableCell className="text-xs py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary/20">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground text-xs">{item.name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">{item.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs py-3 px-4 whitespace-nowrap">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] rounded-lg capitalize px-2.5 py-0.5 font-bold border ${
                                  (item.source || '').toLowerCase().includes('internal') || (item.source || '').toLowerCase().includes('ijp')
                                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                                    : (item.source || '').toLowerCase().includes('referral')
                                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                    : (item.source || '').toLowerCase().includes('bulk')
                                    ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                                    : (item.source || '').toLowerCase().includes('career')
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {item.source === 'bulk_import' ? 'Bulk Import' : (item.source === 'internal_opening' ? 'Internal Job Posting (IJP)' : (item.source || '-'))}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-3 px-4 font-semibold text-foreground whitespace-nowrap">{item.position}</TableCell>
                            <TableCell className="text-xs py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">{item.experience}</TableCell>
                            <TableCell className="text-xs py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">{item.contact}</TableCell>
                            <TableCell className="text-xs py-3 px-4 whitespace-nowrap text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.status === 'Screening' || item.status === 'Shortlisted' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              }`}>
                                {item.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs py-3 px-4 whitespace-nowrap text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedResumeForModal(item);
                                  setIsResumeModalOpen(true);
                                }}
                                className="h-7 px-2.5 text-[11px] font-bold text-primary border-primary/30 hover:bg-primary/10 rounded-lg cursor-pointer transition-all"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" /> View CV
                              </Button>
                            </TableCell>
                            <TableCell className="text-xs py-3 px-5 whitespace-nowrap text-right">
                              <Button 
                                size="sm" 
                                onClick={() => handleShortlist(item.id, item.jobId)}
                                disabled={shortlistingId === item.id || item.status === 'Screening'}
                                className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold shadow-xs cursor-pointer"
                              >
                                {item.status === 'Screening' ? 'Shortlisted' : 'Shortlist →'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-muted-foreground bg-background">
                          No candidate records found matching criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalEntries > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border/60 text-xs text-muted-foreground gap-3">
                  <div className="font-medium">
                    Page <span className="font-bold text-foreground">{currentPage}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 px-3.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 px-3.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AI ATS SCREENING & TOP-N RANKING */}
        <TabsContent value="ats" className="space-y-6">
          <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-visible relative z-30">
            <CardHeader className="py-3.5 px-5 border-b border-amber-100 dark:border-amber-950/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-t-2xl">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600">
                  <Sparkles className="w-4 h-4 fill-amber-400" />
                </div>
                AI ATS Job Matching & Top-N Resume Ranker
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 overflow-visible relative z-30">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                
                {/* 1. Target Job Opening */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 h-4 flex items-center">1. Target Job Opening *</label>
                  <Select value={atsJobId} onValueChange={setAtsJobId}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                      <SelectValue placeholder="-- Select Job Opening --" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {jobsList.map((j: any) => {
                        const id = getJobId(j);
                        const title = getJobTitle(j);
                        const code = getJobCode(j);
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {code ? `[${code}] ` : ''}{title}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Manual Additional Skills */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 h-4 flex items-center">2. Add Manual Skills</label>
                  <Input
                    placeholder="e.g. Python, AWS, Docker, React..."
                    value={atsManualSkills}
                    onChange={e => setAtsManualSkills(e.target.value)}
                    className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>

                {/* 3. SETTING: Min ATS Match % Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 h-4 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    3. Min Match % Filter *
                  </label>
                  <Select value={atsMinMatchPct} onValueChange={setAtsMinMatchPct}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                      <SelectValue placeholder="60% & above" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Matches (0%+)</SelectItem>
                      <SelectItem value="50">50% & Above</SelectItem>
                      <SelectItem value="60">60% & Above (Default)</SelectItem>
                      <SelectItem value="70">70% & Above</SelectItem>
                      <SelectItem value="80">80% & Above (High Match)</SelectItem>
                      <SelectItem value="90">90% & Above (Exact Fit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Top N Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 h-4 flex items-center">4. Top Candidates (N)</label>
                  <Select value={atsTopN} onValueChange={setAtsTopN}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                      <SelectValue placeholder="Top 10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Top 5 Candidates</SelectItem>
                      <SelectItem value="10">Top 10 Candidates</SelectItem>
                      <SelectItem value="15">Top 15 Candidates</SelectItem>
                      <SelectItem value="20">Top 20 Candidates</SelectItem>
                      <SelectItem value="50">Top 50 Candidates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Application Source Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 h-4 flex items-center">5. Source Filter</label>
                  <Select value={atsSourceFilter} onValueChange={setAtsSourceFilter}>
                    <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="Career Portal">Career Portal</SelectItem>
                      <SelectItem value="bulk_import">Bulk Import</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="direct_apply">Direct Apply</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-100 dark:border-slate-800 gap-3">
                {atsJobDetails ? (
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white">Target JD Skills ({atsJobDetails.targetSkills?.length || 0}):</span>
                    <div className="flex flex-wrap gap-1">
                      {atsJobDetails.targetSkills?.slice(0, 8).map((sk: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md">✓ {sk}</Badge>
                      ))}
                    </div>
                  </div>
                ) : <div />}

                <div className="flex items-center gap-3 ml-auto shrink-0">
                  {/* ── GEMINI AI TOGGLE (Fixed width w-[135px] so no size shifting) ── */}
                  <button
                    type="button"
                    onClick={() => setUseGeminiAI(!useGeminiAI)}
                    className={`group relative flex items-center justify-center gap-2 w-[135px] h-9 px-3 rounded-xl text-xs font-bold transition-all duration-300 border ${
                      useGeminiAI
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500 shadow-md shadow-violet-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                    }`}
                  >
                    {/* Toggle Track */}
                    <div className={`relative w-7 h-4 rounded-full shrink-0 transition-colors duration-300 ${
                      useGeminiAI ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${
                        useGeminiAI
                          ? 'left-[14px] bg-white shadow-xs'
                          : 'left-0.5 bg-slate-500 dark:bg-slate-400'
                      }`} />
                    </div>
                    <span className="truncate">
                      {useGeminiAI ? '✨ Gemini AI' : '⚙ Normal Mode'}
                    </span>
                  </button>

                  {/* ── RUN ATS MATCH BUTTON (Fixed width min-w-[210px] so no size shifting) ── */}
                  <Button 
                    onClick={handleRunAtsScoring} 
                    disabled={isLoadingAts || !atsJobId}
                    className={`h-9 min-w-[210px] px-5 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all ${
                      useGeminiAI
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${useGeminiAI ? 'fill-yellow-300 animate-pulse' : 'fill-amber-300 animate-pulse'}`} />
                    {isLoadingAts
                      ? (useGeminiAI ? 'AI Analyzing...' : 'Scanning & Scoring...')
                      : `Run ATS Match (≥ ${atsMinMatchPct}%)`
                    }
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ATS RESULTS TABLE */}
          <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                Ranked Candidates List ({atsResults.length})
                {totalScannedAts > 0 && (
                  <span className="text-xs text-slate-500 font-normal">
                    (Scanned {totalScannedAts} total applications; Filtered by ≥ {atsMinMatchPct}% match)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-white dark:bg-slate-900 overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="border-slate-100 dark:border-slate-800">
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300 w-20 whitespace-nowrap">Rank</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Candidate Name</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">ATS Score</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Matched Skills</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Missing Skills</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Experience</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Resume File</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300">Recommendation</TableHead>
                      <TableHead className="text-xs font-bold h-10 text-slate-700 dark:text-slate-300 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAts ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500 bg-white dark:bg-slate-900">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Sparkles className="w-7 h-7 text-amber-500 animate-spin" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Analyzing resumes, matching JD skills, and scoring candidates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : atsResults.length > 0 ? (
                      atsResults.map((item, idx) => (
                        <TableRow key={item.resumeBankId} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <TableCell className="text-xs py-2.5 font-extrabold whitespace-nowrap">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black rounded-full px-2.5 py-0.5 text-[11px] shadow-2xs whitespace-nowrap shrink-0">
                                #1 👑
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex items-center justify-center bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 font-bold rounded-full px-2.5 py-0.5 text-[11px] shadow-2xs whitespace-nowrap shrink-0">
                                #2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex items-center justify-center bg-gradient-to-r from-amber-700 to-amber-800 text-white font-bold rounded-full px-2.5 py-0.5 text-[11px] shadow-2xs whitespace-nowrap shrink-0">
                                #3
                              </span>
                            ) : (
                              <span className="text-slate-600 font-bold text-xs whitespace-nowrap px-1">#{idx + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-3 font-medium">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{item.candidateName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.email}</div>
                          </TableCell>
                          <TableCell className="text-xs py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full font-black text-xs shadow-2xs ${
                                item.atsScore >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : (item.atsScore >= 60 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800')
                              }`}>
                                {item.atsScore}/100
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2.5">
                            <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden max-w-[220px]">
                              {item.matchedSkills && item.matchedSkills.length > 0 ? (
                                <>
                                  {item.matchedSkills.slice(0, 2).map((sk: string, sIdx: number) => (
                                    <Badge key={sIdx} className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold truncate max-w-[90px]">✓ {sk}</Badge>
                                  ))}
                                  {item.matchedSkills.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAtsDetail(item)}
                                      className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold px-1.5 py-0.5 rounded-md cursor-pointer transition-all shrink-0"
                                    >
                                      +{item.matchedSkills.length - 2} More
                                    </button>
                                  )}
                                </>
                              ) : <span className="text-slate-400 text-[10px] italic">None matched</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2.5">
                            <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden max-w-[220px]">
                              {item.missingSkills && item.missingSkills.length > 0 ? (
                                <>
                                  {item.missingSkills.slice(0, 2).map((sk: string, sIdx: number) => (
                                    <Badge key={sIdx} variant="outline" className="text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate max-w-[90px]">✕ {sk}</Badge>
                                  ))}
                                  {item.missingSkills.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAtsDetail(item)}
                                      className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-1.5 py-0.5 rounded-md cursor-pointer transition-all shrink-0"
                                    >
                                      +{item.missingSkills.length - 2} More
                                    </button>
                                  )}
                                </>
                              ) : (item.matchedSkills && item.matchedSkills.length > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">100% Skills Matched ✓</span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">None</span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                            {item.yearsOfExperience} Yrs
                          </TableCell>
                          <TableCell className="text-xs py-3 whitespace-nowrap">
                            {item.resumeUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(getResumeViewUrl(item.resumeUrl), '_blank')}
                                className="h-7 px-2.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" /> View Resume 📄
                              </Button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Text parsed</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-3 whitespace-nowrap">
                            <Badge className={`${
                              item.recommendation === 'Strong Match' ? 'bg-emerald-600 text-white font-bold' : (item.recommendation === 'Good Match' ? 'bg-indigo-600 text-white font-bold' : (item.recommendation === 'Fair Match' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-600 text-white font-medium'))
                            } text-[10px] rounded-md px-2 py-0.5 shadow-2xs`}>
                              {item.recommendation}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAtsDetail(item)}
                                className="h-7 px-2.5 text-[11px] font-medium border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> Details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleShortlist(item.resumeBankId, Number(atsJobId))}
                                className="h-7 px-3 text-[11px] bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-lg font-bold shadow-xs"
                              >
                                Shortlist →
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500 bg-white dark:bg-slate-900">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Sparkles className="w-6 h-6 text-slate-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">No candidates found matching criteria ≥ {atsMinMatchPct}%.</span>
                            <span className="text-[11px] text-slate-400">Select a Job Opening above and click "Run AI ATS Match".</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BULK UPLOAD (PDF / ZIP / RAR / WORD / EXCEL) */}
        <TabsContent value="upload">
          <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-purple-600" />
                Bulk Resume & Structured Data Import
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Upload Form */}
                <div className="space-y-6">
                  
                  {/* Target Job Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Link to Target Job Opening (Optional)</label>
                    <Select value={bulkJobId || 'none'} onValueChange={val => setBulkJobId(val === 'none' ? '' : val)}>
                      <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-medium">
                        <SelectValue placeholder="-- Select Job Opening --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="none">-- General (No Specific Job) --</SelectItem>
                        {jobsList.map((job: any) => {
                          const id = getJobId(job);
                          const title = getJobTitle(job);
                          const code = getJobCode(job);
                          if (!id) return null;
                          return (
                            <SelectItem key={id} value={id}>
                              {code ? `[${code}] ` : ''}{title}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Multi-File Upload Section (PDF, ZIP, Word) */}
                  <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Upload Resume Files (PDF / ZIP / Word .docx)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Extracts candidate name, contact, skills & experience automatically</p>
                      </div>
                    </div>

                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.zip,.rar,.doc,.docx"
                      className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                      onChange={e => setBulkFiles(Array.from(e.target.files || []))}
                    />

                    {bulkFiles.length > 0 && (
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100/60 dark:bg-indigo-950/60 p-2 rounded-lg">
                        ✓ {bulkFiles.length} file(s) selected: {bulkFiles.map(f => f.name).join(', ')}
                      </div>
                    )}

                    <Button
                      onClick={handleMultiFileUpload}
                      disabled={isUploadingFiles || bulkFiles.length === 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs rounded-xl font-bold flex gap-2 shadow-xs"
                    >
                      <Upload className="w-4 h-4" /> {isUploadingFiles ? 'Parsing & Uploading...' : `Upload & Parse ${bulkFiles.length} File(s)`}
                    </Button>
                  </div>

                  {/* Excel Upload Section */}
                  <div className="p-5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Upload Structured Excel / CSV Data</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Max file size: 10MB (.xlsx, .csv)</p>
                      </div>
                    </div>

                    <Input 
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      className="text-xs h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                      onChange={(e) => setSelectedExcelFile(e.target.files?.[0] || null)}
                    />

                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={isUploadingFiles || !selectedExcelFile}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs rounded-xl font-bold flex gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" /> {isUploadingFiles ? 'Uploading Sheet...' : 'Upload Excel Sheet'}
                    </Button>
                  </div>

                </div>

                {/* Right Instructions */}
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2.5">
                    <Button onClick={handleDownloadSample} variant="outline" className="h-9 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-none rounded-xl px-4 shadow-xs">
                      Download Sample Excel File
                    </Button>
                    <Button onClick={handleDownloadDetails} variant="outline" className="h-9 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white border-none rounded-xl px-4 shadow-xs">
                      Download Candidates Details
                    </Button>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1.5">
                      <p className="font-bold text-slate-900 dark:text-white">Instruction for PDF / ZIP / Word File Upload:</p>
                      <p>• Select single or multiple PDF, Word (.docx) resumes directly.</p>
                      <p>• ZIP or RAR archives containing candidate PDF/Word resumes will be automatically uncompressed and parsed using OCR AI.</p>
                      <p>• All imported candidates land with <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold px-2 py-0.5">bulk_import</Badge> tag in the Resume Source Screen tab.</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">Instruction for Excel upload:</p>
                      <p><strong>Required Columns:</strong> Name, Gender</p>
                      <p><strong>Unique Column:</strong> Email Id</p>
                      <p><strong>Date Columns:</strong> Must be in yyyy-mm-dd format.</p>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BULK UPLOADED LOG */}
        <TabsContent value="logs">
          <Card className="rounded-2xl shadow-xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Upload Activity Audit Logs ({totalLogEntries})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportLogs} className="h-8 px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700">
                <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Export Logs
              </Button>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                <div>
                  Showing {totalLogEntries > 0 ? logStartIndex + 1 : 0} to {logEndIndex} of {totalLogEntries} entries
                </div>
                <div className="flex items-center gap-1.5">
                  Show 
                  <Select value={logPageSize} onValueChange={(val) => { setLogPageSize(val); setLogCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 px-1.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  per page
                </div>
              </div>
              
              <div className="bg-background overflow-x-auto">
                <Table className="min-w-[1100px]">
                  <TableHeader className="bg-muted">
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Upload Date</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Uploaded By</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">File Name</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-center">Total</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-center">ATS Passed</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-center">JD Passed</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-center">AI Shortlisted</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs font-semibold h-9 text-foreground whitespace-nowrap text-right pr-4">AI Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <TableRow key={log.id} className="border-border bg-card text-card-foreground hover:bg-muted/50">
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.date}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{log.uploadedBy}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-muted-foreground">{log.fileName}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-center font-mono font-semibold">{log.total}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-center font-mono font-bold text-indigo-600">
                            {log.atsPassedCount ?? 0}
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-center font-mono font-bold text-indigo-600">
                            {log.jdMatchPassedCount ?? 0}
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-center font-mono font-bold text-emerald-600">
                            {log.aiShortlistedCount ?? 0}
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px] font-medium">{log.status}</span>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap text-right pr-4">
                            {log.targetJobId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAtsJobId(String(log.targetJobId));
                                  setActiveTab('ats');
                                }}
                                className="h-7 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-medium"
                              >
                                <Sparkles className="w-3 h-3 mr-1" /> View AI Suggestions
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-[10px] italic">General Pool</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground bg-background border-b-0">
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

      {/* ATS DETAIL MODAL */}
      <Dialog open={!!selectedAtsDetail} onOpenChange={() => setSelectedAtsDetail(null)}>
        <DialogContent className="max-w-md">
          {selectedAtsDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-md font-bold flex items-center justify-between">
                  <span>Candidate ATS Breakdown</span>
                  <Badge className="bg-amber-500 text-white text-xs">{selectedAtsDetail.atsScore}/100 Score</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedAtsDetail.candidateName}</p>
                  <p className="text-slate-500">{selectedAtsDetail.email} | {selectedAtsDetail.phone || 'No phone'}</p>
                  <p className="text-slate-500">Applied Position: {selectedAtsDetail.position}</p>
                </div>

                {selectedAtsDetail.resumeUrl && (
                  <Button
                    onClick={() => window.open(getResumeViewUrl(selectedAtsDetail.resumeUrl), '_blank')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 flex gap-2"
                  >
                    <FileText className="w-4 h-4" /> Open Original Candidate Resume PDF 📄
                  </Button>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded space-y-2">
                  <div className="flex justify-between">
                    <span>Skill Match Score:</span>
                    <span className="font-bold">{selectedAtsDetail.skillScore}/50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Experience Score:</span>
                    <span className="font-bold">{selectedAtsDetail.expScore}/25</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recommendation:</span>
                    <span className="font-bold text-emerald-600">{selectedAtsDetail.recommendation}</span>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-1 text-slate-800 dark:text-slate-200">Matched Skills ({selectedAtsDetail.matchedSkills?.length || 0}):</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAtsDetail.matchedSkills?.map((s: string, idx: number) => (
                      <Badge key={idx} className="bg-emerald-100 text-emerald-800 text-[10px]">✓ {s}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-1 text-slate-800 dark:text-slate-200">Missing Skills ({selectedAtsDetail.missingSkills?.length || 0}):</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAtsDetail.missingSkills?.map((s: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-red-600 border-red-300 text-[10px]">✕ {s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setSelectedAtsDetail(null)}>Close</Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    handleShortlist(selectedAtsDetail.resumeBankId, Number(atsJobId));
                    setSelectedAtsDetail(null);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Shortlist Candidate →
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="none">-- General (No Specific Job) --</SelectItem>
                    {jobsList.map((job: any) => {
                      const id = getJobId(job);
                      const title = getJobTitle(job);
                      const code = getJobCode(job);
                      if (!id) return null;
                      return (
                        <SelectItem key={id} value={id}>
                          {code ? `[${code}] ` : ''}{title}
                        </SelectItem>
                      );
                    })}
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
                <label className="text-xs font-semibold">Email Id <span className="text-red-500">*</span></label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="h-8 text-xs" 
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Contact Number <span className="text-red-500">*</span></label>
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
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full h-8 text-xs bg-background border border-input rounded-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Choose">Choose</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="IN">India</option>
                </select>
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
                <label className="text-xs font-semibold">Marital Status <span className="text-red-500">*</span></label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({...formData, maritalStatus: e.target.value})}
                  className="w-full h-8 text-xs bg-background border border-input rounded-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Current Company</label>
                <Input value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 8 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Qualification <span className="text-red-500">*</span></label>
                <Input value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="h-8 text-xs" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">University</label>
                <Input value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 9 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Relevant Experience (Yrs)</label>
                <Input value={formData.relevantExp} onChange={e => setFormData({...formData, relevantExp: e.target.value})} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Total Experience (Yrs)</label>
                <Input value={formData.totalExp} onChange={e => setFormData({...formData, totalExp: e.target.value})} className="h-8 text-xs" />
              </div>
            </div>

            {/* ROW 10 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold">Skills <span className="text-red-500">*</span></label>
              <Input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} className="h-8 text-xs" required placeholder="e.g. React, Node.js, TypeScript" />
            </div>

            {/* RESUME FILE UPLOAD */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold">Candidate Resume (PDF)</label>
              <Input 
                type="file" 
                accept=".pdf,.doc,.docx"
                className="h-8 text-xs bg-background cursor-pointer"
                onChange={(e) => setCandidateResumeFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white">Save Candidate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QUICK SHORTLIST MODAL */}
      <Dialog open={isShortlistModalOpen} onOpenChange={setIsShortlistModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-md font-bold">Shortlist Candidate to Pipeline</DialogTitle>
          </DialogHeader>
          {selectedResumeForShortlist && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Shortlisting <strong className="text-slate-900">{selectedResumeForShortlist.name}</strong> ({selectedResumeForShortlist.trackerId}) to the Applicant Pipeline stage:
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800">Select Job Opening *</label>
                <select
                  value={quickJobId}
                  onChange={(e) => setQuickJobId(e.target.value)}
                  className="w-full h-9 text-xs bg-background border border-input rounded-md px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold cursor-pointer"
                >
                  <option value="">-- Choose Job Opening --</option>
                  {jobsList.map((job: any) => {
                    const id = getJobId(job);
                    const title = getJobTitle(job);
                    const code = getJobCode(job);
                    if (!id) return null;
                    return (
                      <option key={id} value={id}>
                        {code ? `[${code}] ` : ''}{title}
                      </option>
                    );
                  })}
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsShortlistModalOpen(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  disabled={!quickJobId || shortlistingId === selectedResumeForShortlist.id}
                  onClick={() => handleShortlist(selectedResumeForShortlist.id, Number(quickJobId))}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {shortlistingId === selectedResumeForShortlist.id ? 'Shortlisting...' : 'Confirm & Move to Pipeline →'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ATS CANDIDATE SKILLS & DETAILS MODAL */}
      <Dialog open={!!selectedAtsDetail} onOpenChange={(open) => !open && setSelectedAtsDetail(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
                <span>Candidate Skill Match Breakdown</span>
              </div>
              {selectedAtsDetail && (
                <Badge className={`${
                  selectedAtsDetail.atsScore >= 80 ? 'bg-emerald-600' : (selectedAtsDetail.atsScore >= 60 ? 'bg-amber-600' : 'bg-rose-600')
                } text-white font-black text-xs px-2.5 py-1`}>
                  {selectedAtsDetail.atsScore}/100 Score
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedAtsDetail && (
            <div className="space-y-4 text-xs pt-1">
              {/* Candidate Info Header */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center">
                  <span>{selectedAtsDetail.candidateName}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">{selectedAtsDetail.recommendation}</Badge>
                </div>
                <div className="text-slate-500 text-[11px] flex gap-3 flex-wrap">
                  <span>📧 {selectedAtsDetail.email}</span>
                  <span>💼 Exp: {selectedAtsDetail.yearsOfExperience} Yrs</span>
                  <span>🎯 Role: {selectedAtsDetail.jobTitle}</span>
                </div>
              </div>

              {/* Matched Skills List */}
              <div className="space-y-2">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Matched Skills ({selectedAtsDetail.matchedSkills?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 max-h-40 overflow-y-auto">
                  {selectedAtsDetail.matchedSkills && selectedAtsDetail.matchedSkills.length > 0 ? (
                    selectedAtsDetail.matchedSkills.map((sk: string, idx: number) => (
                      <Badge key={idx} className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs px-2.5 py-1 font-bold rounded-lg shadow-2xs">
                        ✓ {sk}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No skills matched from Job Description</span>
                  )}
                </div>
              </div>

              {/* Missing Skills List */}
              <div className="space-y-2">
                <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Missing Skills ({selectedAtsDetail.missingSkills?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 max-h-40 overflow-y-auto">
                  {selectedAtsDetail.missingSkills && selectedAtsDetail.missingSkills.length > 0 ? (
                    selectedAtsDetail.missingSkills.map((sk: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs px-2.5 py-1 font-medium rounded-lg">
                        ✕ {sk}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-emerald-600 font-bold">All target skills matched! ✓</span>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-3 border-t flex justify-between items-center">
                {selectedAtsDetail.resumeUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getResumeViewUrl(selectedAtsDetail.resumeUrl), '_blank')}
                    className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Full Resume 📄
                  </Button>
                ) : <div />}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedAtsDetail(null)}>Close</Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const rId = selectedAtsDetail.resumeBankId;
                      setSelectedAtsDetail(null);
                      handleShortlist(rId, Number(atsJobId));
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    Shortlist Candidate →
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resume Document Viewer Modal */}
      <ResumeViewerModal
        open={isResumeModalOpen}
        onOpenChange={setIsResumeModalOpen}
        candidate={selectedResumeForModal}
      />
    </div>
  );
};
