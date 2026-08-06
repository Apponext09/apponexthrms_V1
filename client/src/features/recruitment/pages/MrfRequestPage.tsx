import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, RefreshCw, Plus, Edit2, Trash2, Copy, Download, 
  ChevronLeft, ChevronRight, User, Settings, Briefcase, Eye, Clipboard,
  Grid, GraduationCap, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { TipTapRichTextEditor } from '@/features/settings/components/TipTapRichTextEditor';
import { cn } from '@/lib/utils';

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
  'Age', // Duplicate listed in mockup screenshot 1
  'Alternate Contact Number',
  'Background Verification',
  'Bank Name',
  'Biometric Code',
  'Blood Group',
  'Buddy',
  'Charges',
  'Charges', // Duplicate listed in mockup screenshot 2
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
  // Load initial data from localStorage if exists, otherwise use initial mock
  const [data, setData] = useState<MRFRequest[]>(() => {
    const saved = localStorage.getItem('mrf_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved MRF requests", e);
      }
    }
    return INITIAL_MOCK_DATA;
  });

  const navigate = useNavigate();

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
      setTempVisible([...visibleColumns]);
      setTempHidden([...hiddenColumns]);
      setSelectedLeft([]);
      setSelectedRight([]);
    }
  }, [isFieldsModalOpen, visibleColumns, hiddenColumns]);

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
    setVisibleColumns(tempVisible);
    setHiddenColumns(tempHidden);
    localStorage.setItem('mrf_visible_columns', JSON.stringify(tempVisible));
    localStorage.setItem('mrf_hidden_columns', JSON.stringify(tempHidden));
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
      setTempCandidateVisible([...candidateVisibleColumns]);
      setTempCandidateHidden([...candidateHiddenColumns]);
      setSelectedCandidateLeft([]);
      setSelectedCandidateRight([]);
    }
  }, [isCandidateModalOpen, candidateVisibleColumns, candidateHiddenColumns]);

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
    setCandidateVisibleColumns(tempCandidateVisible);
    setCandidateHiddenColumns(tempCandidateHidden);
    localStorage.setItem('mrf_candidate_visible_columns', JSON.stringify(tempCandidateVisible));
    localStorage.setItem('mrf_candidate_hidden_columns', JSON.stringify(tempCandidateHidden));
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
    requestedBy: 'sakshi shukla',
    stage: 'Approved',
    applicants: 0,
    status: 'Open' as 'Open' | 'Closed'
  });

  // Sync state to local storage
  useEffect(() => {
    if (Array.isArray(data)) {
      localStorage.setItem('mrf_requests', JSON.stringify(data));
    }
  }, [data]);

  // Initial filter run & filter application
  useEffect(() => {
    applyFilters();
  }, [data, activeTab]);

  const applyFilters = (mrNum = searchMrNumber, pos = selectedPosition, reqBy = selectedRequestedBy) => {
    const safeData = Array.isArray(data) ? data : INITIAL_MOCK_DATA;
    let result = safeData.filter(item => {
      if (!item) return false;
      const matchStatus = activeTab === 'open' ? item.status === 'Open' : item.status === 'Closed';
      
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
  const safeDataList = Array.isArray(data) ? data : INITIAL_MOCK_DATA;
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
      setTimeout(() => {
        setIsRefreshingToday(false);
        toast.info("Today's schedule synced");
      }, 1000);
    } else if (type === 'upcoming') {
      setIsRefreshingUpcoming(true);
      setTimeout(() => {
        setIsRefreshingUpcoming(false);
        toast.info("Upcoming schedule synced");
      }, 1000);
    } else if (type === 'pending') {
      setIsRefreshingPending(true);
      setTimeout(() => {
        setIsRefreshingPending(false);
        toast.info("Pending feedback synced");
      }, 1000);
    }
  };

  // Delete Request handler
  const handleDelete = (id: number) => {
    const recordToDelete = safeDataList.find(item => item.id === id);
    if (confirm(`Are you sure you want to delete ${recordToDelete?.mrNumber}?`)) {
      setData(prev => (Array.isArray(prev) ? prev : INITIAL_MOCK_DATA).filter(item => item.id !== id));
      toast.success(`${recordToDelete?.mrNumber} deleted successfully`);
    }
  };

  // Duplicate Request handler
  const handleDuplicate = (item: MRFRequest) => {
    const nextId = Math.max(...safeDataList.map(d => d.id), 0) + 1;
    const newRecord: MRFRequest = {
      ...item,
      id: nextId,
      mrNumber: `MR-${nextId}`,
      positionTitle: `${item.positionTitle} (Copy)`,
      requestedOn: new Date().toISOString().replace('T', ' ').substring(0, 19),
      applicants: 0
    };
    setData(prev => [...(Array.isArray(prev) ? prev : INITIAL_MOCK_DATA), newRecord]);
    toast.success(`Duplicated ${item.mrNumber} as ${newRecord.mrNumber}`);
  };

  // Export to CSV handler
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    const headers = ['MR Number', 'Stage', 'Position Title', 'Company', 'Requested By', 'Requested On', 'Positions', 'Department', 'Status', 'Applicants'];
    const rows = filteredData.map(item => [
      item.mrNumber,
      item.stage,
      item.positionTitle,
      item.company,
      item.requestedBy,
      item.requestedOn,
      item.numberOfPositions,
      item.department,
      item.status,
      item.applicants
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MRF_Requests_Export_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      requestedBy: 'sakshi shukla',
      stage: 'Approved',
      applicants: 0,
      status: 'Open'
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MRFRequest) => {
    setEditingMrf(item);
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

    if (editingMrf) {
      // Update
      setData(prev => (Array.isArray(prev) ? prev : INITIAL_MOCK_DATA).map(item => 
        item.id === editingMrf.id 
          ? { 
              ...item, 
              ...formFields, 
              positionTitle: formFields.positionTitle.toUpperCase() 
            } 
          : item
      ));
      toast.success(`MRF Request ${editingMrf.mrNumber} updated successfully`);
    } else {
      // Create
      const nextId = Math.max(...safeDataList.map(d => d.id), 0) + 1;
      const newRequest: MRFRequest = {
        id: nextId,
        mrNumber: `MR-${nextId}`,
        stage: formFields.stage,
        positionTitle: formFields.positionTitle.toUpperCase(),
        company: formFields.company,
        requestedBy: formFields.requestedBy,
        requestedOn: new Date().toISOString().replace('T', ' ').substring(0, 19),
        numberOfPositions: formFields.numberOfPositions,
        department: formFields.department,
        status: formFields.listInJobRecruitmentPage === 'No' ? 'Closed' : 'Open',
        applicants: formFields.applicants,
        recruitmentType: formFields.recruitmentType,
        companyLocation: formFields.companyLocation,
        grade: formFields.grade,
        employmentType: formFields.employmentType,
        qualificationRequired: formFields.qualificationRequired,
        experienceDesired: formFields.experienceDesired,
        interviewer: formFields.interviewer,
        payScaleType: formFields.payScaleType,
        payScaleForPosition: formFields.payScaleForPosition,
        reasonForRequirement: formFields.reasonForRequirement,
        listInJobRecruitmentPage: formFields.listInJobRecruitmentPage,
        skills: formFields.skills,
        comment: formFields.comment,
        jobDescription: formFields.jobDescription
      };
      setData(prev => [newRequest, ...(Array.isArray(prev) ? prev : INITIAL_MOCK_DATA)]);
      toast.success(`Created MRF Request ${newRequest.mrNumber} successfully`);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen text-slate-800 font-sans relative">
      
      {/* Inline styles to make forms and tables highly compact and premium */}
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
      `}</style>

      {/* Main Content Area (Spans full page width, making elements more compact) */}
      <div className="flex-1">
        
        {/* Top Header Bar (Has pl-20 to leave space for the floating settings button) */}
        <div className="relative flex items-center justify-between mb-6 bg-white border border-slate-100 p-4 rounded-xl shadow-sm z-30 pl-20">
          
          {/* Floating Left Vertical Action Sidebar matching reference image */}
          <div className={cn(
            "absolute left-4 top-3 w-12 z-40 transition-all duration-250 overflow-visible",
            showQuickSettings 
              ? "bg-[#374151] border border-slate-650 rounded-lg shadow-lg flex flex-col gap-0.5" 
              : "flex flex-col"
          )}>
            
            {/* Gear Settings Button (Click toggles the menu open/closed) */}
            <button
              type="button"
              onClick={() => setShowQuickSettings(!showQuickSettings)}
              className={cn(
                "w-12 h-12 bg-[#8ebd2d] text-white flex items-center justify-center transition-all cursor-pointer shadow-sm",
                showQuickSettings ? "rounded-t-lg" : "rounded-lg"
              )}
              title="Settings Menu"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Collapsible Options List (Smooth transition, overflow-visible when open to prevent tooltip clipping) */}
            <div className={cn(
              "flex flex-col gap-0.5 bg-[#374151] rounded-b-lg border-t border-slate-600/20 transition-all duration-300 ease-in-out",
              showQuickSettings 
                ? "max-h-[200px] opacity-100 overflow-visible" 
                : "max-h-0 opacity-0 overflow-hidden pointer-events-none"
            )}>
              
              {/* Grid / Recruitment Fields Option */}
              <div 
                className="relative"
                onMouseEnter={() => setFormFields(prev => ({ ...prev, activeTooltip: 'grid' } as any))}
                onMouseLeave={() => setFormFields(prev => ({ ...prev, activeTooltip: null } as any))}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsFieldsModalOpen(true);
                    setShowQuickSettings(false);
                  }}
                  className="w-12 h-12 bg-slate-700 hover:bg-[#8ebd2d] text-white flex items-center justify-center transition-all cursor-pointer border-t border-slate-500/20"
                >
                  <Grid className="w-5 h-5" />
                </button>
                {(formFields as any).activeTooltip === 'grid' && (
                  <div className="absolute left-14 top-[10px] flex items-center z-50 pointer-events-none">
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#374151]"></div>
                    <div className="bg-[#374151] text-white text-[11px] font-bold px-3 py-1.5 rounded whitespace-nowrap shadow-md">
                      Recruitment Fields
                    </div>
                  </div>
                )}
              </div>

              {/* Graduation Cap / Candidate Fields Option */}
              <div 
                className="relative"
                onMouseEnter={() => setFormFields(prev => ({ ...prev, activeTooltip: 'cap' } as any))}
                onMouseLeave={() => setFormFields(prev => ({ ...prev, activeTooltip: null } as any))}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCandidateModalOpen(true);
                    setShowQuickSettings(false);
                  }}
                  className="w-12 h-12 bg-slate-700 hover:bg-[#8ebd2d] text-white flex items-center justify-center transition-all cursor-pointer border-t border-slate-500/20"
                >
                  <GraduationCap className="w-5 h-5" />
                </button>
                {(formFields as any).activeTooltip === 'cap' && (
                  <div className="absolute left-14 top-[10px] flex items-center z-50 pointer-events-none">
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#374151]"></div>
                    <div className="bg-[#374151] text-white text-[11px] font-bold px-3 py-1.5 rounded whitespace-nowrap shadow-md">
                      Candidate Fields
                    </div>
                  </div>
                )}
              </div>

              {/* Profile / User Creation Fields Mapping Option */}
              <div 
                className="relative"
                onMouseEnter={() => setFormFields(prev => ({ ...prev, activeTooltip: 'user' } as any))}
                onMouseLeave={() => setFormFields(prev => ({ ...prev, activeTooltip: null } as any))}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMappingModalOpen(true);
                    setShowQuickSettings(false);
                  }}
                  className="w-12 h-12 bg-slate-700 hover:bg-[#8ebd2d] text-white flex items-center justify-center transition-all cursor-pointer border-t border-slate-500/20"
                >
                  <User className="w-5 h-5" />
                </button>
                {(formFields as any).activeTooltip === 'user' && (
                  <div className="absolute left-14 top-[10px] flex items-center z-50 pointer-events-none">
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#374151]"></div>
                    <div className="bg-[#374151] text-white text-[11px] font-bold px-3 py-1.5 rounded whitespace-nowrap shadow-md">
                      User Creation Fields Mapping
                    </div>
                  </div>
                )}
              </div>

              {/* Plus / Candidate Form Field Keywords Map Option */}
              <div 
                className="relative"
                onMouseEnter={() => setFormFields(prev => ({ ...prev, activeTooltip: 'plus' } as any))}
                onMouseLeave={() => setFormFields(prev => ({ ...prev, activeTooltip: null } as any))}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsKeywordsModalOpen(true);
                    setShowQuickSettings(false);
                  }}
                  className="w-12 h-12 bg-slate-700 hover:bg-[#8ebd2d] text-white flex items-center justify-center transition-all cursor-pointer border-t border-slate-500/20 rounded-b-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
                {(formFields as any).activeTooltip === 'plus' && (
                  <div className="absolute left-14 top-[10px] flex items-center z-50 pointer-events-none">
                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-[#374151]"></div>
                    <div className="bg-[#374151] text-white text-[11px] font-bold px-3 py-1.5 rounded whitespace-nowrap shadow-md">
                      Candidate Form Field Keywords Map
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={handleOpenCreateModal}
              className="bg-[#1e73be] hover:bg-[#1a62a3] text-white font-semibold flex items-center gap-2 rounded px-4 py-2 shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0px] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Recruitment Request
            </Button>
          </div>
          <div className="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            Recruitment &gt; MRF Request
          </div>
        </div>

      {/* Top Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Card 1: Today's Schedule */}
        <Card className="border-t-4 border-t-green-500 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-slate-700">Today's Schedule</CardTitle>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('today')}
              className={`h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer transition-transform duration-500 ${
                isRefreshingToday ? 'animate-spin text-green-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 text-center text-slate-500 italic text-sm">
              No schedule found
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Upcoming Schedule */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-slate-700">Upcoming Schedule</CardTitle>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('upcoming')}
              className={`h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer transition-transform duration-500 ${
                isRefreshingUpcoming ? 'animate-spin text-amber-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 text-center text-slate-500 italic text-sm">
              No schedule found
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Feedback */}
        <Card className="border-t-4 border-t-red-500 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-slate-700">Pending Feedback (Last 5 day's)</CardTitle>
            <RefreshCw 
              onClick={() => handleRefreshSchedule('pending')}
              className={`h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer transition-transform duration-500 ${
                isRefreshingPending ? 'animate-spin text-red-500' : ''
              }`} 
            />
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 text-center text-slate-500 italic text-sm">
              No schedule found
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="mr-number" className="text-xs font-bold text-slate-500 uppercase tracking-wider">MR-Number</Label>
            <Input
              id="mr-number"
              placeholder="1, 2, 3, ......."
              value={searchMrNumber}
              onChange={(e) => setSearchMrNumber(e.target.value)}
              className="h-10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="position" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Position</Label>
            <Select value={selectedPosition} onValueChange={handlePositionFilterChange}>
              <SelectTrigger className="h-10 text-sm bg-slate-50 border-slate-200 text-slate-600">
                <SelectValue placeholder="Position (0)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Position (All)</SelectItem>
                {uniquePositions.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="requested-by" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requested By</Label>
            <Select value={selectedRequestedBy} onValueChange={handleRequestedByFilterChange}>
              <SelectTrigger className="h-10 text-sm bg-slate-50 border-slate-200 text-slate-600">
                <SelectValue placeholder="Employees (0)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Employees (All)</SelectItem>
                {uniqueRequestedBy.map((emp) => (
                  <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSearch}
            className="bg-[#1e73be] hover:bg-[#1a62a3] text-white h-10 w-full md:w-auto font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 mb-[-1px]">
        <button
          onClick={() => setActiveTab('open')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
            activeTab === 'open'
              ? 'bg-white text-slate-800 border-t-green-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
              : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          Open Request
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`px-6 py-2.5 text-sm font-semibold rounded-t-lg border-t-4 transition-all duration-200 ${
            activeTab === 'closed'
              ? 'bg-white text-slate-800 border-t-red-500 border-x border-b-0 border-slate-200 shadow-sm z-10'
              : 'bg-slate-100/70 text-slate-500 border-t-slate-300 border-transparent hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          Closed Request
        </button>
      </div>

      {/* Result Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-b-xl rounded-tr-xl p-5 shadow-sm">
        
        {/* Result Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Result
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
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{item.mrNumber}</td>
                    <td className="p-3.5 text-center relative overflow-visible">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveStagePopoverId(prev => prev === item.id ? null : item.id);
                        }}
                        className="inline-flex items-center justify-center p-1.5 bg-red-100 rounded-full text-red-500 shadow-sm cursor-pointer transition-transform hover:scale-105"
                        title=""
                      >
                        <User className="w-3.5 h-3.5" />
                      </div>

                      {activeStagePopoverId === item.id && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-[70%] top-[40%] bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-left z-50 min-w-[220px] text-slate-700 select-none animate-in fade-in zoom-in-95 duration-150"
                        >
                          {/* Arrow pointing to profile button */}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-white z-50"></div>
                          <div className="absolute top-1/2 -translate-y-1/2 -left-[9px] w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[7px] border-r-slate-200"></div>

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
                            <div>Status : <span className="text-slate-800 font-semibold">In Process</span></div>
                          </div>
                        </div>
                      )}
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
          <div className="flex items-center justify-end gap-1.5 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="h-8 px-2 text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" /> Previous
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <Button
                key={idx}
                variant={currentPage === idx + 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(idx + 1)}
                className={`h-8 w-8 p-0 ${
                  currentPage === idx + 1 
                    ? 'bg-[#1e73be] hover:bg-[#1a62a3] text-white' 
                    : 'text-slate-600 border-slate-200 hover:bg-slate-50'
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
              className="h-8 px-2 text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              Next <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Add / Edit Recruitment Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 mrf-dialog-compact">
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
                      {positions.map(p => (
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
                      <SelectItem value="Trial Company">Trial Company</SelectItem>
                      <SelectItem value="Apponext Tech">Apponext Tech</SelectItem>
                      <SelectItem value="Kosqu Technolab">Kosqu Technolab</SelectItem>
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
                      {locations.map(loc => (
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
                      {departments.map(dept => (
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
                      {grades.map(g => (
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

              {/* Row 5: Experience Desired | Interviewer */}
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

                <div className="space-y-1.5">
                  <Label htmlFor="interviewer" className="text-xs font-bold text-slate-700">
                    Interviewer
                  </Label>
                  <Input
                    id="interviewer"
                    placeholder="Interviewer"
                    value={formFields.interviewer}
                    onChange={(e) => setFormFields(prev => ({ ...prev, interviewer: e.target.value }))}
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

      {/* Read-Only MRF View Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 mrf-dialog-compact">
          {viewingMrf && (
            <div>
              <DialogHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clipboard className="w-5 h-5 text-blue-500" /> MRF Request Details - {viewingMrf.mrNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-1">
                    Submitted on {viewingMrf.requestedOn} by {viewingMrf.requestedBy}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="py-5 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Position Title</span>
                  <span className="font-bold text-slate-800">{viewingMrf.positionTitle}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Department</span>
                  <span className="font-bold text-slate-800">{viewingMrf.department}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Number of Positions</span>
                  <span className="font-bold text-slate-800">{viewingMrf.numberOfPositions}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Recruitment Type</span>
                  <span className="font-bold text-slate-800">{viewingMrf.recruitmentType || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Company</span>
                  <span className="font-bold text-slate-800">{viewingMrf.company}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Location</span>
                  <span className="font-bold text-slate-800">{viewingMrf.companyLocation || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Grade</span>
                  <span className="font-bold text-slate-800">{viewingMrf.grade || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Employment Type</span>
                  <span className="font-bold text-slate-800">{viewingMrf.employmentType || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Qualifications Required</span>
                  <span className="font-bold text-slate-800">{viewingMrf.qualificationRequired || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Experience desired</span>
                  <span className="font-bold text-slate-800">{viewingMrf.experienceDesired || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Interviewer</span>
                  <span className="font-bold text-slate-800">{viewingMrf.interviewer || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Pay Scale</span>
                  <span className="font-bold text-slate-800">
                    {viewingMrf.payScaleForPosition ? `${viewingMrf.payScaleType} (${viewingMrf.payScaleForPosition})` : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Reason for Requirement</span>
                  <span className="font-bold text-slate-800">{viewingMrf.reasonForRequirement || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">List in Job Recruitment Page</span>
                  <span className="font-bold text-slate-800">{viewingMrf.listInJobRecruitmentPage || 'N/A'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Current Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    viewingMrf.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {viewingMrf.status}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-50">
                  <span className="font-semibold text-slate-500">Workflow Stage</span>
                  <span className="font-bold text-slate-800">{viewingMrf.stage}</span>
                </div>
              </div>

              {/* Skills Display */}
              <div className="mb-4">
                <span className="block font-bold text-xs text-slate-500 uppercase tracking-wider mb-1.5">Required Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingMrf.skills?.split(',')?.map((skill, index) => (
                    <span key={index} className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-xs font-medium">
                      {skill.trim()}
                    </span>
                  )) || <span className="text-slate-400 italic">None specified</span>}
                </div>
              </div>

              {/* Comment Display */}
              {viewingMrf.comment && (
                <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="block font-bold text-xs text-slate-500 uppercase tracking-wider mb-1">Comment</span>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingMrf.comment}</p>
                </div>
              )}

              {/* Job Description HTML Display */}
              {viewingMrf.jobDescription && (
                <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
                    <span className="font-bold text-xs text-slate-500 uppercase tracking-wider">Job Description</span>
                  </div>
                  <div 
                    className="p-4 text-sm text-slate-700 prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewingMrf.jobDescription }}
                  />
                </div>
              )}

              <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end">
                <Button 
                  onClick={() => setIsViewOpen(false)}
                  className="bg-[#1e73be] hover:bg-[#1a62a3] text-white font-semibold h-10 px-6"
                >
                  Close Detail
                </Button>
              </DialogFooter>
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
                value={selectedLeft}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedLeft(options);
                }}
                className="w-full h-[220px] border border-slate-300 rounded p-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
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
                  setTempHidden(prev => [...prev, ...selectedLeft]);
                  setTempVisible(prev => prev.filter(k => !selectedLeft.includes(k)));
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
                  setTempVisible(prev => [...prev, ...selectedRight]);
                  setTempHidden(prev => prev.filter(k => !selectedRight.includes(k)));
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
                value={selectedRight}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedRight(options);
                }}
                className="w-full h-[220px] border border-slate-300 rounded p-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
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
                value={selectedCandidateLeft}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedCandidateLeft(options);
                }}
                className="w-full h-[220px] border border-slate-300 rounded p-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
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
                  setTempCandidateHidden(prev => [...prev, ...selectedCandidateLeft]);
                  setTempCandidateVisible(prev => prev.filter(k => !selectedCandidateLeft.includes(k)));
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
                  setTempCandidateVisible(prev => [...prev, ...selectedCandidateRight]);
                  setTempCandidateHidden(prev => prev.filter(k => !selectedCandidateRight.includes(k)));
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
                value={selectedCandidateRight}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedCandidateRight(options);
                }}
                className="w-full h-[220px] border border-slate-300 rounded p-1.5 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 overflow-y-auto bg-white select-none"
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

      </div>
    </div>
  );
};
