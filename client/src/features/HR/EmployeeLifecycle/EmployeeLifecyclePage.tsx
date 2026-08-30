import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  ArrowLeftRight,
  UserMinus,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  RefreshCw,
  Building2,
  Briefcase,
  MapPin,
  UserCheck,
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  FileCheck,
  Edit,
  Send,
  MoreVertical,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { lifecycleApi, EmployeeLifecycleSummary, EmployeeLifecycleDetails } from './api/lifecycleApi';
import { ChronologicalLifecycleFlow } from './components/ChronologicalLifecycleFlow';
import { useCompanyStore } from '@/features/settings/store/companyStore';

import { useLocation } from 'react-router-dom';
import {
  useLifecycleCustomizationStore,
  AVAILABLE_LIFECYCLE_KPIS,
} from '@/features/employee-lifecycle/store/lifecycleCustomizationStore';

export default function EmployeeLifecyclePage() {
  const location = useLocation();
  const { config: customConfig } = useLifecycleCustomizationStore();
  const { selectedCompanyId } = useCompanyStore();
  const [employees, setEmployees] = useState<EmployeeLifecycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState<string>(selectedCompanyId ? String(selectedCompanyId) : '');
  const [deptFilter, setDeptFilter] = useState('all');
  const [desigFilter, setDesigFilter] = useState('all');
  const [empTypeFilter, setEmpTypeFilter] = useState('all');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const hasInitializedCompanyRef = useRef(false);

  // Top-Level Main View Tab State
  const [mainViewTab, setMainViewTab] = useState<'directory' | 'onboarding' | 'transfers' | 'offboarding'>('directory');

  // React to URL pathname changes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/onboarding')) {
      setStageFilter('onboarding');
      setMainViewTab('onboarding');
    } else if (path.includes('/offboarding')) {
      setStageFilter('notice');
      setMainViewTab('offboarding');
    } else if (path.includes('/transfers')) {
      setStageFilter('all');
      setMainViewTab('transfers');
    } else {
      setStageFilter('all');
    }
  }, [location.pathname]);

  // Metadata Dropdown Options
  const [companies, setCompanies] = useState<Array<{ id: number; name: string; isParent?: boolean }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [designations, setDesignations] = useState<Array<{ id: number; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [managers, setManagers] = useState<Array<{ id: number; name: string; designation?: string; department?: string }>>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<Array<{ id: number; name: string }>>([]);

  // Selected Employee & Detail Modal
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [empDetails, setEmpDetails] = useState<EmployeeLifecycleDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetEmp, setTransferTargetEmp] = useState<EmployeeLifecycleSummary | null>(null);
  const [transferForm, setTransferForm] = useState({
    toDepartmentId: '',
    toDesignationId: '',
    toLocationId: '',
    toReportingManagerId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    transferType: 'department_change',
    transferReason: '',
    notes: '',
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Edit Onboarding Modal State
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    interviewerName: '',
    onboardedByName: '',
    interviewDate: '',
    interviewRating: '4.5 / 5',
    interviewNotes: '',
    joiningDate: '',
    probationEndDate: '',
    orientationCompleted: false,
    documentsVerified: false,
    welcomeKitIssued: false,
    notes: '',
  });

  // Edit Offboarding Modal State
  const [offboardingModalOpen, setOffboardingModalOpen] = useState(false);
  const [offboardingForm, setOffboardingForm] = useState({
    exitType: 'resignation',
    resignationDate: '',
    noticePeriodDays: '30',
    relievingDate: '',
    lastWorkingDay: '',
    exitInterviewerName: '',
    exitReason: '',
    exitNotes: '',
    assetsReturned: false,
    fnfStatus: 'pending',
    updateEmployeeStatus: 'notice' as 'notice' | 'exit' | 'alumni' | 'active',
  });

  // Fetch Employees List & Dropdown Meta
  const fetchLifecycleData = async () => {
    try {
      setLoading(true);
      const effectiveCompanyId = companyFilter === 'all'
        ? 'all'
        : (companyFilter || (selectedCompanyId ? String(selectedCompanyId) : undefined));

      const data = await lifecycleApi.getSummaries({
        search,
        stage: stageFilter,
        departmentId: deptFilter !== 'all' ? Number(deptFilter) : undefined,
        companyId: effectiveCompanyId,
      });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load employee lifecycle directory');
      console.error(err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadataOptions = async () => {
    try {
      const [deptRes, locRes, desigRes, compRes] = await Promise.all([
        apiClient.get('/departments').catch(() => apiClient.get('/settings/departments')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/locations').catch(() => apiClient.get('/attendance/locations')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/designations').catch(() => apiClient.get('/designations')).catch(() => apiClient.get('/reports/options')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/companies').catch(() => ({ data: { data: [] } })),
      ]);

      const deptList = deptRes.data?.data || deptRes.data || [];
      const locList = locRes.data?.data || locRes.data || [];
      
      let desigList: any[] = [];
      if (Array.isArray(desigRes.data?.data)) {
        desigList = desigRes.data.data;
      } else if (Array.isArray(desigRes.data)) {
        desigList = desigRes.data;
      } else if (Array.isArray(desigRes.data?.data?.designations)) {
        desigList = desigRes.data.data.designations;
      } else if (Array.isArray(desigRes.data?.designations)) {
        desigList = desigRes.data.designations;
      }

      const compList = Array.isArray(compRes.data?.data)
        ? compRes.data.data
        : Array.isArray(compRes.data)
        ? compRes.data
        : [];

      if (deptList.length > 0) {
        setDepartments(deptList.map((d: any) => ({ id: Number(d.id), name: d.name })));
      }
      if (locList.length > 0) {
        setLocations(locList.map((l: any) => ({ id: Number(l.id), name: l.locationName || l.location_name || l.name })));
      }
      if (desigList.length > 0) {
        setDesignations(desigList.map((d: any) => ({ id: Number(d.id), name: d.name || d.designation_name || d.designationName })));
      } else {
        setDesignations([
          { id: 9, name: 'Senior Manager' },
          { id: 10, name: 'Manager' },
          { id: 11, name: 'Senior Developer' },
          { id: 12, name: 'Developer' },
          { id: 13, name: 'HR Manager' },
          { id: 14, name: 'Sales Manager' },
          { id: 15, name: 'Finance Manager' },
          { id: 16, name: 'Operations Manager' },
          { id: 17, name: 'Software Development Intern' },
          { id: 18, name: 'SDE' },
          { id: 19, name: 'Senior CS' },
          { id: 20, name: 'STE' },
        ]);
      }

      if (compList.length > 0) {
        const mappedComps = compList.map((c: any) => ({
          id: Number(c.companyId ?? c.company_id ?? c.id),
          name: c.name || 'Unnamed Company',
          isParent: Boolean(c.isParent ?? c.is_parent)
        }));
        setCompanies(mappedComps);
      }

      // Fetch Managers for Interviewer & Reporting dropdowns
      const mgrList = await lifecycleApi.getManagers().catch(() => []);
      if (Array.isArray(mgrList) && mgrList.length > 0) {
        setManagers(mgrList);
      }
    } catch (err) {
      console.warn('Metadata load error:', err);
    }
  };

  // Sync company filter with currently selected company in topbar switcher (handles null when switching back to Organization)
  useEffect(() => {
    if (companyFilter !== 'all') {
      setCompanyFilter(selectedCompanyId ? String(selectedCompanyId) : '');
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    fetchLifecycleData();
  }, [search, stageFilter, deptFilter, desigFilter, empTypeFilter, companyFilter]);

  useEffect(() => {
    fetchMetadataOptions();
  }, []);

  // Fetch Single Employee Detailed Lifecycle
  const handleOpenDetails = async (empId: number, tab: string = 'overview') => {
    try {
      setSelectedEmpId(empId);
      setActiveTab(tab);
      setDetailsModalOpen(true);
      setDetailsLoading(true);
      const data = await lifecycleApi.getDetails(empId);
      setEmpDetails(data);
    } catch (err: any) {
      toast.error('Failed to fetch lifecycle details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Transfer Modal
  const handleOpenTransferModal = (emp: EmployeeLifecycleSummary) => {
    setTransferTargetEmp(emp);
    setTransferForm({
      toDepartmentId: emp.departmentId ? String(emp.departmentId) : '',
      toDesignationId: emp.designationId ? String(emp.designationId) : '',
      toLocationId: emp.currentLocationId ? String(emp.currentLocationId) : '',
      toReportingManagerId: emp.reportingManagerId ? String(emp.reportingManagerId) : '',
      effectiveDate: new Date().toISOString().split('T')[0],
      transferType: 'department_change',
      transferReason: '',
      notes: '',
    });
    setTransferModalOpen(true);
  };

  // Execute Employee Transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetEmp) return;

    try {
      setTransferSubmitting(true);
      await lifecycleApi.transferEmployee({
        employeeId: transferTargetEmp.id,
        toDepartmentId: transferForm.toDepartmentId ? Number(transferForm.toDepartmentId) : undefined,
        toDesignationId: transferForm.toDesignationId ? Number(transferForm.toDesignationId) : undefined,
        toLocationId: transferForm.toLocationId ? Number(transferForm.toLocationId) : undefined,
        toReportingManagerId: transferForm.toReportingManagerId ? Number(transferForm.toReportingManagerId) : undefined,
        effectiveDate: transferForm.effectiveDate,
        transferType: transferForm.transferType,
        transferReason: transferForm.transferReason,
        notes: transferForm.notes,
      });

      toast.success(`Employee ${transferTargetEmp.name} transferred successfully!`);
      setTransferModalOpen(false);
      fetchLifecycleData();
      if (selectedEmpId === transferTargetEmp.id) {
        handleOpenDetails(transferTargetEmp.id, 'transfers');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Employee transfer failed');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Open Onboarding Edit Modal
  const handleOpenOnboardingEdit = () => {
    if (!empDetails) return;
    const ob = empDetails.onboarding;
    setOnboardingForm({
      interviewerName: ob.interviewerName || '',
      onboardedByName: ob.onboardedByName || '',
      interviewDate: ob.interviewDate || '',
      interviewRating: ob.interviewRating || '4.5 / 5',
      interviewNotes: ob.interviewNotes || '',
      joiningDate: ob.joiningDate || empDetails.profile.joiningDate || '',
      probationEndDate: ob.probationEndDate || '',
      orientationCompleted: ob.orientationCompleted,
      documentsVerified: ob.documentsVerified,
      welcomeKitIssued: ob.welcomeKitIssued,
      notes: ob.notes || '',
    });
    setOnboardingModalOpen(true);
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      await lifecycleApi.saveOnboarding(selectedEmpId, onboardingForm);
      toast.success('Onboarding records updated successfully!');
      setOnboardingModalOpen(false);
      handleOpenDetails(selectedEmpId, 'onboarding');
      fetchLifecycleData();
    } catch (err: any) {
      toast.error('Failed to update onboarding details');
    }
  };

  // Open Offboarding Edit Modal
  const handleOpenOffboardingEdit = () => {
    if (!empDetails) return;
    const off = empDetails.offboarding;
    setOffboardingForm({
      exitType: off?.exitType || 'resignation',
      resignationDate: off?.resignationDate || '',
      noticePeriodDays: String(off?.noticePeriodDays || 30),
      relievingDate: off?.relievingDate || '',
      lastWorkingDay: off?.lastWorkingDay || '',
      exitInterviewerName: off?.exitInterviewerName || '',
      exitReason: off?.exitReason || '',
      exitNotes: off?.exitNotes || '',
      assetsReturned: off?.assetsReturned || false,
      fnfStatus: off?.fnfStatus || 'pending',
      updateEmployeeStatus: (empDetails.profile.lifecycleStatus as any) || 'notice',
    });
    setOffboardingModalOpen(true);
  };

  const handleSaveOffboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    try {
      await lifecycleApi.saveOffboarding(selectedEmpId, {
        ...offboardingForm,
        noticePeriodDays: Number(offboardingForm.noticePeriodDays),
      });
      toast.success('Offboarding records updated successfully!');
      setOffboardingModalOpen(false);
      handleOpenDetails(selectedEmpId, 'offboarding');
      fetchLifecycleData();
    } catch (err: any) {
      toast.error('Failed to update offboarding details');
    }
  };

  // Compute Metrics Summary dynamically from store configuration
  const kpiValues: Record<string, number> = {
    total_workforce: employees.length,
    in_onboarding: employees.filter(e => e.lifecycleStatus === 'onboarding' || e.lifecycleStatus === 'probation' || (e.onboarding && Object.keys(e.onboarding).length > 0)).length,
    transferred_events: employees.reduce((acc, e) => acc + (e.transfersCount || 0), 0),
    notice_exits: employees.filter(e => e.lifecycleStatus === 'notice' || e.lifecycleStatus === 'exit' || e.lifecycleStatus === 'alumni' || (e.offboarding && Object.keys(e.offboarding).length > 0)).length,
    active_workforce: employees.filter(e => e.lifecycleStatus === 'active').length,
    in_probation: employees.filter(e => e.lifecycleStatus === 'probation').length,
    confirmed_staff: employees.filter(e => e.lifecycleStatus === 'active' && !(e.onboarding as any)?.probationEndDate).length,
    exits_completed: employees.filter(e => e.lifecycleStatus === 'exit' || e.lifecycleStatus === 'alumni').length,
    dept_movements: employees.filter(e => e.transfersCount > 0).length,
    location_transfers: employees.filter(e => e.transfersCount > 0 && e.locationName).length,
    promotion_upgrades: employees.filter(e => e.transfersCount > 0).length,
  };

  const activeKpiList = AVAILABLE_LIFECYCLE_KPIS.filter(k => customConfig.kpis[k.id]);

  const filteredEmployees = employees.filter((emp: any) => {
    if (desigFilter !== 'all' && String(emp.designationName || emp.designationId || '') !== desigFilter) return false;
    if (empTypeFilter !== 'all' && emp.employmentType !== empTypeFilter) return false;
    return true;
  });

  const activeFiltersCount = [
    companyFilter !== 'all',
    stageFilter !== 'all',
    deptFilter !== 'all',
    desigFilter !== 'all',
    empTypeFilter !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setCompanyFilter('all');
    setStageFilter('all');
    setDeptFilter('all');
    setDesigFilter('all');
    setEmpTypeFilter('all');
  };

  const formatDate = (dStr?: string | null) => {
    if (!dStr || dStr === 'N/A') return '—';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return String(dStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(dStr);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'onboarding':
      case 'probation':
        return <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-bold">Onboarding</Badge>;
      case 'active':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">Active</Badge>;
      case 'notice':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">In Notice Period</Badge>;
      case 'exit':
      case 'alumni':
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold">Offboarded / Exit</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] font-bold">{status.toUpperCase()}</Badge>;
    }
  };

  const onboardingEmployees = employees.filter(emp =>
    (emp.onboarding && Object.keys(emp.onboarding).length > 0)
    || emp.lifecycleStatus === 'onboarding'
    || emp.lifecycleStatus === 'probation'
  );

  const transferEmployees = employees.filter(emp => emp.transfersCount > 0);

  const offboardingEmployees = employees.filter(emp =>
    (emp.offboarding && Object.keys(emp.offboarding).length > 0 && emp.offboarding.exitType)
    || emp.lifecycleStatus === 'notice'
    || emp.lifecycleStatus === 'exit'
    || emp.lifecycleStatus === 'alumni'
  );

  const cols = customConfig.tableColumns;
  const filters = customConfig.filters;
  const onbCols = customConfig.onboardingColumns || {
    employeeNameAvatar: true,
    employeeCode: true,
    interviewer: true,
    hrOnboarder: true,
    joiningDate: true,
    probationEndDate: true,
    orientationStatus: true,
    welcomeKitStatus: true,
    documentsStatus: true,
    interviewScore: true,
    lifecycleStage: true,
    actions: true,
    actionEditOnboarding: true,
  };

  const trfCols = customConfig.transferColumns || {
    employeeNameAvatar: true,
    employeeCode: true,
    department: true,
    designation: true,
    location: true,
    reportingManager: true,
    transfersCount: true,
    lastTransferDate: true,
    transferReason: true,
    actions: true,
    actionViewLog: true,
    actionExecuteTransfer: true,
  };

  const offbCols = customConfig.offboardingColumns || {
    employeeNameAvatar: true,
    employeeCode: true,
    department: true,
    exitType: true,
    resignationDate: true,
    lastWorkingDay: true,
    noticePeriodDays: true,
    exitReason: true,
    exitInterviewer: true,
    assetsReturned: true,
    fnfStatus: true,
    lifecycleStage: true,
    actions: true,
    actionEditOffboarding: true,
  };

  const customFields = customConfig.customFields || {
    directory: [],
    onboarding: [],
    transfers: [],
    offboarding: [],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans select-none pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Employee Lifecycle Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Complete employee directory with onboarding records, interviewer details, transfer actions, and offboarding history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLifecycleData} className="gap-2 text-xs font-bold rounded-xl h-9 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Directory
          </Button>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      {activeKpiList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {activeKpiList.map((kpi) => {
            const count = kpiValues[kpi.id] ?? 0;
            return (
              <Card key={kpi.id} className="border rounded-2xl shadow-xs bg-card hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block truncate">
                      {kpi.label}
                    </span>
                    <span className="text-2xl font-black text-foreground mt-0.5 block">{count}</span>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    {kpi.icon === 'Users' && <Users className="w-5 h-5" />}
                    {kpi.icon === 'UserPlus' && <UserPlus className="w-5 h-5" />}
                    {kpi.icon === 'ArrowLeftRight' && <ArrowLeftRight className="w-5 h-5" />}
                    {kpi.icon === 'UserMinus' && <UserMinus className="w-5 h-5" />}
                    {kpi.icon === 'UserCheck' && <UserCheck className="w-5 h-5" />}
                    {kpi.icon === 'Clock' && <Clock className="w-5 h-5" />}
                    {kpi.icon === 'ShieldCheck' && <ShieldCheck className="w-5 h-5" />}
                    {kpi.icon === 'FileCheck' && <FileCheck className="w-5 h-5" />}
                    {kpi.icon === 'Building2' && <Building2 className="w-5 h-5" />}
                    {kpi.icon === 'MapPin' && <MapPin className="w-5 h-5" />}
                    {kpi.icon === 'Briefcase' && <Briefcase className="w-5 h-5" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── DEDICATED TOP LIFECYCLE TABS NAVIGATION ─── */}
      <Tabs value={mainViewTab} onValueChange={(val: any) => setMainViewTab(val)} className="w-full space-y-4">
        <div className="bg-card border border-border/80 rounded-2xl p-1.5 shadow-sm">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-transparent gap-1.5 h-auto p-0">
            <TabsTrigger
              value="directory"
              className="rounded-xl text-xs font-black py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
            >
              <Users className="w-4 h-4" /> Employee Directory
            </TabsTrigger>
            <TabsTrigger
              value="onboarding"
              className="rounded-xl text-xs font-black py-2.5 data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
            >
              <UserPlus className="w-4 h-4" /> Onboarding &amp; Interview Audit
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="rounded-xl text-xs font-black py-2.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" /> Transfer Audit History
            </TabsTrigger>
            <TabsTrigger
              value="offboarding"
              className="rounded-xl text-xs font-black py-2.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all gap-2"
            >
              <UserMinus className="w-4 h-4" /> Offboarding &amp; Exit Records
            </TabsTrigger>
          </TabsList>
        </div>

        {/* FILTER & SEARCH CONTROL BAR */}
        <Card className="border rounded-2xl shadow-xs bg-card p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {filters.searchBar && (
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employee by name, code, email, designation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-8 h-10 rounded-xl text-xs font-semibold bg-background border-border"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <Button
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`gap-2 h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-white text-indigo-600">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Filters:</span>
                {companyFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                    Company: {companies.find(c => String(c.id) === companyFilter)?.name || companyFilter}
                    <X className="w-3 h-3 cursor-pointer hover:opacity-80" onClick={() => setCompanyFilter('all')} />
                  </Badge>
                )}
                {stageFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20">
                    Stage: {stageFilter}
                    <X className="w-3 h-3 cursor-pointer hover:opacity-80" onClick={() => setStageFilter('all')} />
                  </Badge>
                )}
                {deptFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                    Department: {departments.find(d => String(d.id) === deptFilter)?.name || deptFilter}
                    <X className="w-3 h-3 cursor-pointer hover:opacity-80" onClick={() => setDeptFilter('all')} />
                  </Badge>
                )}
                {desigFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                    Designation: {desigFilter}
                    <X className="w-3 h-3 cursor-pointer hover:opacity-80" onClick={() => setDesigFilter('all')} />
                  </Badge>
                )}
                {empTypeFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                    Type: {empTypeFilter}
                    <X className="w-3 h-3 cursor-pointer hover:opacity-80" onClick={() => setEmpTypeFilter('all')} />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-6 px-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                >
                  Reset All
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT SLIDE-OVER FILTER PANEL DRAWER */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setIsFilterDrawerOpen(false)}
            />

            {/* Drawer Container */}
            <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">Filter Directory</h3>
                    <p className="text-xs text-muted-foreground">Refine employee directory view</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-5 space-y-5">
                {/* Company Filter */}
                {filters.companyFilter && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      Company / Organization
                    </label>
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">All Companies (Parent &amp; Sub-Companies)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.isParent ? '(Parent Org)' : '(Sub-Company)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stage Filter */}
                {filters.stageFilter && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-sky-500" />
                      Lifecycle Stage
                    </label>
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">All Stages</option>
                      <option value="active">Active Workforce</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="probation">Probation</option>
                      <option value="notice">Notice Period</option>
                      <option value="exit">Offboarded / Exit</option>
                    </select>
                  </div>
                )}

                {/* Department Filter */}
                {filters.departmentFilter && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      Department
                    </label>
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designation Filter */}
                {filters.designationFilter && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      Designation / Role
                    </label>
                    <select
                      value={desigFilter}
                      onChange={(e) => setDesigFilter(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">All Designations</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Employment Type Filter */}
                {filters.employmentTypeFilter && (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Employment Type
                    </label>
                    <select
                      value={empTypeFilter}
                      onChange={(e) => setEmpTypeFilter(e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                      <option value="all">All Types</option>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Reset Filters
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 cursor-pointer"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 1: EMPLOYEE DIRECTORY ─── */}
        <TabsContent value="directory" className="mt-0">
          <Card className="border rounded-2xl shadow-md overflow-hidden bg-card border-border">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Organization Employee Directory ({filteredEmployees.length})
              </h2>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar pb-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold">
                    {cols.employeeNameAvatar && <th className="px-5 py-3.5">Employee</th>}
                    {cols.employeeCode && <th className="px-5 py-3.5">Code &amp; Email</th>}
                    {cols.designation && <th className="px-5 py-3.5">Designation</th>}
                    {cols.department && <th className="px-5 py-3.5">Department</th>}
                    {cols.company && <th className="px-5 py-3.5">Company</th>}
                    {cols.location && <th className="px-5 py-3.5">Location</th>}
                    {cols.lifecycleStage && <th className="px-5 py-3.5">Lifecycle Stage</th>}
                    {cols.transfersCount && <th className="px-5 py-3.5">Transfers</th>}
                    {cols.joiningDate && <th className="px-5 py-3.5">Joining Date</th>}
                    {cols.reportingManager && <th className="px-5 py-3.5">Manager</th>}
                    {cols.actions && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading employee directory...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const initials = emp.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';
                      return (
                        <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                          {cols.employeeNameAvatar && (
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-indigo-500/20 shadow-sm shrink-0">
                                  <AvatarImage src={emp.avatarUrl} alt={emp.name} className="object-cover" />
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-black text-foreground block text-xs tracking-tight">{emp.name}</span>
                                  {!cols.employeeCode && (
                                    <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">{emp.employeeCode} • {emp.email}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}

                          {cols.employeeCode && (
                            <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                              <span className="font-bold text-foreground block">{emp.employeeCode || `EMP-${emp.id}`}</span>
                              <span className="text-[10px] text-muted-foreground truncate block">{emp.email}</span>
                            </td>
                          )}

                          {cols.designation && (
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-foreground block text-xs">{emp.designationName || 'Employee'}</span>
                            </td>
                          )}

                          {cols.department && (
                            <td className="px-5 py-3.5">
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" /> {emp.departmentName && emp.departmentName !== 'General' ? emp.departmentName : 'Unassigned'}
                              </span>
                            </td>
                          )}

                          {cols.company && (
                            <td className="px-5 py-3.5">
                              {emp.companyName ? (
                                <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-muted/40 text-muted-foreground border-border">
                                  {emp.companyName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/60 text-[11px]">—</span>
                              )}
                            </td>
                          )}

                          {cols.location && (
                            <td className="px-5 py-3.5 font-medium text-foreground">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold">
                                <MapPin className="w-3 h-3 shrink-0" /> {emp.locationName || 'Headquarters'}
                              </span>
                            </td>
                          )}

                          {cols.lifecycleStage && <td className="px-5 py-3.5">{getStatusBadge(emp.lifecycleStatus)}</td>}

                          {cols.transfersCount && (
                            <td className="px-5 py-3.5">
                              {emp.transfersCount > 0 ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px]">
                                  {emp.transfersCount} Transfers
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/60 text-[11px]">0 Transfers</span>
                              )}
                            </td>
                          )}

                          {cols.joiningDate && (
                            <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                              {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                          )}

                          {cols.reportingManager && (
                            <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                              {emp.reportingManagerName || '—'}
                            </td>
                          )}

                          {cols.actions && (
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {cols.actionViewLifecycle && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenDetails(emp.id, 'overview')}
                                    className="h-8 px-2.5 text-[11px] font-extrabold gap-1 rounded-xl cursor-pointer"
                                  >
                                    View Lifecycle <ChevronRight className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {cols.actionTransfer && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleOpenTransferModal(emp)}
                                    className="h-8 px-2.5 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 rounded-xl cursor-pointer"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: ONBOARDING & INTERVIEW AUDIT VIEW ─── */}
        <TabsContent value="onboarding" className="mt-0">
          <Card className="border rounded-2xl shadow-md overflow-hidden bg-card border-border">
            <div className="p-4 border-b border-border bg-sky-500/5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-500" /> Employee Onboarding &amp; Interview Audit Records ({onboardingEmployees.length})
              </h2>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar pb-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold">
                    {onbCols.employeeNameAvatar && <th className="px-5 py-3.5">Employee</th>}
                    {onbCols.employeeCode && <th className="px-5 py-3.5">Code &amp; Role</th>}
                    {onbCols.interviewer && <th className="px-5 py-3.5">Interviewer &amp; HR Onboarder</th>}
                    {onbCols.joiningDate && <th className="px-5 py-3.5">Joining Date</th>}
                    {onbCols.probationEndDate && <th className="px-5 py-3.5">Probation End Date</th>}
                    {onbCols.orientationStatus && <th className="px-5 py-3.5">Orientation Status</th>}
                    {onbCols.welcomeKitStatus && <th className="px-5 py-3.5">Welcome Kit</th>}
                    {onbCols.documentsStatus && <th className="px-5 py-3.5">Doc Verification</th>}
                    {onbCols.interviewScore && <th className="px-5 py-3.5">Rating Score</th>}
                    {customFields.onboarding?.map((f) => (
                      <th key={f.id} className="px-5 py-3.5 text-sky-600 dark:text-sky-400 font-bold">{f.name}</th>
                    ))}
                    {onbCols.lifecycleStage && <th className="px-5 py-3.5">Stage</th>}
                    {onbCols.actions && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-500" />
                        Loading onboarding records...
                      </td>
                    </tr>
                  ) : onboardingEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-xs text-muted-foreground">
                        No active onboarding records found.
                      </td>
                    </tr>
                  ) : (
                    onboardingEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        {onbCols.employeeNameAvatar && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-sky-500/20 shrink-0">
                                <AvatarImage src={emp.avatarUrl} />
                                <AvatarFallback className="bg-sky-600 text-white font-bold text-xs">
                                  {emp.name.split(' ').map(w => w[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-extrabold text-foreground block">{emp.name}</span>
                                {!onbCols.employeeCode && (
                                  <span className="text-[10px] text-muted-foreground">{emp.employeeCode} • {emp.designationName}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {onbCols.employeeCode && (
                          <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                            <span className="font-bold text-foreground block">{emp.employeeCode || `EMP-${emp.id}`}</span>
                            <span className="text-[10px] text-muted-foreground">{emp.designationName || 'Employee'}</span>
                          </td>
                        )}

                        {onbCols.interviewer && (
                          <td className="px-5 py-3.5 text-xs">
                            <span className="font-bold text-foreground block">
                              By: {emp.onboarding?.interviewerName || '—'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Onboarder: {emp.onboarding?.onboardedByName || '—'}
                            </span>
                          </td>
                        )}

                        {onbCols.joiningDate && (
                          <td className="px-5 py-3.5 font-bold text-foreground text-xs">
                            {formatDate(emp.joiningDate)}
                          </td>
                        )}

                        {onbCols.probationEndDate && (
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {formatDate(emp.onboarding?.probationEndDate)}
                          </td>
                        )}

                        {onbCols.orientationStatus && (
                          <td className="px-5 py-3.5">
                            <Badge className={`text-[10px] font-bold ${emp.onboarding?.orientationCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                              {emp.onboarding?.orientationCompleted ? 'Completed' : 'Pending'}
                            </Badge>
                          </td>
                        )}

                        {onbCols.welcomeKitStatus && (
                          <td className="px-5 py-3.5">
                            <Badge className={`text-[10px] font-bold ${emp.onboarding?.welcomeKitIssued ? 'bg-sky-500/10 text-sky-600 border-sky-500/30' : 'bg-muted text-muted-foreground border-border'}`}>
                              {emp.onboarding?.welcomeKitIssued ? 'Issued & Logged' : 'Pending'}
                            </Badge>
                          </td>
                        )}

                        {onbCols.documentsStatus && (
                          <td className="px-5 py-3.5">
                            <Badge className={`text-[10px] font-bold ${emp.onboarding?.documentsVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                              {emp.onboarding?.documentsVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </td>
                        )}

                        {onbCols.interviewScore && (
                          <td className="px-5 py-3.5 font-black text-amber-600 dark:text-amber-400 text-xs">
                            {emp.onboarding?.interviewRating ? `★ ${emp.onboarding.interviewRating}` : '—'}
                          </td>
                        )}

                        {customFields.onboarding?.map((f) => (
                          <td key={f.id} className="px-5 py-3.5 text-xs text-muted-foreground font-medium">
                            —
                          </td>
                        ))}

                        {onbCols.lifecycleStage && <td className="px-5 py-3.5">{getStatusBadge(emp.lifecycleStatus)}</td>}

                        {onbCols.actions && (
                          <td className="px-5 py-3.5 text-right">
                            {onbCols.actionEditOnboarding && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetails(emp.id, 'onboarding')}
                                className="h-8 px-3 text-xs font-bold gap-1 rounded-xl cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-sky-500" /> Onboarding Details
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: TRANSFER AUDIT HISTORY VIEW ─── */}
        <TabsContent value="transfers" className="mt-0">
          <Card className="border rounded-2xl shadow-md overflow-hidden bg-card border-border">
            <div className="p-4 border-b border-border bg-emerald-500/5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-500" /> Employee Transfer Audit History ({transferEmployees.length})
              </h2>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar pb-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold">
                    {trfCols.employeeNameAvatar && <th className="px-5 py-3.5">Employee</th>}
                    {trfCols.employeeCode && <th className="px-5 py-3.5">Employee Code</th>}
                    {trfCols.department && <th className="px-5 py-3.5">Current Department</th>}
                    {trfCols.designation && <th className="px-5 py-3.5">Current Designation</th>}
                    {trfCols.location && <th className="px-5 py-3.5">Location</th>}
                    {trfCols.reportingManager && <th className="px-5 py-3.5">Reporting Manager</th>}
                    {trfCols.transfersCount && <th className="px-5 py-3.5">Transfers Executed</th>}
                    {trfCols.lastTransferDate && <th className="px-5 py-3.5">Last Effective Date</th>}
                    {trfCols.transferReason && <th className="px-5 py-3.5">Transfer Reason</th>}
                    {customFields.transfers?.map((f) => (
                      <th key={f.id} className="px-5 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold">{f.name}</th>
                    ))}
                    {trfCols.actions && <th className="px-5 py-3.5 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading transfer audit history...
                      </td>
                    </tr>
                  ) : transferEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-xs text-muted-foreground">
                        No transfer records found.
                      </td>
                    </tr>
                  ) : (
                    transferEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        {trfCols.employeeNameAvatar && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-emerald-500/20 shrink-0">
                                <AvatarImage src={emp.avatarUrl} />
                                <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                                  {emp.name.split(' ').map(w => w[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-extrabold text-foreground block">{emp.name}</span>
                                {!trfCols.employeeCode && (
                                  <span className="text-[10px] text-muted-foreground">{emp.employeeCode}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {trfCols.employeeCode && (
                          <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                            {emp.employeeCode || `EMP-${emp.id}`}
                          </td>
                        )}

                        {trfCols.department && (
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-foreground block">{emp.departmentName}</span>
                          </td>
                        )}

                        {trfCols.designation && (
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] text-muted-foreground font-semibold">{emp.designationName || 'Staff'}</span>
                          </td>
                        )}

                        {trfCols.location && <td className="px-5 py-3.5 font-bold text-foreground">{emp.locationName}</td>}

                        {trfCols.reportingManager && (
                          <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
                            {emp.reportingManagerName || emp.reportingManager || 'Executive Lead'}
                          </td>
                        )}

                        {trfCols.transfersCount && (
                          <td className="px-5 py-3.5">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-extrabold text-[10px]">
                              {emp.transfersCount} Transfers
                            </Badge>
                          </td>
                        )}

                        {trfCols.lastTransferDate && (
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {formatDate(emp.lastTransferDate)}
                          </td>
                        )}

                        {trfCols.transferReason && (
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {emp.transferReason || '—'}
                          </td>
                        )}

                        {customFields.transfers?.map((f) => (
                          <td key={f.id} className="px-5 py-3.5 text-xs text-muted-foreground font-medium">
                            —
                          </td>
                        ))}

                        {trfCols.actions && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {trfCols.actionViewLog && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDetails(emp.id, 'transfers')}
                                  className="h-8 px-3 text-xs font-bold gap-1 rounded-xl cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-500" /> View Transfer Log
                                </Button>
                              )}
                              {trfCols.actionExecuteTransfer && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenTransferModal(emp)}
                                  className="h-8 px-3 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 rounded-xl cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Transfer
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: OFFBOARDING & EXIT RECORDS VIEW ─── */}
        <TabsContent value="offboarding" className="mt-0">
          <Card className="border rounded-2xl shadow-md overflow-hidden bg-card border-border">
            <div className="p-4 border-b border-border bg-rose-500/5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-500" /> Offboarding &amp; Exit Interview Records ({offboardingEmployees.length})
              </h2>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[650px] custom-scrollbar pb-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold">
                    {offbCols.employeeNameAvatar && <th className="px-5 py-3.5">Employee</th>}
                    {offbCols.employeeCode && <th className="px-5 py-3.5">Code &amp; Department</th>}
                    {offbCols.exitType && <th className="px-5 py-3.5">Exit Type</th>}
                    {offbCols.resignationDate && <th className="px-5 py-3.5">Resignation &amp; Relieving</th>}
                    {offbCols.noticePeriodDays && <th className="px-5 py-3.5">Notice Days</th>}
                    {offbCols.exitReason && <th className="px-5 py-3.5">Exit Reason</th>}
                    {offbCols.exitInterviewer && <th className="px-5 py-3.5">Interviewer</th>}
                    {offbCols.assetsReturned && <th className="px-5 py-3.5">Assets Returned</th>}
                    {offbCols.fnfStatus && <th className="px-5 py-3.5">F&amp;F Settlement</th>}
                    {customFields.offboarding?.map((f) => (
                      <th key={f.id} className="px-5 py-3.5 text-rose-600 dark:text-rose-400 font-bold">{f.name}</th>
                    ))}
                    {offbCols.lifecycleStage && <th className="px-5 py-3.5">Stage</th>}
                    {offbCols.actions && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-xs text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                        Loading offboarding records...
                      </td>
                    </tr>
                  ) : offboardingEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-xs text-muted-foreground">
                        No offboarding or exit records found.
                      </td>
                    </tr>
                  ) : (
                    offboardingEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        {offbCols.employeeNameAvatar && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border-2 border-rose-500/20 shrink-0">
                                <AvatarImage src={emp.avatarUrl} />
                                <AvatarFallback className="bg-rose-600 text-white font-bold text-xs">
                                  {emp.name.split(' ').map(w => w[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-extrabold text-foreground block">{emp.name}</span>
                                {!offbCols.employeeCode && (
                                  <span className="text-[10px] text-muted-foreground">{emp.employeeCode} • {emp.departmentName}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {offbCols.employeeCode && (
                          <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                            <span className="font-bold text-foreground block">{emp.employeeCode || `EMP-${emp.id}`}</span>
                            <span className="text-[10px] text-muted-foreground">{emp.departmentName || 'General'}</span>
                          </td>
                        )}

                        {offbCols.exitType && (
                          <td className="px-5 py-3.5">
                            <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-600 border-rose-500/30">
                              {emp.offboarding?.exitType || 'Resignation'}
                            </Badge>
                          </td>
                        )}

                        {offbCols.resignationDate && (
                          <td className="px-5 py-3.5 font-medium">
                            <span className="block text-foreground font-bold">Resigned: {emp.offboarding?.resignationDate || 'N/A'}</span>
                            <span className="text-[10px] text-muted-foreground">Relieving: {emp.offboarding?.relievingDate || emp.offboarding?.lastWorkingDay || 'N/A'}</span>
                          </td>
                        )}

                        {offbCols.noticePeriodDays && (
                          <td className="px-5 py-3.5 font-bold text-muted-foreground text-xs">
                            {emp.offboarding?.noticePeriodDays ? `${emp.offboarding.noticePeriodDays} Days` : '—'}
                          </td>
                        )}

                        {offbCols.exitReason && (
                          <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-[180px] truncate">
                            {emp.offboarding?.exitReason || '—'}
                          </td>
                        )}

                        {offbCols.exitInterviewer && (
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">
                            {emp.offboarding?.exitInterviewerName || '—'}
                          </td>
                        )}

                        {offbCols.assetsReturned && (
                          <td className="px-5 py-3.5">
                            <Badge className={`text-[10px] font-bold ${emp.offboarding?.assetsReturned ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}`}>
                              {emp.offboarding?.assetsReturned ? 'Returned' : 'Pending'}
                            </Badge>
                          </td>
                        )}

                        {offbCols.fnfStatus && (
                          <td className="px-5 py-3.5">
                            <Badge className={`text-[10px] font-bold capitalize ${emp.offboarding?.fnfStatus === 'completed' || emp.offboarding?.fnfStatus === 'cleared' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}`}>
                              {emp.offboarding?.fnfStatus || 'Pending'}
                            </Badge>
                          </td>
                        )}

                        {customFields.offboarding?.map((f) => (
                          <td key={f.id} className="px-5 py-3.5 text-xs text-muted-foreground font-medium">
                            —
                          </td>
                        ))}

                        {offbCols.lifecycleStage && <td className="px-5 py-3.5">{getStatusBadge(emp.lifecycleStatus)}</td>}

                        {offbCols.actions && (
                          <td className="px-5 py-3.5 text-right">
                            {offbCols.actionEditOffboarding && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetails(emp.id, 'offboarding')}
                                className="h-8 px-3 text-xs font-bold gap-1 rounded-xl text-rose-600 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" /> Offboarding Details
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EMPLOYEE LIFECYCLE DETAILS DIALOG / MODAL */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-6">
          {detailsLoading || !empDetails ? (
            <div className="py-16 text-center text-muted-foreground text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Fetching comprehensive lifecycle details...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Top Summary Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-indigo-400">
                    <AvatarImage src={empDetails.profile.avatarUrl} alt={empDetails.profile.name} />
                    <AvatarFallback className="bg-indigo-600 text-white font-extrabold text-base">
                      {empDetails.profile.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{empDetails.profile.name}</h2>
                      {getStatusBadge(empDetails.profile.lifecycleStatus)}
                    </div>
                    <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
                      {empDetails.profile.employeeCode} • {empDetails.profile.designationName} ({empDetails.profile.departmentName})
                    </p>
                    <p className="text-[11px] text-indigo-300/70 mt-0.5 flex items-center gap-2">
                      <span>Joined: {empDetails.profile.joiningDate}</span>
                      <span>•</span>
                      <span>Location: {empDetails.profile.locationName}</span>
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    handleOpenTransferModal(empDetails.profile);
                  }}
                  className="bg-white text-indigo-900 hover:bg-white/90 font-extrabold text-xs px-4 py-2 rounded-xl gap-1.5 shrink-0"
                >
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" /> Transfer Employee
                </Button>
              </div>

              {/* TABS NAVIGATION */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 bg-muted/60 p-1 rounded-2xl h-11">
                  <TabsTrigger value="overview" className="rounded-xl text-xs font-extrabold">Overview & Timeline</TabsTrigger>
                  <TabsTrigger value="onboarding" className="rounded-xl text-xs font-extrabold">Onboarding & Interview</TabsTrigger>
                  <TabsTrigger value="transfers" className="rounded-xl text-xs font-extrabold">Transfers ({empDetails.transfers.length})</TabsTrigger>
                  <TabsTrigger value="offboarding" className="rounded-xl text-xs font-extrabold">Offboarding / Exit</TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW & TIMELINE */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card className="border rounded-2xl p-4 bg-card">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-3">Lifecycle Overview Card</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Department</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.profile.departmentName}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Designation</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.profile.designationName}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Transfers</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{empDetails.transfers.length} Executed</span>
                      </div>
                    </div>
                  </Card>

                  <ChronologicalLifecycleFlow
                    milestones={empDetails.chronologicalMilestones || []}
                    employeeName={empDetails.profile.name}
                    employeeCode={empDetails.profile.employeeCode}
                  />
                </TabsContent>

                {/* TAB 2: ONBOARDING & INTERVIEW RECORDS */}
                <TabsContent value="onboarding" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-sky-500" /> Onboarding & Interview Audit Details
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleOpenOnboardingEdit} className="h-8 text-xs font-extrabold gap-1.5 rounded-xl">
                      <Edit className="w-3.5 h-3.5" /> Edit Onboarding Records
                    </Button>
                  </div>

                  <Card className="border rounded-2xl p-4 bg-card space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interviewer Name</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.interviewerName || 'HR Team'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Onboarded By (HR)</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.onboardedByName || 'HR Admin'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.interviewDate || empDetails.onboarding.joiningDate || empDetails.profile.joiningDate || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Rating</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{empDetails.onboarding.interviewRating || '4.5 / 5'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Joining Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.joiningDate || empDetails.profile.joiningDate || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Probation End Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.probationEndDate || 'Completed / Confirmed'}</span>
                      </div>
                    </div>

                    {/* Interview Notes */}
                    <div className="p-3.5 bg-muted/20 rounded-xl border text-xs">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Interview & Selection Notes</span>
                      <p className="text-foreground font-medium">{empDetails.onboarding.interviewNotes}</p>
                    </div>

                    {/* Additional Onboarding Remarks & Notes */}
                    {empDetails.onboarding.notes && (
                      <div className="p-3.5 bg-sky-500/5 dark:bg-sky-950/20 rounded-xl border border-sky-500/20 text-xs">
                        <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 uppercase block mb-1">Onboarding Remarks & Audit Notes</span>
                        <p className="text-foreground font-medium">{empDetails.onboarding.notes}</p>
                      </div>
                    )}

                    {/* Checklists */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${empDetails.onboarding.orientationCompleted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                        <span>Orientation Completed</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${empDetails.onboarding.documentsVerified ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                        <span>Documents Verified</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${empDetails.onboarding.welcomeKitIssued ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                        <span>Welcome Kit Issued</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* TAB 3: TRANSFER HISTORY & ACTION */}
                <TabsContent value="transfers" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-emerald-500" /> Employee Transfer Audit History ({empDetails.transfers.length})
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenTransferModal(empDetails.profile);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-extrabold gap-1.5 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> Transfer Employee
                    </Button>
                  </div>

                  {empDetails.transfers.length === 0 ? (
                    <Card className="border rounded-2xl p-8 text-center bg-card">
                      <p className="text-xs text-muted-foreground font-medium">No transfer history recorded for this employee yet.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {empDetails.transfers.map((t) => (
                        <Card key={t.id} className="border rounded-2xl p-4 bg-card hover:border-indigo-500/30 transition-all space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-extrabold text-[10px]">
                                {t.transferType.toUpperCase().replace('_', ' ')}
                              </Badge>
                              <span className="text-xs font-extrabold text-foreground">Effective Date: {t.effectiveDate}</span>
                              <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                                Record ID: #{t.id}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                              <span>Executed By: <strong className="text-foreground">{t.createdBy}</strong></span>
                              {t.createdAt && t.createdAt !== 'N/A' && (
                                <span className="font-mono text-[10px]">Logged: {t.createdAt.split('T')[0]}</span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="p-2.5 bg-muted/30 rounded-xl border">
                              <span className="text-[10px] text-muted-foreground block font-bold uppercase">Department</span>
                              <span className="font-extrabold text-foreground block mt-1">{t.fromDepartmentName} → <span className="text-indigo-600 font-extrabold">{t.toDepartmentName}</span></span>
                            </div>
                            <div className="p-2.5 bg-muted/30 rounded-xl border">
                              <span className="text-[10px] text-muted-foreground block font-bold uppercase">Designation</span>
                              <span className="font-extrabold text-foreground block mt-1">{t.fromDesignationName} → <span className="text-indigo-600 font-extrabold">{t.toDesignationName}</span></span>
                            </div>
                            <div className="p-2.5 bg-muted/30 rounded-xl border">
                              <span className="text-[10px] text-muted-foreground block font-bold uppercase">Reporting Manager</span>
                              <span className="font-extrabold text-foreground block mt-1">{t.fromManagerName} → <span className="text-emerald-600 font-extrabold">{t.toManagerName}</span></span>
                            </div>
                            <div className="p-2.5 bg-muted/30 rounded-xl border">
                              <span className="text-[10px] text-muted-foreground block font-bold uppercase">Location</span>
                              <span className="font-extrabold text-foreground block mt-1">{t.fromLocationName} → <span className="text-sky-600 font-extrabold">{t.toLocationName}</span></span>
                            </div>
                          </div>

                          {t.transferReason && (
                            <div className="text-xs bg-muted/20 p-3 rounded-xl border">
                              <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-0.5">Transfer Reason & Business Justification</span>
                              <p className="text-foreground font-medium">{t.transferReason}</p>
                            </div>
                          )}

                          {t.notes && (
                            <div className="text-xs bg-indigo-500/5 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-500/20">
                              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase block mb-0.5">HR Audit & System Remarks</span>
                              <p className="text-foreground font-medium">{t.notes}</p>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 4: OFFBOARDING / EXIT DETAILS */}
                <TabsContent value="offboarding" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <UserMinus className="w-4 h-4 text-rose-500" /> Offboarding & Exit Interview Records
                    </h3>
                    <Button size="sm" variant="outline" onClick={handleOpenOffboardingEdit} className="h-8 text-xs font-extrabold gap-1.5 rounded-xl">
                      <Edit className="w-3.5 h-3.5" /> Manage Offboarding
                    </Button>
                  </div>

                  {!empDetails.offboarding ? (
                    <Card className="border rounded-2xl p-8 text-center bg-card">
                      <p className="text-xs text-muted-foreground font-medium">Employee is currently active. No exit/offboarding record initiated.</p>
                      <Button size="sm" onClick={handleOpenOffboardingEdit} className="mt-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
                        Initiate Employee Offboarding
                      </Button>
                    </Card>
                  ) : (
                    <Card className="border rounded-2xl p-4 bg-card space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Exit Type</span>
                          <span className="font-extrabold text-rose-600 dark:text-rose-400 block mt-1 uppercase">{empDetails.offboarding.exitType}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Resignation Date</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.resignationDate || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Notice Period</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.noticePeriodDays} Days</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Relieving Date</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.relievingDate || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Last Working Day</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.lastWorkingDay || empDetails.offboarding.relievingDate || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Exit Interviewer</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.exitInterviewerName || 'HR Manager'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">F&F Settlement Status</span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 block mt-1 uppercase">{empDetails.offboarding.fnfStatus}</span>
                        </div>
                      </div>

                      {/* Assets Returned Card */}
                      <div className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between ${empDetails.offboarding.assetsReturned ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'}`}>
                        <span>Company Hardware & Assets Returned</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>

                      {/* Exit Reason & Feedback */}
                      {empDetails.offboarding.exitReason && (
                        <div className="p-3.5 bg-muted/20 rounded-xl border text-xs">
                          <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Exit Reason & Feedback</span>
                          <p className="text-foreground font-medium">{empDetails.offboarding.exitReason}</p>
                        </div>
                      )}

                      {/* HR Exit Remarks & Notes */}
                      {empDetails.offboarding.exitNotes && (
                        <div className="p-3.5 bg-rose-500/5 dark:bg-rose-950/20 rounded-xl border border-rose-500/20 text-xs">
                          <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase block mb-1">HR Audit & Exit Remarks</span>
                          <p className="text-foreground font-medium">{empDetails.offboarding.exitNotes}</p>
                        </div>
                      )}
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TRANSFER EMPLOYEE MODAL */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600" /> Transfer Employee: {transferTargetEmp?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reassign employee's department, designation, branch location, or reporting manager with full audit tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteTransfer} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Transfer Type */}
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Transfer Type</label>
                <select
                  value={transferForm.transferType}
                  onChange={(e) => setTransferForm({ ...transferForm, transferType: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
                >
                  <option value="department_change">Department Change</option>
                  <option value="location_transfer">Location Branch Transfer</option>
                  <option value="promotion">Promotion / Role Change</option>
                  <option value="manager_change">Reporting Manager Reassignment</option>
                </select>
              </div>

              {/* Effective Date */}
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Effective Date</label>
                <Input
                  type="date"
                  value={transferForm.effectiveDate}
                  onChange={(e) => setTransferForm({ ...transferForm, effectiveDate: e.target.value })}
                  required
                  className="h-9 rounded-xl text-xs font-semibold bg-background"
                />
              </div>
            </div>

            {/* Target Department */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-foreground block">New Target Department</label>
              <select
                value={transferForm.toDepartmentId}
                onChange={(e) => setTransferForm({ ...transferForm, toDepartmentId: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
              >
                <option value="">-- Keep Current Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Target Designation */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-foreground block">New Target Designation</label>
              <select
                value={transferForm.toDesignationId}
                onChange={(e) => setTransferForm({ ...transferForm, toDesignationId: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
              >
                <option value="">-- Keep Current Designation --</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Target Location */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-foreground block">New Branch / Work Location</label>
              <select
                value={transferForm.toLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, toLocationId: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
              >
                <option value="">-- Keep Current Location --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Target Reporting Manager */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-foreground block">New Target Reporting Manager</label>
              <select
                value={transferForm.toReportingManagerId}
                onChange={(e) => setTransferForm({ ...transferForm, toReportingManagerId: e.target.value })}
                className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
              >
                <option value="">-- Keep Current Reporting Manager --</option>
                {employees
                  .filter((m) => m.id !== transferTargetEmp?.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.departmentName ? `(${m.departmentName})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Reason for Transfer */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-foreground block">Transfer Reason & Justification</label>
              <Input
                placeholder="e.g. Promoted to Core Tech Team / Branch Relocation"
                value={transferForm.transferReason}
                onChange={(e) => setTransferForm({ ...transferForm, transferReason: e.target.value })}
                required
                className="h-9 rounded-xl text-xs font-semibold bg-background"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTransferModalOpen(false)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={transferSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5">
                {transferSubmitting ? 'Executing Transfer...' : 'Confirm & Execute Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ONBOARDING MODAL */}
      <Dialog open={onboardingModalOpen} onOpenChange={setOnboardingModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-500" /> Edit Onboarding & Interview Records
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveOnboarding} className="space-y-3 mt-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground block">Interviewer Name (Manager / Lead)</label>
              <Input
                value={onboardingForm.interviewerName}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewerName: e.target.value })}
                placeholder="e.g. Harsh Gawali / Select manager below"
                className="h-9 rounded-xl bg-background text-xs"
                list="interviewer-managers-list"
              />
              <datalist id="interviewer-managers-list">
                {managers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.designation ? `(${m.designation})` : ''} {m.department ? `- ${m.department}` : ''}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground block">Onboarded By (HR Lead)</label>
              <Input
                value={onboardingForm.onboardedByName}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, onboardedByName: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Interview Date</label>
                <Input
                  type="date"
                  value={onboardingForm.interviewDate}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewDate: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Interview Rating</label>
                <Input
                  value={onboardingForm.interviewRating}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewRating: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Joining Date</label>
                <Input
                  type="date"
                  value={onboardingForm.joiningDate}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, joiningDate: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Probation End Date</label>
                <Input
                  type="date"
                  value={onboardingForm.probationEndDate}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, probationEndDate: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Interview & Selection Notes</label>
              <Input
                value={onboardingForm.interviewNotes}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewNotes: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Onboarding Remarks & Audit Notes</label>
              <Input
                value={onboardingForm.notes}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
                placeholder="e.g. Background check completed, laptop handed over"
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={onboardingForm.orientationCompleted}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, orientationCompleted: e.target.checked })}
                  className="rounded"
                />
                Orientation Session Completed
              </label>
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={onboardingForm.documentsVerified}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, documentsVerified: e.target.checked })}
                  className="rounded"
                />
                KYC & Documents Verified
              </label>
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={onboardingForm.welcomeKitIssued}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, welcomeKitIssued: e.target.checked })}
                  className="rounded"
                />
                Welcome Kit & Laptop Issued
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setOnboardingModalOpen(false)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold">
                Save Onboarding Records
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT OFFBOARDING MODAL */}
      <Dialog open={offboardingModalOpen} onOpenChange={setOnboardingModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-rose-600">
              <UserMinus className="w-5 h-5 text-rose-500" /> Manage Employee Exit & Offboarding
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveOffboarding} className="space-y-3 mt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Exit Type</label>
                <select
                  value={offboardingForm.exitType}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, exitType: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
                >
                  <option value="resignation">Resignation</option>
                  <option value="termination">Termination</option>
                  <option value="contract_end">Contract End</option>
                  <option value="retirement">Retirement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground block">Lifecycle Status</label>
                <select
                  value={offboardingForm.updateEmployeeStatus}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, updateEmployeeStatus: e.target.value as any })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
                >
                  <option value="notice">In Notice Period</option>
                  <option value="exit">Offboarded / Exit</option>
                  <option value="alumni">Alumni</option>
                  <option value="active">Active (Cancel Exit)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Resignation Date</label>
                <Input
                  type="date"
                  value={offboardingForm.resignationDate}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, resignationDate: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Notice Period (Days)</label>
                <Input
                  type="number"
                  value={offboardingForm.noticePeriodDays}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, noticePeriodDays: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Relieving Date</label>
                <Input
                  type="date"
                  value={offboardingForm.relievingDate}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, relievingDate: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Last Working Day</label>
                <Input
                  type="date"
                  value={offboardingForm.lastWorkingDay}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, lastWorkingDay: e.target.value })}
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground block">Exit Interviewer Name</label>
                <Input
                  value={offboardingForm.exitInterviewerName}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, exitInterviewerName: e.target.value })}
                  placeholder="e.g. HR Lead / Manager"
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground block">F&F Settlement Status</label>
                <select
                  value={offboardingForm.fnfStatus}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, fnfStatus: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-xl font-semibold cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Exit Reason & Feedback</label>
              <Input
                placeholder="Reason for resignation / exit feedback"
                value={offboardingForm.exitReason}
                onChange={(e) => setOffboardingForm({ ...offboardingForm, exitReason: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground block">HR Exit & Audit Remarks</label>
              <Input
                placeholder="Exit interview summary, clearance notes"
                value={offboardingForm.exitNotes}
                onChange={(e) => setOffboardingForm({ ...offboardingForm, exitNotes: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="pt-2 border-t">
              <label className="flex items-center gap-2 font-bold cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={offboardingForm.assetsReturned}
                  onChange={(e) => setOffboardingForm({ ...offboardingForm, assetsReturned: e.target.checked })}
                  className="rounded"
                />
                Company Laptop & Hardware Returned
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setOffboardingModalOpen(false)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
                Save Exit & Offboarding
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
