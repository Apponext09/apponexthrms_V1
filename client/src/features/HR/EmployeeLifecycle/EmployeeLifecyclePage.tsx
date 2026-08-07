import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useCompanyStore } from '@/features/settings/store/companyStore';

import { useLocation } from 'react-router-dom';

export default function EmployeeLifecyclePage() {
  const location = useLocation();
  const { selectedCompanyId } = useCompanyStore();
  const [employees, setEmployees] = useState<EmployeeLifecycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // React to URL pathname changes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/onboarding')) {
      setStageFilter('onboarding');
    } else if (path.includes('/offboarding')) {
      setStageFilter('notice');
    } else if (path.includes('/transfers')) {
      setStageFilter('all');
    } else {
      setStageFilter('all');
    }
  }, [location.pathname]);

  // Metadata Dropdown Options
  const [companies, setCompanies] = useState<Array<{ id: number; name: string; isParent?: boolean }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [designations, setDesignations] = useState<Array<{ id: number; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
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
    assetsReturned: false,
    fnfStatus: 'pending',
    updateEmployeeStatus: 'notice' as 'notice' | 'exit' | 'alumni' | 'active',
  });

  // Fetch Employees List & Dropdown Meta
  const fetchLifecycleData = async () => {
    try {
      setLoading(true);
      const data = await lifecycleApi.getSummaries({
        search,
        stage: stageFilter,
        departmentId: deptFilter !== 'all' ? Number(deptFilter) : undefined,
        companyId: companyFilter !== 'all' ? companyFilter : 'all',
      });
      setEmployees(data);
    } catch (err: any) {
      toast.error('Failed to load employee lifecycle directory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadataOptions = async () => {
    try {
      const [deptRes, locRes, reportOptRes, compRes] = await Promise.all([
        apiClient.get('/departments').catch(() => apiClient.get('/settings/departments')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/locations').catch(() => apiClient.get('/attendance/locations')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/reports/options').catch(() => ({ data: { data: {} } })),
        apiClient.get('/settings/companies').catch(() => ({ data: { data: [] } })),
      ]);

      const deptList = deptRes.data?.data || deptRes.data || [];
      const locList = locRes.data?.data || locRes.data || [];
      const desigList = reportOptRes.data?.data?.designations || [];
      const compList = Array.isArray(compRes.data?.data)
        ? compRes.data.data
        : Array.isArray(compRes.data)
        ? compRes.data
        : [];

      setDepartments(deptList.map((d: any) => ({ id: Number(d.id), name: d.name })));
      setLocations(locList.map((l: any) => ({ id: Number(l.id), name: l.locationName || l.location_name || l.name })));
      if (compList.length > 0) {
        const mappedComps = compList.map((c: any) => ({
          id: Number(c.companyId ?? c.company_id ?? c.id),
          name: c.name || 'Unnamed Company',
          isParent: Boolean(c.isParent ?? c.is_parent)
        }));
        setCompanies(mappedComps);

        // Default initial filter to selected company or parent company
        if (selectedCompanyId) {
          setCompanyFilter(String(selectedCompanyId));
        } else {
          const parentComp = mappedComps.find((c: any) => c.isParent);
          if (parentComp) {
            setCompanyFilter(String(parentComp.id));
          }
        }
      }
      if (desigList.length > 0) {
        setDesignations(desigList.map((d: any) => ({ id: Number(d.id), name: d.name })));
      }
    } catch (err) {
      console.warn('Metadata load error:', err);
    }
  };

  // Sync active company context when workspace switcher changes company
  useEffect(() => {
    if (selectedCompanyId) {
      setCompanyFilter(String(selectedCompanyId));
    } else if (companies.length > 0) {
      const parentComp = companies.find((c: any) => c.isParent);
      if (parentComp) {
        setCompanyFilter(String(parentComp.id));
      }
    }
  }, [selectedCompanyId, companies]);

  useEffect(() => {
    fetchLifecycleData();
  }, [search, stageFilter, deptFilter, companyFilter]);

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

  // Compute Metrics Summary
  const totalWorkforce = employees.length;
  const onboardingCount = employees.filter(e => e.lifecycleStatus === 'onboarding' || e.lifecycleStatus === 'probation' || e.lifecycleStatus === 'candidate').length;
  const transferredCount = employees.reduce((acc, e) => acc + (e.transfersCount || 0), 0);
  const exitNoticeCount = employees.filter(e => e.lifecycleStatus === 'notice' || e.lifecycleStatus === 'exit' || e.lifecycleStatus === 'alumni').length;

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
          <Button variant="outline" size="sm" onClick={fetchLifecycleData} className="gap-2 text-xs font-bold rounded-xl h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Directory
          </Button>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border rounded-2xl shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Total Workforce</span>
              <span className="text-2xl font-black text-foreground mt-0.5 block">{totalWorkforce}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">In Onboarding</span>
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5 block">{onboardingCount}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Transferred Events</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{transferredCount}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Notice & Exits</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">{exitNoticeCount}</span>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border rounded-2xl shadow-sm bg-card p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee by name, code, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs font-semibold bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[150px]"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isParent ? '(Parent Org)' : '(Sub-Company)'}
                </option>
              ))}
            </select>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[140px]"
            >
              <option value="all">All Stages</option>
              <option value="active">Active Workforce</option>
              <option value="onboarding">Onboarding</option>
              <option value="probation">Probation</option>
              <option value="notice">Notice Period</option>
              <option value="exit">Offboarded / Exit</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 px-3 bg-background border border-border rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[150px]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* EMPLOYEE DIRECTORY LIST TABLE */}
      <Card className="border rounded-2xl shadow-md overflow-hidden bg-card border-border">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" /> Organization Employee Directory ({employees.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-extrabold">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department & Designation</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Lifecycle Stage</th>
                <th className="px-5 py-3.5">Transfers</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    No employees found matching filter criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const initials = emp.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase() || 'EMP';
                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
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
                            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">{emp.employeeCode} • {emp.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-extrabold text-foreground block text-xs">{emp.designationName || 'Employee'}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" /> {emp.departmentName && emp.departmentName !== 'General' ? emp.departmentName : 'Unassigned'}
                          </span>
                          {emp.companyName && (
                            <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0 h-4 bg-muted/40 text-muted-foreground border-border">
                              {emp.companyName}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold">
                          <MapPin className="w-3 h-3 shrink-0" /> {emp.locationName}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">{getStatusBadge(emp.lifecycleStatus)}</td>

                      <td className="px-5 py-3.5">
                        {emp.transfersCount > 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold text-[10px]">
                            {emp.transfersCount} Transfers
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">0 Transfers</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetails(emp.id, 'overview')}
                            className="h-8 px-2.5 text-[11px] font-extrabold gap-1 rounded-xl"
                          >
                            View Lifecycle <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenTransferModal(emp)}
                            className="h-8 px-2.5 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white gap-1 rounded-xl"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EMPLOYEE LIFECYCLE DETAILS DIALOG / MODAL */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
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

                  <Card className="border rounded-2xl p-4 bg-card">
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> Chronological Lifecycle Milestone Events
                    </h3>
                    {empDetails.lifecycleEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No lifecycle events recorded yet.</p>
                    ) : (
                      <div className="relative pl-6 space-y-4 border-l-2 border-indigo-500/30 ml-2">
                        {empDetails.lifecycleEvents.map((evt) => (
                          <div key={evt.id} className="relative group">
                            <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-background" />
                            <div className="bg-muted/30 p-3 rounded-xl border text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-foreground">{evt.notes || `Transition: ${evt.fromStatus} → ${evt.toStatus}`}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{evt.transitionDate}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
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
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.interviewerName}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Onboarded By (HR)</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.onboardedByName}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.interviewDate || 'N/A'}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Interview Rating</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{empDetails.onboarding.interviewRating}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Joining Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.joiningDate || empDetails.profile.joiningDate}</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl border">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Probation End Date</span>
                        <span className="font-extrabold text-foreground block mt-1">{empDetails.onboarding.probationEndDate || 'Completed'}</span>
                      </div>
                    </div>

                    {/* Interview Notes */}
                    <div className="p-3.5 bg-muted/20 rounded-xl border text-xs">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Interview & Selection Notes</span>
                      <p className="text-foreground font-medium">{empDetails.onboarding.interviewNotes}</p>
                    </div>

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
                        <Card key={t.id} className="border rounded-2xl p-4 bg-card hover:border-indigo-500/30 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-extrabold text-[10px]">
                                {t.transferType.toUpperCase().replace('_', ' ')}
                              </Badge>
                              <span className="text-xs font-extrabold text-foreground">Effective Date: {t.effectiveDate}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">Executed By: {t.createdBy}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3">
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-semibold">Department</span>
                              <span className="font-bold text-foreground block">{t.fromDepartmentName} → <span className="text-indigo-600 font-extrabold">{t.toDepartmentName}</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-semibold">Designation</span>
                              <span className="font-bold text-foreground block">{t.fromDesignationName} → <span className="text-indigo-600 font-extrabold">{t.toDesignationName}</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-semibold">Reporting Manager</span>
                              <span className="font-bold text-foreground block">{t.fromManagerName} → <span className="text-emerald-600 font-extrabold">{t.toManagerName}</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block font-semibold">Location</span>
                              <span className="font-bold text-foreground block">{t.fromLocationName} → <span className="text-sky-600 font-extrabold">{t.toLocationName}</span></span>
                            </div>
                          </div>

                          {t.transferReason && (
                            <p className="mt-2.5 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border font-medium">
                              <strong className="text-foreground">Transfer Reason:</strong> {t.transferReason}
                            </p>
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
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Relieving / Last Working Day</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.relievingDate || empDetails.offboarding.lastWorkingDay || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Exit Interviewer</span>
                          <span className="font-extrabold text-foreground block mt-1">{empDetails.offboarding.exitInterviewerName || 'HR Team'}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">F&F Settlement Status</span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 block mt-1 uppercase">{empDetails.offboarding.fnfStatus}</span>
                        </div>
                      </div>

                      {empDetails.offboarding.exitReason && (
                        <div className="p-3.5 bg-muted/20 rounded-xl border text-xs">
                          <span className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Exit Reason & Feedback</span>
                          <p className="text-foreground font-medium">{empDetails.offboarding.exitReason}</p>
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
              <label className="font-bold text-foreground block">Interviewer Name</label>
              <Input
                value={onboardingForm.interviewerName}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewerName: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
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

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Interview & Selection Notes</label>
              <Input
                value={onboardingForm.interviewNotes}
                onChange={(e) => setOnboardingForm({ ...onboardingForm, interviewNotes: e.target.value })}
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

            <div className="space-y-1">
              <label className="font-bold text-foreground block">Exit Reason & Feedback</label>
              <Input
                placeholder="Reason for resignation / exit feedback"
                value={offboardingForm.exitReason}
                onChange={(e) => setOffboardingForm({ ...offboardingForm, exitReason: e.target.value })}
                className="h-9 rounded-xl bg-background text-xs"
              />
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
