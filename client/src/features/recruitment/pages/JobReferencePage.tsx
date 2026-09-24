import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Building2, Briefcase, User, Clock,
  ArrowLeft, FileText, ExternalLink, FileUp,
  GraduationCap, Users, ChevronRight, Sparkles, X, ChevronDown, Calendar,
  AlertCircle, AlertTriangle, CheckCircle2, Loader2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/lib/api';
import { formatApiError } from '@/lib/apiError';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type ModalType = 'main' | 'existing_refer' | 'new_options' | 'new_form' | null;

interface FilterData {
  departments: { id: number; name: string; code?: string }[];
  designations: { id: number; name: string }[];
  employmentTypes: string[];
}

interface Opening {
  id: number;
  mr_number: string;
  position_title: string;
  number_of_positions: number;
  department_id: number;
  department_name: string;
  designation_name: string;
  employment_type: string;
  qualification_required: string;
  experience_desired: string;
  skills: string[] | string;
  job_description: string;
  target_closure_date: string | null;
  created_at: string;
}

export const JobReferencePage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [positionTitle, setPositionTitle] = useState('');
  const [mrfData, setMrfData] = useState<any>(null);
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(true);
  const [openingsLoading, setOpeningsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [filterData, setFilterData] = useState<FilterData>({ departments: [], designations: [], employmentTypes: [] });
  const [searchText, setSearchText] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // Openings
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [totalOpenings, setTotalOpenings] = useState(0);

  // Apply modal target MRF
  const [applyTargetMrf, setApplyTargetMrf] = useState<Opening | null>(null);

  // Job Details / Full JD modal state
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Opening | null>(null);

  // Existing candidate reference states
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [candidatesList, setCandidatesList] = useState<{ id: number; name: string }[]>([]);

  // Candidate Registration form fields states
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'Male',
    emailId: '',
    contactType: 'Mobile',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    country: 'Choose',
    zipcode: '',
    state: '',
    city: '',
    maritalStatus: 'Unmarried',
    currentCompany: '',
    qualification: '',
    university: '',
    relevantExperience: '',
    totalExperience: '',
    skills: '',
    comments: ''
  });

  // File upload refs
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const directResumeInputRef = useRef<HTMLInputElement>(null);

  const [uploadedResumeName, setUploadedResumeName] = useState('');
  const [uploadedResumeBase64, setUploadedResumeBase64] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const { user } = useAuthStore();
  const orgId = user?.organizationId || 1;

  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Guest'
    : 'Guest';
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'G'
    : 'G';

  // Portal Customization Settings
  const [portalSettings, setPortalSettings] = useState<any>({
    portalTitle: 'Career Portal',
    portalTagline: 'Find Your Next Opportunity',
    bannerDescription: 'Explore open roles, apply directly, or submit a referral application.',
    companyLogoUrl: '',
    primaryColor: '#4f46e5',
    showAccountInfo: false,
    showBackToHrms: true,
    copyrightText: `© ${new Date().getFullYear()} HRMS Career Portal. All rights reserved.`,
    formFieldsConfig: {},
  });

  const isFieldEnabled = (fieldKey: string, defaultVal: boolean = true) => {
    const cfg = portalSettings?.formFieldsConfig?.[fieldKey];
    if (!cfg) return defaultVal;
    return cfg.enabled !== false;
  };

  const isFieldRequired = (fieldKey: string, defaultVal: boolean = false) => {
    const cfg = portalSettings?.formFieldsConfig?.[fieldKey];
    if (!cfg) return defaultVal;
    return cfg.required === true;
  };

  // ────── Fetch Portal Settings ──────
  useEffect(() => {
    const fetchPortalSettings = async () => {
      try {
        const res = await apiClient.get('/public/job-portal/settings');
        if (res.data?.success && res.data.data) {
          setPortalSettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load public portal settings', err);
      }
    };
    fetchPortalSettings();
  }, []);

  // ────── Fetch MRF data for this specific reference ──────
  useEffect(() => {
    const fetchJobReference = async () => {
      if (!requestId) return;
      try {
        setLoading(true);
        const response = await apiClient.get(`/public/job-reference/${requestId}`);
        if (response.data?.success) {
          const mrf = response.data.data;
          setMrfData(mrf);
          const title = mrf?.positionTitle || mrf?.position_title;
          if (title) {
            setPositionTitle(title);
          }
        }
      } catch (err) {
        console.error('Failed to load public job reference data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobReference();
  }, [requestId]);

  // ────── Fetch filter data ──────
  useEffect(() => {
    const params: any = {};
    if (user?.organizationId) params.organizationId = user.organizationId;

    apiClient.get('/public/job-portal/filters', { params })
      .then(res => {
        if (res.data?.success && res.data.data) {
          setFilterData(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load portal filters', err);
      });
  }, [user?.organizationId]);

  // ────── Fetch openings (re-fetch on filter change) ──────
  useEffect(() => {
    const fetchOpenings = async () => {
      setOpeningsLoading(true);
      try {
        const params: any = {};
        const effectiveOrgId = user?.organizationId || mrfData?.organizationId || mrfData?.organization_id;
        if (effectiveOrgId) params.organizationId = effectiveOrgId;
        if (selectedDept && selectedDept !== 'All') params.departmentName = selectedDept;
        if (selectedType && selectedType !== 'All') params.employmentType = selectedType;
        if (activeTab !== 'All') params.employmentType = activeTab;
        if (searchText.trim()) params.search = searchText.trim();

        const res = await apiClient.get('/public/job-portal/openings', { params });
        if (res.data?.success) {
          const list = res.data.data || [];
          setOpenings(list);
          setTotalOpenings(res.data.meta?.total || list.length || 0);
        }
      } catch (err) {
        console.error('Failed to load job openings', err);
        setOpenings([]);
      } finally {
        setOpeningsLoading(false);
      }
    };
    fetchOpenings();
  }, [user?.organizationId, mrfData?.organizationId, mrfData?.organization_id, selectedDept, selectedType, activeTab, searchText]);

  // ────── Fetch candidates list (only candidates with uploaded resumes) ──────
  useEffect(() => {
    const params: any = {};
    if (user?.organizationId) params.organizationId = user.organizationId;
    apiClient.get('/public/job-portal/candidates', { params })
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setCandidatesList(res.data.data);
        }
      })
      .catch(() => {
        apiClient.get('/recruitment/candidates', { params: { pageSize: 200 } })
          .then(res => {
            if (res.data?.success && Array.isArray(res.data.data)) {
              const list = res.data.data
                .filter((c: any) => c.resumeUrl || c.resume_url || c.resume_bank_id)
                .map((c: any) => ({
                  id: c.id,
                  name: `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim(),
                  email: c.email,
                })).filter((c: any) => c.name);
              setCandidatesList(list);
            }
          })
          .catch(() => {});
      });
  }, [user?.organizationId]);

  // Displayed openings directly from the backend published openings
  const displayedOpenings = useMemo(() => {
    return openings;
  }, [openings]);

  const handleBackToHrms = () => {
    const roles = user?.roles || [];
    if (roles.includes('super_admin')) navigate('/superadmin/dashboard');
    else if (roles.includes('hr') || roles.includes('hr_admin') || roles.includes('hr_manager')) navigate('/dashboard');
    else if (roles.includes('department_head') || roles.includes('manager')) navigate('/manager/dashboard');
    else if (roles.includes('team_lead')) navigate('/team-lead/dashboard');
    else if (roles.includes('intern')) navigate('/intern/dashboard');
    else if (roles.includes('consultant')) navigate('/consultant/dashboard');
    else if (roles.includes('organization_admin')) navigate('/dashboard');
    else navigate('/employee/dashboard');
  };

  const handleApplyClick = (opening: Opening) => {
    setApplyTargetMrf(opening);
    setCurrentModal('main');
  };

  const activeMrfId = applyTargetMrf?.mr_number || applyTargetMrf?.id || requestId || '';

  const handleReferExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) {
      toast.error('Please select an existing candidate to refer');
      return;
    }
    try {
      const response = await apiClient.post(`/public/job-reference/${activeMrfId}/refer-existing`, {
        candidateId: parseInt(selectedCandidate, 10),
        referringEmployeeId: user?.employeeId || undefined,
      });
      if (response.data?.success) {
        toast.success('Referral submitted successfully!');
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Referral Submitted!',
          message: 'The candidate referral has been registered successfully in the system database.',
        });
        setCurrentModal(null);
        setSelectedCandidate('');
      } else {
        const msg = response.data?.message || 'Failed to refer candidate';
        toast.error(msg);
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Referral Error',
          message: msg,
        });
      }
    } catch (err: any) {
      const errMsg = formatApiError(err, 'Server error while submitting referral');
      toast.error(`Referral Error: ${errMsg}`);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Referral Failed',
        message: errMsg,
      });
    }
  };

  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Full Name Validation
    const trimmedName = candidateForm.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Candidate Full Name is required (minimum 2 characters)');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Full Name Required',
        message: 'Please enter a valid candidate full name with at least 2 characters before submitting.',
      });
      return;
    }

    // 2. Email Address Validation
    const trimmedEmail = candidateForm.emailId.trim();
    if (!trimmedEmail) {
      toast.error('Email Address is mandatory');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Email Address Required',
        message: 'Please enter your email address so we can contact you regarding your application status.',
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Invalid Email Address format');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Invalid Email Format',
        message: 'Please provide a valid email format (e.g., candidate@example.com).',
      });
      return;
    }

    // 3. Contact Number Validation
    if (candidateForm.contactNumber.trim()) {
      const cleanPhone = candidateForm.contactNumber.replace(/[\s\-\+\(\)]/g, '');
      if (cleanPhone.length < 7 || !/^\d+$/.test(cleanPhone)) {
        toast.error('Invalid Contact Number. Please enter a valid phone number.');
        setStatusModal({
          isOpen: true,
          type: 'warning',
          title: 'Validation: Invalid Phone Number',
          message: 'Contact number should contain at least 7 digits (e.g., +91 9876543210).',
        });
        return;
      }
    }

    // 4. Resume File Validation (Mandatory Document)
    if (!uploadedResumeBase64) {
      toast.error('Candidate Resume document is required!');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Resume Upload Required',
        message: 'Please upload your candidate resume file (PDF, DOC, or DOCX, max 5 MB) before submitting your application.',
      });
      return;
    }

    // 5. Configurable Field Validations
    if (isFieldRequired('dateOfBirth') && !candidateForm.dateOfBirth) {
      toast.error('Date of Birth is a required field');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Date of Birth Required',
        message: 'Please select your Date of Birth.',
      });
      return;
    }
    if (isFieldRequired('qualification') && !candidateForm.qualification.trim()) {
      toast.error('Highest Qualification is a required field');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Qualification Required',
        message: 'Please provide your highest academic or professional qualification.',
      });
      return;
    }
    if (isFieldRequired('skills') && !candidateForm.skills.trim()) {
      toast.error('Key Skills is a required field');
      setStatusModal({
        isOpen: true,
        type: 'warning',
        title: 'Validation: Key Skills Required',
        message: 'Please enter key technical or professional skills (comma separated).',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveOrgId = mrfData?.organizationId || mrfData?.organization_id || user?.organizationId || 1;
      const targetPosition = applyTargetMrf?.position_title || mrfData?.position_title || positionTitle || 'QA Engineer';

      const response = await apiClient.post(`/public/job-reference/${activeMrfId}/apply`, {
        ...candidateForm,
        name: trimmedName,
        emailId: trimmedEmail,
        positionTitle: targetPosition,
        position: targetPosition,
        source: 'External',
        organizationId: effectiveOrgId,
        resumeUrl: uploadedResumeBase64 || undefined,
        referringEmployeeId: undefined,
      });

      if (response.data?.success) {
        toast.success('Application submitted successfully!');
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Application Submitted Successfully!',
          message: `Congratulations! Your job application for "${targetPosition}" has been received and added to Candidate Management. Our HR recruitment team will review your profile shortly.`,
        });
        setCurrentModal(null);
        setCandidateForm({
          name: '', dateOfBirth: '', gender: 'Male', emailId: '', contactType: 'Mobile',
          contactNumber: '', addressLine1: '', addressLine2: '', country: 'Choose',
          zipcode: '', state: '', city: '', maritalStatus: 'Unmarried', currentCompany: '',
          qualification: '', university: '', relevantExperience: '', totalExperience: '',
          skills: '', comments: ''
        });
        setUploadedResumeName('');
        setUploadedResumeBase64(null);
      } else {
        const msg = response.data?.message || response.data?.error || 'Failed to submit application';
        toast.error(msg);
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Application Submission Notice',
          message: msg,
        });
      }
    } catch (err: any) {
      const errMsg = formatApiError(err, 'Unable to submit your application. Please verify your form details and try again.');
      toast.error(`Application Notice: ${errMsg}`);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Application Notice',
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resume file size exceeds 5 MB limit. Please select a smaller file.');
        setStatusModal({
          isOpen: true,
          type: 'warning',
          title: 'File Size Exceeded',
          message: 'The selected resume file is larger than 5 MB. Please select a PDF, DOC, or DOCX file under 5 MB.',
        });
        return;
      }
      setUploadedResumeName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedResumeBase64(event.target?.result as string);
        toast.success(`Resume "${file.name}" attached successfully! Please fill your candidate details.`);
        setCurrentModal('new_form');
      };
      reader.onerror = () => {
        toast.error('Failed to read resume file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resume file size exceeds 5 MB limit. Please select a smaller file.');
        setStatusModal({
          isOpen: true,
          type: 'warning',
          title: 'File Size Exceeded',
          message: 'The selected resume file is larger than 5 MB. Please select a PDF, DOC, or DOCX file under 5 MB.',
        });
        return;
      }
      setUploadedResumeName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedResumeBase64(event.target?.result as string);
        toast.success(`Resume "${file.name}" loaded successfully!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read resume file");
      };
      reader.readAsDataURL(file);
    }
  };

  // Employment type tabs derived from filter data
  const employmentTabs = useMemo(() => {
    const tabs = ['All'];
    if (filterData.employmentTypes.length > 0) {
      tabs.push(...filterData.employmentTypes);
    } else {
      tabs.push('Full Time', 'Part Time', 'Contract');
    }
    return tabs;
  }, [filterData.employmentTypes]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const parseSkills = (rawSkills: any): string[] => {
    if (!rawSkills) return [];
    if (Array.isArray(rawSkills)) {
      return rawSkills
        .map((s) => (typeof s === 'string' ? s.trim() : (s?.name || s?.skillName || s?.skill_name || '')).trim())
        .filter(Boolean);
    }
    if (typeof rawSkills === 'string') {
      const trimmed = rawSkills.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .map((s) => (typeof s === 'string' ? s.trim() : (s?.name || s?.skillName || s?.skill_name || '')).trim())
              .filter(Boolean);
          }
        } catch {}
      }
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  return (
    <div className="w-full h-screen overflow-y-auto overflow-x-hidden bg-slate-50 font-sans flex flex-col scroll-smooth">

      {/* ─── Top Navbar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            {portalSettings?.companyLogoUrl ? (
              <div className="flex items-center justify-center p-1 rounded-xl bg-white border border-slate-100 shadow-2xs">
                <img
                  src={portalSettings.companyLogoUrl}
                  alt="Company Logo"
                  className="h-10 sm:h-11 w-auto max-w-[180px] object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs border border-indigo-500/20">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                {portalSettings?.portalTitle || 'Career Portal'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 font-medium">Powered by HRMS</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  Official Job Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {portalSettings?.showAccountInfo && user && (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{fullName}</span>
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {initials}
                </div>
              </div>
            )}
            {portalSettings?.showBackToHrms !== false && (
              <button
                onClick={handleBackToHrms}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to HRMS
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section className="relative bg-[#0f172a] py-20 overflow-hidden border-b border-slate-800">
        {/* Subtle background image watermark */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')`
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center z-20">


          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 leading-tight">
            {portalSettings?.portalTagline || 'Find Your Next Opportunity'}
          </h1>
          <p className="text-slate-400 text-xs font-medium max-w-md mx-auto mb-2">
            {portalSettings?.bannerDescription || 'Explore open roles, apply directly, or submit a referral application.'}
          </p>
        </div>
      </section>

      {/* ─── Search & Filter Bar (Floating) ──────────────────── */}
      <div className="relative z-20 max-w-4xl mx-auto w-full px-4 sm:px-6 -mt-8">
        <div className="bg-white rounded-xl shadow-lg p-3.5 sm:p-4 border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all truncate"
              />
            </div>

            {/* Department Dropdown */}
            <div className="relative w-full min-w-0">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val === 'ALL' ? '' : val)}>
                <SelectTrigger className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all truncate">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="w-full left-0 max-w-full">
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {Array.from(new Set(filterData.departments.map(d => d.name)))
                    .filter(Boolean)
                    .map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Employment Type Dropdown */}
            <div className="relative w-full min-w-0">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  const finalVal = val === 'ALL' ? '' : val;
                  setSelectedType(finalVal);
                  setActiveTab(finalVal || 'All');
                }}
              >
                <SelectTrigger className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all truncate">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="w-full left-0 max-w-full">
                  <SelectItem value="ALL">All Types</SelectItem>
                  {filterData.employmentTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <button
              onClick={() => {}}
              style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
              className="h-10 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:opacity-90 w-full"
            >
              <Search className="w-4 h-4" />
              Search Jobs
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* Tab Filters */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {employmentTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'All') setSelectedType(''); else setSelectedType(tab); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold text-slate-500">
            <span className="text-indigo-600 font-bold">{displayedOpenings.length}</span> position{displayedOpenings.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Job Openings Grid */}
        {openingsLoading && displayedOpenings.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-slate-100 rounded-full w-20"></div>
                  <div className="h-6 bg-slate-100 rounded-full w-16"></div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : displayedOpenings.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Openings Found</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
              {searchText || selectedDept || selectedType !== ''
                ? 'Try adjusting your filters or search terms.'
                : 'There are no active job openings at the moment. Please check back later.'}
            </p>
            {(searchText || selectedDept || selectedType) && (
              <button
                onClick={() => { setSearchText(''); setSelectedDept(''); setSelectedType(''); setActiveTab('All'); }}
                className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          /* Job Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedOpenings.map((job) => {
              const jobSkills = parseSkills(job.skills);
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobForDetails(job)}
                  className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
                  title="Click to view full Job Description & requirements"
                >
                  {/* Card Header & Content */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                          {job.position_title}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{job.mr_number}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2 w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50/50 transition-colors">
                        <Briefcase className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.department_name && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          <Building2 className="w-3 h-3" />
                          {job.department_name}
                        </span>
                      )}
                      {job.employment_type && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          job.employment_type === 'Full Time' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : job.employment_type === 'Part Time' ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : job.employment_type === 'Contract' ? 'bg-orange-50 text-orange-700 border-orange-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {job.employment_type}
                        </span>
                      )}
                      {job.number_of_positions > 1 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                          <Users className="w-3 h-3" />
                          {job.number_of_positions} Positions
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-[11px] text-slate-500 font-medium">
                      {job.experience_desired && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{job.experience_desired} Experience</span>
                        </div>
                      )}
                      {job.qualification_required && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{job.qualification_required}</span>
                        </div>
                      )}
                      {(job.target_closure_date || (job as any).expiry_date || (job as any).expiryDate) && (
                        <div className="flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 w-fit mt-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span>Deadline: {formatDate(job.target_closure_date || (job as any).expiry_date || (job as any).expiryDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {jobSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {jobSkills.slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-50 text-[10px] font-semibold text-slate-600 border border-slate-200">
                            {skill}
                          </span>
                        ))}
                        {jobSkills.length > 4 && (
                          <span className="px-2 py-0.5 rounded bg-slate-50 text-[10px] font-semibold text-slate-400">
                            +{jobSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Posted {formatDate(job.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobForDetails(job);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1 transition-colors cursor-pointer"
                      >
                        View JD
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyClick(job);
                        }}
                        style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer shadow-sm hover:opacity-90 active:scale-95"
                      >
                        Apply Now
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            {portalSettings?.copyrightText || `© ${new Date().getFullYear()} HRMS Career Portal. All rights reserved.`}
          </p>
        </div>
      </footer>

      {/* ─── Hidden file inputs ──────────────────────────────── */}
      <input type="file" ref={directResumeInputRef} onChange={handleDirectResumeChange} accept=".pdf,.doc,.docx" className="hidden" />

      {/* ══════════════════════════════════════════════════════════
           MODALS
         ══════════════════════════════════════════════════════════ */}

      {/* 0) Full Job Description (JD) & Details Modal */}
      {selectedJobForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      {selectedJobForDetails.mr_number}
                    </span>
                    {selectedJobForDetails.department_name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        <Building2 className="w-3 h-3" />
                        {selectedJobForDetails.department_name}
                      </span>
                    )}
                    {selectedJobForDetails.employment_type && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        selectedJobForDetails.employment_type === 'Full Time' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : selectedJobForDetails.employment_type === 'Part Time' ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : selectedJobForDetails.employment_type === 'Contract' ? 'bg-orange-50 text-orange-700 border-orange-100'
                        : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {selectedJobForDetails.employment_type}
                      </span>
                    )}
                    {selectedJobForDetails.number_of_positions > 1 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100">
                        <Users className="w-3 h-3" />
                        {selectedJobForDetails.number_of_positions} Positions
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                    {selectedJobForDetails.position_title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJobForDetails(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 cursor-pointer rounded-xl hover:bg-slate-100 flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-700 flex-1">
              
              {/* Key Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Experience Desired</p>
                    <p className="text-xs font-bold text-slate-800">{selectedJobForDetails.experience_desired || 'Not Specified'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualification</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedJobForDetails.qualification_required || 'Graduate / Diploma'}</p>
                  </div>
                </div>

                {(selectedJobForDetails.target_closure_date || (selectedJobForDetails as any).expiry_date || (selectedJobForDetails as any).expiryDate) && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Application Deadline</p>
                      <p className="text-xs font-bold text-slate-800">
                        {formatDate(selectedJobForDetails.target_closure_date || (selectedJobForDetails as any).expiry_date || (selectedJobForDetails as any).expiryDate)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 border border-slate-200">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posted Date</p>
                    <p className="text-xs font-bold text-slate-800">{formatDate(selectedJobForDetails.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Required Skills & Competencies</h3>
                </div>
                {parseSkills(selectedJobForDetails.skills).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {parseSkills(selectedJobForDetails.skills).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-indigo-50/90 text-indigo-700 text-xs font-semibold border border-indigo-100 shadow-2xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific skills listed for this position.</p>
                )}
              </div>

              {/* Full Job Description Section */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Job Description & Responsibilities</h3>
                </div>
                {selectedJobForDetails.job_description && selectedJobForDetails.job_description.trim() ? (
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line font-normal">
                    {selectedJobForDetails.job_description}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-xs text-slate-500 italic">
                    Detailed job description is not provided for this opening. Please check the experience and qualification requirements above, and feel free to apply with your profile.
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedJobForDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetJob = selectedJobForDetails;
                  setSelectedJobForDetails(null);
                  handleApplyClick(targetJob);
                }}
                style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Apply for this Position
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1) Main Choice Modal */}
      {currentModal === 'main' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Position Application
                </span>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {applyTargetMrf?.position_title || positionTitle || 'Job Position'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Choose application method to submit profile
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 cursor-pointer rounded-xl hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setCurrentModal('new_form')}
                className="group flex flex-col items-center p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer w-full text-center shadow-xs hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform shadow-md shadow-indigo-500/20">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Candidate Application
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Register profile and upload resume
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2) Existing Candidate Refer Modal */}
      {currentModal === 'existing_refer' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-5">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Referral Program
                </span>
                <h2 className="text-base font-bold text-slate-900">Refer Existing Candidate</h2>
              </div>
              <button
                type="button"
                onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 cursor-pointer rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReferExisting} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Select Candidate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCandidate}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 cursor-pointer text-slate-800 transition-all"
                >
                  <option value="">— Select a candidate with uploaded resume —</option>
                  {candidatesList.length === 0 ? (
                    <option value="" disabled>No candidates with uploaded resumes found</option>
                  ) : (
                    candidatesList.map((cand: any) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} {cand.email ? `(${cand.email})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3) New Candidate Registration Form Modal */}
      {currentModal === 'new_form' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                      Candidate Registration
                    </span>
                    {applyTargetMrf?.mr_number && (
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {applyTargetMrf.mr_number}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {applyTargetMrf?.position_title || positionTitle || 'Job Application Form'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 cursor-pointer rounded-xl hover:bg-slate-100 flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {uploadedResumeName && (
                <div className="mt-3 bg-emerald-50/90 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2 truncate">
                    <FileUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Attached Resume: <strong className="font-bold text-emerald-900">{uploadedResumeName}</strong></span>
                  </span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold shrink-0 ml-2">
                    Ready
                  </span>
                </div>
              )}
            </div>

            {/* Form Container */}
            <form onSubmit={handleSaveRegistration} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              
              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
                
                {/* ─── SECTION 1: Personal Information ─── */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">1</div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Personal Details</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Full Name */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={candidateForm.name}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. John Doe"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Email ID */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Email Address {isFieldRequired('emailId', true) && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="email"
                        required={isFieldRequired('emailId', true)}
                        value={candidateForm.emailId}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, emailId: e.target.value }))}
                        placeholder="candidate@example.com"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* DOB */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Date of Birth {isFieldRequired('dateOfBirth') && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="date"
                        required={isFieldRequired('dateOfBirth')}
                        value={candidateForm.dateOfBirth}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer"
                      />
                    </div>

                    {/* Gender */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={candidateForm.gender}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Marital Status */}
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Marital Status
                      </label>
                      <select
                        value={candidateForm.maritalStatus}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer"
                      >
                        <option value="Unmarried">Unmarried</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>

                    {/* Contact Number with Type */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Contact Number
                      </label>
                      <div className="grid grid-cols-12 gap-2">
                        <select
                          value={candidateForm.contactType}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactType: e.target.value }))}
                          className="col-span-4 h-10 px-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer transition-all"
                        >
                          <option value="Mobile">Mobile</option>
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                        </select>
                        <input
                          type="text"
                          value={candidateForm.contactNumber}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                          placeholder="e.g. +91 9876543210"
                          className="col-span-8 h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Current Company */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Current Company / Organization
                      </label>
                      <input
                        type="text"
                        value={candidateForm.currentCompany}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, currentCompany: e.target.value }))}
                        placeholder="Current Employer (if employed)"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── SECTION 2: Address & Geographic Details ─── */}
                <div className="space-y-3.5 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">2</div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Address & Location</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">Address Line 1</label>
                      <input
                        type="text"
                        value={candidateForm.addressLine1}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                        placeholder="House / Flat No, Street"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">Address Line 2</label>
                      <input
                        type="text"
                        value={candidateForm.addressLine2}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                        placeholder="Area, Landmark"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">Country</label>
                      <select
                        value={candidateForm.country}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all cursor-pointer"
                      >
                        <option value="Choose">Choose Country</option>
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">State / Province</label>
                      <input
                        type="text"
                        value={candidateForm.state}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">City</label>
                      <input
                        type="text"
                        value={candidateForm.city}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="block text-slate-600 font-semibold">Zip / Postal Code</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={candidateForm.zipcode}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, zipcode: e.target.value }))}
                        placeholder="Pincode"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── SECTION 3: Academic & Professional Background ─── */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">3</div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Experience & Education</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Highest Qualification {isFieldRequired('qualification') && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('qualification')}
                        value={candidateForm.qualification}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, qualification: e.target.value }))}
                        placeholder="e.g. B.Tech in Computer Science / MBA"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        University / College / Institute
                      </label>
                      <input
                        type="text"
                        value={candidateForm.university}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, university: e.target.value }))}
                        placeholder="e.g. Mumbai University"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Relevant Experience
                      </label>
                      <input
                        type="text"
                        value={candidateForm.relevantExperience}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, relevantExperience: e.target.value }))}
                        placeholder="e.g. 3.5 Years in React / Node"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Total Work Experience
                      </label>
                      <input
                        type="text"
                        value={candidateForm.totalExperience}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, totalExperience: e.target.value }))}
                        placeholder="e.g. 5 Years"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-12 space-y-1.5">
                      <label className="block text-slate-700 font-bold">
                        Key Skills & Technologies {isFieldRequired('skills') && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        required={isFieldRequired('skills')}
                        value={candidateForm.skills}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, skills: e.target.value }))}
                        placeholder="e.g. React.js, TypeScript, PostgreSQL, TailwindCSS (comma separated)"
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ─── SECTION 4: Documents & Attachments ─── */}
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">4</div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Required Documents</h3>
                  </div>

                  <div className="w-full">
                    {/* Resume Upload Card */}
                    {isFieldEnabled('resume') && (
                      <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/50 flex flex-col justify-between space-y-3 hover:border-indigo-400/80 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-800 text-xs">
                              Candidate Resume <span className="text-rose-500 font-extrabold">*</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700">
                            PDF, DOC, DOCX
                          </span>
                        </div>

                        <input
                          type="file"
                          ref={resumeInputRef}
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeChange}
                        />

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <button
                            type="button"
                            onClick={() => resumeInputRef.current?.click()}
                            className={`w-full sm:w-auto px-6 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                              uploadedResumeName
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                            }`}
                          >
                            <FileUp className="w-4 h-4" />
                            {uploadedResumeName ? 'Change Resume File' : 'Upload Resume File'}
                          </button>

                          {uploadedResumeName ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-100/70 text-emerald-800 text-xs font-medium w-full truncate">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="truncate font-semibold">{uploadedResumeName}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 font-medium">
                              Attach your latest resume (Max file size: 5 MB)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── SECTION 5: Additional Comments ─── */}
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-bold">
                    Additional Comments / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={candidateForm.comments}
                    onChange={(e) => setCandidateForm(prev => ({ ...prev, comments: e.target.value }))}
                    placeholder="Provide any additional relevant details, notice period, or notes..."
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

              </div>

              {/* Sticky Footer Action Bar */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
                  className="inline-flex items-center gap-2 px-8 py-2.5 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Dynamic Status & Error Popup Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${
              statusModal.type === 'success'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30'
                : statusModal.type === 'warning'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 ring-8 ring-amber-50 dark:ring-amber-950/30'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/30'
            }`}>
              {statusModal.type === 'success' ? (
                <CheckCircle2 className="w-9 h-9" />
              ) : statusModal.type === 'warning' ? (
                <AlertTriangle className="w-9 h-9" />
              ) : (
                <AlertCircle className="w-9 h-9" />
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
              {statusModal.title}
            </h3>

            <div className={`p-4 rounded-2xl mb-6 text-left border ${
              statusModal.type === 'success'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : statusModal.type === 'warning'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {statusModal.message}
              </p>
            </div>

            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className={`w-full py-3 px-5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all cursor-pointer ${
                statusModal.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                  : statusModal.type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
              }`}
            >
              {statusModal.type === 'success' ? 'Great, Close Window' : 'Understood, Check Details'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
