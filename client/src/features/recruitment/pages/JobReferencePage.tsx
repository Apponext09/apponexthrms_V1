import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, Building2, Briefcase, User, Clock,
  ArrowLeft, FileText, ExternalLink, Image, FileUp,
  GraduationCap, Users, ChevronRight, Sparkles, X, ChevronDown
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
  skills: string[];
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
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const directResumeInputRef = useRef<HTMLInputElement>(null);

  const [uploadedResumeName, setUploadedResumeName] = useState('');
  const [uploadedSignatureName, setUploadedSignatureName] = useState('');
  const [uploadedResumeBase64, setUploadedResumeBase64] = useState<string | null>(null);
  const [uploadedSignatureBase64, setUploadedSignatureBase64] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
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
    else if (roles.includes('hr_manager')) navigate('/hr/dashboard');
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

  const activeMrfId = applyTargetMrf?.mr_number || requestId || '';

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
    if (!candidateForm.name.trim()) {
      toast.error('Candidate Name is required');
      return;
    }
    if (isFieldRequired('emailId', true) && !candidateForm.emailId.trim()) {
      toast.error('Candidate Email ID is required');
      return;
    }
    if (isFieldRequired('resume', true) && !uploadedResumeBase64) {
      toast.error('Resume is a required field! Please upload candidate resume file.');
      return;
    }
    if (isFieldRequired('signature', true) && !uploadedSignatureBase64) {
      toast.error('Signature is a required field! Please upload candidate signature image.');
      return;
    }
    if (isFieldRequired('dateOfBirth') && !candidateForm.dateOfBirth) {
      toast.error('Date of Birth is a required field');
      return;
    }
    if (isFieldRequired('qualification') && !candidateForm.qualification) {
      toast.error('Qualification is a required field');
      return;
    }
    if (isFieldRequired('skills') && !candidateForm.skills) {
      toast.error('Skills is a required field');
      return;
    }
    try {
      const response = await apiClient.post(`/public/job-reference/${activeMrfId}/apply`, {
        ...candidateForm,
        resumeUrl: uploadedResumeBase64 || undefined,
        signatureUrl: uploadedSignatureBase64 || undefined,
        referringEmployeeId: user?.employeeId || undefined,
      });
      if (response.data?.success) {
        toast.success('Application submitted successfully!');
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Application Saved Successfully!',
          message: 'Your candidate details, resume, and signature have been saved and registered into the system database.',
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
        setUploadedSignatureName('');
        setUploadedResumeBase64(null);
        setUploadedSignatureBase64(null);
      } else {
        const msg = response.data?.message || 'Failed to save registration';
        toast.error(msg);
        setStatusModal({
          isOpen: true,
          type: 'error',
          title: 'Registration Error',
          message: msg,
        });
      }
    } catch (err: any) {
      const errMsg = formatApiError(err, 'Server error while saving application');
      toast.error(`Application Error: ${errMsg}`);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Application Submission Failed',
        message: errMsg,
      });
    }
  };

  const handleDirectResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedResumeName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedResumeBase64(event.target?.result as string);
        toast.success(`Resume "${file.name}" attached successfully! Please fill candidate details.`);
        setCurrentModal('new_form');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
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

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedSignatureName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignatureBase64(event.target?.result as string);
        toast.success(`Signature "${file.name}" loaded successfully!`);
      };
      reader.onerror = () => {
        toast.error("Failed to read signature file");
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
            {displayedOpenings.map((job) => (
              <div
                key={job.id}
                className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {job.position_title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{job.mr_number}</p>
                    </div>
                    <div className="flex-shrink-0 ml-2 w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-slate-500" />
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
                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {job.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-50 text-[10px] font-semibold text-slate-500 border border-slate-200">
                          {typeof skill === 'string' ? skill : (skill as any)?.name || ''}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 text-[10px] font-semibold text-slate-400">
                          +{job.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Posted {formatDate(job.created_at)}
                  </span>
                  <button
                    onClick={() => handleApplyClick(job)}
                    style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer shadow-sm hover:opacity-90"
                  >
                    Apply Now
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
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

      {/* 1) Main Choice Modal */}
      {currentModal === 'main' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Apply for</p>
                <h2 className="text-sm font-bold text-slate-800 mt-0.5">
                  {applyTargetMrf?.position_title || positionTitle || 'Job Position'}
                </h2>
              </div>
              <button
                onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentModal('existing_refer')}
                className="group flex flex-col items-center p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  Existing Candidate
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Refer from database</p>
              </button>

              <button
                onClick={() => setCurrentModal('new_form')}
                className="group flex flex-col items-center p-6 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                  New Candidate
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Register fresh profile</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2) Existing Candidate Refer Modal */}
      {currentModal === 'existing_refer' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-5">
              <h2 className="text-sm font-bold text-slate-800">Refer Existing Candidate</h2>
              <button
                onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReferExisting} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Select Candidate <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCandidate}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-slate-50 cursor-pointer text-slate-700 transition-all"
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

              <button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Submit Referral
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3) New Candidate Registration Form Modal */}
      {currentModal === 'new_form' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 z-50">
          <div className="w-full max-w-2xl my-6 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate Registration</p>
                <h2 className="text-xs font-bold text-slate-800 mt-0.5">
                  {applyTargetMrf?.position_title || positionTitle || 'Job Position'}
                </h2>
              </div>
              <button
                onClick={() => { setCurrentModal(null); setApplyTargetMrf(null); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRegistration} className="space-y-4">
              {uploadedResumeName && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-emerald-600" />
                    Attached Resume: <strong className="font-bold text-emerald-900">{uploadedResumeName}</strong>
                  </span>
                  <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Ready</span>
                </div>
              )}
              <div className="max-h-[420px] overflow-y-auto pr-2 space-y-4 text-left text-xs font-semibold text-slate-700">

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label>Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-slate-50 font-medium transition-all"
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={candidateForm.dateOfBirth}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Gender <span className="text-red-500">*</span></label>
                    <select
                      value={candidateForm.gender}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-slate-50 cursor-pointer font-medium transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Email & Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label>Email</label>
                    <input
                      type="email"
                      value={candidateForm.emailId}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, emailId: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Contact Number</label>
                    <div className="flex gap-2">
                      <select
                        value={candidateForm.contactType}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, contactType: e.target.value }))}
                        className="w-24 h-9 border border-slate-200 rounded-xl px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 cursor-pointer font-medium transition-all"
                      >
                        <option value="Mobile">Mobile</option>
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                      </select>
                      <input
                        type="text"
                        value={candidateForm.contactNumber}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                        className="flex-1 h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <span className="font-bold text-slate-700 text-xs block pb-2 border-b border-slate-200/60">Address</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">Address Line 1</label>
                      <input type="text" value={candidateForm.addressLine1}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white font-medium transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">Address Line 2</label>
                      <input type="text" value={candidateForm.addressLine2}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">Country</label>
                      <select value={candidateForm.country}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white cursor-pointer font-medium transition-all"
                      >
                        <option value="Choose">Choose</option>
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Canada">Canada</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">Zipcode</label>
                      <input type="text" value={candidateForm.zipcode}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, zipcode: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">State</label>
                      <input type="text" value={candidateForm.state}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white font-medium transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500">City</label>
                      <input type="text" value={candidateForm.city}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white font-medium transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Marital Status & Company */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label>Marital Status</label>
                    <select value={candidateForm.maritalStatus}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 cursor-pointer font-medium transition-all"
                    >
                      <option value="Unmarried">Unmarried</option>
                      <option value="Married">Married</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Current Company</label>
                    <input type="text" value={candidateForm.currentCompany}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, currentCompany: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Qualification & University */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label>Qualification</label>
                    <input type="text" value={candidateForm.qualification}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, qualification: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>University</label>
                    <input type="text" value={candidateForm.university}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, university: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Experience */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label>Relevant Experience</label>
                    <input type="text" value={candidateForm.relevantExperience}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, relevantExperience: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label>Total Experience</label>
                    <input type="text" value={candidateForm.totalExperience}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, totalExperience: e.target.value }))}
                      className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                    />
                  </div>
                </div>

                {/* Mandatory File Uploads */}
                <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  {isFieldEnabled('signature') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Upload Signature {isFieldRequired('signature', true) && <span className="text-red-500">*</span>}
                      </label>
                      <input type="file" ref={signatureInputRef} className="hidden" accept="image/*"
                        onChange={handleSignatureChange}
                      />
                      <button type="button" onClick={() => signatureInputRef.current?.click()}
                        className={`flex items-center gap-1.5 border text-xs font-bold px-3 py-2 rounded-lg transition-colors w-full justify-center cursor-pointer ${
                          uploadedSignatureName ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        <Image className="w-4 h-4 text-slate-500" />
                        {uploadedSignatureName ? 'Signature Attached ✓' : 'Attach Signature'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {uploadedSignatureName ? `Selected: ${uploadedSignatureName}` : (isFieldRequired('signature', true) ? 'Required (Max 1 MB)' : 'Optional (Max 1 MB)')}
                      </span>
                    </div>
                  )}

                  {isFieldEnabled('resume') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Upload Resume {isFieldRequired('resume', true) && <span className="text-red-500">*</span>}
                      </label>
                      <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf,.doc,.docx"
                        onChange={handleResumeChange}
                      />
                      <button type="button" onClick={() => resumeInputRef.current?.click()}
                        className={`flex items-center gap-1.5 border text-xs font-bold px-3 py-2 rounded-lg transition-colors w-full justify-center cursor-pointer ${
                          uploadedResumeName ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-slate-500" />
                        {uploadedResumeName ? 'Resume Attached ✓' : 'Attach Resume'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {uploadedResumeName ? `Selected: ${uploadedResumeName}` : (isFieldRequired('resume', true) ? 'Required (Max 5 MB)' : 'Optional (Max 5 MB)')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-col gap-1">
                  <label>Skills</label>
                  <input type="text" value={candidateForm.skills}
                    onChange={(e) => setCandidateForm(prev => ({ ...prev, skills: e.target.value }))}
                    className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium transition-all"
                  />
                </div>

                {/* Comments */}
                <div className="flex flex-col gap-1">
                  <label>Comments</label>
                  <textarea rows={3} value={candidateForm.comments}
                    onChange={(e) => setCandidateForm(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 font-medium resize-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  style={{ backgroundColor: portalSettings?.primaryColor || '#4f46e5' }}
                  className="px-8 py-2.5 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer hover:opacity-90"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Status & Error Popup Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative">
            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              statusModal.type === 'success'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
            }`}>
              {statusModal.type === 'success' ? (
                <Sparkles className="w-8 h-8" />
              ) : (
                <X className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {statusModal.title}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {statusModal.message}
            </p>

            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg transition-all cursor-pointer ${
                statusModal.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
