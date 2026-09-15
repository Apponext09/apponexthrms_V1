import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, RefreshCw, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, User, Settings, Briefcase, Eye, Clipboard,
  Grid, GraduationCap, FileText, X, Minus, ChevronDown, UserCheck, Layers,
  Calendar, Mail, UserX, CheckCircle, Code2, Star, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { TipTapRichTextEditor } from '@/features/settings/components/TipTapRichTextEditor';
import { cn } from '@/lib/utils';
import { downloadCsvFile } from '@/lib/downloadCsv';

interface MRFRequest {
  id: number;
  mrNumber: string;
  stage: string;
  positionTitle: string;
  company: string;
  requestedBy: string;
  requestedOn: string;
  numberOfPositions: number;
  department: string;
  status: 'Open' | 'Closed';
  applicants: number;
  
  // Recruitment Form fields
  recruitmentType?: string;
  companyLocation?: string;
  grade?: string;
  employmentType?: string;
  qualificationRequired?: string;
  experienceDesired?: string;
  interviewer?: string;
  payScaleType?: string;
  payScaleForPosition?: string;
  reasonForRequirement?: string;
  listInJobRecruitmentPage?: string;
  skills?: string;
  comment?: string;
  jobDescription?: string;
  targetClosureDate?: string;
  expiryDate?: string;
}

const INITIAL_MOCK_DATA: MRFRequest[] = [
  {
    id: 1,
    mrNumber: 'MR-1',
    stage: 'Approved',
    positionTitle: 'HR EXECUTIVE',
    company: 'Trial Company',
    requestedBy: 'sakshi shukla',
    requestedOn: '2026-06-11 18:24:38',
    numberOfPositions: 1,
    department: 'HR',
    status: 'Open',
    applicants: 0,
    recruitmentType: 'Both',
    companyLocation: 'Headquarters',
    grade: 'Grade B',
    employmentType: 'Full Time',
    qualificationRequired: 'MBA in HR',
    experienceDesired: '2-4 years',
    interviewer: 'sakshi shukla',
    payScaleType: 'Monthly Salary',
    payScaleForPosition: '35,000 - 45,000 INR',
    reasonForRequirement: 'Replacement Hiring',
    listInJobRecruitmentPage: 'Yes',
    skills: 'Recruitment, Sourcing, Excel',
    comment: 'Need to hire urgently.',
    targetClosureDate: '2026-09-30',
    jobDescription: '<strong>Responsibilities:</strong><ul><li>Sourcing candidates from job portals</li><li>Conducting initial HR interviews</li><li>Coordinating schedules with hiring managers</li></ul>'
  },
  {
    id: 2,
    mrNumber: 'MR-2',
    stage: 'Pending Approval',
    positionTitle: 'SOFTWARE ENGINEER',
    company: 'Trial Company',
    requestedBy: 'sakshi shukla',
    requestedOn: '2026-07-22 10:15:30',
    numberOfPositions: 3,
    department: 'Engineering',
    status: 'Open',
    applicants: 2,
    recruitmentType: 'Both',
    companyLocation: 'Remote',
    grade: 'Grade C',
    employmentType: 'Full Time',
    qualificationRequired: 'B.Tech / MCA',
    experienceDesired: '3+ years',
    interviewer: 'Siddharth Mehta',
    payScaleType: 'Annual CTC',
    payScaleForPosition: '1,200,000 - 1,800,000 INR',
    reasonForRequirement: 'New Position',
    listInJobRecruitmentPage: 'Yes',
    skills: 'React, Node.js, Typescript',
    comment: 'Expanding engineering team for new features.',
    targetClosureDate: '2026-08-31',
    jobDescription: '<em>Requirements:</em><br>Looking for a frontend specialist with strong experience in <strong>React</strong> and <strong>TypeScript</strong>. Knowing TailwindCSS is a plus.'
  },
  {
    id: 3,
    mrNumber: 'MR-3',
    stage: 'Approved',
    positionTitle: 'SALES MANAGER',
    company: 'Trial Company',
    requestedBy: 'rahul sharma',
    requestedOn: '2026-05-15 14:30:00',
    numberOfPositions: 2,
    department: 'Sales',
    status: 'Closed',
    applicants: 5,
    recruitmentType: 'External',
    companyLocation: 'Mumbai',
    grade: 'Grade A',
    employmentType: 'Full Time',
    qualificationRequired: 'BBA / MBA',
    experienceDesired: '5+ years',
    interviewer: 'Rahul Sharma',
    payScaleType: 'Monthly Salary',
    payScaleForPosition: '60,000 + Incentives',
    reasonForRequirement: 'Project Expansion',
    listInJobRecruitmentPage: 'No',
    skills: 'B2B Sales, CRM, Client Relationship',
    comment: 'Closed successfully last month.',
    jobDescription: '<u>Key Deliverables:</u><br><ol><li>Achieve regional sales targets</li><li>Manage key client relations</li><li>Onboard new channel partners</li></ol>'
  }
];

interface ColumnConfig {
  key: string;
  label: string;
}

const ALL_CONFIGURABLE_COLUMNS: ColumnConfig[] = [
  { key: 'companyLocation', label: 'Company Location' },
  { key: 'recruitmentType', label: 'Recruitment Type' },
  { key: 'skills', label: 'Skills' },
  { key: 'otherPositionTitle', label: 'Other Position Title' },
  { key: 'comment', label: 'Comment' },
  { key: 'interviewer', label: 'Interviewer' },
  { key: 'payScaleForPosition', label: 'Pay Scale For The Position' },
  { key: 'positionTitle', label: 'Position Title' },
  { key: 'company', label: 'Company' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'requestedOn', label: 'Requested On' },
  { key: 'numberOfPositions', label: 'Number of Positions' },
  { key: 'department', label: 'Department' },
  { key: 'targetClosureDate', label: 'Target Closure Date' },
  { key: 'status', label: 'Status' }
];

interface CandidateColumnConfig {
  key: string;
  label: string;
}

const ALL_CANDIDATE_COLUMNS: CandidateColumnConfig[] = [
  { key: 'totalExperience', label: 'Total Experience' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'university', label: 'University' },
  { key: 'maritalStatus', label: 'Marrital Status' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'skills', label: 'Skills' },
  { key: 'relevantExperience', label: 'Relevant Experience' },
  { key: 'currentCompany', label: 'Current Company' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'name', label: 'Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'emailId', label: 'Email Id' },
  { key: 'comments', label: 'Comments' }
];

const USER_MAPPING_FIELDS = [
  'Account Number',
  'Address',
  'Age',
  'Alternate Contact Number',
  'Background Verification',
  'Bank Name',
  'Biometric Code',
  'Blood Group',
  'Buddy',
  'Charges',
  'Company',
  'Company Bank',
  'Contact Number',
  'Date of Birth',
  'Date of Confirmation',
  'Date of Death',
  'Date of Joining',
  'Date of resignation',
  'Death Certificate Received',
  'Department',
  'Eligible for EPS',
  'Employee Code',
  'Employee Reference Number',
  'Employee Share',
  'Employee Status',
  'Employer Share',
  'Employment Type',
  'ESIC Number',
  'ESIC Status',
  'First Name',
  'Full Name',
  'Gender',
  'Geofencing',
  'Grade',
  'IFSC Code',
  'Last Name',
  'Last Working Date',
  'Location',
  'Marital Status',
  'Middle Name',
  'Nationality',
  'Non Implemented Area Last Working Date',
  'Notice Period',
  'PAN Number',
  'PAN STATUS',
  'Payroll Slab',
  'Permanent Address',
  'Permanent Address', // Duplicate listed in mockup screenshot
  'Personal Email',
  'PF Number',
  'Phone Number',
  'Present Address',
  'Project/ Client',
  'Reporting Officer',
  'UAN Number',
  'UIDAI Number',
  'User Band',
  'Vaccination Date Dose1',
  'Vaccination Date Dose2',
  'Vaccine Type Dose1',
  'Vaccine Type Dose2',
  'Visibility In Organogram',
  'Years of Experience'
];

export const MrfRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Manager / Team Lead portal = view + create only; HR portal = full control (approve/reject/edit/delete/settings)
  const isManagerPortal = location.pathname.startsWith('/manager') || location.pathname.startsWith('/team-lead');
  const isHrPortal = !isManagerPortal;

  const [data, setData] = useState<MRFRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMrfs = async () => {
    try {
      setLoading(true);
      const [mrfRes, appsRes] = await Promise.allSettled([
        apiClient.get('/recruitment/mrf', { params: { pageSize: 500 } }),
        apiClient.get('/recruitment/applications')
      ]);

      let rawApps: any[] = [];
      if (appsRes.status === 'fulfilled' && appsRes.value.data?.success) {
        rawApps = Array.isArray(appsRes.value.data.data) 
          ? appsRes.value.data.data 
          : (Array.isArray(appsRes.value.data.data?.items) ? appsRes.value.data.data.items : []);
      }

      if (mrfRes.status === 'fulfilled' && mrfRes.value.data?.success && Array.isArray(mrfRes.value.data.data)) {
        const mapped = mrfRes.value.data.data.map((item: any) => {
          const mrfId = item.id;
          const posTitle = (item.positionTitle || item.position_title || '').toLowerCase().trim();

          const matchedApps = rawApps.filter((app: any) => {
            const appMrfId = Number(app.mrf_request_id || app.mrfRequestId || app.mrfId);
            const appPos = (app.positionTitle || app.position_title || app.jobTitle || '').toLowerCase().trim();
            const isDirectMatch = appMrfId === Number(mrfId);
            const isTitleMatch = Boolean(posTitle) && (appPos.includes(posTitle) || posTitle.includes(appPos));
            return isDirectMatch || isTitleMatch;
          });

          return {
            id: item.id,
            mrNumber: item.mrNumber || item.mr_number,
            stage: item.stage,
            positionTitle: item.positionTitle || item.position_title,
            company: item.company || 'Trial Company',
            requestedBy: item.requestedBy || item.requested_by || 'sakshi shukla',
            requestedOn: item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 19) : (item.created_at ? item.created_at.replace('T', ' ').substring(0, 19) : ''),
            numberOfPositions: item.numberOfPositions || item.number_of_positions,
            department: item.department || 'HR',
            status: item.status,
            applicants: matchedApps.length > 0 ? matchedApps.length : Number(item.applicants || 0),
            recruitmentType: item.recruitmentType || item.recruitment_type || 'Both',
            companyLocation: item.companyLocation || item.company_location || 'Headquarters',
            grade: item.grade || 'Grade B',
            employmentType: item.employmentType || item.employment_type || 'Full Time',
            qualificationRequired: item.qualificationRequired || item.qualification_required || '',
            experienceDesired: item.experienceDesired || item.experience_desired || '',
            interviewer: item.interviewer || '',
            payScaleType: item.payScaleType || item.pay_scale_type || 'Monthly Salary',
            payScaleForPosition: item.payScaleForPosition || item.pay_scale_for_position || '',
            reasonForRequirement: item.reasonForRequirement || item.reason_for_requirement || 'New Position',
            listInJobRecruitmentPage: item.listInJobPage || item.list_in_job_page || 'Yes',
            skills: item.skills || '',
            comment: item.comment || '',
            jobDescription: item.jobDescription || item.job_description || '',
            targetClosureDate: item.targetClosureDate || item.target_closure_date || item.expiryDate || item.expiry_date || '',
            expiryDate: item.expiryDate || item.expiry_date || item.targetClosureDate || item.target_closure_date || ''
          };
        });
        setData(mapped);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Failed to fetch MRF requests', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMrfs();
  }, []);

  // State management
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [searchMrNumber, setSearchMrNumber] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedRequestedBy, setSelectedRequestedBy] = useState('all');
  const [filteredData, setFilteredData] = useState<MRFRequest[]>([]);
  
  // Quick Settings Floating panel states
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'positions' | 'locations' | 'departments' | 'grades'>('positions');
  const [newFieldOption, setNewFieldOption] = useState('');

  const [activeStagePopoverId, setActiveStagePopoverId] = useState<number | null>(null);

  // Applicant Pipeline Stages & Actions State
  const [pipelineStages, setPipelineStages] = useState<any[]>([
    { id: 1, stageName: 'Applied' },
    { id: 2, stageName: 'Screening' },
    { id: 3, stageName: 'Assessment' },
    { id: 4, stageName: 'Technical Interview' },
    { id: 5, stageName: 'HR Interview' },
    { id: 6, stageName: 'Offer' },
    { id: 7, stageName: 'Hired' },
    { id: 8, stageName: 'Rejected' },
  ]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [offerTemplates, setOfferTemplates] = useState<any[]>([]);
  const [rejectionTemplates, setRejectionTemplates] = useState<any[]>([]);

  // Selected application ID for actions
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Action Dialog 1: Assign Assessment
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [assignedTestUrl, setAssignedTestUrl] = useState<string | null>(null);

  const generateUniqueMeetingLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const rand = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`;
  };

  // Action Dialog 2: Schedule Interview
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState<string>('Technical Interview');
  const [scheduleRound, setScheduleRound] = useState<number>(1);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleDuration, setScheduleDuration] = useState<number>(45);
  const [scheduleMeetingUrl, setScheduleMeetingUrl] = useState<string>(generateUniqueMeetingLink());
  const [scheduleInterviewerId, setScheduleInterviewerId] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('Interview Invitation');
  const [candidateEmailBody, setCandidateEmailBody] = useState<string>('Dear Candidate,\n\nYou have been invited for an interview.');
  const [interviewerEmailBody, setInterviewerEmailBody] = useState<string>('Dear Interviewer,\n\nYou have been assigned an interview.');
  const [sendEmailsToggle, setSendEmailsToggle] = useState<boolean>(true);

  // Action Dialog 3: Generate Offer Letter
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [selectedOfferTemplateId, setSelectedOfferTemplateId] = useState<string>('');
  const [offerPosition, setOfferPosition] = useState<string>('');
  const [offerCtc, setOfferCtc] = useState<string>('');
  const [offerBaseSalary, setOfferBaseSalary] = useState<string>('');
  const [offerStartDate, setOfferStartDate] = useState<string>('');
  const [offerExpiryDate, setOfferExpiryDate] = useState<string>('');
  const [offerEmailSubject, setOfferEmailSubject] = useState<string>('Job Offer Letter');
  const [offerEmailBody, setOfferEmailBody] = useState<string>('We are pleased to offer you a position at our company.');
  const [sendOfferEmailToggle, setSendOfferEmailToggle] = useState<boolean>(true);

  // Action Dialog 4: Reject Candidate
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingCandidateInfo, setRejectingCandidateInfo] = useState<any>(null);
  const [selectedRejectionTemplateId, setSelectedRejectionTemplateId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionSubject, setRejectionSubject] = useState<string>('Update on your application');
  const [rejectionBody, setRejectionBody] = useState<string>('Thank you for applying. Unfortunately, we will not be moving forward with your application.');
  const [sendRejectionEmailToggle, setSendRejectionEmailToggle] = useState<boolean>(true);

  // Helper fetchers for actions
  const fetchPipelineStages = () => {
    apiClient.get('/recruitment/pipeline-stages')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setPipelineStages(res.data.data);
        } else if (res.data?.success && Array.isArray(res.data.data?.items)) {
          setPipelineStages(res.data.data.items);
        }
      })
      .catch(() => {});
  };

  const fetchAssessmentsList = () => {
    apiClient.get('/recruitment/assessments')
      .then(res => {
        if (res.data?.success) {
          const items = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
          setAssessments(items);
        }
      })
      .catch(() => {});
  };

  const fetchEmployeesList = () => {
    apiClient.get('/employees', { params: { pageSize: 1000 } })
      .then(res => {
        if (res.data?.success) {
          const rawItems = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
          const list = rawItems.map((item: any) => {
            const fn = item.firstName || item.first_name || '';
            const ln = item.lastName || item.last_name || '';
            const fullName = `${fn} ${ln}`.trim() || item.name || item.email || '';
            const deptId = item.currentDepartmentId || item.current_department_id || item.departmentId || item.department_id;
            const deptName = item.department || item.departmentName || item.department_name || '';
            const desig = (item.designation || item.jobTitle || item.designationName || item.designation_name || item.accessRole || item.role || '').toLowerCase();
            const role = (item.accessRole || item.role || '').toLowerCase();

            const isMgrRole = ['manager', 'department_head', 'hr', 'hr_admin', 'hr_manager', 'organization_admin', 'admin', 'team_lead'].includes(role);
            const isMgrDesig = desig.includes('manager') || desig.includes('head') || desig.includes('lead') || desig.includes('director') || desig.includes('vp') || desig.includes('chief') || desig.includes('supervisor');
            const isMgr = isMgrRole || isMgrDesig || Boolean(item.isManager) || Boolean(item.is_manager);

            return {
              id: Number(item.id),
              name: fullName,
              first_name: fn,
              last_name: ln,
              departmentId: deptId ? Number(deptId) : null,
              departmentName: deptName,
              department: deptName,
              designation: item.designation || item.jobTitle || '',
              accessRole: role,
              isManager: isMgr,
              rawItem: item
            };
          }).filter((x: any) => x.id && x.name);
          setEmployeesList(list);
          setEmployeesRaw(list);
        }
      })
      .catch(() => {});
  };

  const fetchOfferTemplatesList = () => {
    apiClient.get('/recruitment/offer/templates')
      .then(res => {
        if (res.data?.success) {
          const list = [
            ...(res.data.data?.customTemplates || []),
            ...(res.data.data?.defaultTemplates || [])
          ];
          setOfferTemplates(list);
        }
      })
      .catch(() => {});
  };

  const fetchRejectionTemplatesList = () => {
    apiClient.get('/recruitment/rejection/templates')
      .then(res => {
        if (res.data?.success) {
          const list = [
            ...(res.data.data?.customTemplates || []),
            ...(res.data.data?.defaultTemplates || [])
          ];
          setRejectionTemplates(list);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPipelineStages();
    fetchAssessmentsList();
    fetchEmployeesList();
    fetchOfferTemplatesList();
    fetchRejectionTemplatesList();
  }, []);

  // Handler functions for applicant stage update & actions
  const handleMoveStage = (applicationId: number, stageId: number) => {
    if (!stageId || !applicationId) return;
    apiClient.patch(`/recruitment/applications/${applicationId}/move-stage`, { stageId })
      .then(res => {
        if (res.data?.success) {
          toast.success('Application stage updated successfully!');
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
        } else {
          toast.error(res.data?.message || 'Failed to update stage');
        }
      })
      .catch(err => {
        console.error('Failed to move stage', err);
        toast.error('Failed to move stage');
      });
  };

  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    if (!scheduleDate) {
      toast.error('Please select date and time for the interview');
      return;
    }

    let targetInterviewerId = scheduleInterviewerId;
    if (!targetInterviewerId && employeesList.length > 0) {
      targetInterviewerId = String((employeesList[0] as any)?.id || '');
    }
    if (!targetInterviewerId) {
      toast.error('Please select an Assigned Interviewer');
      return;
    }

    const parsedNumId = Number(targetInterviewerId);
    const interviewerPayload = (!isNaN(parsedNumId) && parsedNumId > 0) ? [parsedNumId] : [targetInterviewerId];

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
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
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

  const handleAssignAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
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
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
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
    if (!selectedAppId) return;
    if (!offerPosition || !offerCtc || !offerBaseSalary || !offerStartDate || !offerExpiryDate) {
      toast.error('Please fill in all offer terms fields');
      return;
    }
    setSubmittingAction(true);
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
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
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
    const targetAppId = rejectingCandidateInfo?.applicationId || rejectingCandidateInfo?.id;
    if (!targetAppId) return;
    setSubmittingAction(true);
    apiClient.post(`/recruitment/applications/${targetAppId}/reject-email`, {
      rejectionReason,
      customSubject: rejectionSubject,
      customBody: rejectionBody,
      sendEmail: sendRejectionEmailToggle,
    })
      .then(res => {
        if (res.data?.success) {
          toast.success('Candidate marked as Rejected & regret email sent!');
          setShowRejectDialog(false);
          setRejectingCandidateInfo(null);
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
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

  const handleOnboardCandidate = (applicationId: number) => {
    if (!applicationId) return;
    apiClient.post(`/recruitment/applications/${applicationId}/onboard`)
      .then(res => {
        if (res.data?.success) {
          toast.success('Candidate successfully hired and sent to Onboarding!');
          if (viewingMrf) fetchMrfApplicants(viewingMrf.id);
        } else {
          toast.error(res.data?.message || 'Failed to onboard candidate');
        }
      })
      .catch(err => {
        console.error('Failed to onboard candidate', err);
        toast.error('Failed to onboard candidate');
      });
  };

  // Add Candidate Form Modal State for MRF Detail View
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    dob: '',
    gender: 'Male',
    email: '',
    contactType: 'Mobile',
    contact: '',
    address1: '',
    address2: '',
    country: 'Choose',
    zipcode: '',
    state: '',
    city: '',
    maritalStatus: 'Unmarried',
    company: '',
    qualification: '',
    university: '',
    relevantExp: '',
    totalExp: '',
    skills: ''
  });

  const resetCandidateFormData = () => {
    setCandidateFormData({
      name: '',
      dob: '',
      gender: 'Male',
      email: '',
      contactType: 'Mobile',
      contact: '',
      address1: '',
      address2: '',
      country: 'Choose',
      zipcode: '',
      state: '',
      city: '',
      maritalStatus: 'Unmarried',
      company: '',
      qualification: '',
      university: '',
      relevantExp: '',
      totalExp: '',
      skills: ''
    });
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateFormData.name.trim()) {
      toast.error('Candidate Name is required');
      return;
    }

    try {
      const payload = {
        fullName: candidateFormData.name.trim(),
        email: candidateFormData.email.trim() || undefined,
        phone: candidateFormData.contact.trim() || undefined,
        gender: candidateFormData.gender,
        dateOfBirth: candidateFormData.dob || undefined,
        maritalStatus: candidateFormData.maritalStatus,
        qualification: candidateFormData.qualification,
        totalExperienceYears: candidateFormData.totalExp ? parseFloat(candidateFormData.totalExp) : undefined,
        currentCompany: candidateFormData.company,
        city: candidateFormData.city,
        state: candidateFormData.state,
        country: candidateFormData.country !== 'Choose' ? candidateFormData.country : undefined,
        skills: candidateFormData.skills ? candidateFormData.skills.split(',').map(s => s.trim()) : undefined,
        mrfRequestId: viewingMrf?.id || undefined,
      };

      const res = await apiClient.post('/recruitment/resume-bank', payload);
      if (res.data?.success) {
        toast.success(`Candidate ${candidateFormData.name} added successfully!`);
        setIsAddCandidateModalOpen(false);
        if (viewingMrf) {
          fetchMrfApplicants(viewingMrf.id);
          fetchMrfs();
        }
      } else {
        toast.error(res.data?.message || 'Failed to add candidate');
      }
    } catch (err: any) {
      console.error('Failed to add candidate', err);
      toast.error(err.response?.data?.message || 'Failed to add candidate');
    }
  };

  // Resume Bank Search Drawer state inside MRF detail view
  const [showResumeBankSearch, setShowResumeBankSearch] = useState(false);
  const [resumeBankFilters, setResumeBankFilters] = useState({
    name: '',
    email: '',
    maritalStatus: 'all',
    qualification: '',
    skills: '',
    gender: 'all',
    contact: ''
  });
  const [resumeBankResults, setResumeBankResults] = useState<any[]>([]);
  const [loadingResumeBank, setLoadingResumeBank] = useState(false);
  const [selectedResumeCandidateIds, setSelectedResumeCandidateIds] = useState<number[]>([]);

  // Applicant Filter Tabs & Candidates List State
  const [applicantFilterTab, setApplicantFilterTab] = useState<'All' | 'Selected' | 'Rejected' | 'On Hold' | 'Open' | 'Shortlisted' | 'Selected-Approved By CEO'>('All');
  const [mrfApplicants, setMrfApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Action Information Modal State
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState('Choose');
  const [actionComment, setActionComment] = useState('');
  const [mrfActionLogs, setMrfActionLogs] = useState<any[]>([]);
  const [loadingActionLogs, setLoadingActionLogs] = useState(false);

  const fetchMrfActionLogs = async (mrfId: number) => {
    try {
      setLoadingActionLogs(true);
      const res = await apiClient.get(`/recruitment/mrf/${mrfId}/audit-log`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMrfActionLogs(res.data.data);
      } else {
        setMrfActionLogs([]);
      }
    } catch (err) {
      console.error('Failed to fetch MRF action logs', err);
      setMrfActionLogs([]);
    } finally {
      setLoadingActionLogs(false);
    }
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionStatus || actionStatus === 'Choose') {
      toast.error('Please select a Status');
      return;
    }
    if (!viewingMrf) return;

    try {
      const res = await apiClient.post(`/recruitment/mrf/${viewingMrf.id}/action`, {
        status: actionStatus,
        comment: actionComment
      });

      if (res.data?.success) {
        toast.success('Action added successfully!');
        setIsAddActionModalOpen(false);
        setActionStatus('Choose');
        setActionComment('');
        fetchMrfActionLogs(viewingMrf.id);
        fetchMrfs();
      } else {
        toast.error(res.data?.message || 'Failed to add action');
      }
    } catch (err: any) {
      console.error('Failed to add action', err);
      toast.error(err.response?.data?.message || 'Failed to add action');
    }
  };

  const fetchMrfApplicants = async (mrfId: number) => {
    try {
      setLoadingApplicants(true);
      const targetMrf = data.find(m => m.id === mrfId) || viewingMrf;

      const [resumeRes, appRes] = await Promise.allSettled([
        apiClient.get('/recruitment/resume-bank', { params: { mrfRequestId: mrfId, pageSize: 500 } }),
        // Pass mrfRequestId so server filters applications linked to this MRF via jobs
        apiClient.get('/recruitment/applications', { params: { mrfRequestId: mrfId, pageSize: 500 } })
      ]);

      let combined: any[] = [];

      // ── Resume bank entries ────────────────────────────────────────────────
      if (resumeRes.status === 'fulfilled' && resumeRes.value.data?.success && Array.isArray(resumeRes.value.data.data)) {
        combined = resumeRes.value.data.data
          // Backend already filters by mrfRequestId — trust it, no client-side re-filter needed
          .map((c: any) => {
            // Build name: resume_bank has its own first_name/last_name/candidate_name columns
            // AND a candidate_name alias from the SQL JOIN (which now also checks rb.first_name first)
            const rbFirstLast = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
            const resolvedName =
              rbFirstLast ||
              c.candidate_name ||
              c.fullName ||
              c.full_name ||
              c.name ||
              c.tracker_id ||
              'Unknown';

            return {
              // Keep all raw fields
              ...c,
              // ── Normalized fields for consistent column rendering ──
              name:           resolvedName,
              email:          c.candidate_email || c.email || '',
              contact:        c.candidate_phone || c.phone || c.contact || c.mobile || '',
              qualification:  c.candidate_qualification || c.qualification || c.highest_qualification || '',
              university:     c.candidate_university || c.university || c.college || '',
              experience:     c.candidate_experience || c.years_of_experience || c.totalExperienceYears || c.experience || '',
              maritalStatus:  c.candidate_marital_status || c.marital_status || c.maritalStatus || '',
              gender:         c.candidate_gender || c.gender || '',
              currentCompany: c.candidate_company || c.current_company || c.currentCompany || '',
              skills:         Array.isArray(c.candidate_skills) ? c.candidate_skills.join(', ')
                              : Array.isArray(c.skills) ? c.skills.join(', ')
                              : (c.candidate_skills || c.skills || ''),
              dob:            c.candidate_dob || c.dob || c.dateOfBirth || '',
              comments:       c.candidate_comments || c.comments || c.notes || '',
              relevantExperience: c.relevant_experience || c.relevantExperience || '',
            };
          });
      }

      // ── Applications from pipeline ─────────────────────────────────────────
      if (appRes.status === 'fulfilled' && appRes.value.data?.success) {
        const rawApps = Array.isArray(appRes.value.data.data)
          ? appRes.value.data.data
          : (Array.isArray(appRes.value.data.data?.items) ? appRes.value.data.data.items : []);

        rawApps.forEach((app: any) => {
          const candidateId = app.candidate_id || app.id;
          // De-duplicate: if already added via resume bank, merge pipeline stage/status onto it
          const existingIndex = combined.findIndex(c =>
            c.id === candidateId ||
            (c.candidate_id && c.candidate_id === candidateId) ||
            (c.email && app.candidate_email && c.email === app.candidate_email)
          );

          if (existingIndex !== -1) {
            // Enrich existing record with pipeline application data
            combined[existingIndex] = {
              ...combined[existingIndex],
              applicationId:  app.id,
              pipelineStageId: app.pipeline_stage_id || app.pipelineStageId || app.stage_id || combined[existingIndex].pipelineStageId || '',
              status:         app.application_status || app.applicationStatus || app.status || combined[existingIndex].status || 'applied',
              positionTitle:  app.position_title || app.positionTitle || app.jobTitle || combined[existingIndex].positionTitle || targetMrf?.positionTitle || '',
            };
          } else {
            // New candidate from pipeline not yet in resume bank
            const appName = app.candidate_name || app.candidateName ||
                            (app.first_name ? `${app.first_name} ${app.last_name || ''}`.trim() : '') || 'Candidate';
            combined.push({
              ...app,
              id:             candidateId,
              applicationId:  app.id,
              pipelineStageId: app.pipeline_stage_id || app.pipelineStageId || app.stage_id || '',
              positionTitle:  app.position_title || app.positionTitle || app.jobTitle || targetMrf?.positionTitle || '',
              status:         app.application_status || app.applicationStatus || app.status || 'applied',
              // Normalized fields
              name:           appName,
              email:          app.candidate_email || app.candidateEmail || app.email || '',
              contact:        app.candidate_phone || app.candidatePhone || app.phone || app.contact || '',
              qualification:  app.qualification || app.highest_qualification || '',
              university:     app.university || app.college || '',
              experience:     app.candidate_experience || app.years_of_experience || app.experience || '',
              maritalStatus:  app.marital_status || app.maritalStatus || '',
              gender:         app.gender || '',
              currentCompany: app.candidate_company || app.current_company || app.currentCompany || '',
              skills:         Array.isArray(app.skills) ? app.skills.join(', ') : (app.candidate_skills || app.skills || ''),
              dob:            app.dob || app.dateOfBirth || '',
              comments:       app.comments || app.notes || '',
              relevantExperience: app.relevant_experience || app.relevantExperience || '',
            });
          }
        });
      }

      setMrfApplicants(combined);
    } catch (err) {
      console.error('Failed to fetch MRF applicants', err);
      setMrfApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleOpenResumeBankSearch = () => {
    if (!showResumeBankSearch && viewingMrf) {
      setResumeBankFilters({
        name: '',
        email: '',
        maritalStatus: 'all',
        qualification: viewingMrf.qualificationRequired || '',
        skills: viewingMrf.skills || '',
        gender: 'all',
        contact: ''
      });
      fetchResumeBankCandidates();
    }
    setShowResumeBankSearch(!showResumeBankSearch);
  };

  const fetchResumeBankCandidates = async () => {
    try {
      setLoadingResumeBank(true);
      const params: any = {};
      if (resumeBankFilters.name) params.name = resumeBankFilters.name;
      if (resumeBankFilters.email) params.email = resumeBankFilters.email;
      if (resumeBankFilters.qualification) params.qualification = resumeBankFilters.qualification;
      if (resumeBankFilters.skills) params.skills = resumeBankFilters.skills;
      if (resumeBankFilters.contact) params.phone = resumeBankFilters.contact;
      
      let res = await apiClient.get('/recruitment/resume-bank', { params });
      let list = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];

      if (list.length === 0) {
        // Fallback search without strict skills/qualification to populate resume bank candidates
        const fallbackRes = await apiClient.get('/recruitment/resume-bank');
        if (fallbackRes.data?.success && Array.isArray(fallbackRes.data.data)) {
          list = fallbackRes.data.data;
        }
      }

      setResumeBankResults(list);
    } catch (err) {
      console.error('Failed to search resume bank', err);
      setResumeBankResults([]);
    } finally {
      setLoadingResumeBank(false);
    }
  };

  const handleMapCandidates = async () => {
    if (selectedResumeCandidateIds.length === 0) {
      toast.error('Please select at least one candidate to map');
      return;
    }
    try {
      for (const id of selectedResumeCandidateIds) {
        await apiClient.patch(`/recruitment/resume-bank/${id}`, {
          mrfRequestId: viewingMrf?.id
        });
      }
      toast.success(`${selectedResumeCandidateIds.length} candidate(s) mapped successfully!`);
      setSelectedResumeCandidateIds([]);
      if (viewingMrf) {
        fetchMrfApplicants(viewingMrf.id);
        fetchMrfs();
      }
    } catch (err) {
      console.error('Failed to map candidates', err);
      toast.error('Failed to map candidate(s)');
    }
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveStagePopoverId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Table columns visible/hidden configuration states matching mockup
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrf_visible_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['positionTitle', 'company', 'requestedBy', 'requestedOn', 'numberOfPositions', 'department', 'status'];
  });

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrf_hidden_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return ['companyLocation', 'recruitmentType', 'skills', 'otherPositionTitle', 'comment', 'interviewer', 'payScaleForPosition'];
  });

  const [tempVisible, setTempVisible] = useState<string[]>([]);
  const [tempHidden, setTempHidden] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string[]>([]);
  const [selectedRight, setSelectedRight] = useState<string[]>([]);

  useEffect(() => {
    if (isFieldsModalOpen) {
      const currentVis = visibleColumns.length > 0 ? visibleColumns : ['positionTitle', 'company', 'requestedBy', 'requestedOn', 'numberOfPositions', 'department', 'status'];
      setTempVisible([...currentVis]);
      setTempHidden(ALL_CONFIGURABLE_COLUMNS.map(c => c.key).filter(k => !currentVis.includes(k)));
      setSelectedLeft([]);
      setSelectedRight([]);
    }
  }, [isFieldsModalOpen, visibleColumns]);

  const handleMoveUp = () => {
    if (selectedLeft.length !== 1) return;
    const key = selectedLeft[0];
    const idx = tempVisible.indexOf(key);
    if (idx <= 0) return;
    const newVisible = [...tempVisible];
    newVisible[idx] = newVisible[idx - 1];
    newVisible[idx - 1] = key;
    setTempVisible(newVisible);
  };

  const handleMoveDown = () => {
    if (selectedLeft.length !== 1) return;
    const key = selectedLeft[0];
    const idx = tempVisible.indexOf(key);
    if (idx === -1 || idx >= tempVisible.length - 1) return;
    const newVisible = [...tempVisible];
    newVisible[idx] = newVisible[idx + 1];
    newVisible[idx + 1] = key;
    setTempVisible(newVisible);
  };

  const handleSaveColumns = () => {
    const hidden = ALL_CONFIGURABLE_COLUMNS.map(c => c.key).filter(k => !tempVisible.includes(k));
    setVisibleColumns(tempVisible);
    setHiddenColumns(hidden);
    localStorage.setItem('mrf_visible_columns', JSON.stringify(tempVisible));
    localStorage.setItem('mrf_hidden_columns', JSON.stringify(hidden));
    setIsFieldsModalOpen(false);
    toast.success('Table settings saved successfully!');
  };

  // Candidate form fields configuration states matching mockup screenshots
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateVisibleColumns, setCandidateVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrf_candidate_visible_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return ['totalExperience', 'qualification', 'university', 'maritalStatus', 'dateOfBirth', 'skills', 'relevantExperience', 'currentCompany', 'contactNumber'];
  });

  const [candidateHiddenColumns, setCandidateHiddenColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrf_candidate_hidden_columns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return ['name', 'gender', 'emailId', 'comments'];
  });

  const [tempCandidateVisible, setTempCandidateVisible] = useState<string[]>([]);
  const [tempCandidateHidden, setTempCandidateHidden] = useState<string[]>([]);
  const [selectedCandidateLeft, setSelectedCandidateLeft] = useState<string[]>([]);
  const [selectedCandidateRight, setSelectedCandidateRight] = useState<string[]>([]);

  useEffect(() => {
    if (isCandidateModalOpen) {
      const currentCandVis = candidateVisibleColumns.length > 0 ? candidateVisibleColumns : ['totalExperience', 'qualification', 'university', 'maritalStatus', 'dateOfBirth', 'skills', 'relevantExperience', 'currentCompany', 'contactNumber'];
      setTempCandidateVisible([...currentCandVis]);
      setTempCandidateHidden(ALL_CANDIDATE_COLUMNS.map(c => c.key).filter(k => !currentCandVis.includes(k)));
      setSelectedCandidateLeft([]);
      setSelectedCandidateRight([]);
    }
  }, [isCandidateModalOpen, candidateVisibleColumns]);

  const handleMoveCandidateUp = () => {
    if (selectedCandidateLeft.length !== 1) return;
    const key = selectedCandidateLeft[0];
    const idx = tempCandidateVisible.indexOf(key);
    if (idx <= 0) return;
    const newVisible = [...tempCandidateVisible];
    newVisible[idx] = newVisible[idx - 1];
    newVisible[idx - 1] = key;
    setTempCandidateVisible(newVisible);
  };

  const handleMoveCandidateDown = () => {
    if (selectedCandidateLeft.length !== 1) return;
    const key = selectedCandidateLeft[0];
    const idx = tempCandidateVisible.indexOf(key);
    if (idx === -1 || idx >= tempCandidateVisible.length - 1) return;
    const newVisible = [...tempCandidateVisible];
    newVisible[idx] = newVisible[idx + 1];
    newVisible[idx + 1] = key;
    setTempCandidateVisible(newVisible);
  };

  const handleSaveCandidateColumns = () => {
    const candHidden = ALL_CANDIDATE_COLUMNS.map(c => c.key).filter(k => !tempCandidateVisible.includes(k));
    setCandidateVisibleColumns(tempCandidateVisible);
    setCandidateHiddenColumns(candHidden);
    localStorage.setItem('mrf_candidate_visible_columns', JSON.stringify(tempCandidateVisible));
    localStorage.setItem('mrf_candidate_hidden_columns', JSON.stringify(candHidden));
    setIsCandidateModalOpen(false);
    toast.success('Candidate form fields saved successfully!');
  };

  // User Creation Fields Mapping states
  interface FieldMapping {
    userField: string;
    candidateField: string;
  }

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappings, setMappings] = useState<FieldMapping[]>(() => {
    const saved = localStorage.getItem('mrf_user_mappings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Robust merge to map newly added user fields while preserving previous mappings
          const merged = USER_MAPPING_FIELDS.map((field, index) => {
            const savedItem = parsed.find(item => item.userField === field) || parsed[index];
            return {
              userField: field,
              candidateField: savedItem ? savedItem.candidateField : ''
            };
          });
          return merged;
        }
      } catch (e) {}
    }
    return USER_MAPPING_FIELDS.map(field => ({ userField: field, candidateField: '' }));
  });

  const [tempMappings, setTempMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    if (isMappingModalOpen) {
      setTempMappings(mappings.map(m => ({ ...m })));
    }
  }, [isMappingModalOpen, mappings]);

  const handleSaveMappings = () => {
    setMappings(tempMappings);
    localStorage.setItem('mrf_user_mappings', JSON.stringify(tempMappings));
    setIsMappingModalOpen(false);
    toast.success('User creation fields mapping saved successfully!');
  };

  // Candidate Form Field Keywords Map states
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);
  const [keywords, setKeywords] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('mrf_candidate_keywords');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {}
    }
    return {
      name: ['name', 'Name', 'names'],
      dateOfBirth: ['dob', 'd-o-b'],
      gender: ['gender'],
      maritalStatus: ['marrital status'],
      contactNumber: ['contact_no', 'phone number', 'mobile_number'],
      emailId: ['email_id', 'email'],
      currentCompany: ['companies worked', 'company', 'Employment Details'],
      university: ['university', 'universities', 'Institute'],
      comments: [],
      qualification: ['qualification', 'degree', 'education'],
      relevantExperience: ['total_exp', 'total experience', 'total_experience'],
      totalExperience: [],
      skills: ['skills', 'skillsset', 'Skills']
    };
  });

  const [tempKeywords, setTempKeywords] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isKeywordsModalOpen) {
      const copy: Record<string, string[]> = {};
      Object.keys(keywords).forEach(k => {
        copy[k] = [...(keywords[k] || [])];
      });
      setTempKeywords(copy);
    }
  }, [isKeywordsModalOpen, keywords]);

  const handleAddTag = (fieldKey: string, tagVal: string) => {
    const val = tagVal.trim();
    if (!val) return;
    setTempKeywords(prev => {
      const currentTags = prev[fieldKey] || [];
      if (currentTags.includes(val)) return prev;
      return {
        ...prev,
        [fieldKey]: [...currentTags, val]
      };
    });
  };

  const handleRemoveTag = (fieldKey: string, tagVal: string) => {
    setTempKeywords(prev => {
      const currentTags = prev[fieldKey] || [];
      return {
        ...prev,
        [fieldKey]: currentTags.filter(t => t !== tagVal)
      };
    });
  };

  const handleSaveKeywords = () => {
    setKeywords(tempKeywords);
    localStorage.setItem('mrf_candidate_keywords', JSON.stringify(tempKeywords));
    setIsKeywordsModalOpen(false);
    toast.success('Candidate field keywords saved successfully!');
  };

  const [loggedInEmployeeName, setLoggedInEmployeeName] = useState('sakshi shukla');

  // Dynamic dropdown field lists
  const [positions, setPositions] = useState([
    'HR EXECUTIVE', 'SOFTWARE ENGINEER', 'SALES MANAGER', 'QA ENGINEER', 'PRODUCT MANAGER', 'UI/UX DESIGNER'
  ]);
  const [locations, setLocations] = useState([
    'Headquarters', 'New York', 'Mumbai', 'London', 'Remote'
  ]);
  const [departments, setDepartments] = useState([
    'HR', 'Engineering', 'Sales', 'Marketing', 'Finance', 'Operations', 'IT'
  ]);
  const [grades, setGrades] = useState([
    'Grade A', 'Grade B', 'Grade C', 'Grade D', 'Junior', 'Mid', 'Senior'
  ]);
  const [companiesList, setCompaniesList] = useState<string[]>(['Trial Company', 'Apponext Tech', 'Kosqu Technolab']);
  const [employeesList, setEmployeesList] = useState<string[]>(['sakshi shukla', 'Rahul Sharma', 'Siddharth Mehta']);

  // Raw reference maps for ID resolution & company filtering
  const [positionsRaw, setPositionsRaw] = useState<{ id: number; name: string; companyId?: number | null; companyName?: string }[]>([]);
  const [companiesRaw, setCompaniesRaw] = useState<{ id: number; name: string }[]>([]);
  const [locationsRaw, setLocationsRaw] = useState<{ id: number; name: string; companyId?: number | null; companyName?: string }[]>([]);
  const [departmentsRaw, setDepartmentsRaw] = useState<{ id: number; name: string; companyId?: number | null; companyName?: string }[]>([]);
  const [gradesRaw, setGradesRaw] = useState<{ id: number; name: string; companyId?: number | null; companyName?: string }[]>([]);
  const [employeesRaw, setEmployeesRaw] = useState<{ id: number; name: string; first_name?: string; last_name?: string; departmentId?: number | null; departmentName?: string; department?: string; companyId?: number | null; companyName?: string; designation?: string; accessRole?: string; isManager?: boolean; rawItem?: any }[]>([]);

  // Sub-Company Filter Helpers
  const isCompanyMatch = (itemCompanyId?: number | null, itemCompanyName?: string | null, targetCompany?: string | number) => {
    if (!targetCompany || targetCompany === 'Choose' || targetCompany === 'Select') return true;
    const targetStr = String(targetCompany).toLowerCase().trim();
    if (!itemCompanyId && !itemCompanyName) return true; // Parent scope items apply everywhere

    const matchName = itemCompanyName ? String(itemCompanyName).toLowerCase().trim() === targetStr : false;
    const matchId = itemCompanyId ? String(itemCompanyId) === targetStr : false;
    return matchName || matchId;
  };

  const getFilteredPositions = (companyName?: string) => {
    if (!positionsRaw || positionsRaw.length === 0) return positions;
    const matched = positionsRaw.filter(p => isCompanyMatch(p.companyId, p.companyName, companyName));
    return matched.length > 0 ? Array.from(new Set(matched.map(p => p.name))) : positions;
  };

  const getFilteredLocations = (companyName?: string) => {
    if (!locationsRaw || locationsRaw.length === 0) return locations;
    const matched = locationsRaw.filter(l => isCompanyMatch(l.companyId, l.companyName, companyName));
    return matched.length > 0 ? Array.from(new Set(matched.map(l => l.name))) : locations;
  };

  const getFilteredDepartments = (companyName?: string) => {
    if (!departmentsRaw || departmentsRaw.length === 0) return departments;
    const matched = departmentsRaw.filter(d => isCompanyMatch(d.companyId, d.companyName, companyName));
    return matched.length > 0 ? Array.from(new Set(matched.map(d => d.name))) : departments;
  };

  const getFilteredGrades = (companyName?: string) => {
    if (!gradesRaw || gradesRaw.length === 0) return grades;
    const matched = gradesRaw.filter(g => isCompanyMatch(g.companyId, g.companyName, companyName));
    return matched.length > 0 ? Array.from(new Set(matched.map(g => g.name))) : grades;
  };

  // Helper to resolve & filter Managers for a given department and company
  const getDepartmentManagers = (deptNameOrId?: string | number, companyName?: string) => {
    if (!employeesRaw || employeesRaw.length === 0) return [];
    
    // Filter by company first
    const companyEmployees = employeesRaw.filter(e => isCompanyMatch(e.companyId, e.companyName, companyName));
    const poolEmployees = companyEmployees.length > 0 ? companyEmployees : employeesRaw;

    // Filter managers/leads first
    const managersOnly = poolEmployees.filter(e => e.isManager);
    const pool = managersOnly.length > 0 ? managersOnly : poolEmployees;

    if (!deptNameOrId || deptNameOrId === 'Choose' || deptNameOrId === 'Select') {
      return pool;
    }

    const targetStr = String(deptNameOrId).toLowerCase().trim();
    const matched = pool.filter(e => {
      const eDept = (e.departmentName || e.department || '').toLowerCase().trim();
      const eDeptId = String(e.departmentId || '');
      return eDept === targetStr || eDeptId === targetStr;
    });

    return matched.length > 0 ? matched : pool;
  };

  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [upcomingSchedule, setUpcomingSchedule] = useState<any[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);

  const fetchSchedules = () => {
    apiClient.get('/recruitment/interviews/schedule')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const items = res.data.data;
          
          // Get today's date in local YYYY-MM-DD
          const todayStr = new Date().toISOString().split('T')[0];

          const today: any[] = [];
          const upcoming: any[] = [];
          const pending: any[] = [];
          const seenIds = new Set<number>();

          items.forEach((item: any) => {
            if (seenIds.has(item.id)) return;
            seenIds.add(item.id);

            const scheduledDateStr = item.scheduledDate ? item.scheduledDate.split('T')[0] : (item.scheduled_date ? item.scheduled_date.split('T')[0] : '');
            
            if (item.status === 'completed' && !item.feedbackSubmitted) {
              pending.push(item);
            } else if (scheduledDateStr === todayStr && (item.status === 'scheduled' || item.status === 'rescheduled')) {
              today.push(item);
            } else if (scheduledDateStr > todayStr && (item.status === 'scheduled' || item.status === 'rescheduled')) {
              upcoming.push(item);
            }
          });

          setTodaySchedule(today);
          setUpcomingSchedule(upcoming);
          setPendingFeedback(pending);
        }
      })
      .catch(err => console.error('Failed to fetch interview schedules', err));
  };

  useEffect(() => {
    // Fetch designations (positions)
    apiClient.get('/settings/designations')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || item.title || ''),
            companyId: item.companyId || item.company_id ? Number(item.companyId || item.company_id) : null,
            companyName: item.companyName || item.company_name || item.company || null,
          })).filter((x: any) => x.id && x.name);
          if (list.length > 0) {
            setPositions(list.map((x: any) => x.name));
            setPositionsRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load designations', err));

    // Fetch locations
    apiClient.get('/settings/locations')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name),
            companyId: item.companyId || item.company_id ? Number(item.companyId || item.company_id) : null,
            companyName: item.companyName || item.company_name || item.company || null,
          })).filter((x: any) => x.id && x.name);
          if (list.length > 0) {
            setLocations(list.map((x: any) => x.name));
            setLocationsRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load locations', err));

    // Fetch departments
    apiClient.get('/settings/departments')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name),
            companyId: item.companyId || item.company_id ? Number(item.companyId || item.company_id) : null,
            companyName: item.companyName || item.company_name || item.company || null,
          })).filter((x: any) => x.id && x.name);
          if (list.length > 0) {
            setDepartments(list.map((x: any) => x.name));
            setDepartmentsRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load departments', err));

    // Fetch grades
    apiClient.get('/settings/grades')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            id: Number(item.id),
            name: String(item.name),
            companyId: item.companyId || item.company_id ? Number(item.companyId || item.company_id) : null,
            companyName: item.companyName || item.company_name || item.company || null,
          })).filter((x: any) => x.id && x.name);
          if (list.length > 0) {
            setGrades(list.map((x: any) => x.name));
            setGradesRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load grades', err));

    // Fetch companies
    apiClient.get('/settings/companies')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            id: Number(item.companyId || item.company_id || item.id),
            name: String(item.name)
          })).filter((x: any) => x.id && x.name);
          if (list.length > 0) {
            setCompaniesList(list.map((x: any) => x.name));
            setCompaniesRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load companies', err));

    // Fetch employees (interviewers)
    apiClient.get('/employees', { params: { pageSize: 1000 } })
      .then(res => {
        if (res.data?.success) {
          const rawItems = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.items || []);
          const list = rawItems.map((item: any) => {
            const fn = item.firstName || item.first_name || '';
            const ln = item.lastName || item.last_name || '';
            const fullName = `${fn} ${ln}`.trim() || item.name || item.email || '';
            const deptId = item.currentDepartmentId || item.current_department_id || item.departmentId || item.department_id;
            const deptName = item.department || item.departmentName || item.department_name || '';
            const compId = item.currentBranchId || item.current_branch_id || item.companyId || item.company_id || item.currentCompanyId || item.current_company_id;
            const compName = item.company || item.companyName || item.company_name || '';
            const desig = (item.designation || item.jobTitle || item.designationName || item.designation_name || item.accessRole || item.role || '').toLowerCase();
            const role = (item.accessRole || item.role || '').toLowerCase();

            const isMgrRole = ['manager', 'department_head', 'hr', 'hr_admin', 'hr_manager', 'organization_admin', 'admin', 'team_lead'].includes(role);
            const isMgrDesig = desig.includes('manager') || desig.includes('head') || desig.includes('lead') || desig.includes('director') || desig.includes('vp') || desig.includes('chief') || desig.includes('supervisor');
            const isMgr = isMgrRole || isMgrDesig || Boolean(item.isManager) || Boolean(item.is_manager);

            return {
              id: Number(item.id),
              name: fullName,
              first_name: fn,
              last_name: ln,
              departmentId: deptId ? Number(deptId) : null,
              departmentName: deptName,
              department: deptName,
              companyId: compId ? Number(compId) : null,
              companyName: compName,
              designation: item.designation || item.jobTitle || '',
              accessRole: role,
              isManager: isMgr,
              rawItem: item
            };
          }).filter((x: any) => x.id && x.name);

          if (list.length > 0) {
            setEmployeesList(list);
            setEmployeesRaw(list);
          }
        }
      })
      .catch(err => console.error('Failed to load employees', err));

    // Fetch logged-in employee for "Requested By" auto-population
    apiClient.get('/employees/me')
      .then(res => {
        if (res.data?.success && res.data.data) {
          const emp = res.data.data;
          const fullName = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim();
          if (fullName) {
            setLoggedInEmployeeName(fullName);
            // Also update formFields default
            setFormFields(prev => ({ ...prev, requestedBy: fullName }));
          }
        }
      })
      .catch(err => console.warn('Failed to load current employee info', err));

    fetchSchedules();
  }, []);

  const getCurrentConfigList = () => {
    if (activeConfigTab === 'positions') return positions;
    if (activeConfigTab === 'locations') return locations;
    if (activeConfigTab === 'departments') return departments;
    return grades;
  };

  const handleAddFieldOption = () => {
    const val = newFieldOption.trim();
    if (!val) return;
    
    if (activeConfigTab === 'positions') {
      const upper = val.toUpperCase();
      if (positions.includes(upper)) {
        toast.error('Option already exists');
        return;
      }
      setPositions(prev => [...prev, upper]);
    } else if (activeConfigTab === 'locations') {
      if (locations.includes(val)) {
        toast.error('Option already exists');
        return;
      }
      setLocations(prev => [...prev, val]);
    } else if (activeConfigTab === 'departments') {
      if (departments.includes(val)) {
        toast.error('Option already exists');
        return;
      }
      setDepartments(prev => [...prev, val]);
    } else {
      if (grades.includes(val)) {
        toast.error('Option already exists');
        return;
      }
      setGrades(prev => [...prev, val]);
    }
    
    setNewFieldOption('');
    toast.success(`Added "${val}" to ${activeConfigTab}`);
  };

  const handleDeleteFieldOption = (itemToDelete: string) => {
    if (activeConfigTab === 'positions') {
      setPositions(prev => prev.filter(item => item !== itemToDelete));
    } else if (activeConfigTab === 'locations') {
      setLocations(prev => prev.filter(item => item !== itemToDelete));
    } else if (activeConfigTab === 'departments') {
      setDepartments(prev => prev.filter(item => item !== itemToDelete));
    } else {
      setGrades(prev => prev.filter(item => item !== itemToDelete));
    }
    toast.success(`Removed "${itemToDelete}" from ${activeConfigTab}`);
  };
  
  // Pagination & entries count
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMrf, setEditingMrf] = useState<MRFRequest | null>(null);
  
  // View Detail dialog state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingMrf, setViewingMrf] = useState<MRFRequest | null>(null);
  
  // Refresh Spin Animation states
  const [isRefreshingToday, setIsRefreshingToday] = useState(false);
  const [isRefreshingUpcoming, setIsRefreshingUpcoming] = useState(false);
  const [isRefreshingPending, setIsRefreshingPending] = useState(false);

  // Form Fields State
  const [formFields, setFormFields] = useState({
    positionTitle: 'Choose',
    numberOfPositions: '' as any,
    recruitmentType: 'Both',
    company: 'Choose',
    companyLocation: 'Choose',
    department: 'Choose',
    grade: 'Choose',
    employmentType: 'Choose',
    qualificationRequired: '',
    experienceDesired: '',
    interviewer: '',
    payScaleType: 'Choose',
    payScaleForPosition: '',
    reasonForRequirement: 'Choose',
    listInJobRecruitmentPage: 'Choose',
    skills: '',
    comment: '',
    jobDescription: '',
    targetClosureDate: '',
    requestedBy: 'sakshi shukla',
    stage: 'Approved',
    applicants: 0,
    status: 'Open' as 'Open' | 'Closed'
  });

  // Sync state to local storage
  useEffect(() => {
    // Disabled localStorage sync, using real DB now
  }, [data]);

  // Initial filter run & filter application
  useEffect(() => {
    applyFilters();
  }, [data, activeTab]);

  const applyFilters = (mrNum = searchMrNumber, pos = selectedPosition, reqBy = selectedRequestedBy) => {
    const safeData = Array.isArray(data) ? data : [];
    let result = safeData.filter(item => {
      if (!item) return false;
      const status = (item.status || '').toLowerCase();
      const stage = (item.stage || '').toLowerCase();
      const isClosed = status === 'closed' || stage === 'completed';
      const matchStatus = activeTab === 'open' ? !isClosed : isClosed;
      
      const matchMrNumber = mrNum.trim() === '' || 
        (item.mrNumber && item.mrNumber.toLowerCase().includes(mrNum.toLowerCase()));
      
      const matchPosition = pos === 'all' || 
        (item.positionTitle && item.positionTitle.toLowerCase() === pos.toLowerCase());
      
      const matchRequestedBy = reqBy === 'all' || 
        (item.requestedBy && item.requestedBy.toLowerCase() === reqBy.toLowerCase());

      return matchStatus && matchMrNumber && matchPosition && matchRequestedBy;
    });

    setFilteredData(result);
    setCurrentPage(1);
  };

  // Immediate filter triggers
  const handlePositionFilterChange = (val: string) => {
    setSelectedPosition(val);
    applyFilters(searchMrNumber, val, selectedRequestedBy);
  };

  const handleRequestedByFilterChange = (val: string) => {
    setSelectedRequestedBy(val);
    applyFilters(searchMrNumber, selectedPosition, val);
  };

  const handleSearch = () => {
    applyFilters();
    toast.success('Filters applied successfully');
  };

  // Safe unique lists generation
  const safeDataList = Array.isArray(data) ? data : [];
  const uniquePositions = Array.from(new Set(safeDataList.map(item => item?.positionTitle).filter(Boolean)));
  const uniqueRequestedBy = Array.from(new Set(safeDataList.map(item => item?.requestedBy).filter(Boolean)));

  // Pagination calculation
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);

  // Refresh Schedule handler
  const handleRefreshSchedule = (type: 'today' | 'upcoming' | 'pending') => {
    if (type === 'today') {
      setIsRefreshingToday(true);
      apiClient.get('/recruitment/interviews/schedule')
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            const todayStr = new Date().toISOString().split('T')[0];
            const list = res.data.data.filter((item: any) => {
              const dStr = item.scheduledDate ? item.scheduledDate.split('T')[0] : '';
              return dStr === todayStr && (item.status === 'scheduled' || item.status === 'rescheduled');
            });
            setTodaySchedule(list);
            toast.info("Today's schedule synced");
          }
        })
        .catch(() => toast.error("Failed to sync Today's schedule"))
        .finally(() => setIsRefreshingToday(false));
    } else if (type === 'upcoming') {
      setIsRefreshingUpcoming(true);
      apiClient.get('/recruitment/interviews/schedule')
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            const todayStr = new Date().toISOString().split('T')[0];
            const list = res.data.data.filter((item: any) => {
              const dStr = item.scheduledDate ? item.scheduledDate.split('T')[0] : '';
              return dStr > todayStr && (item.status === 'scheduled' || item.status === 'rescheduled');
            });
            setUpcomingSchedule(list);
            toast.info("Upcoming schedule synced");
          }
        })
        .catch(() => toast.error("Failed to sync Upcoming schedule"))
        .finally(() => setIsRefreshingUpcoming(false));
    } else if (type === 'pending') {
      setIsRefreshingPending(true);
      apiClient.get('/recruitment/interviews/schedule')
        .then(res => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            const list = res.data.data.filter((item: any) => item.status === 'completed' && !item.feedbackSubmitted);
            setPendingFeedback(list);
            toast.info("Pending feedback synced");
          }
        })
        .catch(() => toast.error("Failed to sync Pending feedback"))
        .finally(() => setIsRefreshingPending(false));
    }
  };

  // Delete Request handler
  const handleDelete = async (id: number) => {
    const recordToDelete = safeDataList.find(item => item.id === id);
    if (confirm(`Are you sure you want to delete ${recordToDelete?.mrNumber}?`)) {
      try {
        const response = await apiClient.delete(`/recruitment/mrf/${id}`);
        if (response.data?.success) {
          toast.success(`${recordToDelete?.mrNumber} deleted successfully`);
          setData(prev => (Array.isArray(prev) ? prev.filter((item: any) => item.id !== id) : []));
          fetchMrfs();
        } else {
          toast.error(response.data?.message || 'Failed to delete MRF request');
        }
      } catch (err) {
        console.error('Delete MRF Request error:', err);
        toast.error('Error deleting MRF request');
      }
    }
  };

  const handleApproveMrf = (id: number) => {
    apiClient.post(`/recruitment/mrf/${id}/approve`, { comment: 'Approved via UI' })
      .then(res => {
        if (res.data?.success) {
          toast.success('MRF Approved successfully');
          fetchMrfs();
          setActiveStagePopoverId(null);
        } else {
          toast.error(res.data?.message || 'Failed to approve MRF');
        }
      })
      .catch(err => {
        console.error('Failed to approve MRF', err);
        toast.error('Failed to approve MRF');
      });
  };

  const handleRejectMrf = (id: number) => {
    apiClient.post(`/recruitment/mrf/${id}/reject`, { comment: 'Rejected via UI' })
      .then(res => {
        if (res.data?.success) {
          toast.success('MRF Rejected successfully');
          fetchMrfs();
          setActiveStagePopoverId(null);
        } else {
          toast.error(res.data?.message || 'Failed to reject MRF');
        }
      })
      .catch(err => {
        console.error('Failed to reject MRF', err);
        toast.error('Failed to reject MRF');
      });
  };

  // Duplicate Request handler
  const handleDuplicate = async (item: MRFRequest) => {
    try {
      const response = await apiClient.post('/recruitment/mrf', {
        positionTitle: `${item.positionTitle} (Copy)`,
        numberOfPositions: item.numberOfPositions,
        recruitmentType: item.recruitmentType,
        company: item.company,
        companyLocation: item.companyLocation,
        department: item.department,
        grade: item.grade,
        employmentType: item.employmentType,
        qualificationRequired: item.qualificationRequired,
        experienceDesired: item.experienceDesired,
        interviewer: item.interviewer,
        payScaleType: item.payScaleType,
        payScaleForPosition: item.payScaleForPosition,
        reasonForRequirement: item.reasonForRequirement,
        listInJobPage: item.listInJobRecruitmentPage,
        skills: item.skills,
        comment: item.comment,
        jobDescription: item.jobDescription,
        stage: 'Pending Approval'
      });
      if (response.data?.success) {
        toast.success(`Duplicated ${item.mrNumber} successfully`);
        fetchMrfs();
      }
    } catch (err) {
      toast.error('Failed to duplicate MRF request');
    }
  };

  // Export to CSV handler
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    downloadCsvFile(
      `MRF_Requests_Export_${activeTab}.csv`,
      ['MR Number', 'Stage', 'Position Title', 'Company', 'Requested By', 'Requested On', 'Positions', 'Department', 'Status', 'Applicants'],
      filteredData.map((item) => [
        item.mrNumber,
        item.stage,
        item.positionTitle,
        item.company,
        item.requestedBy,
        item.requestedOn,
        item.numberOfPositions,
        item.department,
        item.status,
        item.applicants,
      ])
    );
    toast.success('Data exported to CSV successfully');
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingMrf(null);
    setFormFields({
      positionTitle: 'Choose',
      numberOfPositions: '' as any,
      recruitmentType: 'Both',
      company: 'Choose',
      companyLocation: 'Choose',
      department: 'Choose',
      grade: 'Choose',
      employmentType: 'Choose',
      qualificationRequired: '',
      experienceDesired: '',
      interviewer: '',
      payScaleType: 'Choose',
      payScaleForPosition: '',
      reasonForRequirement: 'Choose',
      listInJobRecruitmentPage: 'Choose',
      skills: '',
      comment: '',
      jobDescription: '',
      targetClosureDate: '',
      requestedBy: loggedInEmployeeName,
      stage: isHrPortal ? 'Approved' : 'Pending Approval',
      applicants: 0,
      status: 'Open'
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MRFRequest) => {
    setEditingMrf(item);
    const rawDate = item.targetClosureDate || item.expiryDate || '';
    const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : (rawDate.includes(' ') ? rawDate.split(' ')[0] : rawDate);

    setFormFields({
      positionTitle: item.positionTitle || 'Choose',
      numberOfPositions: item.numberOfPositions || '' as any,
      recruitmentType: item.recruitmentType || 'Both',
      company: item.company || 'Choose',
      companyLocation: item.companyLocation || 'Choose',
      department: item.department || 'Choose',
      grade: item.grade || 'Choose',
      employmentType: item.employmentType || 'Choose',
      qualificationRequired: item.qualificationRequired || '',
      experienceDesired: item.experienceDesired || '',
      interviewer: item.interviewer || '',
      payScaleType: item.payScaleType || 'Choose',
      payScaleForPosition: item.payScaleForPosition || '',
      reasonForRequirement: item.reasonForRequirement || 'Choose',
      listInJobRecruitmentPage: item.listInJobRecruitmentPage || 'Choose',
      skills: item.skills || '',
      comment: item.comment || '',
      jobDescription: item.jobDescription || '',
      targetClosureDate: cleanDate,
      requestedBy: item.requestedBy || 'sakshi shukla',
      stage: item.stage || 'Approved',
      applicants: item.applicants || 0,
      status: item.status || 'Open'
    });
    setIsModalOpen(true);
  };

  // Open View Modal
  const handleOpenViewModal = (item: MRFRequest) => {
    setViewingMrf(item);
    setIsViewOpen(true);
    setApplicantFilterTab('All');
    fetchMrfApplicants(item.id);
    fetchMrfActionLogs(item.id);
  };

  // Save (Create or Update) handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formFields.numberOfPositions || Number(formFields.numberOfPositions) <= 0) {
      toast.error('Number of Positions is required and must be greater than 0');
      return;
    }
    if (formFields.positionTitle === 'Choose') {
      toast.error('Please select a Position Title');
      return;
    }
    if (formFields.company === 'Choose') {
      toast.error('Please select a Company');
      return;
    }
    if (formFields.companyLocation === 'Choose') {
      toast.error('Please select a Company Location');
      return;
    }
    if (formFields.department === 'Choose') {
      toast.error('Please select a Department');
      return;
    }
    if (formFields.employmentType === 'Choose') {
      toast.error('Please select an Employment Type');
      return;
    }
    if (formFields.listInJobRecruitmentPage === 'Choose') {
      toast.error('Please select whether to List in Job Recruitment Page');
      return;
    }
    if (!formFields.skills.trim()) {
      toast.error('Skills field is required');
      return;
    }
    if (!formFields.targetClosureDate || !formFields.targetClosureDate.trim()) {
      toast.error('Target Closure Date / Expiry Date is required');
      return;
    }

    const matchedCompany = companiesRaw.find(c => c.name === formFields.company);
    const matchedLocation = locationsRaw.find(l => l.name === formFields.companyLocation);
    const matchedDept = departmentsRaw.find(d => d.name === formFields.department);
    const matchedGrade = gradesRaw.find(g => g.name === formFields.grade);
    const matchedInterviewer = employeesRaw.find(e => 
      e.name.toLowerCase().trim() === formFields.interviewer.toLowerCase().trim()
    );

    const payload: any = {
      positionTitle: formFields.positionTitle,
      numberOfPositions: Number(formFields.numberOfPositions) || 1,
      recruitmentType: formFields.recruitmentType !== 'Choose' ? formFields.recruitmentType : 'Both',
      companyId: matchedCompany?.id || undefined,
      companyLocationId: matchedLocation?.id || undefined,
      departmentId: matchedDept?.id || undefined,
      gradeId: matchedGrade?.id || undefined,
      employmentType: formFields.employmentType !== 'Choose' ? formFields.employmentType : undefined,
      qualificationRequired: formFields.qualificationRequired || undefined,
      experienceDesired: formFields.experienceDesired || undefined,
      interviewerId: matchedInterviewer?.id || undefined,
      payScaleType: formFields.payScaleType !== 'Choose' ? formFields.payScaleType : undefined,
      payScaleForPosition: formFields.payScaleForPosition || undefined,
      reasonForRequirement: formFields.reasonForRequirement !== 'Choose' ? formFields.reasonForRequirement : undefined,
      listInJobPage: (formFields.listInJobRecruitmentPage === 'No' ? 'No' : 'Yes') as 'Yes' | 'No',
      skills: formFields.skills,
      comment: formFields.comment || undefined,
      jobDescription: formFields.jobDescription,
      targetClosureDate: formFields.targetClosureDate || undefined,
      expiryDate: formFields.targetClosureDate || undefined,
    };

    console.log('--- Submitting MRF payload with resolved IDs ---', payload);

    if (editingMrf) {
      // Update
      apiClient.patch(`/recruitment/mrf/${editingMrf.id}`, {
        ...payload,
        stage: formFields.stage,
        status: formFields.status
      })
      .then((res) => {
        if (res.data?.success) {
          toast.success(`MRF Request ${editingMrf.mrNumber} updated successfully`);
          fetchMrfs();
        }
      })
      .catch((err) => {
        console.error('Update MRF Request failed:', err);
        toast.error('Failed to update MRF request');
      });
    } else {
      // Create
      apiClient.post('/recruitment/mrf', {
        ...payload,
        stage: formFields.stage || (isHrPortal ? 'Approved' : 'Pending Approval'),
        status: formFields.status || 'Open'
      })
      .then((res) => {
        if (res.data?.success) {
          toast.success(`Created MRF Request successfully`);
          fetchMrfs();
        }
      })
      .catch((err) => {
        console.error('Create MRF Request failed:', err);
        toast.error('Failed to create MRF request');
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans relative">
      
      {/* Inline styles to make forms and tables highly compact and premium with complete dark mode support */}
      <style>{`
        .mrf-table th, .mrf-table td {
          padding: 8px 12px !important;
          font-size: 11.5px !important;
        }
        .mrf-dialog-compact label {
          font-size: 11px !important;
          font-weight: 700 !important;
        }
        .mrf-dialog-compact input, 
        .mrf-dialog-compact select,
        .mrf-dialog-compact textarea,
        .mrf-dialog-compact [role="combobox"],
        .mrf-dialog-compact button:not([aria-label="Close"]) {
          height: 34px !important;
          font-size: 12px !important;
        }
        .mrf-dialog-compact textarea {
          height: 60px !important;
        }
        
        /* Dark mode support overrides */
        .dark .bg-slate-50\\/50 {
          background-color: rgb(15 23 42 / 0.95) !important;
        }
        .dark .text-slate-800 {
          color: rgb(241 245 249) !important;
        }
        .dark .bg-white {
          background-color: rgb(30 41 59) !important;
          color: rgb(241 245 249) !important;
        }
        .dark .border-slate-100,
        .dark .border-slate-200 {
          border-color: rgb(51 65 85) !important;
        }
        .dark .bg-slate-50 {
          background-color: rgb(15 23 42 / 0.4) !important;
        }
        .dark .bg-slate-100\\/70 {
          background-color: rgb(15 23 42 / 0.3) !important;
        }
        .dark .text-slate-700 {
          color: rgb(226 232 240) !important;
        }
        .dark .text-slate-600 {
          color: rgb(203 213 225) !important;
        }
        .dark .text-slate-500 {
          color: rgb(148 163 184) !important;
        }
        .dark .text-slate-755 {
          color: rgb(241 245 249) !important;
        }
        .dark .divide-slate-100 > :not([hidden]) ~ :not([hidden]) {
          border-color: rgb(51 65 85) !important;
        }
        .dark .hover\\:bg-slate-50\\/50:hover {
          background-color: rgb(15 23 42 / 0.5) !important;
        }
        .dark .bg-emerald-50:hover {
          background-color: rgb(16 185 129 / 0.15) !important;
        }
        .dark .bg-blue-50:hover {
          background-color: rgb(59 130 246 / 0.15) !important;
        }
        .dark .bg-green-50:hover {
          background-color: rgb(34 197 94 / 0.15) !important;
        }
        .dark .bg-red-50:hover {
          background-color: rgb(239 68 68 / 0.15) !important;
        }
        
        /* Dialog overrides in dark mode */
        .dark .mrf-dialog-compact {
          background-color: rgb(30 41 59) !important;
          color: rgb(241 245 249) !important;
          border-color: rgb(51 65 85) !important;
        }
        .dark .mrf-dialog-compact input,
        .dark .mrf-dialog-compact select,
        .dark .mrf-dialog-compact textarea,
        .dark .mrf-dialog-compact [role="combobox"] {
          background-color: rgb(15 23 42) !important;
          border-color: rgb(51 65 85) !important;
          color: rgb(241 245 249) !important;
        }
        .dark .mrf-dialog-compact select option {
          background-color: rgb(30 41 59) !important;
          color: rgb(241 245 249) !important;
        }
        .dark .border-slate-300 {
          border-color: rgb(51 65 85) !important;
        }
        .dark .bg-red-100 {
          background-color: rgb(239 68 68 / 0.2) !important;
        }
        
        /* Radix Select element portal support */
        .dark div[role="listbox"],
        .dark div[role="option"],
        .dark [data-radix-popper-content-wrapper] > div,
        .dark [data-radix-select-viewport] {
          background-color: rgb(30 41 59) !important;
          color: rgb(241 245 249) !important;
          border-color: rgb(51 65 85) !important;
        }
      `}</style>

      {/* Main Content Area (Spans full page width, making elements more compact) */}
      <div className="flex-1">
        
        {/* ── Top Header Banner ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-visible mb-6">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 border border-primary/20 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Manpower Requisition (MRF)
              </h1>
              <p className="text-xs text-muted-foreground">
                Create, approve and manage departmental hiring requests with multi-tier approval chains.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto flex-wrap">
            {isHrPortal && (
              <Popover open={showQuickSettings} onOpenChange={setShowQuickSettings}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted text-foreground cursor-pointer shadow-2xs"
                    title="Field & Mapping Configurations"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="hidden sm:inline">Settings</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-64 p-1.5 rounded-xl shadow-2xl z-50 bg-card border border-border">
                  <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    Form & Field Configurations
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFieldsModalOpen(true);
                        setShowQuickSettings(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/70 cursor-pointer transition-colors"
                    >
                      <Grid className="w-4 h-4 text-primary" />
                      <span>Recruitment Fields</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCandidateModalOpen(true);
                        setShowQuickSettings(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/70 cursor-pointer transition-colors"
                    >
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <span>Candidate Fields</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMappingModalOpen(true);
                        setShowQuickSettings(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/70 cursor-pointer transition-colors"
                    >
                      <User className="w-4 h-4 text-primary" />
                      <span>User Creation Fields Mapping</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsKeywordsModalOpen(true);
                        setShowQuickSettings(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/70 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <span>Candidate Form Field Keywords</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button 
              onClick={handleOpenCreateModal}
              className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Raise MRF Requisition
            </Button>
          </div>
        </div>

      {/* ── Top Schedule Cards Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        
        {/* Card 1: Today's Schedule */}
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-extrabold text-foreground">Today's Interviews</CardTitle>
            </div>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('today')}
              className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-transform duration-500 ${
                isRefreshingToday ? 'animate-spin text-emerald-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent className="p-4">
            {todaySchedule.length === 0 ? (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-5 text-center text-muted-foreground text-xs font-medium">
                No interviews scheduled for today
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {todaySchedule.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{item.candidateName || 'Candidate'}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.positionTitle || 'N/A'} • Round {item.interviewRound}</div>
                      <div className="text-[10px] text-primary font-bold uppercase tracking-wider">{item.interviewType}</div>
                    </div>
                    <div className="text-right space-y-1 shrink-0">
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {item.scheduledDate ? new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      {item.meetingUrl && (
                        <a 
                          href={item.meetingUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-block text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-md transition-all"
                        >
                          Join
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Upcoming Schedule */}
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-extrabold text-foreground">Upcoming Schedule</CardTitle>
            </div>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('upcoming')}
              className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-transform duration-500 ${
                isRefreshingUpcoming ? 'animate-spin text-amber-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent className="p-4">
            {upcomingSchedule.length === 0 ? (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-5 text-center text-muted-foreground text-xs font-medium">
                No upcoming interviews
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {upcomingSchedule.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{item.candidateName || 'Candidate'}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.positionTitle || 'N/A'} • Round {item.interviewRound}</div>
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase">{item.interviewType}</div>
                    </div>
                    <div className="text-right space-y-0.5 shrink-0">
                      <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {item.scheduledDate ? new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Pending Feedback */}
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
              <CardTitle className="text-xs font-extrabold text-foreground">Pending Feedback</CardTitle>
            </div>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('pending')}
              className={`h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer transition-transform duration-500 ${
                isRefreshingPending ? 'animate-spin text-rose-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent className="p-4">
            {pendingFeedback.length === 0 ? (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-5 text-center text-muted-foreground text-xs font-medium">
                All interview feedback submitted
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {pendingFeedback.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{item.candidateName || 'Candidate'}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.positionTitle || 'N/A'} • Round {item.interviewRound}</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">{item.interviewType}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Section ────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="mr-number" className="text-xs font-bold text-foreground uppercase tracking-wider">MR-Number</Label>
              <Input
                id="mr-number"
                placeholder="1, 2, 3, ..."
                value={searchMrNumber}
                onChange={(e) => setSearchMrNumber(e.target.value)}
                className="h-9 text-xs bg-background border-border rounded-xl"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-xs font-bold text-foreground uppercase tracking-wider">Position</Label>
              <Select value={selectedPosition} onValueChange={handlePositionFilterChange}>
                <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {uniquePositions.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="requested-by" className="text-xs font-bold text-foreground uppercase tracking-wider">Requested By</Label>
              <Select value={selectedRequestedBy} onValueChange={handleRequestedByFilterChange}>
                <SelectTrigger className="h-9 text-xs bg-background border-border rounded-xl">
                  <SelectValue placeholder="All Requesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requesters</SelectItem>
                  {uniqueRequestedBy.map((emp) => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSearch}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" /> Search Requests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Segmented Tabs & Results Card ─────────────────────────────────────── */}
      <div className="space-y-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'open'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Open Requests ({data.filter(d => {
              const status = (d.status || '').toLowerCase();
              const stage = (d.stage || '').toLowerCase();
              return status !== 'closed' && stage !== 'completed';
            }).length})
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'closed'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Closed Requests ({data.filter(d => {
              const status = (d.status || '').toLowerCase();
              const stage = (d.stage || '').toLowerCase();
              return status === 'closed' || stage === 'completed';
            }).length})
          </button>
        </div>

        {/* Result Card Wrapper */}
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          
          {/* Result Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/60 gap-4">
            <div>
              <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Requisition Roster
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Showing {filteredData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl border-border hover:bg-muted shrink-0 text-foreground"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export CSV
              </Button>
            </div>
          </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg w-full">
          <table className="w-full text-sm text-left border-collapse min-w-[1200px] mrf-table">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">MR Number</th>
                <th className="p-3.5 text-center">Stage</th>
                
                {/* Dynamically configured columns */}
                {visibleColumns.map((colKey) => {
                  const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === colKey);
                  const isCenter = colKey === 'numberOfPositions' || colKey === 'status';
                  return (
                    <th key={colKey} className={cn("p-3.5", isCenter && "text-center")}>
                      {col?.label || colKey}
                    </th>
                  );
                })}

                <th className="p-3.5 text-center">Applicants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={3 + visibleColumns.length + 1} className="p-8 text-center text-slate-400 italic">
                    No MRF Requests found matching the filters
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="p-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenViewModal(item)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {isHrPortal && (
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                        {isHrPortal && (
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/liberation/103/${item.mrNumber}/aHc9PQ`;
                            navigator.clipboard.writeText(link).then(() => {
                              toast.success("Link copied to clipboard!");
                            }).catch(() => {
                              toast.error("Failed to copy link");
                            });
                          }}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        )}
                        {isHrPortal && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{item.mrNumber}</td>
                    <td className="p-3.5 text-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <div 
                            className="inline-flex items-center justify-center p-1.5 bg-red-100 rounded-full text-red-500 shadow-sm cursor-pointer transition-transform hover:scale-105"
                            title="Reporting Officer"
                          >
                            <User className="w-3.5 h-3.5" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent 
                          align="center" 
                          side="top" 
                          sideOffset={8}
                          className="bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-left z-50 min-w-[220px] text-slate-700 select-none"
                        >
                          {/* Popover Header */}
                          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 mb-2">
                            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Reporting Officer</span>
                            <button
                              type="button"
                              onClick={() => {
                                toast.success("Audit Log opened!");
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                            >
                              Audit Log
                            </button>
                          </div>

                          {/* Popover Content */}
                          <div className="space-y-1 text-xs text-slate-500 font-medium">
                            <div>Approver : <span className="text-slate-800 font-semibold">Administrator</span></div>
                            <div>Status : <span className="text-slate-800 font-semibold">{item.stage || 'Pending Approval'}</span></div>
                          </div>

                          {isHrPortal && item.stage !== 'Approved' && item.stage !== 'Rejected' && (
                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => handleApproveMrf(item.id)}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-[10px] text-center cursor-pointer transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectMrf(item.id)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-[10px] text-center cursor-pointer transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </td>

                    {/* Dynamically configured column cells */}
                    {visibleColumns.map((colKey) => {
                      const isCenter = colKey === 'numberOfPositions' || colKey === 'status';
                      
                      if (colKey === 'status') {
                        return (
                          <td key={colKey} className="p-3.5 text-center">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                              item.status === 'Open'
                                ? 'bg-green-55 text-green-700 border border-green-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", item.status === 'Open' ? 'bg-green-500' : 'bg-slate-400')}></span>
                              {item.status}
                            </span>
                          </td>
                        );
                      }
                      
                      if (colKey === 'numberOfPositions') {
                        return (
                          <td key={colKey} className="p-3.5 text-center font-bold text-slate-800">
                            {item.numberOfPositions}
                          </td>
                        );
                      }
                      
                      if (colKey === 'targetClosureDate') {
                        const targetDateStr = item.targetClosureDate || item.expiryDate;
                        const isExpired = targetDateStr && new Date(targetDateStr) < new Date() && item.status === 'Open';
                        return (
                          <td key={colKey} className="p-3.5 text-center">
                            {targetDateStr ? (
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-700">{targetDateStr}</span>
                                {isExpired && (
                                  <span className="mt-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 rounded border border-rose-200">
                                    Expired / Overdue
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                        );
                      }

                      if (colKey === 'positionTitle') {
                        return (
                          <td key={colKey} className="p-3.5 font-semibold text-slate-755 hover:text-blue-600 cursor-pointer transition-colors" onClick={() => handleOpenViewModal(item)}>
                            {item.positionTitle}
                          </td>
                        );
                      }

                      const val = (item as any)[colKey];
                      return (
                        <td key={colKey} className="p-3.5">
                          {val !== undefined && val !== null && val !== ''
                            ? String(val)
                            : <span className="text-slate-400 italic">-</span>
                          }
                        </td>
                      );
                    })}

                    <td className="p-3.5 text-center">
                      <span className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1 rounded shadow-sm whitespace-nowrap transition-colors cursor-pointer" onClick={() => handleOpenViewModal(item)}>
                        {item.applicants} Candidates
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-1.5 p-4 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <Button
                key={idx}
                variant={currentPage === idx + 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(idx + 1)}
                className={`h-8 w-8 p-0 text-xs font-bold rounded-xl ${
                  currentPage === idx + 1 
                    ? 'bg-primary text-primary-foreground shadow-xs' 
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                {idx + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border-border hover:bg-muted text-foreground"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        )}
        </Card>
      </div>

      {/* Add / Edit Recruitment Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 mrf-dialog-compact"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-select-content]')) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-select-content]')) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-select-content]')) {
              e.preventDefault();
            }
          }}
        >
          <form onSubmit={handleSave}>
            <DialogHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {editingMrf ? 'Edit Recruitment Form' : 'Add Recruitment Form'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Submit or edit Manpower Requisition Form (MRF) configurations.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="grid gap-5 py-5 text-sm text-slate-700">
              
              {/* Row 1: Position Title | Number of Positions | Recruitment Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-xs font-bold text-slate-700">
                    Position Title <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.positionTitle} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, positionTitle: val }))}
                  >
                    <SelectTrigger id="position" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      {getFilteredPositions(formFields.company).map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numPositions" className="text-xs font-bold text-slate-700">
                    Number of Positions <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numPositions"
                    type="number"
                    min={1}
                    value={formFields.numberOfPositions || ''}
                    onChange={(e) => setFormFields(prev => ({ ...prev, numberOfPositions: e.target.value === '' ? '' as any : parseInt(e.target.value) || 0 }))}
                    required
                    className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                    placeholder="Enter number of positions"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recruitmentType" className="text-xs font-bold text-slate-700">
                    Recruitment Type
                  </Label>
                  <Select 
                    value={formFields.recruitmentType} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, recruitmentType: val }))}
                  >
                    <SelectTrigger id="recruitmentType" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Company | Company Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-bold text-slate-700">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.company} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, company: val }))}
                  >
                    <SelectTrigger id="company" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      {companiesList.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs font-bold text-slate-700">
                    Company Location <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.companyLocation} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, companyLocation: val }))}
                  >
                    <SelectTrigger id="location" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      {getFilteredLocations(formFields.company).map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Department | Grade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-bold text-slate-700">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.department} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, department: val }))}
                  >
                    <SelectTrigger id="department" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      {getFilteredDepartments(formFields.company).map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grade" className="text-xs font-bold text-slate-700">
                    Grade <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.grade} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, grade: val }))}
                  >
                    <SelectTrigger id="grade" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      {getFilteredGrades(formFields.company).map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Employment Type | Qualification Required */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="employmentType" className="text-xs font-bold text-slate-700">
                    Employment Type <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.employmentType} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, employmentType: val }))}
                  >
                    <SelectTrigger id="employmentType" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      <SelectItem value="Full Time">Full Time</SelectItem>
                      <SelectItem value="Part Time">Part Time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qualification" className="text-xs font-bold text-slate-700">
                    Qualification Required
                  </Label>
                  <Input
                    id="qualification"
                    placeholder="Qualification Required"
                    value={formFields.qualificationRequired}
                    onChange={(e) => setFormFields(prev => ({ ...prev, qualificationRequired: e.target.value }))}
                    className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 5: Experience Desired */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="experience" className="text-xs font-bold text-slate-700">
                    Experience desired
                  </Label>
                  <Input
                    id="experience"
                    placeholder="Experience desired"
                    value={formFields.experienceDesired}
                    onChange={(e) => setFormFields(prev => ({ ...prev, experienceDesired: e.target.value }))}
                    className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 6: Pay Scale Type | Pay Scale For The Position */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payScaleType" className="text-xs font-bold text-slate-700">
                    Pay Scale Type
                  </Label>
                  <Select 
                    value={formFields.payScaleType} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, payScaleType: val }))}
                  >
                    <SelectTrigger id="payScaleType" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                      <SelectItem value="Monthly Salary">Monthly Salary</SelectItem>
                      <SelectItem value="Annual CTC">Annual CTC</SelectItem>
                      <SelectItem value="Fixed Contract">Fixed Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payScale" className="text-xs font-bold text-slate-700">
                    Pay Scale For The Position
                  </Label>
                  <Input
                    id="payScale"
                    placeholder="Pay Scale For The Position"
                    value={formFields.payScaleForPosition}
                    onChange={(e) => setFormFields(prev => ({ ...prev, payScaleForPosition: e.target.value }))}
                    className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 7: Reason for Requirement | List in Job Recruitment Page * */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reasonRequirement" className="text-xs font-bold text-slate-700">
                    Reason for Requirement
                  </Label>
                  <Select 
                    value={formFields.reasonForRequirement} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, reasonForRequirement: val }))}
                  >
                    <SelectTrigger id="reasonRequirement" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      <SelectItem value="New Position">New Position</SelectItem>
                      <SelectItem value="Replacement Hiring">Replacement Hiring</SelectItem>
                      <SelectItem value="Project Expansion">Project Expansion</SelectItem>
                      <SelectItem value="Maternity/Paternity Cover">Maternity/Paternity Cover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="listJobPage" className="text-xs font-bold text-slate-700">
                    List in Job Recruitment Page <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formFields.listInJobRecruitmentPage} 
                    onValueChange={(val) => setFormFields(prev => ({ ...prev, listInJobRecruitmentPage: val }))}
                  >
                    <SelectTrigger id="listJobPage" className="bg-white border-slate-200 text-slate-755 h-10">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Choose">Choose</SelectItem>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 7.5: Target Closure Date / Expiry Date & Approval Stage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="targetClosureDate" className="text-xs font-bold text-slate-700">
                    Target Closure Date / Expiry Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="targetClosureDate"
                    type="date"
                    required
                    value={formFields.targetClosureDate}
                    onChange={(e) => setFormFields(prev => ({ ...prev, targetClosureDate: e.target.value }))}
                    className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500 bg-white text-slate-800 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </div>

                {isHrPortal && (
                  <div className="space-y-1.5">
                    <Label htmlFor="mrfStage" className="text-xs font-bold text-slate-700">
                      Approval Stage
                    </Label>
                    <Select 
                      value={formFields.stage || 'Approved'} 
                      onValueChange={(val) => setFormFields(prev => ({ ...prev, stage: val }))}
                    >
                      <SelectTrigger id="mrfStage" className="bg-white border-slate-200 text-slate-700 h-10">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Row 8: Skills * */}
              <div className="space-y-1.5">
                <Label htmlFor="skills" className="text-xs font-bold text-slate-700">
                  Skills <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="skills"
                  placeholder="Skills"
                  value={formFields.skills}
                  onChange={(e) => setFormFields(prev => ({ ...prev, skills: e.target.value }))}
                  required
                  className="border-slate-200 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>

              {/* Row 9: Comment */}
              <div className="space-y-1.5">
                <Label htmlFor="comment" className="text-xs font-bold text-slate-700">
                  Comment
                </Label>
                <textarea
                  id="comment"
                  placeholder="Enter comments here"
                  value={formFields.comment}
                  onChange={(e) => setFormFields(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Row 10: Job Description (Using the codebase's TipTap Rich Text Editor) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Job Description
                </Label>
                <TipTapRichTextEditor
                  content={formFields.jobDescription}
                  onChange={(html) => setFormFields(prev => ({ ...prev, jobDescription: html }))}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end">
              <Button 
                type="submit"
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-8 h-10 rounded-md transition-all shadow-md active:scale-95"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Read-Only MRF View Detail Dialog with Candidates Information & Action Information */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[1050px] max-h-[92vh] overflow-y-auto bg-slate-100/90 rounded-lg shadow-2xl p-0 border border-slate-300 [&>button]:hidden">
          {viewingMrf && (
            <div className="p-4 space-y-4 text-xs font-sans">
              
              {/* Top Title Bar */}
              <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded border border-slate-200 shadow-2xs">
                <span className="font-bold text-slate-700 text-sm">Recruitment Request</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsViewOpen(false);
                      handleOpenEditModal(viewingMrf);
                    }} 
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Edit Request"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsViewOpen(false)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Minimize"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsViewOpen(false)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section 1: Recruitment Request Details */}
              <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
                {/* Cyan Header Banner */}
                <div className="bg-[#0099b8] text-white font-bold text-xs px-4 py-2 flex items-center justify-between">
                  <span>{viewingMrf.mrNumber ? `${viewingMrf.mrNumber} — ${viewingMrf.positionTitle}` : 'Default'}</span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Position Title</span>
                      <span className="font-bold text-slate-800">{viewingMrf.positionTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Number of Positions</span>
                      <span className="font-bold text-slate-800">{viewingMrf.numberOfPositions}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Recruitment Type</span>
                      <span className="font-bold text-slate-800">{viewingMrf.recruitmentType || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Company</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.company || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Company Location</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.companyLocation || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Department</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Grade</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.grade || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Employment Type</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.employmentType || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Qualification Required</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.qualificationRequired || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Experience desired</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.experienceDesired || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Interviewer</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.interviewer || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Pay Scale Type</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.payScaleType || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Pay Scale For The Position</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.payScaleForPosition || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Reason for Requirement</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.reasonForRequirement || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">List in Job Recruitment Page</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.listInJobRecruitmentPage || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium block text-[11px]">Target Closure / Expiry Date</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-slate-800">
                          {viewingMrf.targetClosureDate || viewingMrf.expiryDate || 'Not Specified'}
                        </span>
                        {(viewingMrf.targetClosureDate || viewingMrf.expiryDate) && 
                         new Date(viewingMrf.targetClosureDate || viewingMrf.expiryDate!) < new Date() && 
                         viewingMrf.status === 'Open' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Expired / Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {viewingMrf.skills && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium block text-[11px]">Skills</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.skills}</span>
                    </div>
                  )}

                  {viewingMrf.comment && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium block text-[11px]">Comment</span>
                      <span className="font-semibold text-slate-700">{viewingMrf.comment}</span>
                    </div>
                  )}

                  {viewingMrf.jobDescription && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium block text-[11px]">Job Description</span>
                      <div className="font-semibold text-slate-700 prose text-xs max-w-none" dangerouslySetInnerHTML={{ __html: viewingMrf.jobDescription }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Candidates Information */}
              <div className="bg-white rounded border-t-2 border-t-emerald-500 border-x border-b border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">Candidates Information</h3>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        resetCandidateFormData();
                        setIsAddCandidateModalOpen(true);
                      }}
                      className="bg-[#1b84bf] hover:bg-[#156ea3] text-white text-xs font-semibold px-3 py-1.5 rounded-sm shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      + Add Candidate
                    </button>
                    <button 
                      onClick={handleOpenResumeBankSearch}
                      className="bg-[#f08b00] hover:bg-[#d47b00] text-white text-xs font-semibold px-3 py-1.5 rounded-sm shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Search in Resume Bank
                    </button>
                  </div>

                  {/* Resume Bank Search Card (Embedded when toggled) */}
                  {showResumeBankSearch && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-4 shadow-2xs relative my-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-slate-800 text-xs">Resume Bank</span>
                        <button 
                          onClick={() => setShowResumeBankSearch(false)}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Filter fields grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Name</label>
                          <Input 
                            value={resumeBankFilters.name} 
                            onChange={e => setResumeBankFilters({...resumeBankFilters, name: e.target.value})}
                            className="h-8 text-xs bg-white border-slate-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Email Id</label>
                          <Input 
                            value={resumeBankFilters.email} 
                            onChange={e => setResumeBankFilters({...resumeBankFilters, email: e.target.value})}
                            className="h-8 text-xs bg-white border-slate-200"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Marital Status</label>
                          <Select 
                            value={resumeBankFilters.maritalStatus} 
                            onValueChange={val => setResumeBankFilters({...resumeBankFilters, maritalStatus: val})}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                              <SelectValue placeholder="Marital Status (0)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Marital Status (0)</SelectItem>
                              <SelectItem value="Unmarried">Unmarried</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Qualification</label>
                          <div className="min-h-[32px] p-1.5 bg-white border border-slate-200 rounded flex flex-wrap items-center gap-1">
                            {resumeBankFilters.qualification ? (
                              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium">
                                {resumeBankFilters.qualification}
                                <button onClick={() => setResumeBankFilters({...resumeBankFilters, qualification: ''})} className="text-slate-500 hover:text-slate-800">✕</button>
                              </span>
                            ) : (
                              <input 
                                type="text" 
                                placeholder="Filter qualification..."
                                value={resumeBankFilters.qualification}
                                onChange={e => setResumeBankFilters({...resumeBankFilters, qualification: e.target.value})}
                                className="w-full bg-transparent outline-none text-xs"
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Skills</label>
                          <div className="min-h-[32px] p-1.5 bg-white border border-slate-200 rounded flex flex-wrap items-center gap-1">
                            {resumeBankFilters.skills ? (
                              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium">
                                {resumeBankFilters.skills}
                                <button onClick={() => setResumeBankFilters({...resumeBankFilters, skills: ''})} className="text-slate-500 hover:text-slate-800">✕</button>
                              </span>
                            ) : (
                              <input 
                                type="text" 
                                placeholder="Filter skills..."
                                value={resumeBankFilters.skills}
                                onChange={e => setResumeBankFilters({...resumeBankFilters, skills: e.target.value})}
                                className="w-full bg-transparent outline-none text-xs"
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Gender</label>
                          <Select 
                            value={resumeBankFilters.gender} 
                            onValueChange={val => setResumeBankFilters({...resumeBankFilters, gender: val})}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                              <SelectValue placeholder="Gender (0)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Gender (0)</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 text-[11px]">Contact Number</label>
                          <Input 
                            value={resumeBankFilters.contact} 
                            onChange={e => setResumeBankFilters({...resumeBankFilters, contact: e.target.value})}
                            className="h-8 text-xs bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      {/* Search buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={fetchResumeBankCandidates}
                          className="bg-[#00a8cc] hover:bg-[#008ba8] text-white text-xs font-semibold px-4 py-1.5 rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          🔍 Search
                        </button>
                        <button 
                          onClick={() => {
                            setResumeBankFilters({
                              name: '',
                              email: '',
                              maritalStatus: 'all',
                              qualification: '',
                              skills: '',
                              gender: 'all',
                              contact: ''
                            });
                            fetchResumeBankCandidates();
                          }}
                          className="bg-[#f08b00] hover:bg-[#d47b00] text-white text-xs font-semibold px-4 py-1.5 rounded-xs transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={handleMapCandidates}
                          className="bg-[#e04b40] hover:bg-[#c93b31] text-white text-xs font-semibold px-4 py-1.5 rounded-xs transition-colors cursor-pointer"
                        >
                          Map Candidate
                        </button>
                      </div>

                      {/* Result Table Container */}
                      <div className="bg-white border border-slate-200 rounded p-3 space-y-3 mt-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-800 text-xs">Result</span>
                          <button 
                            onClick={() => toast.info('Exporting resume bank results...')}
                            className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            📥 Export
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
                          <span>Show</span>
                          <select className="border border-slate-200 rounded text-xs px-2 py-1 bg-white">
                            <option value="10000">10000</option>
                            <option value="50">50</option>
                            <option value="10">10</option>
                          </select>
                          <span>entries</span>
                        </div>

                        {/* Results Table or Empty State */}
                        {loadingResumeBank ? (
                          <div className="py-6 text-center text-xs text-slate-500">Searching Resume Bank...</div>
                        ) : resumeBankResults.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                <tr>
                                  <th className="p-2 w-8 text-center">
                                    <input 
                                      type="checkbox" 
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedResumeCandidateIds(resumeBankResults.map(r => r.id));
                                        } else {
                                          setSelectedResumeCandidateIds([]);
                                        }
                                      }}
                                    />
                                  </th>
                                  <th className="p-2 font-bold">Candidate Name</th>
                                  <th className="p-2 font-bold">Email</th>
                                  <th className="p-2 font-bold">Contact</th>
                                  <th className="p-2 font-bold">Qualification</th>
                                  <th className="p-2 font-bold">Experience</th>
                                  <th className="p-2 font-bold">Skills</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {resumeBankResults.map(cand => (
                                  <tr key={cand.id} className="hover:bg-slate-50">
                                    <td className="p-2 text-center">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedResumeCandidateIds.includes(cand.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedResumeCandidateIds(prev => [...prev, cand.id]);
                                          } else {
                                            setSelectedResumeCandidateIds(prev => prev.filter(id => id !== cand.id));
                                          }
                                        }}
                                      />
                                    </td>
                                    <td className="p-2 font-bold text-slate-800">
                                       {cand.fullName || cand.full_name || cand.candidate_name || cand.name || (cand.first_name ? `${cand.first_name} ${cand.last_name || ''}` : 'Candidate')}
                                     </td>
                                     <td className="p-2 text-slate-600">{cand.email || cand.candidate_email || 'N/A'}</td>
                                     <td className="p-2 text-slate-600">{cand.phone || cand.candidate_phone || cand.contact || cand.mobile || 'N/A'}</td>
                                     <td className="p-2 text-slate-600">{cand.qualification || cand.highest_qualification || cand.candidate_qualification || 'N/A'}</td>
                                     <td className="p-2 text-slate-600">
                                       {cand.totalExperienceYears || cand.years_of_experience || cand.experience 
                                         ? `${cand.totalExperienceYears || cand.years_of_experience || cand.experience} yrs` 
                                         : 'N/A'}
                                     </td>
                                     <td className="p-2 text-slate-600">
                                       {Array.isArray(cand.skills) ? cand.skills.join(', ') : (cand.skills || cand.candidate_skills || 'N/A')}
                                     </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-8 bg-slate-50/50 border border-slate-100 text-center text-xs text-slate-500">
                            No data available in table
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span>Showing {resumeBankResults.length > 0 ? 1 : 0} to {resumeBankResults.length} of {resumeBankResults.length} entries</span>
                          <div className="flex items-center gap-2 font-semibold text-slate-600">
                            <button className="hover:text-slate-900 disabled:opacity-50" disabled>Previous</button>
                            <button className="hover:text-slate-900 disabled:opacity-50" disabled>Next</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Applicants Filter Tabs Header */}
                  {(() => {
                    const parseCandidateStatus = (c: any): string => {
                      const raw = String(c.status || c.application_status || c.applicationStatus || c.stage || 'Open').toLowerCase().trim();
                      if (raw.includes('ceo') || raw.includes('approved_by_ceo')) return 'Selected-Approved By CEO';
                      if (raw === 'hired' || raw === 'selected' || raw === 'offer' || raw === 'offered' || raw.includes('hired') || raw.includes('offer') || raw.includes('select')) return 'Selected';
                      if (raw === 'rejected' || raw === 'dropped' || raw === 'withdrawn' || raw.includes('reject')) return 'Rejected';
                      if (raw === 'hold' || raw === 'on_hold' || raw === 'on hold' || raw.includes('hold')) return 'On Hold';
                      if (raw === 'shortlisted' || raw === 'screening' || raw === 'interview' || raw === 'assessment' || raw.includes('shortlist') || raw.includes('screen') || raw.includes('interview') || raw.includes('test')) return 'Shortlisted';
                      return 'Open';
                    };

                    const tabCounts = {
                      All: mrfApplicants.length,
                      Selected: mrfApplicants.filter(a => parseCandidateStatus(a) === 'Selected').length,
                      Rejected: mrfApplicants.filter(a => parseCandidateStatus(a) === 'Rejected').length,
                      'On Hold': mrfApplicants.filter(a => parseCandidateStatus(a) === 'On Hold').length,
                      Open: mrfApplicants.filter(a => parseCandidateStatus(a) === 'Open').length,
                      Shortlisted: mrfApplicants.filter(a => parseCandidateStatus(a) === 'Shortlisted').length,
                      'Selected-Approved By CEO': mrfApplicants.filter(a => parseCandidateStatus(a) === 'Selected-Approved By CEO').length,
                    };

                    const filteredApplicants = mrfApplicants.filter(app => {
                      if (applicantFilterTab === 'All') return true;
                      return parseCandidateStatus(app) === applicantFilterTab;
                    });

                    return (
                      <>
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-600 block">List of Applicants</span>
                          
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {(['All', 'Selected', 'Rejected', 'On Hold', 'Open', 'Shortlisted', 'Selected-Approved By CEO'] as const).map(tabKey => {
                              const isActive = applicantFilterTab === tabKey;
                              const count = tabCounts[tabKey] || 0;
                              return (
                                <button 
                                  key={tabKey}
                                  type="button"
                                  onClick={() => setApplicantFilterTab(tabKey)}
                                  className={cn(
                                    "px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border",
                                    isActive 
                                      ? "bg-black text-white border-black font-bold shadow-2xs" 
                                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  {tabKey} 
                                  <span className={cn(
                                    "text-[10px] rounded-full px-1.5 py-0.2",
                                    isActive ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-800"
                                  )}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Applicants List Table or Empty State */}
                        {loadingApplicants ? (
                          <div className="py-10 bg-slate-50/70 border border-dashed border-slate-200 rounded text-center text-xs text-slate-500">
                            Loading applications...
                          </div>
                        ) : filteredApplicants.length > 0 ? (
                          <div className="overflow-x-auto border border-slate-200 rounded my-2">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                                <tr>
                                  <th className="p-2.5">Candidate Name</th>
                                  {candidateVisibleColumns.map((colKey) => {
                                    const colDef = ALL_CANDIDATE_COLUMNS.find(c => c.key === colKey);
                                    return (
                                      <th key={colKey} className="p-2.5 whitespace-nowrap">
                                        {colDef?.label || colKey}
                                      </th>
                                    );
                                  })}
                                  <th className="p-2.5">Stage Select</th>
                                  <th className="p-2.5">Status</th>
                                  <th className="p-2.5 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredApplicants.map(candidate => {
                                  const name =
                                    candidate.name ||
                                    candidate.candidate_name ||
                                    candidate.fullName ||
                                    candidate.full_name ||
                                    ([candidate.first_name, candidate.last_name].filter(Boolean).join(' ').trim()) ||
                                    candidate.tracker_id ||
                                    'Candidate';
                                  const statusCategory = parseCandidateStatus(candidate);

                                  return (
                                    <tr key={candidate.id} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button 
                                              type="button"
                                              className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left flex items-center gap-1"
                                            >
                                              {name}
                                              <ChevronDown className="w-3 h-3 text-blue-400" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent align="start" className="w-52 p-1.5 text-xs space-y-1 shadow-lg border border-slate-200 bg-white z-[9999]">
                                            <div className="px-2 py-1 bg-slate-50 rounded text-[11px] font-bold text-slate-700 border-b border-slate-100 mb-1">
                                              Candidate Actions: {name}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setSelectedAssessmentId('');
                                                setShowAssignDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <Code2 className="w-3.5 h-3.5 text-blue-600" /> Assign Assessment
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setScheduleRound(1);
                                                setScheduleDate('');
                                                setScheduleMeetingUrl('https://meet.google.com/new');
                                                setShowScheduleDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Schedule Interview
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigate('/hr/recruitment/interviews');
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-amber-50 font-medium text-amber-700 cursor-pointer"
                                            >
                                              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Rate Interview & Feedback
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setOfferPosition(candidate.positionTitle || viewingMrf?.positionTitle || '');
                                                setOfferCtc('');
                                                setOfferBaseSalary('');
                                                setOfferStartDate('');
                                                setOfferExpiryDate('');
                                                setShowOfferDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <FileText className="w-3.5 h-3.5 text-purple-600" /> Generate Offer Letter
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRejectingCandidateInfo(candidate);
                                                setRejectionReason('');
                                                setShowRejectDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-red-50 font-semibold text-red-600 cursor-pointer"
                                            >
                                              <UserX className="w-3.5 h-3.5 text-red-600" /> Reject Candidate
                                            </button>
                                          </PopoverContent>
                                        </Popover>
                                      </td>
                                      {candidateVisibleColumns.map((colKey) => {
                                        let val: string = '-';
                                        if (colKey === 'emailId' || colKey === 'email') {
                                          val = candidate.email || candidate.candidate_email || '-';
                                        } else if (colKey === 'contactNumber' || colKey === 'phone') {
                                          val = candidate.contact || candidate.candidate_phone || candidate.phone || '-';
                                        } else if (colKey === 'totalExperience' || colKey === 'experience') {
                                          const exp = candidate.experience || candidate.candidate_experience || candidate.years_of_experience || candidate.totalExperienceYears || '';
                                          val = exp ? `${exp} yrs` : '-';
                                        } else if (colKey === 'qualification') {
                                          val = candidate.qualification || candidate.candidate_qualification || candidate.highest_qualification || '-';
                                        } else if (colKey === 'university') {
                                          val = candidate.university || candidate.candidate_university || candidate.college || '-';
                                        } else if (colKey === 'maritalStatus') {
                                          val = candidate.maritalStatus || candidate.candidate_marital_status || candidate.marital_status || '-';
                                        } else if (colKey === 'dateOfBirth' || colKey === 'dob') {
                                          val = candidate.dob || candidate.candidate_dob || candidate.dateOfBirth || '-';
                                        } else if (colKey === 'skills') {
                                          val = candidate.skills || candidate.candidate_skills || '-';
                                        } else if (colKey === 'relevantExperience') {
                                          val = candidate.relevantExperience || candidate.relevant_experience || '-';
                                        } else if (colKey === 'currentCompany') {
                                          val = candidate.currentCompany || candidate.candidate_company || candidate.current_company || '-';
                                        } else if (colKey === 'gender') {
                                          val = candidate.gender || candidate.candidate_gender || '-';
                                        } else if (colKey === 'comments') {
                                          val = candidate.comments || candidate.notes || '-';
                                        } else if (colKey === 'name') {
                                          val = candidate.name || candidate.candidate_name || name;
                                        }

                                        return (
                                          <td key={colKey} className="p-2.5 text-slate-600 whitespace-nowrap">
                                            {val}
                                          </td>
                                        );
                                      })}
                                      <td className="p-2.5 whitespace-nowrap min-w-[130px]">
                                        <div className="relative inline-block w-full">
                                          {(() => {
                                            const resolvedStageId = (() => {
                                              if (candidate.pipelineStageId) {
                                                const match = pipelineStages.find(s => Number(s.id) === Number(candidate.pipelineStageId));
                                                if (match) return match.id;
                                              }
                                              const statusLower = (candidate.status || '').toLowerCase().trim();
                                              const matchByName = pipelineStages.find(s => {
                                                const nameLower = (s.stageName || s.stage_name || '').toLowerCase().trim();
                                                if (nameLower === statusLower) return true;
                                                if ((statusLower === 'offer' || statusLower === 'offered') && (nameLower === 'offer' || nameLower === 'offered')) return true;
                                                if ((statusLower.includes('tech') || statusLower.includes('technical')) && (nameLower.includes('tech') || nameLower.includes('technical'))) return true;
                                                if (statusLower.includes('hr') && nameLower.includes('hr')) return true;
                                                return false;
                                              });
                                              return matchByName ? matchByName.id : '';
                                            })();

                                            return (
                                              <select
                                                value={resolvedStageId || ''}
                                                onChange={(e) => {
                                                  const newStageId = Number(e.target.value);
                                                  const appId = candidate.applicationId || candidate.id;
                                                  if (newStageId && appId) {
                                                    handleMoveStage(appId, newStageId);
                                                  }
                                                }}
                                                className="h-7 text-[11px] font-semibold border border-slate-300 rounded bg-white text-slate-800 px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer hover:border-slate-400 w-full"
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
                                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                                        </div>
                                      </td>
                                      <td className="p-2.5 whitespace-nowrap">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                          statusCategory === 'Selected' || statusCategory === 'Selected-Approved By CEO' ? "bg-emerald-100 text-emerald-800" :
                                          statusCategory === 'Rejected' ? "bg-rose-100 text-rose-800" :
                                          statusCategory === 'On Hold' ? "bg-amber-100 text-amber-800" :
                                          statusCategory === 'Shortlisted' ? "bg-purple-100 text-purple-800" :
                                          "bg-blue-100 text-blue-800"
                                        )}>
                                          {candidate.status || candidate.application_status || statusCategory}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-center whitespace-nowrap">
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              className="h-7 text-[11px] font-semibold px-2.5 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                            >
                                              Actions <ChevronDown className="w-3 h-3 text-slate-400" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent align="end" className="w-48 p-1 text-xs space-y-0.5 shadow-md border border-slate-200 bg-white text-slate-800 z-[9999]">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setSelectedAssessmentId('');
                                                setShowAssignDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <Code2 className="w-3.5 h-3.5 text-blue-600" /> Assign Assessment
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setScheduleRound(1);
                                                setScheduleDate('');
                                                setScheduleMeetingUrl('https://meet.google.com/new');
                                                setShowScheduleDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Schedule Interview
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigate('/hr/recruitment/interviews');
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-amber-50 font-medium text-amber-700 cursor-pointer"
                                            >
                                              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Rate Interview & Feedback
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedAppId(candidate.applicationId || candidate.id);
                                                setOfferPosition(candidate.positionTitle || viewingMrf?.positionTitle || '');
                                                setOfferCtc('');
                                                setOfferBaseSalary('');
                                                setOfferStartDate('');
                                                setOfferExpiryDate('');
                                                setShowOfferDialog(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
                                            >
                                              <FileText className="w-3.5 h-3.5 text-purple-600" /> Generate Offer Letter
                                            </button>
                                            {['offer', 'offered'].includes((candidate.status || '').toLowerCase().trim()) && (
                                              <button
                                                type="button"
                                                onClick={() => handleOnboardCandidate(candidate.applicationId || candidate.id)}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-green-50 font-medium text-green-700 cursor-pointer"
                                              >
                                                <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Hire & Onboard
                                              </button>
                                            )}
                                            {candidate.status?.toLowerCase() !== 'rejected' && candidate.status?.toLowerCase() !== 'withdrawn' && (
                                              <>
                                                <div className="my-1 border-t border-slate-100" />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setRejectingCandidateInfo(candidate);
                                                    setRejectionReason('');
                                                    setShowRejectDialog(true);
                                                  }}
                                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-red-50 font-semibold text-red-600 cursor-pointer"
                                                >
                                                  <UserX className="w-3.5 h-3.5 text-red-600" /> Reject Candidate
                                                </button>
                                              </>
                                            )}
                                          </PopoverContent>
                                        </Popover>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-12 bg-slate-50/70 border border-dashed border-slate-200 rounded flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 rounded-full bg-slate-200/80 flex items-center justify-center mb-2 text-slate-400">
                              <User className="w-7 h-7" />
                            </div>
                            <p className="text-xs font-medium text-slate-500">No Applications Found !!.</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Section 3: Action Information */}
              <div className="bg-white rounded border-t-2 border-t-[#258cc1] border-x border-b border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 space-y-4">
                  {/* Section Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#258cc1]/10 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-[#258cc1]" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">Action Information</h3>
                      {mrfActionLogs.length > 0 && (
                        <span className="text-[10px] font-bold bg-[#258cc1]/10 text-[#258cc1] px-2 py-0.5 rounded-full">
                          {mrfActionLogs.length} {mrfActionLogs.length === 1 ? 'entry' : 'entries'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setActionStatus('Choose');
                        setActionComment('');
                        setIsAddActionModalOpen(true);
                      }}
                      className="bg-[#258cc1] hover:bg-[#1d74a3] text-white text-[11px] font-bold px-3 py-1.5 rounded-md shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3 h-3" /> Add Action
                    </button>
                  </div>

                  {/* Timeline log entries or empty state */}
                  {loadingActionLogs ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#258cc1] border-t-transparent rounded-full animate-spin" />
                      Loading action history...
                    </div>
                  ) : mrfActionLogs.length > 0 ? (
                    <div className="relative pl-5">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[9px] top-3 bottom-3 w-px bg-slate-200" />

                      <div className="space-y-4">
                        {mrfActionLogs.map((log: any, idx: number) => {
                          const statusRaw = (log.action || '').toLowerCase();
                          const isApproved  = statusRaw.includes('approv');
                          const isRejected  = statusRaw.includes('reject');
                          const isPending   = statusRaw.includes('pending');
                          const isCompleted = statusRaw.includes('complet') || statusRaw.includes('hired') || statusRaw.includes('closed');

                          const dotColor   = isApproved  ? 'bg-emerald-500 ring-emerald-100'
                                           : isRejected  ? 'bg-rose-500 ring-rose-100'
                                           : isPending   ? 'bg-amber-400 ring-amber-100'
                                           : isCompleted ? 'bg-indigo-500 ring-indigo-100'
                                           : 'bg-[#258cc1] ring-blue-100';

                          const badgeColor = isApproved  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                           : isRejected  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                           : isPending   ? 'bg-amber-50 text-amber-700 border-amber-200'
                                           : isCompleted ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                           : 'bg-blue-50 text-blue-700 border-blue-200';

                          const actorName = log.approver_name || log.acted_by || 'HR Admin';
                          const initials  = actorName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

                          const dateStr = log.acted_at || log.created_at;
                          const formattedDate = dateStr
                            ? new Date(dateStr).toLocaleString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })
                            : '—';

                          return (
                            <div key={log.id || idx} className="relative flex gap-3">
                              {/* Timeline dot */}
                              <div className={`w-[18px] h-[18px] rounded-full shrink-0 ring-4 mt-1.5 z-10 ${dotColor}`} />

                              {/* Card */}
                              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 hover:shadow-sm transition-shadow">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  {/* Status badge */}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                    {log.action || 'Updated'}
                                  </span>
                                  {/* Date */}
                                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{formattedDate}</span>
                                </div>

                                {/* Comment bubble */}
                                {log.comment && (
                                  <div className="text-[11px] text-slate-600 bg-white border border-slate-100 rounded px-2.5 py-1.5 leading-relaxed">
                                    💬 {log.comment}
                                  </div>
                                )}

                                {/* Actor row */}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <div className="w-5 h-5 rounded-full bg-[#258cc1] text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                    {initials}
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-medium">by <span className="text-slate-700 font-bold">{actorName}</span></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/60">
                      <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-500">No action history yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click "+ Add Action" to log the first action</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Table Settings Config Modal ────────────────────────── */}
      <Dialog open={isFieldsModalOpen} onOpenChange={setIsFieldsModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-xl shadow-2xl p-6 text-slate-700 mrf-dialog-compact">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <DialogTitle className="text-sm font-bold text-slate-800">
              Table Settings For MRF Request Form
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 flex justify-between items-start gap-4">
            
            {/* Left Box (Visible columns / Main block) */}
            <div className="flex flex-col gap-1.5 flex-1">
              <select
                multiple
                size={10}
                value={selectedLeft}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedLeft(options);
                }}
                style={{ minHeight: '220px', padding: '8px' }}
                className="w-full border border-slate-300 rounded text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
              >
                {tempVisible.map((key) => {
                  const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === key);
                  return (
                    <option key={key} value={key} className="p-1.5 cursor-pointer hover:bg-slate-100 rounded">
                      {col?.label || key}
                    </option>
                  );
                })}
              </select>
              
              {/* Up and Down buttons positioned below the left box */}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleMoveUp}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={handleMoveDown}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Down
                </button>
              </div>
            </div>

            {/* Move arrow buttons (Between Left and Right Boxes) */}
            <div className="flex flex-col gap-2 self-center mt-[-30px]">
              <button
                type="button"
                onClick={() => {
                  if (selectedLeft.length === 0) return;
                  const newVis = tempVisible.filter(k => !selectedLeft.includes(k));
                  setTempVisible(newVis);
                  setTempHidden(ALL_CONFIGURABLE_COLUMNS.map(c => c.key).filter(k => !newVis.includes(k)));
                  setSelectedLeft([]);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
              >
                &gt;&gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedRight.length === 0) return;
                  const newVis = [...tempVisible, ...selectedRight];
                  setTempVisible(newVis);
                  setTempHidden(ALL_CONFIGURABLE_COLUMNS.map(c => c.key).filter(k => !newVis.includes(k)));
                  setSelectedRight([]);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
              >
                &lt;&lt;
              </button>
            </div>

            {/* Right Box (Available but hidden columns) */}
            <div className="flex flex-col gap-1.5 flex-1">
              <select
                multiple
                size={10}
                value={selectedRight}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedRight(options);
                }}
                style={{ minHeight: '220px', padding: '8px' }}
                className="w-full border border-slate-300 rounded text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
              >
                {tempHidden.map((key) => {
                  const col = ALL_CONFIGURABLE_COLUMNS.find(c => c.key === key);
                  return (
                    <option key={key} value={key} className="p-1.5 cursor-pointer hover:bg-slate-100 rounded">
                      {col?.label || key}
                    </option>
                  );
                })}
              </select>
              
              {/* Right side alignment gap placeholder */}
              <div className="h-[28px] mt-1" />
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveColumns}
              className="bg-[#12b060] hover:bg-[#0f9a53] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Table Settings For MRF Candidate Form Config Modal ────────────────────────── */}
      <Dialog open={isCandidateModalOpen} onOpenChange={setIsCandidateModalOpen}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-xl shadow-2xl p-6 text-slate-700 mrf-dialog-compact">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <DialogTitle className="text-sm font-bold text-slate-800">
              Table Settings For MRF Candidate Form
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 flex justify-between items-start gap-4">
            
            {/* Left Box (Visible columns / Main block) */}
            <div className="flex flex-col gap-1.5 flex-1">
              <select
                multiple
                size={10}
                value={selectedCandidateLeft}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedCandidateLeft(options);
                }}
                style={{ minHeight: '220px', padding: '8px' }}
                className="w-full border border-slate-300 rounded text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
              >
                {tempCandidateVisible.map((key) => {
                  const col = ALL_CANDIDATE_COLUMNS.find(c => c.key === key);
                  return (
                    <option key={key} value={key} className="p-1.5 cursor-pointer hover:bg-slate-100 rounded">
                      {col?.label || key}
                    </option>
                  );
                })}
              </select>
              
              {/* Up and Down buttons positioned below the left box */}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleMoveCandidateUp}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={handleMoveCandidateDown}
                  className="px-3.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
                >
                  Down
                </button>
              </div>
            </div>

            {/* Move arrow buttons (Between Left and Right Boxes) */}
            <div className="flex flex-col gap-2 self-center mt-[-30px]">
              <button
                type="button"
                onClick={() => {
                  if (selectedCandidateLeft.length === 0) return;
                  const newVis = tempCandidateVisible.filter(k => !selectedCandidateLeft.includes(k));
                  setTempCandidateVisible(newVis);
                  setTempCandidateHidden(ALL_CANDIDATE_COLUMNS.map(c => c.key).filter(k => !newVis.includes(k)));
                  setSelectedCandidateLeft([]);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
              >
                &gt;&gt;
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedCandidateRight.length === 0) return;
                  const newVis = [...tempCandidateVisible, ...selectedCandidateRight];
                  setTempCandidateVisible(newVis);
                  setTempCandidateHidden(ALL_CANDIDATE_COLUMNS.map(c => c.key).filter(k => !newVis.includes(k)));
                  setSelectedCandidateRight([]);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm transition-colors cursor-pointer"
              >
                &lt;&lt;
              </button>
            </div>

            {/* Right Box (Available but hidden columns) */}
            <div className="flex flex-col gap-1.5 flex-1">
              <select
                multiple
                size={10}
                value={selectedCandidateRight}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedCandidateRight(options);
                }}
                style={{ minHeight: '220px', padding: '8px' }}
                className="w-full border border-slate-300 rounded text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
              >
                {tempCandidateHidden.map((key) => {
                  const col = ALL_CANDIDATE_COLUMNS.find(c => c.key === key);
                  return (
                    <option key={key} value={key} className="p-1.5 cursor-pointer hover:bg-slate-100 rounded">
                      {col?.label || key}
                    </option>
                  );
                })}
              </select>
              
              {/* Right side alignment gap placeholder */}
              <div className="h-[28px] mt-1" />
            </div>

          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSaveCandidateColumns}
              className="bg-[#12b060] hover:bg-[#0f9a53] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── User Creation Fields Mapping Modal ────────────────────────── */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white rounded-xl shadow-2xl p-6 text-slate-700 mrf-dialog-compact">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <DialogTitle className="text-sm font-bold text-slate-800">
              User Creation Fields Mapping
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable list container matching screenshots */}
          <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3.5 relative">
            {tempMappings.map((mapping, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 text-xs font-semibold">
                
                {/* User Field Label */}
                <span className="text-slate-700 w-[180px] select-none text-left font-bold truncate">
                  {mapping.userField}
                </span>

                {/* Candidate Field Select Dropdown */}
                <select
                  value={mapping.candidateField}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setTempMappings(prev => {
                      const updated = [...prev];
                      updated[idx].candidateField = newVal;
                      return updated;
                    });
                  }}
                  className="w-60 h-9 border border-slate-300 rounded px-2 text-slate-600 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer"
                >
                  <option value="">---Select Candidate Field--</option>
                  {ALL_CANDIDATE_COLUMNS.map((candidateCol) => (
                    <option key={candidateCol.key} value={candidateCol.key}>
                      {candidateCol.label}
                    </option>
                  ))}
                </select>

              </div>
            ))}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-center mt-4">
            <button
              type="button"
              onClick={handleSaveMappings}
              className="bg-[#12b060] hover:bg-[#0f9a53] text-white px-6 py-2 rounded text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              + Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Candidate Form Field Keywords Map Modal ────────────────────────── */}
      <Dialog open={isKeywordsModalOpen} onOpenChange={setIsKeywordsModalOpen}>
        <DialogContent className="sm:max-w-[580px] bg-white rounded-xl shadow-2xl p-6 text-slate-700 mrf-dialog-compact">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <DialogTitle className="text-sm font-bold text-slate-800">
              Candidate Form Field Keywords Map
            </DialogTitle>
          </DialogHeader>

          {/* Form Header labels matching mockup */}
          <div className="flex justify-between items-center text-xs text-slate-800 font-bold mb-3 px-1">
            <span>Candidate Fields</span>
            <span className="w-[320px] text-left text-slate-700 font-bold">
              Enter Keywords in textarea relevant to field in comma separated format
            </span>
          </div>

          {/* Scrollable List Container */}
          <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4 relative">
            {ALL_CANDIDATE_COLUMNS.map((candidateCol) => {
              const fieldKey = candidateCol.key;
              const tags = tempKeywords[fieldKey] || [];
              return (
                <div key={fieldKey} className="flex items-start justify-between gap-4 text-xs">
                  
                  {/* Left Column: Candidate Field Name */}
                  <span className="text-slate-700 w-[180px] font-bold text-left pt-2">
                    {candidateCol.label}
                  </span>

                  {/* Right Column: Tags-Input Container */}
                  <div className="w-[320px] border border-slate-300 rounded p-1.5 min-h-[44px] flex flex-wrap gap-1.5 bg-white items-center focus-within:ring-1 focus-within:ring-slate-400 cursor-text">
                    
                    {/* Tag Pills */}
                    {tags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm select-none"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(fieldKey, tag)}
                          className="text-slate-400 hover:text-slate-650 font-extrabold focus:outline-none cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {/* Inline Tag Input */}
                    <input
                      type="text"
                      placeholder={tags.length === 0 ? "Type keyword & press comma..." : ""}
                      onKeyDown={(e) => {
                        if (e.key === ',' || e.key === 'Enter') {
                          e.preventDefault();
                          const inputVal = e.currentTarget.value;
                          handleAddTag(fieldKey, inputVal);
                          e.currentTarget.value = '';
                        } else if (e.key === 'Backspace' && !e.currentTarget.value && tags.length > 0) {
                          // Remove last tag on Backspace
                          handleRemoveTag(fieldKey, tags[tags.length - 1]);
                        }
                      }}
                      onBlur={(e) => {
                        const inputVal = e.target.value;
                        if (inputVal) {
                          handleAddTag(fieldKey, inputVal);
                          e.target.value = '';
                        }
                      }}
                      className="flex-1 min-w-[70px] bg-transparent border-none outline-none text-xs text-slate-700 h-6 p-0"
                    />

                  </div>

                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-center mt-4">
            <button
              type="button"
              onClick={handleSaveKeywords}
              className="bg-[#12b060] hover:bg-[#0f9a53] text-white px-8 py-1.5 rounded text-xs font-bold shadow-sm transition-colors cursor-pointer mx-auto"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANDIDATE APPLICATION MODAL */}
      <Dialog open={isAddCandidateModalOpen} onOpenChange={setIsAddCandidateModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-800">
              Job Application for {viewingMrf?.positionTitle || 'HR EXECUTIVE'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCandidate} className="space-y-4 pt-4 text-xs font-sans text-slate-700">
            {/* ROW 1: Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Name <span className="text-red-500">*</span></label>
              <Input 
                value={candidateFormData.name} 
                onChange={e => setCandidateFormData({...candidateFormData, name: e.target.value})} 
                className="h-9 text-xs border-slate-200" 
                required 
              />
            </div>

            {/* ROW 2: Date of Birth & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                <Input 
                  type="date"
                  value={candidateFormData.dob} 
                  onChange={e => setCandidateFormData({...candidateFormData, dob: e.target.value})} 
                  className="h-9 text-xs border-slate-200" 
                  placeholder="Y-m-d"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Gender <span className="text-red-500">*</span></label>
                <Select value={candidateFormData.gender} onValueChange={(val) => setCandidateFormData({...candidateFormData, gender: val})}>
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
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

            {/* ROW 3: Email Id & Contact Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Id</label>
                <Input 
                  type="email"
                  value={candidateFormData.email} 
                  onChange={e => setCandidateFormData({...candidateFormData, email: e.target.value})} 
                  className="h-9 text-xs border-slate-200" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Number</label>
                <div className="flex gap-2">
                  <Select value={candidateFormData.contactType} onValueChange={(val) => setCandidateFormData({...candidateFormData, contactType: val})}>
                    <SelectTrigger className="h-9 text-xs w-28 border-slate-200 bg-white">
                      <SelectValue placeholder="Mobile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={candidateFormData.contact} 
                    onChange={e => setCandidateFormData({...candidateFormData, contact: e.target.value})} 
                    className="h-9 text-xs flex-1 border-slate-200" 
                  />
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1 mt-4">Address</div>

            {/* Address Line 1 & Address Line 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Address Line 1</label>
                <Input value={candidateFormData.address1} onChange={e => setCandidateFormData({...candidateFormData, address1: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Address Line 2</label>
                <Input value={candidateFormData.address2} onChange={e => setCandidateFormData({...candidateFormData, address2: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* Country & Zipcode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Country</label>
                <Select value={candidateFormData.country} onValueChange={(val) => setCandidateFormData({...candidateFormData, country: val})}>
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Choose">Choose</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Zipcode</label>
                <Input value={candidateFormData.zipcode} onChange={e => setCandidateFormData({...candidateFormData, zipcode: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* State & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">State</label>
                <Input value={candidateFormData.state} onChange={e => setCandidateFormData({...candidateFormData, state: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">City</label>
                <Input value={candidateFormData.city} onChange={e => setCandidateFormData({...candidateFormData, city: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* Marital Status & Current Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Marital Status</label>
                <Select value={candidateFormData.maritalStatus} onValueChange={(val) => setCandidateFormData({...candidateFormData, maritalStatus: val})}>
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Unmarried" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unmarried">Unmarried</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Current Company</label>
                <Input value={candidateFormData.company} onChange={e => setCandidateFormData({...candidateFormData, company: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* Qualification & University */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Qualification</label>
                <Input value={candidateFormData.qualification} onChange={e => setCandidateFormData({...candidateFormData, qualification: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">University</label>
                <Input value={candidateFormData.university} onChange={e => setCandidateFormData({...candidateFormData, university: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* Relevant Experience & Total Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Relevant Experience</label>
                <Input value={candidateFormData.relevantExp} onChange={e => setCandidateFormData({...candidateFormData, relevantExp: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Total Experience</label>
                <Input value={candidateFormData.totalExp} onChange={e => setCandidateFormData({...candidateFormData, totalExp: e.target.value})} className="h-9 text-xs border-slate-200" />
              </div>
            </div>

            {/* Upload Signature & Upload Resume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block border-b border-slate-200 pb-1">Upload Signature</label>
                <div className="pt-1">
                  <Input type="file" accept="image/*" className="h-9 text-xs border-slate-200" />
                  <div className="text-[10px] text-slate-400 mt-1">(Min Size - 0 MB and Max Size - 1 MB)</div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block border-b border-slate-200 pb-1">Upload Resume</label>
                <div className="pt-1">
                  <Input type="file" accept=".pdf,.doc,.docx" className="h-9 text-xs border-slate-200" />
                  <div className="text-[10px] text-slate-400 mt-1">(Min Size - 0 MB and Max Size - 5 MB)</div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddCandidateModalOpen(false)} className="h-9 text-xs px-5">
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-xs px-6 bg-[#1b84bf] hover:bg-[#156ea3] text-white font-bold">
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADD ACTION MODAL DIALOG */}
      <Dialog open={isAddActionModalOpen} onOpenChange={setIsAddActionModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-white rounded-lg shadow-2xl p-5 border border-slate-200">
          <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-slate-800">
              Add Action
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAction} className="space-y-4 pt-4 text-xs font-sans text-slate-700">
            {/* Status Field */}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="font-bold text-slate-800 text-xs">
                Status<span className="text-red-500">*</span>
              </label>
              <div className="col-span-2">
                <Select value={actionStatus} onValueChange={setActionStatus}>
                  <SelectTrigger className="h-9 text-xs border-slate-300 bg-white">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]">
                    <SelectItem value="Choose">Choose</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Requested">Requested</SelectItem>
                    <SelectItem value="WIP">WIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comment Field */}
            <div className="grid grid-cols-3 items-start gap-2 pt-2">
              <label className="font-bold text-slate-700 text-xs pt-2">
                Comment
              </label>
              <div className="col-span-2">
                <textarea
                  value={actionComment}
                  onChange={e => setActionComment(e.target.value)}
                  placeholder="Enter comments here"
                  className="w-full min-h-[80px] p-2 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 py-1.5 rounded text-xs shadow-sm transition-colors cursor-pointer"
              >
                Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Assessment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[425px] z-[99999]">
          <DialogHeader>
            <DialogTitle>Assign Online Assessment</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select an assessment profile to assign to the candidate.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignAssessmentSubmit} className="space-y-4 py-4 text-xs">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Select Test Profile</label>
              <select
                value={selectedAssessmentId}
                onChange={e => setSelectedAssessmentId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none"
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
              <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)} disabled={submittingAction} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {submittingAction ? 'Assigning...' : 'Assign & Send Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Link Assigned Success Dialog */}
      <Dialog open={Boolean(assignedTestUrl)} onOpenChange={(open) => !open && setAssignedTestUrl(null)}>
        <DialogContent className="sm:max-w-[480px] z-[99999]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Test Assigned & Email Sent
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              An automated email with the test link has been dispatched to the candidate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
              <p className="font-semibold">📧 Candidate Email Notification Sent!</p>
              <p className="text-[11px] mt-0.5 text-green-700">
                The candidate will receive the test invitation in their email and can click "Start Assessment" to begin.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Direct Assessment Link (Copy to Share)</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={assignedTestUrl || ''}
                  className="h-8 text-xs font-mono bg-slate-100 text-slate-700"
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

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto z-[99999]">
          <DialogHeader>
            <DialogTitle>Schedule Interview Round</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set date, time, assigned interviewer, and dispatch invitations.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleInterviewSubmit} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Interview Type</label>
                <select
                  value={scheduleType}
                  onChange={e => setScheduleType(e.target.value)}
                  className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs text-slate-800"
                >
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="HR Screening">HR Screening</option>
                  <option value="Managerial Round">Managerial Round</option>
                  <option value="Final CEO Round">Final CEO Round</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Interview Round</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={scheduleRound}
                  onChange={e => setScheduleRound(Number(e.target.value))}
                  className="h-8 text-xs bg-white border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Scheduled Date & Time <span className="text-red-500">*</span></label>
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-300"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Duration (Minutes)</label>
                <Input
                  type="number"
                  value={scheduleDuration}
                  onChange={e => setScheduleDuration(Number(e.target.value))}
                  className="h-8 text-xs bg-white border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Meeting Link / Google Meet</label>
              <Input
                value={scheduleMeetingUrl}
                onChange={e => setScheduleMeetingUrl(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Assigned Interviewer</label>
              <select
                value={scheduleInterviewerId}
                onChange={e => setScheduleInterviewerId(e.target.value)}
                className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs text-slate-800"
              >
                <option value="">Select Interviewer...</option>
                {getDepartmentManagers((viewingMrf as any)?.department || (viewingMrf as any)?.departmentName || (viewingMrf as any)?.departmentId).map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.designation || emp.departmentName || emp.department || 'Manager'})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={submittingAction} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {submittingAction ? 'Scheduling...' : 'Schedule & Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto z-[99999]">
          <DialogHeader>
            <DialogTitle>Generate & Email Offer Letter</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure candidate offer terms and dispatch offer invitation email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendOfferSubmit} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">Position Title</label>
                <Input 
                  value={offerPosition} 
                  onChange={e => setOfferPosition(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="h-8 text-xs bg-white border-slate-300"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Cost to Company (CTC)</label>
                <Input 
                  type="number"
                  value={offerCtc} 
                  onChange={e => setOfferCtc(e.target.value)}
                  placeholder="CTC amount"
                  className="h-8 text-xs bg-white border-slate-300"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Base Salary</label>
                <Input 
                  type="number"
                  value={offerBaseSalary} 
                  onChange={e => setOfferBaseSalary(e.target.value)}
                  placeholder="Base Salary"
                  className="h-8 text-xs bg-white border-slate-300"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Joining Date</label>
                <Input 
                  type="date"
                  value={offerStartDate} 
                  onChange={e => setOfferStartDate(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-300"
                  disabled={submittingAction}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Offer Expiry Date</label>
                <Input 
                  type="date"
                  value={offerExpiryDate} 
                  onChange={e => setOfferExpiryDate(e.target.value)}
                  className="h-8 text-xs bg-white border-slate-300"
                  disabled={submittingAction}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowOfferDialog(false)} disabled={submittingAction} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {submittingAction ? 'Generating...' : 'Generate & Send Offer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Candidate Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px] z-[99999]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 font-bold">Reject Candidate</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide rejection comments and send optional regret email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRejectSubmit} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason for rejecting this candidate..."
                className="w-full min-h-[70px] p-2 text-xs border border-slate-300 rounded bg-white"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)} disabled={submittingAction} className="text-xs h-8">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingAction} className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                {submittingAction ? 'Rejecting...' : 'Confirm Reject & Send Email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
};
