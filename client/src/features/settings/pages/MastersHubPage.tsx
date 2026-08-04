import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Award,
  FileText,
  Calendar,
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sliders,
  ShieldCheck,
  Bell,
  Coffee,
  Smile,
  Zap,
  Users,
  Grid,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LocationMasterForm } from '../components/LocationMasterForm';
import { GeneralShiftMasterForm } from '../components/GeneralShiftMasterForm';
import { RosterShiftMasterForm } from '../components/RosterShiftMasterForm';
import { DepartmentMasterForm } from '../components/DepartmentMasterForm';
import { GradeMasterCustomUI } from '../components/GradeMasterCustomUI';
import { EmploymentTypeMasterCustomUI } from '../components/EmploymentTypeMasterCustomUI';
import { DesignationMaster } from '../components/DesignationMaster';
import { CompanyMasterForm, CompanyRecordItem } from '../components/CompanyMasterForm';

// Exact master categories list
export interface MasterCategory {
  id: string;
  name: string;
  icon: any;
  category: 'Core & Structure' | 'Policies & Rules' | 'Templates & System' | 'Events & Planning';
  description: string;
  defaultItemCount: number;
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  { id: 'company', name: 'Company', icon: Building2, category: 'Core & Structure', description: 'Manage company profiles, legal entities, and organization details.', defaultItemCount: 3 },
  { id: 'location', name: 'Location', icon: MapPin, category: 'Core & Structure', description: 'Configure office locations, branches, and geographic sites.', defaultItemCount: 8 },
  { id: 'department', name: 'Department', icon: Layers, category: 'Core & Structure', description: 'Manage organizational departments, divisions, and teams.', defaultItemCount: 12 },
  { id: 'designation', name: 'Designation', icon: Briefcase, category: 'Core & Structure', description: 'Job designations, roles, and title hierarchies.', defaultItemCount: 24 },
  { id: 'general-shift', name: 'General Shift', icon: Clock, category: 'Policies & Rules', description: 'General work shift timings, start/end hours, and attendance rules.', defaultItemCount: 5 },
  { id: 'roster-shift', name: 'Roster Shift', icon: Clock, category: 'Policies & Rules', description: 'Rotational & roster shift patterns, weekly shift rosters, and cycle schedules.', defaultItemCount: 4 },
  { id: 'ot-rule', name: 'OT Rule', icon: Sliders, category: 'Policies & Rules', description: 'Overtime calculation rules, rate multipliers, and cap limits.', defaultItemCount: 3 },
  { id: 'grade', name: 'Grade', icon: Award, category: 'Core & Structure', description: 'Employee pay grades, bands, and seniority levels.', defaultItemCount: 7 },
  { id: 'holiday', name: 'Holiday', icon: Calendar, category: 'Events & Planning', description: 'Holiday calendar schedules, regional lists, and floaters.', defaultItemCount: 14 },
  { id: 'employee-status', name: 'Employee Status', icon: Users, category: 'Core & Structure', description: 'Active, On-Probation, Suspended, and Exit employee states.', defaultItemCount: 5 },
  { id: 'emp-type', name: 'Emp. Type', icon: Users, category: 'Core & Structure', description: 'Employment classification (Full-Time, Contract, Intern, Part-Time).', defaultItemCount: 4 },
  { id: 'events', name: 'Events', icon: Calendar, category: 'Events & Planning', description: 'Company events, town halls, anniversaries, and celebrations.', defaultItemCount: 9 },
  { id: 'notification-templates', name: 'Notification Templates', icon: Bell, category: 'Templates & System', description: 'Email, SMS, and Push notification message templates.', defaultItemCount: 18 },
  { id: 'break', name: 'Break', icon: Coffee, category: 'Policies & Rules', description: 'Break duration limits, meal breaks, and relaxation policies.', defaultItemCount: 3 },
  { id: 'roles-responsibility', name: 'Roles & Responsibility', icon: ShieldCheck, category: 'Templates & System', description: 'RBAC user permissions, access controls, and security roles.', defaultItemCount: 8 },
  { id: 'resource-plan', name: 'Resource Plan', icon: Grid, category: 'Events & Planning', description: 'Headcount planning, project allocation, and resource capacity.', defaultItemCount: 6 },
];

interface MasterItemRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const INITIAL_RECORDS: Record<string, MasterItemRecord[]> = {
  company: [
    { id: 'c1', code: 'HQ-MAIN', name: 'Apponext Technolabs Pvt Ltd', description: 'Primary Headquarters Entity', status: 'Active', createdAt: '2026-01-01' },
    { id: 'c2', code: 'GLOBAL-US', name: 'Apponext Global Inc', description: 'US Subsidiary Operations', status: 'Active', createdAt: '2026-02-15' },
  ],
  location: [
    { id: 'l1', code: 'LOC-HQ', name: 'Main Corporate Office - Tech Park', description: 'Primary headquarters and R&D facility', status: 'Active', createdAt: '2026-01-10' },
    { id: 'l2', code: 'LOC-DEL', name: 'Regional Office - Delhi NCR', description: 'Sales and North Region Support Operations', status: 'Active', createdAt: '2026-02-01' },
  ],
  'custom-query-cron': [
    { id: 'qc1', code: 'CRON-EXPIRY', name: 'Leave Expiry & Comp-off Check', description: 'Runs daily at 00:05 AM to expire elapsed comp-offs', status: 'Active', createdAt: '2026-03-01' },
    { id: 'qc2', code: 'CRON-AUTO-CO', name: 'Auto Check-Out Reconciliation', description: 'Runs nightly at 11:30 PM for open shift sessions', status: 'Active', createdAt: '2026-03-10' },
  ],
  department: [
    { id: 'd1', code: 'ENG-01', name: 'Engineering & Development', description: 'Software Product Engineering and QA Team', status: 'Active', createdAt: '2026-01-05' },
    { id: 'd2', code: 'HR-01', name: 'Human Resources & Talent', description: 'Talent Acquisition, People Operations, and Compliance', status: 'Active', createdAt: '2026-01-05' },
    { id: 'd3', code: 'SALES-01', name: 'Enterprise Sales', description: 'Global Business Development and Account Management', status: 'Active', createdAt: '2026-01-08' },
  ],
  designation: [
    { id: 'des1', code: 'SE-02', name: 'Senior Software Engineer', description: 'Lead developer for core system modules', status: 'Active', createdAt: '2026-01-10' },
    { id: 'des2', code: 'HRM-01', name: 'HR Manager', description: 'People operations manager', status: 'Active', createdAt: '2026-01-10' },
  ],
  policy: [
    { id: 'p1', code: 'POL-LEAVE', name: 'Standard Leave Policy 2026', description: 'Annual Paid Leaves, Sick Leaves, and Encashment', status: 'Active', createdAt: '2026-01-01' },
    { id: 'p2', code: 'POL-REMOTE', name: 'Hybrid & Remote Work Policy', description: 'Rules for WFH allowances and tracking', status: 'Active', createdAt: '2026-02-10' },
  ],
  shift: [
    { id: 's1', code: 'SHIFT-GEN', name: 'General Shift (09:00 AM - 06:00 PM)', description: 'Standard 9-hour business shift', status: 'Active', createdAt: '2026-01-01' },
    { id: 's2', code: 'SHIFT-EVE', name: 'Evening Support Shift (02:00 PM - 11:00 PM)', description: 'US & Europe client alignment shift', status: 'Active', createdAt: '2026-01-15' },
  ],
  'ot-rule': [
    { id: 'ot1', code: 'OT-STD', name: 'Standard 1.5x Multiplier Overtime', description: 'Calculates 150% hourly rate beyond 45 weekly hours', status: 'Active', createdAt: '2026-02-01' },
  ],
  grade: [
    { id: 'g1', code: 'GRD-L1', name: 'Grade L1 - Associate / Junior', description: 'Entry level workforce band', status: 'Active', createdAt: '2026-01-01' },
    { id: 'g2', code: 'GRD-L2', name: 'Grade L2 - Senior Specialist', description: 'Mid to senior individual contributor band', status: 'Active', createdAt: '2026-01-01' },
    { id: 'g3', code: 'GRD-L3', name: 'Grade L3 - Management & Lead', description: 'Team leads and department managers band', status: 'Active', createdAt: '2026-01-01' },
  ],
  holiday: [
    { id: 'h1', code: 'HOL-NEWYEAR', name: 'New Year Day', description: 'National Holiday (Jan 01)', status: 'Active', createdAt: '2026-01-01' },
    { id: 'h2', code: 'HOL-IND', name: 'Independence Day', description: 'Gazetted National Holiday (Aug 15)', status: 'Active', createdAt: '2026-01-01' },
  ],
  'employee-status': [
    { id: 'es1', code: 'ST-ACT', name: 'Active', description: 'Employee currently employed and active', status: 'Active', createdAt: '2026-01-01' },
    { id: 'es2', code: 'ST-PROB', name: 'On Probation', description: 'Newly joined employee undergoing probation evaluation', status: 'Active', createdAt: '2026-01-01' },
    { id: 'es3', code: 'ST-NOT', name: 'Serving Notice', description: 'Resigned employee serving notice period', status: 'Active', createdAt: '2026-01-01' },
  ],
  'emp-type': [
    { id: 'et1', code: 'ET-FT', name: 'Full-Time Permanent', description: 'Regular full-time staff member', status: 'Active', createdAt: '2026-01-01' },
    { id: 'et2', code: 'ET-CON', name: 'Contractor / Vendor', description: 'Fixed term fixed scope vendor contractor', status: 'Active', createdAt: '2026-01-01' },
    { id: 'et3', code: 'ET-INT', name: 'Intern', description: 'Trainee or student intern', status: 'Active', createdAt: '2026-01-01' },
  ],
  events: [
    { id: 'ev1', code: 'EVT-TOWNHALL', name: 'Quarterly All-Hands Townhall', description: 'All-company strategy and recognition meeting', status: 'Active', createdAt: '2026-03-01' },
  ],
  'notification-templates': [
    { id: 'nt1', code: 'NOTIF-LEAVE-APP', name: 'Leave Application Submitted', description: 'Notification sent to manager when leave is requested', status: 'Active', createdAt: '2026-01-10' },
    { id: 'nt2', code: 'NOTIF-COMP-EXP', name: 'Comp-Off Expiry Alert', description: 'Alert sent when earned comp-off hours are expiring', status: 'Active', createdAt: '2026-01-10' },
  ],
  templates: [
    { id: 't1', code: 'TMP-OFFER', name: 'Standard Employment Offer Letter', description: 'PDF template for candidate job offer letters', status: 'Active', createdAt: '2026-01-15' },
    { id: 't2', code: 'TMP-EXP', name: 'Experience & Relieving Certificate', description: 'Exit document template', status: 'Active', createdAt: '2026-01-15' },
  ],
  break: [
    { id: 'b1', code: 'BRK-LUNCH', name: 'Lunch Break (45 Mins)', description: 'Standard afternoon lunch break window', status: 'Active', createdAt: '2026-01-01' },
    { id: 'b2', code: 'BRK-TEA', name: 'Tea & Coffee Break (15 Mins)', description: 'Short morning/evening relaxation break', status: 'Active', createdAt: '2026-01-01' },
  ],
  'roles-responsibility': [
    { id: 'rr1', code: 'ROLE-ADMIN', name: 'Organization Admin', description: 'Full administrative access across all tenant configurations', status: 'Active', createdAt: '2026-01-01' },
    { id: 'rr2', code: 'ROLE-HR', name: 'HR Manager', description: 'HR Operations, Leaves, Payroll, and Employee Management', status: 'Active', createdAt: '2026-01-01' },
    { id: 'rr3', code: 'ROLE-MGR', name: 'Department Manager', description: 'Team approvals, timelog reviews, and performance evaluations', status: 'Active', createdAt: '2026-01-01' },
  ],
  'resource-plan': [
    { id: 'rp1', code: 'RP-2026-Q3', name: 'Q3 Engineering Capacity Plan', description: 'Headcount and project allocation planning for Q3 2026', status: 'Active', createdAt: '2026-03-15' },
  ],
  'happiness-index-setting': [
    { id: 'hi1', code: 'HI-MOOD-DAILY', name: 'Daily Mood Check-in Survey', description: '1-click daily mood feedback prompt on employee dashboard', status: 'Active', createdAt: '2026-02-01' },
    { id: 'hi2', code: 'HI-ENPS-MONTHLY', name: 'Monthly eNPS Pulse Poll', description: 'Monthly employee net promoter score survey', status: 'Active', createdAt: '2026-02-01' },
  ],
};

export function MastersHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const [selectedMasterId, setSelectedMasterId] = useState<string>('company');

  useEffect(() => {
    if (tabFromUrl && MASTER_CATEGORIES.some(m => m.id === tabFromUrl)) {
      setSelectedMasterId(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleSelectMaster = (id: string) => {
    setSelectedMasterId(id);
    setSearchParams({ tab: id });
    setSearchQuery('');
  };
  const [fullCompanyRecords, setFullCompanyRecords] = useState<CompanyRecordItem[]>([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await apiClient.get('/settings/companies');
        if (res.data?.success && Array.isArray(res.data.data)) {
          const mapped: CompanyRecordItem[] = res.data.data.map((c: any) => ({
            id: String(c.companyId || c.company_id || c.id || c.uuid),
            code: c.code || '',
            name: c.name || '',
            employerName: c.employerName || c.employer_name || '',
            classOfEstablishment: c.classOfEstablishment || c.class_of_establishment || '',
            addressLine1: c.addressLine1 || c.addressLine_1 || c.address_line_1 || '',
            addressLine2: c.addressLine2 || c.addressLine_2 || c.address_line_2 || '',
            country: c.country || 'India',
            zipCode: c.zipCode || c.zip_code || '',
            state: c.state || '',
            city: c.city || '',
            panTin: c.panTin || c.pan_tin || '',
            contactNumber: c.contactNumber || c.contact_number || '',
            email: c.email || '',
            logo: c.logo || '',
            companyStamp: c.companyStamp || c.company_stamp || '',
            signature: c.signature || '',
            isActiveToggle: c.isActiveToggle === 1 || c.isActiveToggle === true || c.is_active_toggle === 1 || c.is_active_toggle === true,
            activeUsersToggle: c.activeUsersToggle === 1 || c.activeUsersToggle === true || c.active_users_toggle === 1 || c.active_users_toggle === true,
            loginPageLogoToggle: c.loginPageLogoToggle === 1 || c.loginPageLogoToggle === true || c.login_page_logo_toggle === 1 || c.login_page_logo_toggle === true,
            status: c.status || 'Active',
          }));
          setFullCompanyRecords(mapped);
        }
      } catch (err) {
        console.error('Failed to load companies in MastersHubPage:', err);
      }
    };
    fetchCompanies();
  }, []);

  const handleCompanySave = (saved: CompanyRecordItem) => {
    setFullCompanyRecords((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      if (exists) {
        return prev.map((item) => (item.id === saved.id ? saved : item));
      }
      return [saved, ...prev];
    });
    setIsAddModalOpen(false);
  };

  const [records, setRecords] = useState<Record<string, MasterItemRecord[]>>(INITIAL_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'code'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterItemRecord | null>(null);

  // New/Edit Record Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  const selectedMaster = useMemo(() => {
    return MASTER_CATEGORIES.find(m => m.id === selectedMasterId) || MASTER_CATEGORIES[0];
  }, [selectedMasterId]);

  const filteredCategories = useMemo(() => {
    if (categoryFilter === 'all') return MASTER_CATEGORIES;
    return MASTER_CATEGORIES.filter(m => m.category === categoryFilter);
  }, [categoryFilter]);

  const currentRecords = useMemo(() => {
    let list = records[selectedMasterId] || [];

    // Filter by Status (All / Active / Inactive)
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    // Filter by Search Query
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();

    return list.filter(r => {
      if (searchField === 'name') {
        return r.name.toLowerCase().includes(q);
      }
      if (searchField === 'code') {
        return r.code.toLowerCase().includes(q);
      }
      // 'all' searches both Company/Branch Name and Code
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
      );
    });
  }, [records, selectedMasterId, searchQuery, searchField, statusFilter]);

  const handleOpenAddModal = (record?: MasterItemRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormCode(record.code);
      setFormName(record.name);
      setFormDescription(record.description);
      setFormStatus(record.status);
    } else {
      setEditingRecord(null);
      setFormCode(`${selectedMaster.id.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
      setFormName('');
      setFormDescription('');
      setFormStatus('Active');
    }
    setIsAddModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingRecord) {
      // Update existing record
      setRecords(prev => ({
        ...prev,
        [selectedMasterId]: (prev[selectedMasterId] || []).map(item =>
          item.id === editingRecord.id
            ? { ...item, code: formCode, name: formName, description: formDescription, status: formStatus }
            : item
        )
      }));
    } else {
      // Add new record
      const newRec: MasterItemRecord = {
        id: `rec-${Date.now()}`,
        code: formCode || `MST-${Date.now()}`,
        name: formName,
        description: formDescription,
        status: formStatus,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setRecords(prev => ({
        ...prev,
        [selectedMasterId]: [newRec, ...(prev[selectedMasterId] || [])]
      }));
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Are you sure you want to delete this master record?')) {
      setRecords(prev => ({
        ...prev,
        [selectedMasterId]: (prev[selectedMasterId] || []).filter(item => item.id !== id)
      }));
    }
  };

  const handleToggleStatus = (id: string) => {
    setRecords(prev => ({
      ...prev,
      [selectedMasterId]: (prev[selectedMasterId] || []).map(item =>
        item.id === id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item
      )
    }));
  };

  const IconComponent = selectedMaster.icon;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Masters Management
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Centralized management hub for all 19 system master configuration tables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenAddModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 h-10 shadow-sm flex items-center gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Add {selectedMaster.name}
          </Button>
        </div>
      </div>


      {selectedMasterId === 'grade' ? (
        <GradeMasterCustomUI />
      ) : selectedMasterId === 'emp-type' ? (
        <EmploymentTypeMasterCustomUI />
      ) : selectedMasterId === 'company' ? (
        <CompanyMasterForm
          companiesList={fullCompanyRecords}
          onCancel={() => handleSelectMaster('company')}
          onSave={handleCompanySave}
        />
      ) : selectedMasterId === 'location' ? (
        <LocationMasterForm
          onCancel={() => handleSelectMaster('company')}
          onSave={(data) => {
            const newRec: MasterItemRecord = {
              id: `loc-${Date.now()}`,
              code: `LOC-${Math.floor(100 + Math.random() * 900)}`,
              name: data.locationName || 'New Office Location',
              description: `${data.officeType} - ${data.city}, ${data.state}`,
              status: data.isActive ? 'Active' : 'Inactive',
              createdAt: new Date().toISOString().split('T')[0]
            };
            setRecords(prev => ({
              ...prev,
              location: [newRec, ...(prev.location || [])]
            }));
          }}
        />
      ) : (selectedMasterId === 'general-shift' || selectedMasterId === 'shift') ? (
        <GeneralShiftMasterForm
          onCancel={() => handleSelectMaster('company')}
        />
      ) : selectedMasterId === 'roster-shift' ? (
        <RosterShiftMasterForm
          onCancel={() => handleSelectMaster('company')}
        />
      ) : selectedMasterId === 'department' ? (
        <DepartmentMasterForm
          onCancel={() => handleSelectMaster('company')}
        />
      ) : selectedMasterId === 'designation' ? (
        <DesignationMaster onCancel={() => handleSelectMaster('company')} />
      ) : (
        /* Active Master Details Card & Actions Bar */
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary text-white">
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{selectedMaster.name}</h2>
                  <Badge variant="outline" className="text-[11px] font-semibold">
                    {selectedMaster.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedMaster.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Field Filter Dropdown: Name and Code only */}
              <select
                value={searchField}
                onChange={e => setSearchField(e.target.value as 'all' | 'name' | 'code')}
                className="h-9 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                title="Filter search by field"
              >
                <option value="all">All</option>
                <option value="name">{selectedMaster.name} Name</option>
                <option value="code">{selectedMaster.name} Code</option>
              </select>

              {/* Search Term Input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search term..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-background rounded-xl"
                />
              </div>

              {/* Status Filter Dropdown: All, Active, Inactive */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive')}
                className="h-9 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                title="Filter by status"
              >
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Master Records Data Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs font-medium text-foreground">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">{selectedMaster.name} Name</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {currentRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-primary">
                      {rec.code}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {rec.name}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                      {rec.description || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(rec.id)}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        {rec.status === 'Active' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {rec.createdAt}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                          onClick={() => handleOpenAddModal(rec)}
                          title="Edit Master Record"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                          onClick={() => handleDeleteRecord(rec.id)}
                          title="Delete Master Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {currentRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <IconComponent className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground">No {selectedMaster.name} records found</p>
                        <p className="text-xs text-muted-foreground">Click below to add a new record to this master list.</p>
                        <Button
                          onClick={() => handleOpenAddModal()}
                          size="sm"
                          className="mt-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add {selectedMaster.name} Record
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Master Record Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className={cn(
          "p-6 rounded-2xl border border-border bg-card shadow-xl overflow-y-auto max-h-[90vh]",
          selectedMasterId === 'company' ? "sm:max-w-[900px] lg:max-w-[1050px]" : "sm:max-w-[460px]"
        )}>
          <DialogHeader className="border-b border-border pb-3 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-primary" />
              <span>{editingRecord ? `Edit ${selectedMaster.name}` : `Add New ${selectedMaster.name}`}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedMasterId === 'company' ? (
            <CompanyMasterForm
              hideFiltersAndList={true}
              isNew={!editingRecord}
              companiesList={fullCompanyRecords}
              onCancel={() => setIsAddModalOpen(false)}
              onSave={handleCompanySave}
            />
          ) : (
            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Record Code</label>
                <Input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="e.g. MST-001"
                  className="text-xs h-9 font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">{selectedMaster.name} Name</label>
                <Input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder={`Enter ${selectedMaster.name} Name`}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={`Brief description for this ${selectedMaster.name} record...`}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full h-9 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl px-5"
                >
                  {editingRecord ? 'Update Record' : 'Save Record'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default MastersHubPage;
