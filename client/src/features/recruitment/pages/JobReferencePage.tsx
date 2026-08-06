import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, Globe, MapPin, Building, Briefcase, User, Bug, 
  ArrowLeft, FileText, Upload, ExternalLink, Image, FileUp 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';

type ModalType = 'main' | 'existing_refer' | 'new_options' | 'new_form';

export const JobReferencePage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  
  const [positionTitle, setPositionTitle] = useState('HR EXECUTIVE');
  const [currentModal, setCurrentModal] = useState<ModalType>('main');
  
  // Existing candidate reference states
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const mockCandidates = [
    'Rajesh Kumar Sharma',
    'Neha Amit Gupta',
    'Priya Patel',
    'Arjun Varma',
    'Anjali Nair'
  ];

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

  // Dynamic position title lookup from stored MRFs
  useEffect(() => {
    const saved = localStorage.getItem('mrf_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            (item) => item.mrNumber === requestId || String(item.id) === requestId
          );
          if (found && found.positionTitle) {
            setPositionTitle(found.positionTitle);
          }
        }
      } catch (e) {}
    }
  }, [requestId]);

  const { user } = useAuthStore();

  const fullName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Surinder Sharma'
    : 'Surinder Sharma';
  const initials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'SS'
    : 'SS';

  const handleBackToHrms = () => {
    const roles = user?.roles || [];
    if (roles.includes('super_admin')) {
      navigate('/superadmin/dashboard');
    } else if (roles.includes('hr_manager')) {
      navigate('/hr/dashboard');
    } else if (roles.includes('department_head') || roles.includes('manager')) {
      navigate('/manager/dashboard');
    } else if (roles.includes('team_lead')) {
      navigate('/team-lead/dashboard');
    } else if (roles.includes('organization_admin')) {
      navigate('/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  };

  const handleReferExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) {
      toast.error('Please select an existing candidate to refer');
      return;
    }
    toast.success(`Successfully referred existing candidate: ${selectedCandidate}`);
    setCurrentModal('main');
    setSelectedCandidate('');
  };

  const handleSaveRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name) {
      toast.error('Name is a required field');
      return;
    }
    toast.success('Candidate registration form saved successfully!');
    setCurrentModal('main');
    // Clear form
    setCandidateForm({
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
    setUploadedResumeName('');
    setUploadedSignatureName('');
  };

  const triggerDirectResumeUpload = () => {
    directResumeInputRef.current?.click();
  };

  const handleDirectResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast.success(`Resume "${files[0].name}" uploaded successfully!`);
      setCurrentModal('main');
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center font-sans relative flex flex-col justify-between"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1920&q=80')` 
      }}
    >
      
      {/* ─── Top Navbar ────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center px-8 py-3.5 bg-black/35 backdrop-blur-sm border-b border-white/10 z-25">
        <div className="flex items-center gap-2">
          <span className="text-white text-base font-extrabold tracking-wider">HRMS Reference Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Welcome {fullName}</span>
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold font-sans">
              {initials}
            </div>
          </div>
          <button
            onClick={handleBackToHrms}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded border border-white/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to HRMS
          </button>
        </div>
      </header>

      {/* ─── Main Content Container (Flex Center) ────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-15">
        
        {/* Top Center CV Upload Trigger */}
        <div className="text-center my-6 text-white z-20">
          <button 
            onClick={() => setCurrentModal('main')}
            className="bg-white text-[#0f2942] hover:bg-slate-50 border border-slate-200 font-extrabold px-6 py-2.5 rounded-lg text-xs transition-all shadow-md cursor-pointer mb-6"
          >
            Upload Candidate CV
          </button>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 select-none">
            Find Your <span className="text-[#0f2942]">Desired Job</span>
          </h1>
          <p className="text-slate-200 text-xs font-semibold select-none">
            Jobs, Employment & Future Career Opportunities
          </p>
        </div>

        {/* Background Search Form (Mock layout from screenshot) */}
        <div className="w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl mb-8 border border-slate-100 z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-700 text-[11px] font-bold">
            <div className="flex flex-col gap-1.5 text-left">
              <span className="flex items-center gap-1.5 text-slate-600"><Globe className="w-3.5 h-3.5 text-blue-500" /> Search By Country</span>
              <input type="text" placeholder="Country" className="h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-300" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <span className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3.5 h-3.5 text-red-500" /> Search By Location</span>
              <input type="text" placeholder="Location" className="h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-300" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <span className="flex items-center gap-1.5 text-slate-600"><Building className="w-3.5 h-3.5 text-emerald-500" /> Search By Department</span>
              <input type="text" placeholder="Department" className="h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-300" />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <span className="flex items-center gap-1.5 text-slate-600"><Briefcase className="w-3.5 h-3.5 text-purple-500" /> Search By Designation</span>
              <input type="text" placeholder="Designation" className="h-9 border border-slate-200 rounded-lg px-3 bg-slate-50 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-300" />
            </div>
          </div>
          <div className="flex justify-center mt-6 -mb-10">
            <button className="bg-[#0f2942] hover:bg-[#091a2b] text-white font-bold px-10 py-2.5 rounded-full text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer">
              Search
            </button>
          </div>
        </div>

        {/* Hidden inputs for file uploads */}
        <input 
          type="file" 
          ref={directResumeInputRef} 
          onChange={handleDirectResumeChange} 
          accept=".pdf,.doc,.docx" 
          className="hidden" 
        />

        {/* ─── CHOICE POPUP CONTAINER ───────────────────────────────────── */}
        
        {/* 1) Main Choice Popup (Existing vs New Candidate) */}
        {currentModal === 'main' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-40">
            <div className="w-full max-w-[620px] bg-white rounded-xl shadow-2xl border border-slate-100 p-6 text-slate-700 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Job Reference for</div>
                  <h2 className="text-slate-800 text-sm font-black tracking-tight mt-0.5">{positionTitle}</h2>
                </div>
                <button 
                  onClick={() => setCurrentModal(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 mb-2">
                {/* Card 1: Existing Candidate */}
                <div 
                  onClick={() => setCurrentModal('existing_refer')}
                  className="flex-1 border border-slate-200 rounded-xl p-5 text-center relative overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="absolute top-0 right-0 w-10 h-10 bg-[#0f2942] flex items-center justify-center rounded-bl-2xl shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-4 group-hover:text-blue-600 transition-colors">
                    Existing Candidate
                  </h3>
                  <div className="text-[11px] text-blue-500 font-bold mt-4 group-hover:text-blue-600 transition-all">
                    Click here...
                  </div>
                </div>

                {/* Card 2: New Candidate */}
                <div 
                  onClick={() => setCurrentModal('new_options')}
                  className="flex-1 border border-slate-200 rounded-xl p-5 text-center relative overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                >
                  <div className="absolute top-0 right-0 w-10 h-10 bg-[#892a78] flex items-center justify-center rounded-bl-2xl shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-4 group-hover:text-purple-600 transition-colors">
                    New Candidate
                  </h3>
                  <div className="text-[11px] text-purple-500 font-bold mt-4 group-hover:text-purple-600 transition-all">
                    Click here...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2) Existing Candidate Refer Form Popup */}
        {currentModal === 'existing_refer' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-40">
            <div className="w-full max-w-[500px] bg-white rounded-xl shadow-2xl border border-slate-100 p-6 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
                <h2 className="text-slate-800 text-sm font-bold tracking-tight">
                  Job Reference For Existing Candidates
                </h2>
                <button 
                  onClick={() => setCurrentModal('main')}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleReferExisting} className="space-y-5">
                <div className="flex flex-col gap-1.5 text-xs text-left">
                  <label className="font-bold text-slate-700">
                    Select Candidate <span className="text-red-500 font-black">*</span>
                  </label>
                  <select
                    value={selectedCandidate}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                    className="w-full h-10 border border-slate-300 rounded px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer text-slate-700"
                  >
                    <option value="">- Select -</option>
                    {mockCandidates.map((cand) => (
                      <option key={cand} value={cand}>{cand}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-start">
                  <button
                    type="submit"
                    className="bg-[#00ab66] hover:bg-[#008f55] text-white px-6 py-2 rounded text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    Refer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3) New Candidate Options Popup (Upload Resume vs Fill Form) */}
        {currentModal === 'new_options' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-40">
            <div className="w-full max-w-[620px] bg-white rounded-xl shadow-2xl border border-slate-100 p-6 text-slate-700 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Job Reference for</div>
                  <h2 className="text-slate-800 text-sm font-black tracking-tight mt-0.5">{positionTitle}</h2>
                </div>
                <button 
                  onClick={() => setCurrentModal('main')}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 mb-2">
                {/* Option 1: Upload Resume */}
                <div 
                  onClick={triggerDirectResumeUpload}
                  className="flex-1 border border-slate-200 rounded-xl p-5 text-center relative overflow-hidden shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                >
                  {/* Green top right tab */}
                  <div className="absolute top-0 right-0 w-10 h-10 bg-[#4caf50] flex items-center justify-center rounded-bl-2xl shadow-sm">
                    <FileUp className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-4 group-hover:text-green-600 transition-colors">
                    Upload Resume
                  </h3>
                  <div className="text-[10px] text-green-600 font-extrabold mt-4">
                    Max Size : 2 MB
                  </div>
                </div>

                {/* Option 2: Fill Form */}
                <div 
                  onClick={() => setCurrentModal('new_form')}
                  className="flex-1 border border-slate-200 rounded-xl p-5 text-center relative overflow-hidden shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
                >
                  {/* Orange top right tab */}
                  <div className="absolute top-0 right-0 w-10 h-10 bg-[#ffa726] flex items-center justify-center rounded-bl-2xl shadow-sm">
                    <ExternalLink className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-4 group-hover:text-amber-600 transition-colors">
                    Fill Form
                  </h3>
                  <div className="text-[11px] text-amber-500 font-bold mt-4 group-hover:text-amber-600 transition-all">
                    Click here...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4) New Candidate Fill Form Scrollable Modal */}
        {currentModal === 'new_form' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4 z-40">
            <div className="w-full max-w-[700px] my-6 bg-white rounded-xl shadow-2xl border border-slate-100 p-6 text-slate-700 relative animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-slate-800 text-xs font-bold tracking-tight">
                  Job Reference for {positionTitle}
                </h2>
                <button 
                  onClick={() => setCurrentModal('new_options')}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold p-1 cursor-pointer"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSaveRegistration} className="space-y-4">
                
                {/* Scrollable inputs wrapper (restricted to max-h-[350px] so it is compact and fully visible on all viewports) */}
                <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4 text-left text-xs font-semibold text-slate-700">
                  
                  {/* Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-655">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={candidateForm.name}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                    />
                  </div>

                  {/* DOB & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Date of Birth</label>
                      <input
                        type="text"
                        placeholder="Y-m-d"
                        value={candidateForm.dateOfBirth}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Gender <span className="text-red-500">*</span></label>
                      <select
                        value={candidateForm.gender}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer font-medium"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Email & Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Email Id</label>
                      <input
                        type="email"
                        value={candidateForm.emailId}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, emailId: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Contact Number</label>
                      <div className="flex gap-2">
                        <select
                          value={candidateForm.contactType}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactType: e.target.value }))}
                          className="w-24 h-9 border border-slate-300 rounded px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer font-medium"
                        >
                          <option value="Mobile">Mobile</option>
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                        </select>
                        <input
                          type="text"
                          value={candidateForm.contactNumber}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                          className="flex-1 h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address block layout from mockup */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                    <span className="font-bold text-slate-800 text-xs block -mt-1.5 pb-1.5 border-b border-slate-200/60">
                      Address
                    </span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">Address Line 1</label>
                        <input
                          type="text"
                          value={candidateForm.addressLine1}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                          className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">Address Line 2</label>
                        <input
                          type="text"
                          value={candidateForm.addressLine2}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                          className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">Country</label>
                        <select
                          value={candidateForm.country}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer font-medium"
                        >
                          <option value="Choose">Choose</option>
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">Zipcode</label>
                        <input
                          type="text"
                          value={candidateForm.zipcode}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, zipcode: e.target.value }))}
                          className="w-full h-9 border border-slate-200 rounded px-2.5 text-xs bg-slate-100 focus:outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">State</label>
                        <input
                          type="text"
                          value={candidateForm.state}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full h-9 border border-slate-200 rounded px-2.5 text-xs bg-slate-100 focus:outline-none font-medium"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-555">City</label>
                        <input
                          type="text"
                          value={candidateForm.city}
                          onChange={(e) => setCandidateForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full h-9 border border-slate-200 rounded px-2.5 text-xs bg-slate-100 focus:outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Marrital Status & Current Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Marrital Status</label>
                      <select
                        value={candidateForm.maritalStatus}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white cursor-pointer font-medium"
                      >
                        <option value="Unmarried">Unmarried</option>
                        <option value="Married">Married</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Current Company</label>
                      <input
                        type="text"
                        value={candidateForm.currentCompany}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, currentCompany: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Qualification & University */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Qualification</label>
                      <input
                        type="text"
                        value={candidateForm.qualification}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, qualification: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">University</label>
                      <input
                        type="text"
                        value={candidateForm.university}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, university: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* Relevant & Total Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Relevant Experience</label>
                      <input
                        type="text"
                        value={candidateForm.relevantExperience}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, relevantExperience: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-655">Total Experience</label>
                      <input
                        type="text"
                        value={candidateForm.totalExperience}
                        onChange={(e) => setCandidateForm(prev => ({ ...prev, totalExperience: e.target.value }))}
                        className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                      />
                    </div>
                  </div>

                  {/* File Upload fields (Signature and Resume) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Signature Upload */}
                    <div className="flex flex-col gap-1.5">
                      <input 
                        type="file" 
                        ref={signatureInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) setUploadedSignatureName(files[0].name);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-bold px-3 py-2 rounded transition-colors w-fit shadow-sm cursor-pointer"
                      >
                        <Image className="w-3.5 h-3.5 text-slate-500" />
                        Upload Signature
                      </button>
                      <span className="text-[10px] text-slate-400 select-none font-medium">
                        {uploadedSignatureName ? `Selected: ${uploadedSignatureName}` : "(Min Size - 0 MB and Max Size - 1 MB)"}
                      </span>
                    </div>

                    {/* Resume Upload */}
                    <div className="flex flex-col gap-1.5">
                      <input 
                        type="file" 
                        ref={resumeInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) setUploadedResumeName(files[0].name);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => resumeInputRef.current?.click()}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-bold px-3 py-2 rounded transition-colors w-fit shadow-sm cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Upload Resume
                      </button>
                      <span className="text-[10px] text-slate-400 select-none font-medium">
                        {uploadedResumeName ? `Selected: ${uploadedResumeName}` : "(Min Size - 0 MB and Max Size - 5 MB)"}
                      </span>
                    </div>

                  </div>

                  {/* Skills */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-655">Skills</label>
                    <input
                      type="text"
                      value={candidateForm.skills}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, skills: e.target.value }))}
                      className="w-full h-9 border border-slate-300 rounded px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium"
                    />
                  </div>

                  {/* Comments */}
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-655">Comments</label>
                    <textarea
                      rows={3}
                      value={candidateForm.comments}
                      onChange={(e) => setCandidateForm(prev => ({ ...prev, comments: e.target.value }))}
                      className="w-full border border-slate-300 rounded p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white font-medium resize-none"
                    />
                  </div>

                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#0f2942] hover:bg-[#091a2b] text-white px-7 py-2 rounded text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </main>

      {/* ─── Footer Feed & Bug Button ──────────────────────────────────── */}
      <footer className="w-full bg-[#f8fafc] border-t border-slate-200/80 px-8 py-8 flex flex-col items-center justify-center relative select-none z-10 text-slate-700">
        
        {/* Recent Jobs Section */}
        <div className="w-full max-w-4xl text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Jobs</h2>
          
          {/* Filters Card */}
          <div className="inline-flex items-center gap-1.5 p-2 bg-slate-100 rounded-xl border border-slate-200/60 shadow-sm mb-8">
            <span className="px-5 py-2 rounded-lg text-xs font-bold bg-[#0f2942] text-white shadow-sm cursor-pointer">All</span>
            <span className="px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200/60 text-slate-655 transition-colors cursor-pointer">New</span>
            <span className="px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200/60 text-slate-655 transition-colors cursor-pointer">Part Time</span>
            <span className="px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200/60 text-slate-655 transition-colors cursor-pointer">Full Time</span>
            <span className="px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200/60 text-slate-655 transition-colors cursor-pointer">Contract</span>
            <span className="px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-200/60 text-slate-655 transition-colors cursor-pointer">Regular</span>
          </div>

          {/* No Job Available placeholder */}
          <div className="py-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">No Job Available</h3>
          </div>
        </div>

      </footer>

    </div>
  );
};
