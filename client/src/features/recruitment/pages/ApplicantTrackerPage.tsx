import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight, UserCheck, Eye, Layers, Copy, Link2, CheckCircle, Code2, FileText, Calendar, Mail, UserX, XCircle, Star, Video, Clock, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AiAnalysisModal } from '../components/AiAnalysisModal';

const CANDIDATE_STAGES = ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
const MARITAL_STATUS_OPTIONS = ['Unmarried', 'Married'];
const GENDER_OPTIONS = ['Male', 'Female', 'Transgender'];

const INITIAL_FILTERS = {
  name: '',
  email: '',
  maritalStatus: [] as string[],
  qualification: '',
  skills: '',
  gender: [] as string[],
  contact: '',
  status: 'all'
};

// Helper component for the Multi-Select with Checkboxes
const MultiSelectCheckboxDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholderPrefix
}: {
  options?: string[],
  selectedValues?: string[],
  onChange: (values: string[]) => void,
  placeholderPrefix: string
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelected = Array.isArray(selectedValues) ? selectedValues : [];
  const filteredOptions = safeOptions.filter(opt => String(opt).toLowerCase().includes(search.toLowerCase()));
  const isAllSelected = safeSelected.length === safeOptions.length && safeOptions.length > 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...safeOptions]);
    }
  };

  const handleToggleOption = (val: string) => {
    if (safeSelected.includes(val)) {
      onChange(safeSelected.filter(v => v !== val));
    } else {
      onChange([...safeSelected, val]);
    }
  };

  const displayText = safeSelected.length === 0 
    ? `${placeholderPrefix} (0)`
    : `${placeholderPrefix}${safeSelected.join(', ')} (${safeSelected.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-8 px-3 text-xs bg-background border-border rounded-sm font-normal text-muted-foreground hover:text-muted-foreground hover:bg-background">
          <span className="truncate">{displayText}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-2 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs border-border rounded-sm"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
          {search === '' && (
            <div className="flex items-center space-x-2 p-1 hover:bg-background rounded-sm cursor-pointer" onClick={handleToggleAll}>
              <Checkbox checked={isAllSelected} id="check-all" />
              <label htmlFor="check-all" className="text-xs text-foreground cursor-pointer w-full">{isAllSelected ? 'Uncheck All' : 'Check All'}</label>
            </div>
          )}
          {filteredOptions.map((opt) => (
            <div key={opt} className="flex items-center space-x-2 p-1 hover:bg-background rounded-sm cursor-pointer" onClick={() => handleToggleOption(opt)}>
              <Checkbox checked={safeSelected.includes(opt)} id={`opt-${opt}`} />
              <label htmlFor={`opt-${opt}`} className="text-xs text-foreground cursor-pointer w-full">{opt}</label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ApplicantTrackerPage: React.FC = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [pipelineStages, setPipelineStages] = useState<any[]>([
    { id: 1, stageName: 'Applied', stage_name: 'Applied', stage_code: 'applied' },
    { id: 2, stageName: 'Screening', stage_name: 'Screening', stage_code: 'screening' },
    { id: 3, stageName: 'Assessment', stage_name: 'Assessment', stage_code: 'assessment' },
    { id: 4, stageName: 'Interview', stage_name: 'Interview', stage_code: 'interview' },
    { id: 5, stageName: 'Offer', stage_name: 'Offer', stage_code: 'offer' },
    { id: 6, stageName: 'Hired', stage_name: 'Hired', stage_code: 'hired' },
    { id: 7, stageName: 'Rejected', stage_name: 'Rejected', stage_code: 'rejected' },
  ]);

  // Assessment, Offer & Interview Schedule States
  const [assessments, setAssessments] = useState<any[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [assignedTestUrl, setAssignedTestUrl] = useState<string | null>(null);

  // Multi-Round Interview Management States
  const [candidateRoundsSummary, setCandidateRoundsSummary] = useState<any>(null);
  const [showRoundsDrawer, setShowRoundsDrawer] = useState(false);
  const [activeCandidateForDrawer, setActiveCandidateForDrawer] = useState<any>(null);
  const [loadingRoundsSummary, setLoadingRoundsSummary] = useState(false);

  // AI Modal State
  const [selectedCandidateForAiModal, setSelectedCandidateForAiModal] = useState<any | null>(null);
  const [isAiAnalysisModalOpen, setIsAiAnalysisModalOpen] = useState(false);

  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [offerPosition, setOfferPosition] = useState('');
  const [offerCtc, setOfferCtc] = useState('');
  const [offerBaseSalary, setOfferBaseSalary] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');

  // Schedule Interview state
  const [scheduleType, setScheduleType] = useState<'video' | 'phone' | 'in_person'>('video');
  const [scheduleRound, setScheduleRound] = useState(1);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState('45');
  const [scheduleMeetingUrl, setScheduleMeetingUrl] = useState('');
  const [scheduleInterviewerId, setScheduleInterviewerId] = useState('');
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  const generateUniqueMeetingLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.jit.si/apponext-interview-${rand(8)}`;
  };

  const openScheduleInterviewModal = async (candidate: any) => {
    setSelectedAppId(candidate.id);
    setScheduleDate('');
    setScheduleMeetingUrl(generateUniqueMeetingLink());
    setCandidateRoundsSummary(null);
    setShowScheduleDialog(true);

    try {
      const res = await apiClient.get(`/recruitment/applications/${candidate.id}/interview-rounds`);
      if (res.data?.success && res.data?.data) {
        setCandidateRoundsSummary(res.data.data);
        const nextRound = res.data.data.nextSuggestedRound || 1;
        setScheduleRound(nextRound);
      } else {
        setScheduleRound(1);
      }
    } catch (e) {
      setScheduleRound(1);
    }
  };

  const openCandidateRoundsDrawer = async (candidate: any) => {
    setActiveCandidateForDrawer(candidate);
    setShowRoundsDrawer(true);
    setLoadingRoundsSummary(true);
    try {
      const res = await apiClient.get(`/recruitment/applications/${candidate.id}/interview-rounds`);
      if (res.data?.success && res.data?.data) {
        setCandidateRoundsSummary(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load candidate rounds summary:', e);
    } finally {
      setLoadingRoundsSummary(false);
    }
  };

  // Email Template States for Interview Scheduling
  const [interviewTemplates, setInterviewTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default_standard');
  const [emailSubject, setEmailSubject] = useState('Interview Invitation: {{positionTitle}} - {{companyName}}');
  const [candidateEmailBody, setCandidateEmailBody] = useState('');
  const [interviewerEmailBody, setInterviewerEmailBody] = useState('');
  const [sendEmailsToggle, setSendEmailsToggle] = useState(true);

  // Offer Email Template States
  const [offerTemplates, setOfferTemplates] = useState<any[]>([]);
  const [selectedOfferTemplateId, setSelectedOfferTemplateId] = useState<string>('default_offer_standard');
  const [offerEmailSubject, setOfferEmailSubject] = useState('Job Offer: {{positionTitle}} - {{companyName}}');
  const [offerEmailBody, setOfferEmailBody] = useState('');
  const [sendOfferEmailToggle, setSendOfferEmailToggle] = useState(true);

  // Rejection / Regret Email States
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingCandidateInfo, setRejectingCandidateInfo] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionTemplates, setRejectionTemplates] = useState<any[]>([]);
  const [selectedRejectionTemplateId, setSelectedRejectionTemplateId] = useState<string>('default_reject_general');
  const [rejectionSubject, setRejectionSubject] = useState('Update on your application for {{positionTitle}} at {{companyName}}');
  const [rejectionBody, setRejectionBody] = useState('');
  const [sendRejectionEmailToggle, setSendRejectionEmailToggle] = useState(true);

  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchEmployees = () => {
    apiClient.get('/employees', { params: { pageSize: 500 } })
      .then(res => {
        const rawItems = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const items = rawItems.map((item: any) => {
            const desig = (item.designation || item.jobTitle || item.designationName || item.designation_name || item.accessRole || item.role || '').toLowerCase();
            const role = (item.accessRole || item.role || '').toLowerCase();
            const isMgrRole = ['manager', 'department_head', 'hr_manager', 'organization_admin', 'admin', 'team_lead'].includes(role);
            const isMgrDesig = desig.includes('manager') || desig.includes('head') || desig.includes('lead') || desig.includes('director') || desig.includes('vp') || desig.includes('chief') || desig.includes('supervisor');
            const isMgr = isMgrRole || isMgrDesig || Boolean(item.isManager) || Boolean(item.is_manager);
            return {
              ...item,
              isManager: isMgr
            };
          });
          setEmployeesList(items);
          const firstMgr = items.find((e: any) => e.isManager) || items[0];
          setScheduleInterviewerId(prev => prev || String(firstMgr.id));
        } else {
          apiClient.get('/users').then(uRes => {
            const uItems = Array.isArray(uRes.data) ? uRes.data : (uRes.data?.data || uRes.data?.items || []);
            setEmployeesList(uItems);
            if (uItems.length > 0) {
              setScheduleInterviewerId(prev => prev || String(uItems[0].id));
            }
          }).catch(() => {});
        }
      })
      .catch(err => {
        console.error('Failed to fetch employees list', err);
      });
  };

  const fetchInterviewTemplates = () => {
    apiClient.get('/recruitment/interviews/templates')
      .then(res => {
        if (res.data?.success) {
          const list = [
            ...(res.data.data?.customTemplates || []),
            ...(res.data.data?.defaultTemplates || [])
          ];
          setInterviewTemplates(list);
          if (list.length > 0) {
            applyTemplate(list[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch interview templates', err));
  };

  const applyTemplate = (tpl: any) => {
    if (!tpl) return;
    setSelectedTemplateId(String(tpl.id));
    setEmailSubject(tpl.subject || 'Interview Invitation: {{positionTitle}} - {{companyName}}');

    const cleanText = (str: string) => {
      if (!str) return '';
      return str
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
    };

    setCandidateEmailBody(cleanText(tpl.candidate_body || tpl.email_notification || ''));
    setInterviewerEmailBody(cleanText(tpl.interviewer_body || ''));
  };

  const fetchOfferTemplates = () => {
    apiClient.get('/recruitment/offer/templates')
      .then(res => {
        if (res.data?.success) {
          const list = [
            ...(res.data.data?.customTemplates || []),
            ...(res.data.data?.defaultTemplates || [])
          ];
          setOfferTemplates(list);
          if (list.length > 0) {
            applyOfferTemplate(list[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch offer templates', err));
  };

  const applyOfferTemplate = (tpl: any) => {
    if (!tpl) return;
    setSelectedOfferTemplateId(String(tpl.id));
    setOfferEmailSubject(tpl.subject || 'Job Offer: {{positionTitle}} - {{companyName}}');
    const cleanText = (str: string) => {
      if (!str) return '';
      return str.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    };
    setOfferEmailBody(cleanText(tpl.email_notification || tpl.body || ''));
  };

  const fetchRejectionTemplates = () => {
    apiClient.get('/recruitment/rejection/templates')
      .then(res => {
        if (res.data?.success) {
          const list = [
            ...(res.data.data?.customTemplates || []),
            ...(res.data.data?.defaultTemplates || [])
          ];
          setRejectionTemplates(list);
          if (list.length > 0) {
            applyRejectionTemplate(list[0]);
          }
        }
      })
      .catch(err => console.error('Failed to fetch rejection templates', err));
  };

  const applyRejectionTemplate = (tpl: any) => {
    if (!tpl) return;
    setSelectedRejectionTemplateId(String(tpl.id));
    setRejectionSubject(tpl.subject || 'Update on your application for {{positionTitle}} at {{companyName}}');
    const cleanText = (str: string) => {
      if (!str) return '';
      return str.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
    };
    setRejectionBody(cleanText(tpl.email_notification || tpl.body || ''));
  };

  useEffect(() => {
    fetchEmployees();
    fetchInterviewTemplates();
    fetchOfferTemplates();
    fetchRejectionTemplates();
  }, []);

  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) {
      toast.error('Please select date and time for the interview');
      return;
    }

    let targetInterviewerId = scheduleInterviewerId;
    if (!targetInterviewerId && employeesList.length > 0) {
      targetInterviewerId = String(employeesList[0].id);
      setScheduleInterviewerId(targetInterviewerId);
    }

    if (!targetInterviewerId) {
      toast.error('Please select an Assigned Interviewer from the list');
      return;
    }

    const parsedNumId = Number(targetInterviewerId);
    const interviewerPayload = (!isNaN(parsedNumId) && parsedNumId > 0)
      ? [parsedNumId]
      : [targetInterviewerId];

    let formattedDateStr = scheduleDate;
    if (formattedDateStr.includes('T')) {
      formattedDateStr = formattedDateStr.replace('T', ' ');
    }
    if (formattedDateStr.length === 16) {
      formattedDateStr += ':00';
    }

    setSubmittingAction(true);
    apiClient.post('/recruitment/interviews', {
      applicationId: selectedAppId,
      interviewType: scheduleType,
      interviewRound: Number(scheduleRound),
      scheduledDate: formattedDateStr,
      durationMinutes: Number(scheduleDuration),
      meetingUrl: scheduleMeetingUrl,
      interviewerIds: interviewerPayload,
      customSubject: emailSubject,
      customCandidateBody: candidateEmailBody,
      customInterviewerBody: interviewerEmailBody,
      sendEmails: sendEmailsToggle,
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Interview scheduled & emails dispatched!');
          setShowScheduleDialog(false);
          fetchApplications();
        } else {
          toast.error(res.data?.message || 'Failed to schedule interview');
        }
      })
      .catch(err => {
        console.error('Failed to schedule interview', err);
        toast.error('Failed to schedule interview');
      })
      .finally(() => setSubmittingAction(false));
  };

  const fetchAssessments = () => {
    apiClient.get('/recruitment/assessments')
      .then(res => {
        if (res.data?.success) {
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
          setAssessments(items);
        }
      })
      .catch(err => console.error('Failed to fetch assessments list', err));
  };

  const handleAssignAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentId) {
      toast.error('Please select an assessment to assign');
      return;
    }
    setSubmittingAction(true);
    apiClient.post('/recruitment/assessments/assign', {
      applicationId: selectedAppId,
      assessmentId: Number(selectedAssessmentId)
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Assessment assigned successfully!');
          setShowAssignDialog(false);
          
          const attemptUuid = res.data.data?.uuid;
          if (attemptUuid) {
            const testUrl = `${window.location.origin}/public/assessments/take/${attemptUuid}`;
            setAssignedTestUrl(testUrl);
          }
          
          fetchApplications();
        } else {
          toast.error(res.data?.message || 'Failed to assign assessment');
        }
      })
      .catch(err => {
        console.error('Failed to assign assessment', err);
        toast.error('Failed to assign assessment');
      })
      .finally(() => setSubmittingAction(false));
  };

  const handleSendOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPosition || !offerCtc || !offerBaseSalary || !offerStartDate || !offerExpiryDate) {
      toast.error('Please fill in all offer terms fields');
      return;
    }
    setSubmittingAction(true);
    
    // Generate offer first
    apiClient.post('/recruitment/offers', {
      applicationId: selectedAppId,
      positionTitle: offerPosition,
      costToCompany: Number(offerCtc),
      baseSalary: Number(offerBaseSalary),
      currency: 'INR',
      offerStartDate,
      offerExpiryDate
    })
      .then(res => {
        if (res.data?.success) {
          const offerId = res.data.data.id;
          // Send offer email with custom template
          return apiClient.post(`/recruitment/offers/${offerId}/send`, {
            customSubject: offerEmailSubject,
            customBody: offerEmailBody,
            sendEmails: sendOfferEmailToggle,
          });
        } else {
          throw new Error(res.data?.message || 'Failed to generate offer');
        }
      })
      .then(res => {
        if (res?.data?.success) {
          toast.success('Offer generated and emailed successfully!');
          setShowOfferDialog(false);
          fetchApplications();
        } else {
          toast.error(res?.data?.message || 'Failed to email offer');
        }
      })
      .catch(err => {
        console.error('Failed to generate/email offer letter', err);
        toast.error(err.message || 'Failed to complete offer generation');
      })
      .finally(() => setSubmittingAction(false));
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCandidateInfo?.id) return;
    setSubmittingAction(true);
    apiClient.post(`/recruitment/applications/${rejectingCandidateInfo.id}/reject-email`, {
      rejectionReason,
      customSubject: rejectionSubject,
      customBody: rejectionBody,
      sendEmail: sendRejectionEmailToggle,
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Candidate marked as Rejected & regret email processed!');
          setShowRejectDialog(false);
          setRejectingCandidateInfo(null);
          fetchApplications();
        } else {
          toast.error(res.data?.message || 'Failed to reject application');
        }
      })
      .catch(err => {
        console.error('Failed to reject application', err);
        toast.error('Failed to reject application');
      })
      .finally(() => setSubmittingAction(false));
  };

  const fetchPipelineStages = () => {
    apiClient.get('/recruitment/pipeline-stages')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setPipelineStages(res.data.data);
        } else if (res.data?.success && Array.isArray(res.data.data?.items)) {
          setPipelineStages(res.data.data.items);
        }
      })
      .catch(err => console.error('Failed to load pipeline stages', err));
  };

  const fetchApplications = () => {
    setIsLoading(true);
    apiClient.get('/recruitment/applications')
      .then(res => {
        const rawList = res.data?.success && Array.isArray(res.data.data) 
          ? res.data.data 
          : (res.data?.success && Array.isArray(res.data.data?.items) ? res.data.data.items : []);

        const mapped = rawList.map((item: any) => ({
          id: item.id,
          candidateId: item.candidateId || item.candidate_id || item.candidate?.id || item.id,
          jobId: item.jobId || item.job_id || item.job?.id || null,
          name: item.candidateName || item.candidate_name || item.name || 'N/A',
          email: item.candidateEmail || item.candidate_email || item.email || 'N/A',
          contact: item.candidatePhone || item.candidate_phone || item.phone || item.contact || '-',
          skills: item.candidateSkills || item.candidate_skills || item.skills || '-',
          status: item.applicationStatus || item.application_status || item.status || 'applied',
          positionTitle: item.positionTitle || item.position_title || item.jobTitle || item.job_title || '-',
          pipelineStageId: item.pipelineStageId || item.pipeline_stage_id || item.stage_id || '',
          source: item.candidateSource || item.candidate_source || item.appliedFromSource || item.applied_from_source || '-',
          maritalStatus: item.maritalStatus || item.marital_status || item.candidate_marital_status || '-',
          gender: item.gender || item.candidate_gender || '-',
          qualification: item.qualification || item.highest_qualification || item.candidate_qualification || '-',
          atsScore: item.atsScore ?? item.ats_score ?? item.candidate?.ats_score ?? null,
          jdMatchScore: item.jdMatchScore ?? item.jd_match_score ?? item.candidate?.jd_match_score ?? null
        }));
        setData(mapped);
        setFilteredData(mapped);
      })
      .catch(err => {
        console.error('Failed to load applications', err);
        toast.error('Failed to load applicant records');
        setData([]);
        setFilteredData([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchApplications();
    fetchPipelineStages();
    fetchAssessments();
    fetchEmployees();
  }, []);

  const handleMoveStage = (applicationId: number, stageId: number) => {
    if (!stageId) return;
    apiClient.patch(`/recruitment/applications/${applicationId}/move-stage`, { stageId })
      .then(res => {
        if (res.data?.success) {
          toast.success('Application stage updated successfully!');
          fetchApplications();
        } else {
          toast.error(res.data?.message || 'Failed to update stage');
        }
      })
      .catch(err => {
        console.error('Failed to move stage', err);
        toast.error('Failed to move stage');
      });
  };

  const handleOnboardCandidate = (applicationId: number) => {
    let fieldMappings: any[] = [];
    try {
      const saved = localStorage.getItem('mrf_user_mappings');
      if (saved) fieldMappings = JSON.parse(saved);
    } catch (e) {}

    apiClient.post(`/recruitment/applications/${applicationId}/onboard`, { fieldMappings })
      .then(res => {
        if (res.data?.success) {
          toast.success(`Candidate hired & onboarded successfully! Employee Code: ${res.data.employeeCode || ''}`);
          fetchApplications();
        } else {
          toast.error(res.data?.message || 'Failed to hire candidate');
        }
      })
      .catch(err => {
        console.error('Failed to hire candidate', err);
        toast.error('Failed to hire candidate');
      });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    const safeData = Array.isArray(data) ? data : [];
    const results = safeData.filter(applicant => {
      const name = String(applicant?.name || '').toLowerCase();
      const email = String(applicant?.email || '').toLowerCase();
      const qual = String(applicant?.qualification || '').toLowerCase();
      const skills = String(applicant?.skills || '').toLowerCase();
      const contact = String(applicant?.contact || '');
      const status = String(applicant?.status || '').toLowerCase();
      const filterStatus = String(filters.status || '').toLowerCase();

      return (
        (!filters.name || name.includes(filters.name.toLowerCase())) &&
        (!filters.email || email.includes(filters.email.toLowerCase())) &&
        (filters.maritalStatus.length === 0 || filters.maritalStatus.includes(applicant?.maritalStatus)) &&
        (!filters.qualification || qual.includes(filters.qualification.toLowerCase())) &&
        (!filters.skills || skills.includes(filters.skills.toLowerCase())) &&
        (filters.gender.length === 0 || filters.gender.includes(applicant?.gender)) &&
        (!filters.contact || contact.includes(filters.contact)) &&
        (filters.status === 'all' || status === filterStatus || applicant?.status === filters.status)
      );
    });
    setFilteredData(results);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setFilteredData(data);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ['Name', 'Email Id', 'Marital Status', 'Qualification', 'Skills', 'Gender', 'Contact', 'Status'];
    const safeFiltered = Array.isArray(filteredData) ? filteredData : [];
    const csvContent = [
      headers.join(','),
      ...safeFiltered.map(c => `"${c?.name || ''}","${c?.email || ''}","${c?.maritalStatus || ''}","${c?.qualification || ''}","${c?.skills || ''}","${c?.gender || ''}","${c?.contact || ''}","${c?.status || ''}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applicant_tracker.csv';
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
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/20 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Applicant Pipeline Tracker
            </h1>
            <p className="text-xs text-muted-foreground">
              Track candidate lifecycle, multi-round interviews, assessments, and offer letter generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-2 rounded-xl border border-border/80 text-xs font-semibold text-foreground shadow-2xs">
            <UserCheck className="w-4 h-4 text-primary" />
            <span>Active Pipeline: <strong className="text-primary font-bold">{totalEntries} Applicants</strong></span>
          </div>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Filters Section ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-border/60 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Filter Applicant Pipeline
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">Refine search criteria</span>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Candidate Name</label>
              <Input 
                placeholder="Search name..."
                value={filters.name} 
                onChange={(e) => handleFilterChange('name', e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Email Address</label>
              <Input 
                placeholder="Search email..."
                value={filters.email} 
                onChange={(e) => handleFilterChange('email', e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Marital Status</label>
              <MultiSelectCheckboxDropdown 
                options={MARITAL_STATUS_OPTIONS}
                selectedValues={filters.maritalStatus}
                onChange={(vals) => handleFilterChange('maritalStatus', vals)}
                placeholderPrefix="Marital Status"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Qualification</label>
              <Input 
                placeholder="Degree / Stream..."
                value={filters.qualification} 
                onChange={(e) => handleFilterChange('qualification', e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Skills</label>
              <Input 
                placeholder="e.g. React, Node, Python..."
                value={filters.skills} 
                onChange={(e) => handleFilterChange('skills', e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Gender</label>
              <MultiSelectCheckboxDropdown 
                options={GENDER_OPTIONS}
                selectedValues={filters.gender}
                onChange={(vals) => handleFilterChange('gender', vals)}
                placeholderPrefix="Gender "
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Contact Number</label>
              <Input 
                placeholder="Phone number..."
                value={filters.contact} 
                onChange={(e) => handleFilterChange('contact', e.target.value)} 
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Candidate Status</label>
              <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {CANDIDATE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage} className="capitalize">{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button onClick={handleReset} variant="outline" className="h-9 px-4 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground">
              Reset Filters
            </Button>
            <Button onClick={handleSearch} className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl shadow-xs gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Results Section ──────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/60 gap-4">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Applicant Pipeline Roster
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} candidates</p>
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
            <Table className="w-full min-w-[1250px] border-collapse">
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground w-[180px]">Candidate</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground w-[180px]">Applied Role</TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[90px]">ATS Score</TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[90px]">JD Match</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[110px]">Qualification</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[130px]">Skills</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[120px]">Contact</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[140px]">Pipeline Stage</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[100px]">Actions</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground w-[100px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading applicant pipeline records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((candidate) => {
                    const initials = (candidate.name || 'CA').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    const statusStr = (candidate.status || 'applied').toLowerCase();

                    return (
                      <TableRow key={candidate.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">{candidate.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate font-mono">{candidate.email}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-5 text-xs font-semibold text-foreground">
                          {candidate.positionTitle}
                        </TableCell>

                        {/* ATS Score Column */}
                        <TableCell className="py-3 px-4 text-center">
                          {candidate.atsScore !== null && candidate.atsScore !== undefined ? (
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border inline-block",
                              candidate.atsScore >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                              candidate.atsScore >= 70 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                              "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            )}>
                              {candidate.atsScore}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-mono">-</span>
                          )}
                        </TableCell>

                        {/* JD Match Column */}
                        <TableCell className="py-3 px-4 text-center">
                          {candidate.jdMatchScore !== null && candidate.jdMatchScore !== undefined ? (
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold border inline-block",
                              candidate.jdMatchScore >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                              candidate.jdMatchScore >= 65 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                              "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            )}>
                              {candidate.jdMatchScore}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-mono">-</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs text-muted-foreground font-medium truncate max-w-[120px]" title={candidate.qualification}>
                          {candidate.qualification || '-'}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs text-muted-foreground font-medium truncate max-w-[130px]" title={candidate.skills}>
                          {candidate.skills || '-'}
                        </TableCell>

                        <TableCell className="py-3 px-4 text-xs text-muted-foreground font-mono">
                          {candidate.contact || '-'}
                        </TableCell>

                        <TableCell className="py-3 px-4">
                          <div className="relative">
                            {(() => {
                              const candidateStatusNorm = String(candidate.status || '').toLowerCase().trim();
                              const matchedStage = pipelineStages.find((s) => 
                                s.id === Number(candidate.pipelineStageId) || 
                                String(s.stage_code || s.stageName || s.stage_name || '').toLowerCase().trim() === candidateStatusNorm
                              );
                              const selectedVal = candidate.pipelineStageId || (matchedStage ? matchedStage.id : '');

                              return (
                                <select
                                  value={selectedVal}
                                  onChange={(e) => handleMoveStage(candidate.id, Number(e.target.value))}
                                  className="w-full text-xs font-semibold rounded-lg bg-background border border-border px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs text-foreground cursor-pointer"
                                >
                                  <option value="" disabled>Select Stage...</option>
                                  {pipelineStages.map((stage) => (
                                    <option key={stage.id} value={stage.id}>
                                      {stage.stageName || stage.stage_name}
                                    </option>
                                  ))}
                                </select>
                              );
                            })()}
                            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-2.5 pointer-events-none" />
                          </div>
                        </TableCell>

                        <TableCell className="py-3 px-4">
                          {/* Sleek Combined Actions Menu */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-bold px-3 rounded-xl border-border hover:bg-muted text-foreground shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                Actions <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-1.5 text-xs space-y-1 shadow-2xl border-border bg-card text-foreground rounded-xl">
                               {/* AI Analysis Modal Trigger */}
                               <button
                                 type="button"
                                 onClick={() => {
                                   setSelectedCandidateForAiModal(candidate);
                                   setIsAiAnalysisModalOpen(true);
                                 }}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-primary/10 font-bold text-primary cursor-pointer transition-colors"
                               >
                                 <Sparkles className="w-3.5 h-3.5 text-primary" /> View AI ATS Analysis
                                </button>

                               <div className="my-1 border-t border-border/60" />

                               <button
                                 type="button"
                                 onClick={() => {
                                   setSelectedAppId(candidate.id);
                                   setSelectedAssessmentId('');
                                   setShowAssignDialog(true);
                                 }}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
                               >
                                 <Code2 className="w-3.5 h-3.5 text-blue-500" /> Assign Assessment
                               </button>

                               <button
                                 type="button"
                                 onClick={() => openScheduleInterviewModal(candidate)}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
                               >
                                 <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Schedule Interview
                               </button>

                               <button
                                 type="button"
                                 onClick={() => openCandidateRoundsDrawer(candidate)}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-muted font-medium text-foreground cursor-pointer transition-colors"
                               >
                                 <Layers className="w-3.5 h-3.5 text-indigo-500" /> Interview Timeline
                               </button>

                               <button
                                 type="button"
                                 onClick={() => {
                                   window.location.href = '/hr/recruitment/interviews';
                                 }}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400 cursor-pointer transition-colors"
                               >
                                 <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Rate Feedback
                               </button>

                               <button
                                 type="button"
                                 onClick={() => {
                                   setSelectedAppId(candidate.id);
                                   setOfferPosition(candidate.positionTitle || '');
                                   setOfferCtc('');
                                   setOfferBaseSalary('');
                                   setOfferStartDate('');
                                   setOfferExpiryDate('');
                                   setShowOfferDialog(true);
                                 }}
                                 className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-purple-500/10 font-medium text-purple-600 dark:text-purple-400 cursor-pointer transition-colors"
                               >
                                 <FileText className="w-3.5 h-3.5 text-purple-500" /> Generate Offer Letter
                               </button>

                               {['offered', 'offer'].includes((candidate.status || '').toLowerCase()) && (
                                 <button
                                   type="button"
                                   onClick={() => handleOnboardCandidate(candidate.id)}
                                   className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer transition-colors"
                                 >
                                   <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Hire & Onboard
                                 </button>
                               )}

                               {candidate.status?.toLowerCase() !== 'rejected' && candidate.status?.toLowerCase() !== 'withdrawn' && (
                                 <>
                                   <div className="my-1 border-t border-border/60" />
                                   <button
                                     type="button"
                                     onClick={() => {
                                       setRejectingCandidateInfo(candidate);
                                       setRejectionReason('');
                                       setShowRejectDialog(true);
                                     }}
                                     className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                   >
                                     <UserX className="w-3.5 h-3.5 text-rose-500" /> Reject Candidate
                                   </button>
                                 </>
                               )}
                            </PopoverContent>
                          </Popover>
                        </TableCell>

                        <TableCell className="py-3 px-4 text-center">
                          <Badge variant="outline" className={cn(
                            "px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full",
                            ['hired', 'approved'].includes(statusStr)
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                              : ['offered', 'offer'].includes(statusStr)
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                              : statusStr === 'interview'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : ['rejected', 'withdrawn'].includes(statusStr)
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          )}>
                            {candidate.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground bg-background">
                      No applicant pipeline records found matching the criteria.
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
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-xl border-border hover:bg-muted text-foreground disabled:opacity-40"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Assessment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Online Assessment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an assessment profile to assign to the candidate.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignAssessmentSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Select Test Profile</label>
              <select
                value={selectedAssessmentId}
                onChange={e => setSelectedAssessmentId(e.target.value)}
                className="w-full p-2 border border-border rounded bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="">Choose Test...</option>
                {assessments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.assessmentName || a.assessment_name || 'Untitled'} ({(a.assessmentType || a.assessment_type || 'test').toUpperCase()})
                  </option>
                ))}

              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)} disabled={submittingAction} className="text-xs h-8 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 rounded-sm">
                {submittingAction ? 'Assigning...' : 'Assign & Send Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Link Assigned Success Dialog */}
      <Dialog open={Boolean(assignedTestUrl)} onOpenChange={(open) => !open && setAssignedTestUrl(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Test Assigned & Email Sent
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              An automated email with the test link has been dispatched to the candidate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
              <p className="font-semibold">📧 Candidate Email Notification Sent!</p>
              <p className="text-[11px] mt-0.5 text-green-700">
                The candidate will receive the test invitation in their email and can click "Start Assessment" to begin the proctored test.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Direct Assessment Link (Copy to Share)</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={assignedTestUrl || ''}
                  className="h-8 text-xs font-mono bg-muted text-muted-foreground"
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  onClick={() => {
                    if (assignedTestUrl) {
                      navigator.clipboard.writeText(assignedTestUrl);
                      toast.success('Test link copied to clipboard!');
                    }
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setAssignedTestUrl(null)} className="h-8 text-xs px-4">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate & Email Offer Letter</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the candidate's offer terms and customize the offer invitation email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendOfferSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-foreground">Position Title</label>
                <Input 
                  value={offerPosition} 
                  onChange={e => setOfferPosition(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cost to Company (CTC)</label>
                <Input 
                  type="number"
                  value={offerCtc} 
                  onChange={e => setOfferCtc(e.target.value)}
                  placeholder="CTC amount"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Base Salary</label>
                <Input 
                  type="number"
                  value={offerBaseSalary} 
                  onChange={e => setOfferBaseSalary(e.target.value)}
                  placeholder="Base Salary"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Start Date</label>
                <Input 
                  type="date"
                  value={offerStartDate} 
                  onChange={e => setOfferStartDate(e.target.value)}
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Offer Expiry Date</label>
                <Input 
                  type="date"
                  value={offerExpiryDate} 
                  onChange={e => setOfferExpiryDate(e.target.value)}
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  disabled={submittingAction}
                />
              </div>
            </div>

            {/* Offer Email Template Customization */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-foreground">Offer Email Template & Customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendOfferEmail"
                    checked={sendOfferEmailToggle}
                    onCheckedChange={(checked) => setSendOfferEmailToggle(Boolean(checked))}
                  />
                  <label htmlFor="sendOfferEmail" className="text-xs text-muted-foreground cursor-pointer font-medium">
                    Send Email Notification
                  </label>
                </div>
              </div>

              {sendOfferEmailToggle && (
                <div className="space-y-2.5 bg-muted/40 p-3 rounded-md border border-border">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Offer Template Preset</label>
                    <Select
                      value={selectedOfferTemplateId}
                      onValueChange={(val) => {
                        const matched = offerTemplates.find(t => String(t.id) === val);
                        if (matched) applyOfferTemplate(matched);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background border-border">
                        <SelectValue placeholder="Select offer template preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {offerTemplates.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                            {t.template_name || t.name || 'Offer Template'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Email Subject</label>
                    <Input
                      value={offerEmailSubject}
                      onChange={(e) => setOfferEmailSubject(e.target.value)}
                      className="h-8 text-xs bg-background border-border"
                      placeholder="Email Subject"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Offer Email Body (Candidate)</label>
                    <textarea
                      rows={5}
                      value={offerEmailBody}
                      onChange={(e) => setOfferEmailBody(e.target.value)}
                      className="w-full text-xs font-sans p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Offer email message..."
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowOfferDialog(false)} disabled={submittingAction} className="text-xs h-8 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 rounded-sm bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {submittingAction ? 'Generating...' : 'Generate & Send Offer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Rejection / Regret Email Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-700 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" /> Mark Candidate as Rejected
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update application status to Rejected and dispatch candidate regret email.
            </DialogDescription>
          </DialogHeader>

          {rejectingCandidateInfo && (
            <form onSubmit={handleRejectSubmit} className="space-y-3.5 py-1">
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-md text-xs space-y-1">
                <p className="font-bold text-red-900">
                  Candidate: {rejectingCandidateInfo.candidateName || 'Candidate'}
                </p>
                <p className="text-red-700 text-[11px]">
                  Applied Position: {rejectingCandidateInfo.positionTitle || 'Position'} | Current Stage: <span className="uppercase font-semibold">{rejectingCandidateInfo.status}</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Rejection Reason / Notes (Internal)</label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Assessment score below threshold, Profile mismatch, etc."
                  className="h-8 text-xs bg-background border-border"
                />
              </div>

              <div className="border-t border-border pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-foreground">Candidate Regret Email Customization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sendRejectionEmail"
                      checked={sendRejectionEmailToggle}
                      onCheckedChange={(checked) => setSendRejectionEmailToggle(Boolean(checked))}
                    />
                    <label htmlFor="sendRejectionEmail" className="text-xs text-muted-foreground cursor-pointer font-medium">
                      Send Regret Email
                    </label>
                  </div>
                </div>

                {sendRejectionEmailToggle && (
                  <div className="space-y-2.5 bg-muted/40 p-3 rounded-md border border-border">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Regret Template Preset</label>
                      <Select
                        value={selectedRejectionTemplateId}
                        onValueChange={(val) => {
                          const matched = rejectionTemplates.find(t => String(t.id) === val);
                          if (matched) applyRejectionTemplate(matched);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background border-border">
                          <SelectValue placeholder="Select regret template preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {rejectionTemplates.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                              {t.template_name || t.name || 'Rejection Template'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Email Subject</label>
                      <Input
                        value={rejectionSubject}
                        onChange={(e) => setRejectionSubject(e.target.value)}
                        className="h-8 text-xs bg-background border-border"
                        placeholder="Email Subject"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Candidate Regret Message</label>
                      <textarea
                        rows={5}
                        value={rejectionBody}
                        onChange={(e) => setRejectionBody(e.target.value)}
                        className="w-full text-xs font-sans p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Regret message for candidate..."
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)} disabled={submittingAction} className="text-xs h-8 rounded-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingAction} className="text-xs h-8 rounded-sm bg-red-600 hover:bg-red-700 text-white font-bold">
                  {submittingAction ? 'Processing...' : 'Reject & Send Regret Email'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Show Assigned Link Success Dialog */}
      <Dialog open={!!assignedTestUrl} onOpenChange={(open) => !open && setAssignedTestUrl(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-1.5 font-bold">
              <CheckCircle className="w-5 h-5 text-green-600" /> Assessment Assigned!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              The online assessment has been successfully scheduled for this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-xs text-foreground font-medium">
              You can copy the test URL below and share it with the candidate directly:
            </p>
            <div className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg">
              <input
                type="text"
                readOnly
                value={assignedTestUrl || ''}
                className="w-full text-[10px] font-mono bg-transparent border-none focus:outline-none select-all text-slate-800"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 flex items-center gap-1 text-[10px] bg-white shrink-0 shadow-sm border-slate-200"
                onClick={() => {
                  if (assignedTestUrl) {
                    navigator.clipboard.writeText(assignedTestUrl);
                    toast.success('Test link copied to clipboard!');
                  }
                }}
              >
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              *An automated invitation email has also been sent to the candidate's email address.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="text-xs h-8 rounded-sm"
              onClick={() => setAssignedTestUrl(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 font-bold text-slate-800">
              <Calendar className="w-5 h-5 text-indigo-600" /> Schedule Interview & Dispatch Emails
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set up interview schedule and customize invitation templates for candidate and interviewer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleInterviewSubmit} className="space-y-4 py-2">
            {/* Multi-Round Previous Summary Card if rounds exist */}
            {candidateRoundsSummary && candidateRoundsSummary.rounds && candidateRoundsSummary.rounds.length > 0 && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" /> 
                    Previous Interview Rounds ({candidateRoundsSummary.totalRounds} scheduled)
                  </span>
                  {candidateRoundsSummary.averageRating && (
                    <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-600" /> Avg {candidateRoundsSummary.averageRating}/5
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 divide-y divide-indigo-100/80 text-[11px] text-slate-700 max-h-36 overflow-y-auto pr-1">
                  {candidateRoundsSummary.rounds.map((r: any) => (
                    <div key={r.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-indigo-800">Round {r.roundNumber} ({r.interviewType}):</span>{' '}
                        <span className="font-medium text-slate-800">{r.interviewerNames}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {r.feedback ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ★ {r.feedback.overallRating}/5 ({r.feedback.wouldRecommend || 'Hire'})
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase text-[9px] font-bold">
                            {r.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-indigo-700 font-semibold pt-1 border-t border-indigo-200/60">
                  ✨ Now configuring <span className="underline font-bold">Round {scheduleRound}</span> for this candidate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Interview Type</label>
                <select
                  value={scheduleType}
                  onChange={(e: any) => setScheduleType(e.target.value)}
                  className="w-full h-8 text-xs bg-background border border-input rounded-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="video">Video Call (Online)</option>
                  <option value="phone">Phone Screening</option>
                  <option value="in_person">In-Person (Office)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Interview Round</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={scheduleRound}
                  onChange={e => setScheduleRound(Number(e.target.value))}
                  className="h-8 text-xs bg-background border-border rounded-sm font-bold text-indigo-600"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-foreground">Scheduled Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="h-8 text-xs bg-background border-border rounded-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Duration (Minutes)</label>
                <Input
                  type="number"
                  value={scheduleDuration}
                  onChange={e => setScheduleDuration(e.target.value)}
                  placeholder="e.g. 45"
                  className="h-8 text-xs bg-background border-border rounded-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Assigned Interviewer</label>
                <select
                  value={scheduleInterviewerId}
                  onChange={(e) => setScheduleInterviewerId(e.target.value)}
                  className="w-full h-8 text-xs bg-background border border-input rounded-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select interviewer...</option>
                  {(employeesList.filter((e: any) => e.isManager).length > 0
                    ? employeesList.filter((e: any) => e.isManager)
                    : employeesList
                  ).map((emp: any) => {
                    const empName = emp.first_name || emp.firstName || emp.last_name || emp.lastName 
                      ? `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() 
                      : (emp.name || emp.full_name || emp.email || `Employee #${emp.id}`);
                    const empVal = emp.id || emp.employee_id || emp.user_id || empName;
                    const desig = emp.designation || emp.jobTitle || emp.department || 'Manager';
                    return (
                      <option key={empVal} value={String(empVal)}>
                        {empName} ({desig})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-600" /> Dedicated Meeting Room Link
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleMeetingUrl(generateUniqueMeetingLink())}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                      title="Generate instant encrypted video room (zero setup)"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-Generate Room
                    </button>
                    <span className="text-gray-300">|</span>
                    <a
                      href="https://meet.google.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                      title="Open Google Meet in a new tab to create and copy an official Google link"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Create Google Meet
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={scheduleMeetingUrl}
                    onChange={e => setScheduleMeetingUrl(e.target.value)}
                    placeholder="e.g. https://meet.google.com/abc-defg-hij or https://meet.jit.si/..."
                    className="h-8 text-xs bg-background border-border rounded-sm font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (scheduleMeetingUrl) {
                        navigator.clipboard.writeText(scheduleMeetingUrl);
                        toast.success('Meeting link copied!');
                      }
                    }}
                    className="h-8 px-2.5 text-xs flex items-center gap-1 shrink-0"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  💡 <strong>1-Room Sync:</strong> Auto-generated rooms open instantly for everyone without login. If using Google Meet, click <em>Create Google Meet</em> above, copy the link and paste it here.
                </p>
              </div>
            </div>

            {/* Email Notification & Template Settings */}
            <div className="mt-4 pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" /> Send Email Invitations
                </label>
                <input
                  type="checkbox"
                  checked={sendEmailsToggle}
                  onChange={(e) => setSendEmailsToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {sendEmailsToggle && (
                <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Select Email Template</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const tpl = interviewTemplates.find(t => String(t.id) === e.target.value);
                        if (tpl) applyTemplate(tpl);
                      }}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {interviewTemplates.map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.template_name || t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Email Subject Line</label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Interview Invitation: {{positionTitle}} - {{companyName}}"
                      className="h-8 text-xs bg-white border-slate-300 rounded-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Candidate Email Body (HTML/Text)</label>
                    <textarea
                      value={candidateEmailBody}
                      onChange={(e) => setCandidateEmailBody(e.target.value)}
                      rows={3}
                      className="w-full p-2 text-[11px] font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Custom candidate invitation message..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">Assigned Interviewer Email Body (HTML/Text)</label>
                    <textarea
                      value={interviewerEmailBody}
                      onChange={(e) => setInterviewerEmailBody(e.target.value)}
                      rows={2}
                      className="w-full p-2 text-[11px] font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Custom interviewer notification message..."
                    />
                  </div>

                  <p className="text-[10px] text-slate-500">
                    *Placeholders like <code className="bg-slate-200 px-1 rounded">&#123;&#123;candidateName&#125;&#125;</code>, <code className="bg-slate-200 px-1 rounded">&#123;&#123;interviewerName&#125;&#125;</code>, <code className="bg-slate-200 px-1 rounded">&#123;&#123;scheduledDate&#125;&#125;</code>, <code className="bg-slate-200 px-1 rounded">&#123;&#123;meetingUrl&#125;&#125;</code> will automatically replace during email dispatch.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={submittingAction} className="text-xs h-8 rounded-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 rounded-sm bg-indigo-600 hover:bg-indigo-700 text-white">
                {submittingAction ? 'Scheduling...' : 'Schedule & Dispatch Email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Interview Rounds & Scorecards Drawer / Dialog */}
      <Dialog open={showRoundsDrawer} onOpenChange={setShowRoundsDrawer}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-slate-900 text-lg">
              <Layers className="w-5 h-5 text-indigo-600" />
              Interview Journey & Scorecards
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Candidate: <span className="font-bold text-slate-900">{activeCandidateForDrawer?.name || activeCandidateForDrawer?.candidateName || 'Candidate'}</span> • 
              Position: <span className="font-semibold text-slate-800">{activeCandidateForDrawer?.positionTitle || activeCandidateForDrawer?.jobTitle || 'N/A'}</span>
            </DialogDescription>
          </DialogHeader>

          {loadingRoundsSummary ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading candidate interview history...</div>
          ) : !candidateRoundsSummary || candidateRoundsSummary.rounds.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-slate-500 font-medium">No interview rounds scheduled yet for this candidate.</p>
              <Button
                onClick={() => {
                  setShowRoundsDrawer(false);
                  if (activeCandidateForDrawer) openScheduleInterviewModal(activeCandidateForDrawer);
                }}
                className="bg-indigo-600 text-white text-xs h-8 font-semibold gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule Round 1 Interview
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Summary Stats Header */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Rounds</p>
                  <p className="text-xl font-bold text-indigo-700">{candidateRoundsSummary.totalRounds}</p>
                </div>
                <div className="text-center border-x border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Completed</p>
                  <p className="text-xl font-bold text-emerald-700">{candidateRoundsSummary.completedRounds}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Average Rating</p>
                  <p className="text-xl font-bold text-amber-600 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {candidateRoundsSummary.averageRating ? `${candidateRoundsSummary.averageRating}/5` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Rounds Step by Step Timeline */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Round-by-Round Timeline</p>
                <div className="space-y-3">
                  {candidateRoundsSummary.rounds.map((round: any) => {
                    const hasFb = Boolean(round.feedback);
                    return (
                      <div key={round.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              R{round.roundNumber}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">
                                Round {round.roundNumber} ({round.interviewType?.toUpperCase() || 'VIDEO'})
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Interviewer: <span className="font-semibold text-slate-700">{round.interviewerNames}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              round.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : round.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {round.status}
                            </span>
                          </div>
                        </div>

                        {/* Date & Meeting link */}
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-50 p-2 rounded-lg">
                          <span className="font-medium">📅 Date: {round.scheduledDate ? new Date(round.scheduledDate).toLocaleString() : 'N/A'}</span>
                          {round.meetingUrl && (
                            <button
                              onClick={() => window.open(round.meetingUrl)}
                              className="text-blue-600 hover:underline font-semibold cursor-pointer"
                            >
                              🔗 Open Meeting Link
                            </button>
                          )}
                        </div>

                        {/* Interviewer Scorecard Section */}
                        {hasFb ? (
                          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                Scorecard Rating: {round.feedback.overallRating}/5
                              </span>
                              <span className="font-bold text-emerald-800 uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                                Recommendation: {round.feedback.wouldRecommend || 'Hire'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                              <div>Technical: <span className="font-bold text-slate-900">{round.feedback.technicalScore || 'N/A'}/5</span></div>
                              <div>Communication: <span className="font-bold text-slate-900">{round.feedback.communicationScore || 'N/A'}/5</span></div>
                            </div>
                            {round.feedback.feedbackText && (
                              <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-emerald-100 italic">
                                "{round.feedback.feedbackText}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                            <span>Scorecard feedback is pending from interviewer.</span>
                            <button
                              onClick={() => {
                                window.location.href = '/hr/recruitment/interviews';
                              }}
                              className="text-amber-900 font-bold underline cursor-pointer"
                            >
                              Submit Rating
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setShowRoundsDrawer(false);
                    if (activeCandidateForDrawer) openScheduleInterviewModal(activeCandidateForDrawer);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-semibold gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" /> 
                  Schedule Next Round (Round {candidateRoundsSummary.nextSuggestedRound})
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRoundsDrawer(false)}
                  className="text-xs h-8"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI ATS & Match Analysis Modal */}
      {selectedCandidateForAiModal && (
        <AiAnalysisModal
          isOpen={isAiAnalysisModalOpen}
          onClose={() => {
            setIsAiAnalysisModalOpen(false);
            setSelectedCandidateForAiModal(null);
          }}
          candidateId={selectedCandidateForAiModal.candidateId || selectedCandidateForAiModal.id}
          jobId={selectedCandidateForAiModal.jobId}
          candidateName={selectedCandidateForAiModal.name}
          jobTitle={selectedCandidateForAiModal.positionTitle}
          onShortlistSuccess={fetchApplications}
        />
      )}
    </div>
  );
};
