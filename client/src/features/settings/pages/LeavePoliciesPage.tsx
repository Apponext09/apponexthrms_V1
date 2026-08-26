import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import {
  Plus, Trash2, Edit2, CheckCircle2, XCircle, ShieldCheck,
  HelpCircle, Calendar, Settings, Search, Database, Info,
  ChevronDown, ChevronUp, Play, ArrowLeft, Clock, FileText, Check, X, AlertCircle, CreditCard,
  Zap, Loader2, PanelLeftClose, PanelLeftOpen, ChevronLeft, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { RuleConditionBuilder } from '../components/RuleConditionBuilder';
import { LeaveAllocationTab } from '../components/LeaveAllocationTab';
import { LeaveApplicationTab } from '../components/LeaveApplicationTab';
import { LeaveEncashmentTab } from '../components/LeaveEncashmentTab';
import { HelpHint } from '../components/HelpHint';
import { AuditTrailModal } from '../components/AuditTrailModal';
import { AddLeaveTypeModal } from '../components/AddLeaveTypeModal';
import { LeaveYearSettingsModal, LeaveYearSettingItem } from '../components/LeaveYearSettingsModal';

interface LeaveType {
  id: number;
  leaveName?: string;
  leave_name?: string;
  leaveCode?: string;
  leave_code?: string;
  annualQuota?: number;
  annual_quota?: number;
  carryForwardEnabled?: boolean;
  carry_forward_enabled?: boolean;
  carryForwardLimit?: number;
  carry_forward_limit?: number;
  encashmentEnabled?: boolean;
  encashment_enabled?: boolean;
  encashmentLimit?: number;
  encashment_limit?: number;
  status: 'active' | 'inactive';
  allowNegativeBalance?: boolean;
  allow_negative_balance?: boolean;
  negativeBalanceAction?: string;
  negative_balance_action?: string;
  poolFromLeaveTypeId?: number;
  pool_from_leave_type_id?: number;
  paidType?: 'paid' | 'unpaid' | 'half_paid';
  paid_type?: 'paid' | 'unpaid' | 'half_paid';
  leave_classification?: 'calendar' | 'non-calendar' | 'uncategorized';
  allocationSettings?: any;
  allocation_settings?: any;
  applicationSettings?: any;
  application_settings?: any;
  payrollSettings?: any;
  payroll_settings?: any;
  employmentAllocationSettings?: any;
  employment_allocation_settings?: any;
  employmentApplicationSettings?: any;
  employment_application_settings?: any;
  encashmentSettings?: any;
  encashment_settings?: any;
  gender_applicable?: string;
  genderApplicable?: string;
  sandwich_rule_enabled?: boolean;
  sandwichRuleEnabled?: boolean;
}

export function LeavePoliciesPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'leave' | 'policy' | 'late_deduction_policy' | 'late_auto_deduction' | 'encashment'>('leave');
  const [configureTab, setConfigureTab] = useState<'allocation' | 'application' | 'encashment'>('allocation');
  const [viewMode, setViewMode] = useState<'table' | 'edit' | 'configure' | 'leave-year'>('table');

  // Sidebar collapse states for maximum form workspace
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState<boolean>(false);

  // Master lists
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);
  const [isExecutingCron, setIsExecutingCron] = useState<boolean>(false);

  // Leave Year Setting & Scope Master List States
  const [isLeaveYearModalOpen, setIsLeaveYearModalOpen] = useState<boolean>(false);
  const [leaveYearToEdit, setLeaveYearToEdit] = useState<LeaveYearSettingItem | null>(null);
  const [leaveYearSettings, setLeaveYearSettings] = useState<LeaveYearSettingItem[]>([]);
  const [isLoadingLeaveYear, setIsLoadingLeaveYear] = useState<boolean>(false);

  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [subDepartmentsList, setSubDepartmentsList] = useState<any[]>([]);
  const [designationsList, setDesignationsList] = useState<any[]>([]);
  const [employmentTypesList, setEmploymentTypesList] = useState<any[]>([]);
  const [employmentStatusesList, setEmploymentStatusesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchScopeMasters = async () => {
      try {
        const res = await apiClient.get('/settings/scope-masters');
        if (res.data && res.data.success && res.data.data) {
          const d = res.data.data;
          if (d.companies && d.companies.length > 0) {
            setCompaniesList(d.companies);
          } else {
            // Direct fallback fetch from Company Controller
            try {
              const compRes = await apiClient.get('/settings/companies');
              if (compRes.data && compRes.data.success && Array.isArray(compRes.data.data)) {
                const mapped = compRes.data.data.map((c: any) => ({
                  id: c.company_id || c.id,
                  name: String(c.name || c.company_name || c.employerName || `Company #${c.company_id || c.id}`).trim()
                }));
                setCompaniesList(mapped);
              }
            } catch (err) {}
          }
          if (d.locations) setLocationsList(d.locations);
          if (d.departments) setDepartmentsList(d.departments);
          if (d.subDepartments) setSubDepartmentsList(d.subDepartments);
          if (d.designations) setDesignationsList(d.designations);
          if (d.grades) setGradesList(d.grades);
          if (d.employmentTypes) setEmploymentTypesList(d.employmentTypes);
          if (d.employmentStatuses) setEmploymentStatusesList(d.employmentStatuses);
        }
      } catch (e) {
        console.error('Failed to load scope masters:', e);
      }
    };
    fetchScopeMasters();
  }, []);

  const fetchLeaveYearSettings = async () => {
    setIsLoadingLeaveYear(true);
    try {
      const res = await apiClient.get('/settings/leave-year-settings');
      if (res.data && res.data.success) {
        setLeaveYearSettings(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch leave year settings", err);
    } finally {
      setIsLoadingLeaveYear(false);
    }
  };

  const handleCreateLeaveTypeApi = async (payload: any) => {
    const res = await apiClient.post('/settings/leave-types', payload);
    if (res.data && res.data.success) {
      toast.success('Leave category created successfully!');
      fetchLeaveTypes();
      return res.data.data || res.data;
    }
  };

  const fetchAuditLogs = async () => {
    if (!selectedLeaveType?.id) return;
    setIsLoadingAudit(true);
    try {
      const res = await apiClient.get(`/settings/leave-types/${selectedLeaveType.id}/audit-logs`);
      if (res.data && res.data.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Late Deduction Policy States
  const [latePolicies, setLatePolicies] = useState<any[]>([]);
  const [isLoadingLatePolicies, setIsLoadingLatePolicies] = useState<boolean>(false);
  const [selectedLatePolicyId, setSelectedLatePolicyId] = useState<number | null>(null);
  const [shiftOptions, setShiftOptions] = useState<any[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string[]>([]);
  const [expandedLateSub, setExpandedLateSub] = useState<string | null>(null);
  const [isLatePolicyModalOpen, setIsLatePolicyModalOpen] = useState<boolean>(false);

  const [latePolicyForm, setLatePolicyForm] = useState({
    name: '',
    policy_type: 'Late Coming',
    first_deduction_on: 3,
    buffer_allowed: 15,
    no_buffer_allowed: 0,
    deduct_type: 'Leave', // 'Leave' or 'Salary'
    deduction_unit: 1.0,
    after_deduction_amount: 0.5,
    after_deduction_every: 1,
    deduction_sequence: ['LWP', 'Paid leaves', 'Privilege Leave', 'Salary'] as string[],
    locations: [] as number[],
    departments: [] as number[],
    grades: [] as string[],
    shifts: [] as number[],
    employee_statuses: [] as string[],
    status: 'active'
  });

  // Late Auto Deduction States
  const [lateDeductionLogs, setLateDeductionLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [manualRunMonth, setManualRunMonth] = useState('2026-07');
  const [isDryRun, setIsDryRun] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isExecutingJob, setIsExecutingJob] = useState(false);

  // Late Updation Configuration States
  const [lateUpdations, setLateUpdations] = useState<any[]>([]);
  const [isLoadingLateUpdations, setIsLoadingLateUpdations] = useState<boolean>(false);
  const [selectedLateUpdationId, setSelectedLateUpdationId] = useState<number | null>(null);
  const [isLateUpdationModalOpen, setIsLateUpdationModalOpen] = useState<boolean>(false);
  const [expandedLateUpdationSub, setExpandedLateUpdationSub] = useState<string | null>(null);

  const [lateUpdationForm, setLateUpdationForm] = useState({
    name: '',
    late_coming_after: '09:30',
    update_for: 'Half Day',
    auto_apply_leave: false,
    locations: [] as number[],
    departments: [] as number[],
    grades: [] as string[],
    shifts: [] as number[],
    employee_statuses: [] as string[],
    status: 'active'
  });

  const fetchLatePolicies = async () => {
    setIsLoadingLatePolicies(true);
    try {
      const res = await apiClient.get('/settings/late-deduction-policies');
      if (res.data && res.data.success) {
        setLatePolicies(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch late deduction policies", err);
    } finally {
      setIsLoadingLatePolicies(false);
    }
  };

  const fetchLateDeductionLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get('/settings/late-auto-deductions/logs');
      if (res.data && res.data.success) {
        setLateDeductionLogs(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch late deduction logs", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveLatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latePolicyForm.name.trim()) {
      toast.error('Policy name is required');
      return;
    }
    try {
      if (selectedLatePolicyId) {
        await apiClient.put(`/settings/late-deduction-policies/${selectedLatePolicyId}`, latePolicyForm);
        toast.success('Late deduction policy updated successfully');
      } else {
        await apiClient.post('/settings/late-deduction-policies', latePolicyForm);
        toast.success('Late deduction policy created successfully');
      }
      setLatePolicyForm({
        name: '',
        policy_type: 'Late Coming',
        first_deduction_on: 3,
        buffer_allowed: 15,
        no_buffer_allowed: 0,
        deduct_type: 'Leave',
        deduction_unit: 1.0,
        after_deduction_amount: 0.5,
        after_deduction_every: 1,
        deduction_sequence: ['LWP', 'Paid leaves', 'Privilege Leave', 'Salary'],
        locations: [],
        departments: [],
        grades: [],
        shifts: [],
        employee_statuses: [],
        status: 'active'
      });
      setSelectedLatePolicyId(null);
      setSelectedAvailable([]);
      setSelectedSequence([]);
      setIsLatePolicyModalOpen(false);
      fetchLatePolicies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save policy');
    }
  };

  const handleEditLatePolicy = (policy: any) => {
    setSelectedLatePolicyId(policy.id);
    setLatePolicyForm({
      name: policy.name,
      policy_type: policy.policy_type || 'Late Coming',
      first_deduction_on: policy.first_deduction_on || 3,
      buffer_allowed: policy.buffer_allowed || 15,
      no_buffer_allowed: policy.no_buffer_allowed || 0,
      deduct_type: policy.deduct_type || 'Leave',
      deduction_unit: policy.deduction_unit || 1.0,
      after_deduction_amount: policy.after_deduction_amount || 0.5,
      after_deduction_every: policy.after_deduction_every || 1,
      deduction_sequence: Array.isArray(policy.deduction_sequence) ? policy.deduction_sequence : ['LWP', 'Paid leaves', 'Privilege Leave', 'Salary'],
      locations: Array.isArray(policy.locations) ? policy.locations : [],
      departments: Array.isArray(policy.departments) ? policy.departments : [],
      grades: Array.isArray(policy.grades) ? policy.grades : [],
      shifts: Array.isArray(policy.shifts) ? policy.shifts : [],
      employee_statuses: Array.isArray(policy.employee_statuses) ? policy.employee_statuses : (Array.isArray(policy.employeeStatuses) ? policy.employeeStatuses : []),
      status: policy.status || (policy.is_active === 1 || policy.is_active === true || policy.is_active === 'active' ? 'active' : 'inactive')
    });
    setSelectedAvailable([]);
    setSelectedSequence([]);
    setIsLatePolicyModalOpen(true);
  };

  const handleToggleLatePolicyStatus = async (policy: any) => {
    const currentStatus = policy.status || (policy.is_active === true || policy.is_active === 1 || policy.is_active === 'active' ? 'active' : 'inactive');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.patch(`/settings/late-deduction-policies/${policy.id}/status`, { status: newStatus });
      toast.success(`Policy ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchLatePolicies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteLatePolicy = async (id: number) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await apiClient.delete(`/settings/late-deduction-policies/${id}`);
      toast.success('Late deduction policy deleted successfully');
      if (selectedLatePolicyId === id) {
        setSelectedLatePolicyId(null);
        setLatePolicyForm({
          name: '',
          policy_type: 'Late Coming',
          first_deduction_on: 3,
          buffer_allowed: 15,
          no_buffer_allowed: 0,
          deduct_type: 'Leave',
          deduction_unit: 1.0,
          after_deduction_amount: 0.5,
          after_deduction_every: 1,
          deduction_sequence: ['LWP', 'Paid leaves', 'Privilege Leave', 'Salary'],
          locations: [],
          departments: [],
          grades: [],
          shifts: [],
          employee_statuses: [],
          status: 'active'
        });
      }
      setSelectedAvailable([]);
      setSelectedSequence([]);
      fetchLatePolicies();
    } catch (err) {
      toast.error('Failed to delete policy');
    }
  };

  const fetchLateUpdations = async () => {
    setIsLoadingLateUpdations(true);
    try {
      const res = await apiClient.get('/settings/late-updations');
      if (res.data && res.data.success) {
        setLateUpdations(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch late updations", err);
    } finally {
      setIsLoadingLateUpdations(false);
    }
  };

  const handleSaveLateUpdation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lateUpdationForm.name) {
      toast.error('Please enter updation name');
      return;
    }
    try {
      if (selectedLateUpdationId) {
        await apiClient.put(`/settings/late-updations/${selectedLateUpdationId}`, lateUpdationForm);
        toast.success('Late updation updated successfully');
      } else {
        await apiClient.post('/settings/late-updations', lateUpdationForm);
        toast.success('Late updation created successfully');
      }
      setLateUpdationForm({
        name: '',
        late_coming_after: '09:30',
        update_for: 'Half Day',
        auto_apply_leave: false,
        locations: [],
        departments: [],
        grades: [],
        shifts: [],
        employee_statuses: [],
        status: 'active'
      });
      setSelectedLateUpdationId(null);
      setIsLateUpdationModalOpen(false);
      fetchLateUpdations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save updation');
    }
  };

  const handleEditLateUpdation = (updation: any) => {
    setSelectedLateUpdationId(updation.id);
    setLateUpdationForm({
      name: updation.name,
      late_coming_after: updation.late_coming_after || '09:30',
      update_for: updation.update_for || 'Half Day',
      auto_apply_leave: !!updation.auto_apply_leave,
      locations: Array.isArray(updation.locations) ? updation.locations : [],
      departments: Array.isArray(updation.departments) ? updation.departments : [],
      grades: Array.isArray(updation.grades) ? updation.grades : [],
      shifts: Array.isArray(updation.shifts) ? updation.shifts : [],
      employee_statuses: Array.isArray(updation.employee_statuses) ? updation.employee_statuses : [],
      status: updation.status || (updation.is_active === 1 || updation.is_active === true ? 'active' : 'inactive') || 'active'
    });
    setIsLateUpdationModalOpen(true);
  };

  const handleDeleteLateUpdation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this updation rule?')) return;
    try {
      await apiClient.delete(`/settings/late-updations/${id}`);
      toast.success('Late updation deleted successfully');
      if (selectedLateUpdationId === id) {
        setSelectedLateUpdationId(null);
        setLateUpdationForm({
          name: '',
          late_coming_after: '09:30',
          update_for: 'Half Day',
          auto_apply_leave: false,
          locations: [],
          departments: [],
          grades: [],
          shifts: [],
          employee_statuses: [],
          status: 'active'
        });
      }
      fetchLateUpdations();
    } catch (err) {
      toast.error('Failed to delete updation');
    }
  };

  const handleRunLateDeduction = async () => {
    setIsExecutingJob(true);
    try {
      const res = await apiClient.post('/settings/late-auto-deductions/run', {
        month: manualRunMonth,
        isDryRun
      });
      if (res.data && res.data.success) {
        setPreviewData(res.data.data.preview || []);
        if (isDryRun) {
          setIsPreviewModalOpen(true);
          toast.success('Dry run generated. Review the preview below.');
        } else {
          toast.success('Late deduction executed and balances updated successfully!');
          fetchLateDeductionLogs();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to run late deduction');
    } finally {
      setIsExecutingJob(false);
    }
  };

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'calendar' | 'non-calendar' | 'uncategorized'>('all');

  // Accordion expansion state
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('allocation');

  // Nested employment accordions state
  const [expandedAllocSub, setExpandedAllocSub] = useState<string | null>(null);
  const [expandedAppSub, setExpandedAppSub] = useState<string | null>(null);

  // Metadata states
  const [policies, setPolicies] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [blackoutPeriods, setBlackoutPeriods] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [orgLocation, setOrgLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic options lists for employment targets
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [employeeTypeOptions, setEmployeeTypeOptions] = useState<string[]>([]);
  const [employeeStatusOptions, setEmployeeStatusOptions] = useState<string[]>([]);

  // Original Modals
  const [isOpen, setIsOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);

  // Encashment & Carry Forward Modals and State
  const [isEncashRuleModalOpen, setIsEncashRuleModalOpen] = useState(false);
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

  // Encashment Rule Form State
  const [ruleForm, setRuleForm] = useState({
    periodicity: 'Select',
    requestableEncashment: false,
    allowMultipleEncashment: false,
    encashYear: 'Select',
    maxCarryForward: '',
    maxEncash: '',
    maxLimit: '',
    expireAfterDays: '',
    customHook: '',
    employment: {
      locations: [] as number[],
      departments: [] as number[],
      grades: [] as string[],
      employeeTypes: [] as string[],
      employeeStatuses: [] as string[],
    }
  });

  // Disbursement Form State
  const [disbursementForm, setDisbursementForm] = useState({
    periodicity: 'Select',
    disbursementAfter: ''
  });

  // Modal Collapsible Section
  const [isRuleModalEmploymentExpanded, setIsRuleModalEmploymentExpanded] = useState(false);
  const [expandedRuleSub, setExpandedRuleSub] = useState<string | null>(null);

  // --- New Leave Encashment Tab UI State ---
  const [encashmentsList, setEncashmentsList] = useState<any[]>([
    { id: 1, name: 'Leave encashment one', formula: '[NUMBER_OF_LEAVE] * [PER_DAY_SALARY]', limit: '', isActive: true }
  ]);
  const [selectedEncashmentId, setSelectedEncashmentId] = useState<number | null>(1);
  const [encashmentSearchQuery, setEncashmentSearchQuery] = useState('');
  const [encashmentStatusFilter, setEncashmentStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const [encashmentTabForm, setEncashmentTabForm] = useState({
    name: 'Leave encashment one',
    formula: '[NUMBER_OF_LEAVE] * [PER_DAY_SALARY]',
    limit: '',
    isActive: true,
    daysBasis: 30,
    employment: {
      locations: [] as number[],
      departments: [] as number[],
      grades: [] as string[],
      employeeTypes: [] as string[],
    }
  });
  const [expandedEncashmentSub, setExpandedEncashmentSub] = useState<string | null>(null);

  const handleToggleEncashmentEmploymentTarget = (category: 'locations' | 'departments' | 'grades' | 'employeeTypes', id: any) => {
    setEncashmentTabForm(prev => {
      const arr = prev.employment[category] as any[];
      return {
        ...prev,
        employment: {
          ...prev.employment,
          [category]: arr.includes(id) ? arr.filter((x: any) => x !== id) : [...arr, id]
        }
      };
    });
  };

  // Original Form States
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [policyForm, setPolicyForm] = useState({
    earnedLeaveEntitlementPercent: '',
    entitlementIncludesPublicHolidays: false,
  });
  const [mappingForm, setMappingForm] = useState({
    leavePolicyId: '',
    roleId: '',
    departmentId: '',
    designationId: '',
    employmentType: '',
    priority: 10,
  });
  const [blackoutForm, setBlackoutForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    applicable_department_id: '',
    applicable_location_id: '',
  });

  // Quick Create Policy States
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [isSavingNewPolicy, setIsSavingNewPolicy] = useState(false);

  const handleQuickCreatePolicy = async () => {
    if (!newPolicyName.trim()) {
      toast.error('Please enter a policy name');
      return;
    }
    setIsSavingNewPolicy(true);
    try {
      const res = await apiClient.post('/leaves/policies', { name: newPolicyName.trim() });
      if (res.data?.success) {
        toast.success(`Leave Policy "${newPolicyName.trim()}" created successfully!`);
        setNewPolicyName('');
        setIsCreatePolicyOpen(false);

        const resPolicies = await apiClient.get('/leaves/policies');
        const updatedList = resPolicies.data?.data || [];
        setPolicies(updatedList);

        if (res.data?.data?.id) {
          setMappingForm(prev => ({ ...prev, leavePolicyId: String(res.data.data.id) }));
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create leave policy');
    } finally {
      setIsSavingNewPolicy(false);
    }
  };

  // Helper to parse JSON safely, handling potential double-stringification from DB
  const parseJson = (val: any, fallback: any) => {
    if (!val) return fallback;
    let parsed = val;
    // First un-stringify if it's a string
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return fallback;
      }
    }
    // If it's STILL a string, it was double stringified in the DB
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) { }
    }
    return (typeof parsed === 'object' && parsed !== null) ? parsed : fallback;
  };

  // State for Advanced Form Configuration (Right panel)
  const [formData, setFormData] = useState({
    leave_name: '',
    leave_code: '',
    leave_classification: 'calendar' as 'calendar' | 'non-calendar' | 'uncategorized',
    status: 'active' as 'active' | 'inactive',
    paid_type: 'paid' as 'paid' | 'unpaid' | 'half_paid',
    annual_quota: '' as number | string,

    // Allocation Settings
    allocation: {
      considerLeaveStartYearAsFrom: false,
      leaveStartMonth: '4',
      entitlementDays: '',
      entitlementPeriodicity: 'Select',
      entitlementEndType: 'End',
      entitlementEndTypeVal: '',
      strictCronPeriodicity: false,
      customAllocation: false,
      allocateAllLeaveIfConfirmed: false,
      allocatePastLeaveIfConfirmed: false,
      expireLeaveOnDashboard: false,
      considerLeaveCalendarYear: false,
      allocateLeaveIfConfirmationDatePresent: false,
      noPayment: false,
      excludeLeaveFromSandwichPolicy: false,
      minServiceRequired: '',
      minServiceRequiredUnit: 'Select',
      gender: 'All',
      minWorkingDays: '',
      initialAllocationDateRange: false,
      considerFullMonthIfDateOf: 'Confirmation',
      considerFullMonthBeforeDay: '',
      allocateLeaveBeforeDays: '0',
      leaveRoundOff: false,
      considerAllocationTillResignedDate: false,
      expireLeaveAfterValue: '',
      expireLeaveAfterBase: 'Date of Credit/Approval',
      notifyLeaveExpireBeforeDays: '',
      requestLeaveWithinDays: '',
      disableProRata: false,
      leaveProrataDateType: 'Select',
      leaveProrataDays: '',
      encashmentsSubjectToLimitsFNF: false,
      encashmentOnProrataBasis: false,
      maxEncashUnit: '',
      maxCarryForwardUnit: '',

      // Non-Calendar specific
      creditType: 'manual' as 'manual' | 'on_request' | 'auto',
      dayType: 'Week Off',
      hourStart: '',
      hourEnd: '',
      allocateLeaves: '',
      nonCalendarRules: [] as any[],
      workingDateRequired: false,
      applyAutoRequestPolicy: false,
      noOfTimesInService: '',
      fixedLeave: false,
      maritalStatus: 'All',
      maximumAllowed: '0',
      requestLeaveOnlyOnWeekendAndHoliday: false,
      requestLeaveOnlyIfAttendanceExists: false,
      restrictLeaveApplicationTillExpiry: false,
      showFromToDateForRequest: false,
      addLeaveApplicationAfterApproval: false,
    },

    // Application Settings
    application: {
      category: 'unplanned' as 'planned' | 'unplanned',
      daysInAdvance: '',
      daysInAdvanceUnit: 'Days',
      gracePeriod: '',
      gracePeriodUnit: 'Days',
      minDaysAllowed: '',
      maxDaysAllowed: '',
      gapBetweenApplication: '',
      gapBetweenApplicationUnit: 'Days',
      gapBetweenApplicationWindow: 'This',
      numTimesEmployeeCanApply: '',
      numTimesEmployeeCanApplyUnit: 'Select',
      numLeavesEmployeeCanApply: '',
      numLeavesEmployeeCanApplyUnit: 'Select',
      validUpto: '',
      validUptoUnit: 'Select',
      supportingDocumentsRequired: false,
      allowBookTicket: false,
      excludeWeekend: false,
      excludeHoliday: false,
      restrictBeforeAfterHoliday: false,
      restrictBeforeAfterWeekend: false,
      restrictBeforeConfirmation: false,
      applyLeaveFromThisDate: false,
      applyInMultipleOfOne: false,
      applyLeaveBeforeConfirmationDate: false,
      applyRestrictionForWeekoffHoliday: false,
      cancelFutureAppliedLeaveOnResignation: false,
      customHook: '',
    },

    // Payroll Condition Settings
    payroll: {
      conditionOn: 'Choose',
      operator: 'Choose',
      value1: '0',
      value2: '0',
      considerMonths: '0',
      reverseCondition: false,
    },

    // Employment Target scopes (Allocation)
    employment_allocation: {
      locations: [] as number[],
      departments: [] as number[],
      grades: [] as string[],
      employeeTypes: [] as string[],
      employeeStatuses: [] as string[],
    },

    // Employment Target scopes (Application)
    employment_application: {
      locations: [] as number[],
      departments: [] as number[],
      grades: [] as string[],
      employeeTypes: [] as string[],
      employeeStatuses: [] as string[],
    },

    // Leave Encashment / Carry Forward Settings
    encashment: {
      rules: [] as any[],
      disbursement: {
        periodicity: 'Select',
        disbursementAfter: ''
      }
    }
  });

  // Fetch Leave Types
  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      let types: any[] = [];
      try {
        const res = await apiClient.get('/settings/leave-types');
        if (res.data?.success || Array.isArray(res.data?.data)) {
          types = res.data?.data || res.data || [];
        }
      } catch (e) {
        try {
          const fallbackRes = await apiClient.get('/leaves/leave-types');
          if (fallbackRes.data?.success || Array.isArray(fallbackRes.data?.data)) {
            types = fallbackRes.data?.data || fallbackRes.data || [];
          }
        } catch (errFallback) {
          console.warn('Fallback leave types fetch failed silently:', errFallback);
        }
      }

      setLeaveTypes(types);

      // Auto-select or preserve current selection
      if (types.length > 0) {
        setSelectedLeaveType((prev: any) => {
          if (prev?.id) {
            const matched = types.find((t: any) => t.id === prev.id);
            if (matched) return matched;
          }
          const paid = types.find((t: any) => (t.leaveName || t.leave_name || '').toLowerCase().includes('paid'));
          return paid || types[0];
        });
      } else {
        setSelectedLeaveType(null);
      }
    } catch (err: any) {
      console.error('Failed to load leave types', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Policies and Mappings (Original mapping metadata)
  const fetchMappingMetadata = async () => {
    try {
      const fetchWithFallback = async (primary: string, fallback: string) => {
        try {
          const res = await apiClient.get(primary);
          if (res.status === 200 && res.data) {
            return res;
          }
          return await apiClient.get(fallback).catch(() => ({ data: { data: [] } }));
        } catch (e: any) {
          if (e?.response?.status === 404) {
            return await apiClient.get(fallback).catch(() => ({ data: { data: [] } }));
          }
          return { data: { data: [] } };
        }
      };

      const [policiesRes, mappingsRes, deptsRes, desigsRes, locsRes, empOptsRes, shiftsRes, rolesRes] = await Promise.all([
        apiClient.get('/leaves/policies').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/policy-mappings').catch(() => ({ data: { data: [] } })),
        fetchWithFallback('/settings/departments', '/departments'),
        fetchWithFallback('/settings/designations', '/designations'),
        fetchWithFallback('/settings/locations', '/settings/branches'),
        apiClient.get('/settings/employment-options').catch(() => ({ data: { data: { grades: [], employeeTypes: [], employeeStatuses: [] } } })),
        apiClient.get('/attendance/shifts/active').catch(() => ({ data: { data: [] } })),
        apiClient.get('/rbac/roles').catch(() => ({ data: { data: { items: [] } } })),
      ]);

      const policiesData = policiesRes.data?.data || policiesRes.data || [];
      setPolicies(Array.isArray(policiesData) ? policiesData : []);

      const mappingsData = mappingsRes.data?.data || mappingsRes.data || [];
      setMappings(Array.isArray(mappingsData) ? mappingsData : []);

      const deptsData = deptsRes.data?.data?.items || deptsRes.data?.data || deptsRes.data || [];
      setDepartments(Array.isArray(deptsData) ? deptsData : []);

      const desigsData = desigsRes.data?.data?.items || desigsRes.data?.data || desigsRes.data || [];
      setDesignations(Array.isArray(desigsData) ? desigsData : []);

      const locsData = locsRes.data?.data?.items || locsRes.data?.data || locsRes.data || [];
      setLocations(Array.isArray(locsData) ? locsData : []);

      const shiftsData = shiftsRes.data?.data || shiftsRes.data || [];
      setShiftOptions(Array.isArray(shiftsData) ? shiftsData : []);

      const rolesData = rolesRes.data?.data?.items || rolesRes.data?.data || rolesRes.data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);

      const empData = empOptsRes.data?.data || {};
      setGradeOptions(empData.grades || []);
      setEmployeeTypeOptions(empData.employeeTypes || []);
      setEmployeeStatusOptions(empData.employeeStatuses || []);

      // Load blackout periods
      const blackoutRes = await apiClient.get('/leaves/blackout-periods').catch(() => ({ data: { data: [] } }));
      setBlackoutPeriods(blackoutRes.data?.data || []);

      // Fetch company profile location
      const companyRes = await apiClient.get('/settings/company-profile').catch(() => null);
      if (companyRes?.data?.data) {
        const orgData = companyRes.data.data;
        const locName = orgData.address_line1 || orgData.location || orgData.company_name || 'Main Office';
        setOrgLocation({
          id: 999999,
          locationName: locName,
          name: locName,
          location_name: locName
        });
      }

      // Load encashment settings
      const encashmentSettingsRes = await apiClient.get('/leaves/encashment-settings').catch(() => ({ data: { data: [] } }));
      const encashments = encashmentSettingsRes.data?.data || [];
      setEncashmentsList(encashments);
      if (encashments.length > 0) {
        setSelectedEncashmentId(encashments[0].id);
      } else {
        setSelectedEncashmentId(null);
      }
    } catch (err) {
      console.error('Failed to load policy mappings metadata', err);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchMappingMetadata();
  }, []);

  // Global Checkbox Toast with Descriptive Effects
  useEffect(() => {
    const tooltipMapping: Record<string, string> = {
      "Expire Leave On Dashboard": "Expired leaves will instantly vanish from the employee's UI.",
      "Consider Leave Calendar Year": "Leave quota resets strictly based on the financial year start.",
      "Allocate Leave If Confirmation Date Is Present": "Resigned employees cannot receive this if unconfirmed.",
      "No Payment": "This leave will be processed as Unpaid (Loss of Pay).",
      "Exclude Leave from Sandwich Policy": "Weekends between leave days will NOT be deducted.",
      "Supporting documents required": "Employees must upload a document to apply.",
      "Allow to book ticket": "Enables the flight/train booking feature for this leave.",
      "Exclude Weekend in Leave Application": "Weekends will not be counted as leave days.",
      "Exclude Holiday in Leave Application": "Holidays will not be counted as leave days.",
      "Before or after holiday": "Restricts applying if it attaches to a holiday.",
      "Before or after weekend": "Restricts applying if it attaches to a weekend.",
      "Apply Restriction for WeekOff and Holiday": "Prevents bridging leaves with week-offs and holidays.",
      "Apply Leave from this date": "Restricts applying before a specifically configured date.",
      "Apply In Multiple of One": "Only allows applying in full days (no half days).",
      "Apply Leave Before Confirmation Date": "Blocks application if the employee is not confirmed.",
      "Before Confirmation": "Blocks cancellation or application before confirmation.",
      "Custom Allocation": "Enables the custom hook formula for allocation.",
      "Allocate past leave if confirmed": "Grants retro-active leaves upon confirmation.",
      "Encashments subject to the limits defined for FNF": "Links encashment limits to the global Full & Final settlement limits.",
      "Encashment on Prorata Basis": "Encashment payout is prorated if employee leaves mid-year."
    };

    const handleGlobalChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'checkbox') {
        const labelEl = target.nextElementSibling as HTMLLabelElement;
        const labelText = labelEl ? labelEl.innerText.trim() : 'Setting';

        const effectMsg = tooltipMapping[labelText];

        if (effectMsg) {
          if (target.checked) {
            toast.success(`Enabled: ${effectMsg}`, { duration: 1500, position: 'top-center' });
          } else {
            toast.error(`Disabled: ${labelText}`, { duration: 1000, position: 'top-center' });
          }
        } else {
          toast.success(`${labelText} ${target.checked ? 'Enabled' : 'Disabled'}`, { duration: 1000, position: 'top-center' });
        }
      }
    };
    document.addEventListener('change', handleGlobalChange);
    return () => document.removeEventListener('change', handleGlobalChange);
  }, []);

  // Fit LeavePoliciesPage inside AppShellLayout without outer overflow
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    const mainEl = document.querySelector('.app-shell-scroll') as HTMLElement | null;
    const contentEl = document.querySelector('.app-shell-content') as HTMLElement | null;

    if (mainEl) {
      mainEl.scrollTop = 0;
      mainEl.style.overflow = 'hidden';
    }
    if (contentEl) {
      contentEl.style.height = '100%';
      contentEl.style.padding = '0';
    }

    return () => {
      if (mainEl) {
        mainEl.style.overflow = '';
      }
      if (contentEl) {
        contentEl.style.height = '';
        contentEl.style.padding = '';
      }
    };
  }, []);

  // When selected Leave Type changes, populate form
  useEffect(() => {
    if (selectedLeaveType) {
      const lt = selectedLeaveType;

      const alloc = parseJson(lt.allocationSettings || lt.allocation_settings, {});
      const app = parseJson(lt.applicationSettings || lt.application_settings, {});
      const pay = parseJson(lt.payrollSettings || lt.payroll_settings, {});
      const empAlloc = parseJson(lt.employmentAllocationSettings || lt.employment_allocation_settings, {});
      const empApp = parseJson(lt.employmentApplicationSettings || lt.employment_application_settings, {});
      const enc = parseJson(lt.encashmentSettings || lt.encashment_settings, { rules: [], disbursement: { periodicity: 'Select', disbursementAfter: '' } });

      setFormData({
        leave_name: lt.leaveName || lt.leave_name || '',
        leave_code: lt.leaveCode || lt.leave_code || '',
        leave_classification: lt.leave_classification ||
          ((lt.leaveName || lt.leave_name || '').toLowerCase().includes('lwp') ? 'uncategorized' :
            (lt.leaveName || lt.leave_name || '').toLowerCase().includes('privilage') || (lt.leaveName || lt.leave_name || '').toLowerCase().includes('privilege') ? 'non-calendar' : 'calendar'),
        status: lt.status || 'active',
        paid_type: (lt.paidType || lt.paid_type) as any || 'paid',
        annual_quota: lt.annualQuota ?? lt.annual_quota ?? 12,

        allocation: {
          ...alloc,
          considerLeaveStartYearAsFrom: alloc.considerLeaveStartYearAsFrom ?? false,
          leaveStartMonth: alloc.leaveStartMonth || '4',
          entitlementDays: alloc.entitlementDays ?? String(lt.annualQuota ?? lt.annual_quota ?? '0'),
          entitlementPeriodicity: alloc.entitlementPeriodicity || 'Select',
          entitlementEndType: alloc.entitlementEndType || 'End',
          entitlementEndTypeVal: alloc.entitlementEndTypeVal ?? '',
          strictCronPeriodicity: alloc.strictCronPeriodicity ?? false,
          customAllocation: alloc.customAllocation ?? false,
          allocateAllLeaveIfConfirmed: alloc.allocateAllLeaveIfConfirmed ?? false,
          allocatePastLeaveIfConfirmed: alloc.allocatePastLeaveIfConfirmed ?? false,
          expireLeaveOnDashboard: alloc.expireLeaveOnDashboard ?? false,
          considerLeaveCalendarYear: alloc.considerLeaveCalendarYear ?? false,
          allocateLeaveIfConfirmationDatePresent: alloc.allocateLeaveIfConfirmationDatePresent ?? false,
          noPayment: alloc.noPayment ?? ((lt.paidType || lt.paid_type) === 'unpaid'),
          excludeLeaveFromSandwichPolicy: alloc.excludeLeaveFromSandwichPolicy ?? false,
          minServiceRequired: alloc.minServiceRequired ?? '',
          minServiceRequiredUnit: alloc.minServiceRequiredUnit || 'Select',
          gender: (() => {
            const g = lt.gender_applicable || lt.genderApplicable || alloc.gender || 'All';
            if (g.toLowerCase() === 'all') return 'All';
            return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
          })(),
          minWorkingDays: alloc.minWorkingDays ?? '',
          initialAllocationDateRange: alloc.initialAllocationDateRange ?? false,
          considerFullMonthIfDateOf: alloc.considerFullMonthIfDateOf || 'Confirmation',
          considerFullMonthBeforeDay: alloc.considerFullMonthBeforeDay ?? '',
          allocateLeaveBeforeDays: alloc.allocateLeaveBeforeDays ?? '0',
          leaveRoundOff: alloc.leaveRoundOff ?? false,
          considerAllocationTillResignedDate: alloc.considerAllocationTillResignedDate ?? false,
          expireLeaveAfterValue: alloc.expireLeaveAfterValue ?? '',
          expireLeaveAfterBase: alloc.expireLeaveAfterBase || 'Date of Credit/Approval',
          notifyLeaveExpireBeforeDays: alloc.notifyLeaveExpireBeforeDays ?? '',
          requestLeaveWithinDays: alloc.requestLeaveWithinDays ?? '',
          disableProRata: alloc.disableProRata ?? false,
          leaveProrataDateType: alloc.leaveProrataDateType || 'Select',
          leaveProrataDays: alloc.leaveProrataDays ?? '',
          encashmentsSubjectToLimitsFNF: alloc.encashmentsSubjectToLimitsFNF ?? false,
          encashmentOnProrataBasis: alloc.encashmentOnProrataBasis ?? false,
          maxEncashUnit: alloc.maxEncashUnit ?? '',
          maxCarryForwardUnit: alloc.maxCarryForwardUnit ?? '',

          // Non-Calendar specific
          creditType: alloc.creditType || 'manual',
          dayType: alloc.dayType || 'Week Off',
          hourStart: alloc.hourStart ?? '',
          hourEnd: alloc.hourEnd ?? '',
          allocateLeaves: alloc.allocateLeaves ?? '',
          nonCalendarRules: alloc.nonCalendarRules || [],
          workingDateRequired: alloc.workingDateRequired ?? false,
          applyAutoRequestPolicy: alloc.applyAutoRequestPolicy ?? false,
          noOfTimesInService: alloc.noOfTimesInService ?? '',
          fixedLeave: alloc.fixedLeave ?? false,
          maritalStatus: alloc.maritalStatus || 'All',
          maximumAllowed: alloc.maximumAllowed ?? '0',
          requestLeaveOnlyOnWeekendAndHoliday: alloc.requestLeaveOnlyOnWeekendAndHoliday ?? false,
          requestLeaveOnlyIfAttendanceExists: alloc.requestLeaveOnlyIfAttendanceExists ?? false,
          restrictLeaveApplicationTillExpiry: alloc.restrictLeaveApplicationTillExpiry ?? false,
          showFromToDateForRequest: alloc.showFromToDateForRequest ?? false,
          addLeaveApplicationAfterApproval: alloc.addLeaveApplicationAfterApproval ?? false,
          onlyWhen: alloc.onlyWhen || alloc.only_when || undefined,
        },
        application: {
          ...app,
          category: app.category || 'unplanned',
          daysInAdvance: app.daysInAdvance ?? '',
          daysInAdvanceUnit: app.daysInAdvanceUnit || 'Days',
          gracePeriod: app.gracePeriod ?? '',
          gracePeriodUnit: app.gracePeriodUnit || 'Days',
          minDaysAllowed: app.minDaysAllowed ?? '',
          maxDaysAllowed: app.maxDaysAllowed ?? '',
          gapBetweenApplication: app.gapBetweenApplication ?? '',
          gapBetweenApplicationUnit: app.gapBetweenApplicationUnit || 'Days',
          gapBetweenApplicationWindow: app.gapBetweenApplicationWindow || 'This',
          numTimesEmployeeCanApply: app.numTimesEmployeeCanApply ?? '',
          numTimesEmployeeCanApplyUnit: app.numTimesEmployeeCanApplyUnit || 'Select',
          numLeavesEmployeeCanApply: app.numLeavesEmployeeCanApply ?? '',
          numLeavesEmployeeCanApplyUnit: app.numLeavesEmployeeCanApplyUnit || 'Select',
          validUpto: app.validUpto ?? '',
          validUptoUnit: app.validUptoUnit || 'Select',
          supportingDocumentsRequired: app.supportingDocumentsRequired ?? false,
          allowBookTicket: app.allowBookTicket ?? false,
          excludeWeekend: app.excludeWeekend ?? false,
          excludeHoliday: app.excludeHoliday ?? false,
          restrictBeforeAfterHoliday: app.restrictBeforeAfterHoliday ?? false,
          restrictBeforeAfterWeekend: app.restrictBeforeAfterWeekend ?? false,
          restrictBeforeConfirmation: app.restrictBeforeConfirmation ?? false,
          applyLeaveFromThisDate: app.applyLeaveFromThisDate ?? false,
          applyInMultipleOfOne: app.applyInMultipleOfOne ?? false,
          applyLeaveBeforeConfirmationDate: app.applyLeaveBeforeConfirmationDate ?? false,
          applyRestrictionForWeekoffHoliday: app.applyRestrictionForWeekoffHoliday ?? false,
          cancelFutureAppliedLeaveOnResignation: app.cancelFutureAppliedLeaveOnResignation ?? false,
          customHook: app.customHook || '',
          onlyWhen: app.onlyWhen || app.only_when || undefined,
        },

        payroll: {
          ...pay,
          conditionOn: pay.conditionOn || 'Choose',
          operator: pay.operator || 'Choose',
          value1: pay.value1 ?? '0',
          value2: pay.value2 ?? '0',
          considerMonths: pay.considerMonths ?? '0',
          reverseCondition: pay.reverseCondition ?? false,
        },

        employment_allocation: {
          ...empAlloc,
          locations: empAlloc.locations || [],
          departments: empAlloc.departments || [],
          grades: empAlloc.grades || [],
          employeeTypes: empAlloc.employeeTypes || [],
          employeeStatuses: empAlloc.employeeStatuses || [],
        },

        employment_application: {
          ...empApp,
          locations: empApp.locations || [],
          departments: empApp.departments || [],
          grades: empApp.grades || [],
          employeeTypes: empApp.employeeTypes || [],
          employeeStatuses: empApp.employeeStatuses || [],
        },

        encashment: {
          ...enc,
          rules: enc.rules || [],
          disbursement: enc.disbursement || { periodicity: 'Select', disbursementAfter: '' }
        }
      });
    } else {
      setFormData({
        leave_name: '',
        leave_code: '',
        leave_classification: 'calendar',
        status: 'active',
        paid_type: 'paid',
        annual_quota: '',
        allocation: {
          considerLeaveStartYearAsFrom: false,
          leaveStartMonth: '4',
          entitlementDays: '',
          entitlementPeriodicity: 'Select',
          entitlementEndType: 'End',
          entitlementEndTypeVal: '',
          strictCronPeriodicity: false,
          customAllocation: false,
          allocateAllLeaveIfConfirmed: false,
          allocatePastLeaveIfConfirmed: false,
          expireLeaveOnDashboard: false,
          considerLeaveCalendarYear: false,
          allocateLeaveIfConfirmationDatePresent: false,
          noPayment: false,
          excludeLeaveFromSandwichPolicy: false,
          minServiceRequired: '',
          minServiceRequiredUnit: 'Select',
          gender: 'All',
          minWorkingDays: '',
          initialAllocationDateRange: false,
          considerFullMonthIfDateOf: 'Confirmation',
          considerFullMonthBeforeDay: '',
          allocateLeaveBeforeDays: '0',
          leaveRoundOff: false,
          considerAllocationTillResignedDate: false,
          expireLeaveAfterValue: '',
          expireLeaveAfterBase: 'Date of Credit/Approval',
          notifyLeaveExpireBeforeDays: '',
          requestLeaveWithinDays: '',
          disableProRata: false,
          leaveProrataDateType: 'Select',
          leaveProrataDays: '',
          encashmentsSubjectToLimitsFNF: false,
          encashmentOnProrataBasis: false,
          maxEncashUnit: '',
          maxCarryForwardUnit: '',
          creditType: 'manual',
          dayType: 'Week Off',
          hourStart: '',
          hourEnd: '',
          allocateLeaves: '',
          nonCalendarRules: [],
          workingDateRequired: false,
          applyAutoRequestPolicy: false,
          noOfTimesInService: '',
          fixedLeave: false,
          maritalStatus: 'All',
          maximumAllowed: '0',
          requestLeaveOnlyOnWeekendAndHoliday: false,
          requestLeaveOnlyIfAttendanceExists: false,
          restrictLeaveApplicationTillExpiry: false,
          showFromToDateForRequest: false,
          addLeaveApplicationAfterApproval: false,
        },
        application: {
          category: 'unplanned',
          daysInAdvance: '',
          daysInAdvanceUnit: 'Days',
          gracePeriod: '',
          gracePeriodUnit: 'Days',
          minDaysAllowed: '',
          maxDaysAllowed: '',
          gapBetweenApplication: '',
          gapBetweenApplicationUnit: 'Days',
          gapBetweenApplicationWindow: 'This',
          numTimesEmployeeCanApply: '',
          numTimesEmployeeCanApplyUnit: 'Select',
          numLeavesEmployeeCanApply: '',
          numLeavesEmployeeCanApplyUnit: 'Select',
          validUpto: '',
          validUptoUnit: 'Select',
          supportingDocumentsRequired: false,
          allowBookTicket: false,
          excludeWeekend: false,
          excludeHoliday: false,
          restrictBeforeAfterHoliday: false,
          restrictBeforeAfterWeekend: false,
          restrictBeforeConfirmation: false,
          applyLeaveFromThisDate: false,
          applyInMultipleOfOne: false,
          applyLeaveBeforeConfirmationDate: false,
          applyRestrictionForWeekoffHoliday: false,
          cancelFutureAppliedLeaveOnResignation: false,
          customHook: '',
        },
        payroll: {
          conditionOn: 'Choose',
          operator: 'Choose',
          value1: '0',
          value2: '0',
          considerMonths: '0',
          reverseCondition: false,
        },
        employment_allocation: {
          locations: [],
          departments: [],
          grades: [],
          employeeTypes: [],
          employeeStatuses: [],
        },
        employment_application: {
          locations: [],
          departments: [],
          grades: [],
          employeeTypes: [],
          employeeStatuses: [],
        },
        encashment: {
          rules: [],
          disbursement: {
            periodicity: 'Select',
            disbursementAfter: ''
          }
        }
      });
    }
  }, [selectedLeaveType]);

  const handleToggleLeaveStatus = async (lt: LeaveType) => {
    const newStatus = lt.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.put(`/settings/leave-types/${lt.id}`, { status: newStatus });
      toast.success(`${lt.leaveName || lt.leave_name} status updated to ${newStatus}`);
      fetchLeaveTypes();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveEditLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leave_name) {
      toast.error('Name is required');
      return;
    }
    if (!selectedLeaveType?.id) {
      try {
        const payload = {
          leave_name: formData.leave_name,
          leave_code: (formData.leave_code || 'L001').toUpperCase(),
          paid_type: formData.paid_type || 'paid',
          leave_classification: formData.leave_classification || 'calendar',
          status: formData.status || 'active',
          color: (formData as any).color || 'Sky',
          icon: (formData as any).icon || 'Sun',
          effective_from: (formData as any).effective_from || null,
          effective_to: (formData as any).effective_to || null,
          description: (formData as any).description || '',
          allocation_settings: formData.allocation,
          application_settings: formData.application,
          encashment_settings: formData.encashment,
        };
        const res = await apiClient.post('/settings/leave-types', payload);
        if (res.data?.success) {
          toast.success('Leave category created successfully');
          fetchLeaveTypes();
          setViewMode('table');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to create leave category');
      }
      return;
    }

    try {
      const payload = {
        leave_name: formData.leave_name,
        leave_code: (formData.leave_code || '').toUpperCase(),
        paid_type: formData.paid_type || 'paid',
        leave_classification: formData.leave_classification || 'calendar',
        status: formData.status || 'active',
        color: (formData as any).color || 'Sky',
        icon: (formData as any).icon || 'Sun',
        effective_from: (formData as any).effective_from || null,
        effective_to: (formData as any).effective_to || null,
        description: (formData as any).description || '',
        annual_quota: formData.annual_quota ?? 12,
        allocation_settings: formData.allocation,
        application_settings: formData.application,
        encashment_settings: formData.encashment,
      };
      await apiClient.put(`/settings/leave-types/${selectedLeaveType.id}`, payload);
      toast.success('Leave category details updated successfully');
      fetchLeaveTypes();
      setViewMode('configure');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update leave details');
    }
  };

  // Handle Save (Create or Update)
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leave_name || !formData.leave_code) {
      toast.error('Leave Name and Code are required.');
      return;
    }

    const computedQuota = parseInt(formData.allocation?.entitlementDays || String(formData.annual_quota || 0), 10) || 0;

    const payload = {
      leave_name: formData.leave_name,
      leave_code: formData.leave_code.toUpperCase(),
      leave_classification: formData.leave_classification,
      status: formData.status,
      paid_type: formData.allocation.noPayment ? 'unpaid' : formData.paid_type,
      annual_quota: computedQuota,
      gender_applicable: (formData.allocation.gender || 'all').toLowerCase(),
      sandwich_rule_enabled: selectedLeaveType?.sandwich_rule_enabled ?? selectedLeaveType?.sandwichRuleEnabled ?? false,
      allow_negative_balance: selectedLeaveType?.allow_negative_balance ?? selectedLeaveType?.allowNegativeBalance ?? false,
      negative_balance_action: selectedLeaveType?.negative_balance_action ?? selectedLeaveType?.negativeBalanceAction ?? 'BLOCK',
      pool_from_leave_type_id: selectedLeaveType?.pool_from_leave_type_id ?? selectedLeaveType?.poolFromLeaveTypeId ?? null,
      encashment_enabled: !!(formData.encashment?.rules && formData.encashment.rules.length > 0),
      encashment_limit: (() => {
        const rules = formData.encashment?.rules || [];
        if (rules.length === 0) return null;
        const limits = rules.map((r: any) => parseFloat(r.maxEncash) || 0);
        return Math.max(...limits, 0) || null;
      })(),
      carry_forward_enabled: (() => {
        const rules = formData.encashment?.rules || [];
        return rules.some((r: any) => (parseFloat(r.maxCarryForward) || 0) > 0);
      })(),

      // Pass config JSONs directly
      allocation_settings: formData.allocation,
      application_settings: formData.application,
      payroll_settings: formData.payroll,
      employment_allocation_settings: formData.employment_allocation,
      employment_application_settings: formData.employment_application,
      encashment_settings: formData.encashment,
    };

    try {
      if (selectedLeaveType?.id) {
        // Update
        const res = await apiClient.put(`/settings/leave-types/${selectedLeaveType.id}`, payload);
        if (res.data?.success) {
          toast.success('Leave settings updated successfully!');
          const updatedType: any = {
            ...selectedLeaveType,
            ...payload,
            leave_name: payload.leave_name,
            leaveName: payload.leave_name,
            leave_code: payload.leave_code,
            leaveCode: payload.leave_code,
            annual_quota: computedQuota,
            annualQuota: computedQuota,
            allocation_settings: payload.allocation_settings,
            allocationSettings: payload.allocation_settings,
            application_settings: payload.application_settings,
            applicationSettings: payload.application_settings,
            payroll_settings: payload.payroll_settings,
            payrollSettings: payload.payroll_settings,
            employment_allocation_settings: payload.employment_allocation_settings,
            employmentAllocationSettings: payload.employment_allocation_settings,
            employment_application_settings: payload.employment_application_settings,
            employmentApplicationSettings: payload.employment_application_settings,
            encashment_settings: payload.encashment_settings,
            encashmentSettings: payload.encashment_settings,
          };
          setSelectedLeaveType(updatedType);
          setLeaveTypes((prev) => prev.map(t => t.id === selectedLeaveType.id ? updatedType : t));
        }
      } else {
        // Create
        const res = await apiClient.post('/settings/leave-types', payload);
        if (res.data?.success) {
          toast.success('Leave category created successfully!');
          await fetchLeaveTypes();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save leave settings.');
    }
  };

  // Trigger Cron allocation
  const handleTriggerCron = async () => {
    setIsExecutingCron(true);
    try {
      const res = await apiClient.post('/leaves/sync-balances');
      if (res.data?.success) {
        toast.success(res.data.message || 'All employee leave balances successfully synchronized!');
        await fetchLeaveTypes();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to sync leave balances.';
      toast.error(errMsg);
    } finally {
      setIsExecutingCron(false);
    }
  };

  // Original policy edits
  const handleEditPolicy = (p: any) => {
    setEditingPolicy(p);
    setPolicyForm({
      earnedLeaveEntitlementPercent: p.earned_leave_entitlement_percent?.toString() || p.earnedLeaveEntitlementPercent?.toString() || '',
      entitlementIncludesPublicHolidays: !!(p.entitlement_includes_public_holidays || p.entitlementIncludesPublicHolidays),
    });
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      const res = await apiClient.put(`/leaves/policies/${editingPolicy.id}`, {
        earnedLeaveEntitlementPercent: policyForm.earnedLeaveEntitlementPercent ? parseFloat(policyForm.earnedLeaveEntitlementPercent) : null,
        entitlementIncludesPublicHolidays: policyForm.entitlementIncludesPublicHolidays,
      });

      if (res.data?.success) {
        toast.success('Leave policy updated successfully!');
        setIsPolicyModalOpen(false);
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update leave policy.');
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetPolicyId = mappingForm.leavePolicyId;

    if (targetPolicyId === 'custom' || isCreatePolicyOpen) {
      if (!newPolicyName.trim()) {
        toast.error('Please enter a custom Policy Name');
        return;
      }
      try {
        const createRes = await apiClient.post('/leaves/policies', { name: newPolicyName.trim() });
        if (createRes.data?.data?.id) {
          targetPolicyId = String(createRes.data.data.id);
        } else {
          toast.error('Failed to create custom policy');
          return;
        }
      } catch (createErr: any) {
        toast.error(createErr.response?.data?.message || 'Failed to create custom policy');
        return;
      }
    }

    if (!targetPolicyId) {
      toast.error('Please select or enter a leave policy name');
      return;
    }

    try {
      const res = await apiClient.post('/leaves/policy-mappings', {
        leavePolicyId: parseInt(targetPolicyId, 10),
        roleId: mappingForm.roleId ? parseInt(mappingForm.roleId, 10) : null,
        departmentId: mappingForm.departmentId ? parseInt(mappingForm.departmentId, 10) : null,
        designationId: mappingForm.designationId ? parseInt(mappingForm.designationId, 10) : null,
        employmentType: mappingForm.employmentType || null,
        priority: parseInt(mappingForm.priority as any, 10) || 10,
      });

      if (res.data?.success) {
        toast.success('Policy mapping created successfully!');
        setIsMappingModalOpen(false);
        setIsCreatePolicyOpen(false);
        setNewPolicyName('');
        setMappingForm({
          leavePolicyId: '',
          roleId: '',
          departmentId: '',
          designationId: '',
          employmentType: '',
          priority: 10,
        });
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create policy mapping');
    }
  };

  const handleDeleteMapping = async (id: number) => {
    try {
      const res = await apiClient.delete(`/leaves/policy-mappings/${id}`);
      if (res.data?.success) {
        toast.success('Policy mapping deleted successfully');
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete policy mapping');
    }
  };

  const handleSaveBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutForm.start_date || !blackoutForm.end_date || !blackoutForm.reason) {
      toast.error('Start date, end date, and reason are required.');
      return;
    }
    try {
      const res = await apiClient.post('/leaves/blackout-periods', {
        start_date: blackoutForm.start_date,
        end_date: blackoutForm.end_date,
        reason: blackoutForm.reason,
        applicable_department_id: blackoutForm.applicable_department_id ? parseInt(blackoutForm.applicable_department_id, 10) : null,
        applicable_location_id: blackoutForm.applicable_location_id ? parseInt(blackoutForm.applicable_location_id, 10) : null,
      });

      if (res.data?.success) {
        toast.success('Blackout period created successfully!');
        setIsBlackoutModalOpen(false);
        setBlackoutForm({
          start_date: '',
          end_date: '',
          reason: '',
          applicable_department_id: '',
          applicable_location_id: '',
        });
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create blackout period');
    }
  };

  const handleDeleteBlackout = async (id: number) => {
    try {
      const res = await apiClient.delete(`/leaves/blackout-periods/${id}`);
      if (res.data?.success) {
        toast.success('Blackout period deleted successfully');
        fetchMappingMetadata();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete blackout period');
    }
  };

  // Encashment settings CRUD handlers
  const handleDeleteEncashmentSetting = async () => {
    if (!selectedEncashmentId) return;
    if (!confirm('Are you sure you want to delete this encashment configuration?')) return;
    try {
      const res = await apiClient.delete(`/leaves/encashment-settings/${selectedEncashmentId}`);
      if (res.data?.success) {
        toast.success('Leave encashment settings deleted successfully');
        const resList = await apiClient.get('/leaves/encashment-settings');
        const list = resList.data?.data || [];
        setEncashmentsList(list);
        setSelectedEncashmentId(list.length > 0 ? list[0].id : null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete leave encashment settings');
    }
  };

  const handleSaveEncashmentTabForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encashmentTabForm.name || !encashmentTabForm.formula) {
      toast.error('Name and formula are required.');
      return;
    }

    const payload = {
      name: encashmentTabForm.name,
      formula: encashmentTabForm.formula,
      limit: encashmentTabForm.limit ? parseFloat(encashmentTabForm.limit) : null,
      isActive: encashmentTabForm.isActive,
      daysBasis: encashmentTabForm.daysBasis,
      employment: encashmentTabForm.employment
    };

    try {
      if (selectedEncashmentId) {
        // Update
        const res = await apiClient.put(`/leaves/encashment-settings/${selectedEncashmentId}`, payload);
        if (res.data?.success) {
          toast.success('Leave encashment settings updated successfully!');
          const resList = await apiClient.get('/leaves/encashment-settings');
          const list = resList.data?.data || [];
          setEncashmentsList(list);
        }
      } else {
        // Create
        const res = await apiClient.post('/leaves/encashment-settings', payload);
        if (res.data?.success) {
          toast.success('Leave encashment settings created successfully!');
          const newId = res.data.data?.id;
          const resList = await apiClient.get('/leaves/encashment-settings');
          const list = resList.data?.data || [];
          setEncashmentsList(list);
          setSelectedEncashmentId(newId || (list.length > 0 ? list[list.length - 1].id : null));
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save leave encashment settings.');
    }
  };

  // Sync selected encashment setting to the form
  useEffect(() => {
    if (selectedEncashmentId) {
      const selected = encashmentsList.find(e => String(e.id) === String(selectedEncashmentId));
      if (selected) {
        const emp = parseJson(selected.employment, { locations: [], departments: [], grades: [], employeeTypes: [] });
        setEncashmentTabForm({
          name: selected.name || '',
          formula: selected.formula || '',
          limit: selected.limit?.toString() || '',
          isActive: selected.is_active !== undefined ? !!selected.is_active : !!selected.isActive,
          daysBasis: selected.days_basis || 30,
          employment: {
            locations: emp.locations || [],
            departments: emp.departments || [],
            grades: emp.grades || [],
            employeeTypes: emp.employeeTypes || [],
          }
        });
      }
    } else {
      setEncashmentTabForm({
        name: '',
        formula: '',
        limit: '',
        isActive: true,
        daysBasis: 30,
        employment: {
          locations: [],
          departments: [],
          grades: [],
          employeeTypes: [],
        }
      });
    }
  }, [selectedEncashmentId, encashmentsList]);

  useEffect(() => {
    if (activeTab === 'late_deduction_policy') {
      fetchLatePolicies();
    } else if (activeTab === 'late_auto_deduction') {
      fetchLateUpdations();
      fetchLateDeductionLogs();
    }
  }, [activeTab]);

  // Toggle dynamic employment selection
  const handleToggleEmploymentTarget = (scope: 'allocation' | 'application', category: 'locations' | 'departments' | 'grades' | 'employeeTypes' | 'employeeStatuses', item: any) => {
    const key = scope === 'allocation' ? 'employment_allocation' : 'employment_application';
    const currentList = (formData as any)[key][category] as any[];

    let newList;
    if (currentList.includes(item)) {
      newList = currentList.filter(x => x !== item);
    } else {
      newList = [...currentList, item];
    }

    setFormData({
      ...formData,
      [key]: {
        ...(formData as any)[key],
        [category]: newList
      }
    });
  };

  // Encashment & Carry Forward Action Handlers
  const handleOpenAddRule = () => {
    setEditingRuleIndex(null);
    setRuleForm({
      periodicity: 'Select',
      requestableEncashment: false,
      allowMultipleEncashment: false,
      encashYear: 'Select',
      maxCarryForward: '',
      maxEncash: '',
      maxLimit: '',
      expireAfterDays: '',
      customHook: '',
      employment: {
        locations: [],
        departments: [],
        grades: [],
        employeeTypes: [],
        employeeStatuses: [],
      }
    });
    setIsEncashRuleModalOpen(true);
  };

  const handleOpenEditRule = (index: number) => {
    const rules = formData.encashment?.rules || [];
    const rule = rules[index];
    if (!rule) return;
    setEditingRuleIndex(index);
    setRuleForm({
      periodicity: rule.periodicity || 'Select',
      requestableEncashment: !!rule.requestableEncashment,
      allowMultipleEncashment: !!rule.allowMultipleEncashment,
      encashYear: rule.encashYear || 'Select',
      maxCarryForward: rule.maxCarryForward ?? '',
      maxEncash: rule.maxEncash ?? '',
      maxLimit: rule.maxLimit ?? '',
      expireAfterDays: rule.expireAfterDays ?? '',
      customHook: rule.customHook || '',
      employment: rule.employment || {
        locations: [],
        departments: [],
        grades: [],
        employeeTypes: [],
        employeeStatuses: [],
      }
    });
    setIsEncashRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const currentRules = [...(formData.encashment?.rules || [])];

    if (editingRuleIndex !== null) {
      // Update
      currentRules[editingRuleIndex] = ruleForm;
    } else {
      // Add
      currentRules.push(ruleForm);
    }

    setFormData({
      ...formData,
      encashment: {
        ...formData.encashment,
        rules: currentRules
      }
    });

    setIsEncashRuleModalOpen(false);
  };

  const handleDeleteRule = (index: number) => {
    const currentRules = [...(formData.encashment?.rules || [])];
    currentRules.splice(index, 1);
    setFormData({
      ...formData,
      encashment: {
        ...formData.encashment,
        rules: currentRules
      }
    });
  };

  const handleToggleRuleEmploymentTarget = (category: 'locations' | 'departments' | 'grades' | 'employeeTypes' | 'employeeStatuses', item: any) => {
    const currentList = (ruleForm.employment[category] as any[]) || [];
    let newList;
    if (currentList.includes(item)) {
      newList = currentList.filter((x: any) => x !== item);
    } else {
      newList = [...currentList, item];
    }
    setRuleForm({
      ...ruleForm,
      employment: {
        ...ruleForm.employment,
        [category]: newList
      }
    });
  };

  const handleOpenDisbursementSettings = () => {
    setDisbursementForm({
      periodicity: formData.encashment?.disbursement?.periodicity || 'Select',
      disbursementAfter: formData.encashment?.disbursement?.disbursementAfter ?? ''
    });
    setIsDisbursementModalOpen(true);
  };

  const handleSaveDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    setFormData({
      ...formData,
      encashment: {
        ...formData.encashment,
        disbursement: disbursementForm
      }
    });
    setIsDisbursementModalOpen(false);
  };

  // Filter Leave types list
  const filteredLeaveTypes = leaveTypes.filter(lt => {
    const nameMatch = (lt.leaveName || lt.leave_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lt.leaveCode || lt.leave_code || '').toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch = statusFilter === 'all' || lt.status === statusFilter;
    const classMatch = classificationFilter === 'all' || lt.leave_classification === classificationFilter;

    return nameMatch && statusMatch && classMatch;
  });

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* 1st COLUMN: Sidebar Sub-Navigation (Collapsible Rail) */}
      <div className={`bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-full lg:w-48 xl:w-52'
        }`}>
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Administration
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`h-7 w-7 p-0 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer ${isSidebarCollapsed ? 'mx-auto' : ''
              }`}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {[
            { id: 'leave', label: 'Categories', icon: Database },
            { id: 'policy', label: 'Policy Mappings', icon: ShieldCheck },
            { id: 'late_deduction_policy', label: 'Late Policy', icon: Clock },
            { id: 'late_auto_deduction', label: 'Auto Deduction', icon: Play },
            { id: 'encashment', label: 'Encashment', icon: Calendar },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/60'
                  }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER DYNAMIC VIEWS DEPENDING ON SIDEBAR ACTIVE TAB */}

      {activeTab === 'leave' && (
        <div className="flex-1 flex flex-col lg:flex-row bg-slate-50/70 dark:bg-slate-950 h-full overflow-hidden">
          {/* LEFT MASTER PANEL: Leave Categories Roster */}
          <div className={`bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full shrink-0 transition-all duration-300 ${isCategoriesCollapsed ? 'w-14' : 'w-full lg:w-72 xl:w-80'}`}>
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              {!isCategoriesCollapsed ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-2xs">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-xs">Categories</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">{filteredLeaveTypes.length} Policies Configured</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setIsAddLeaveModalOpen(true)}
                      size="sm"
                      className="h-7 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                      title="Add New Leave Category"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCategoriesCollapsed(true)}
                      className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 mx-auto py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCategoriesCollapsed(false)}
                    className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setIsAddLeaveModalOpen(true)}
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg bg-indigo-600 text-white shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {!isCategoriesCollapsed && (
              <>
                {/* Search & Filters */}
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search policies..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={statusFilter}
                      onChange={(e: any) => setStatusFilter(e.target.value)}
                      className="flex-1 px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <button
                      onClick={() => setViewMode(viewMode === 'table' ? 'configure' : 'table')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Toggle Full Table View"
                    >
                      {viewMode === 'table' ? '📋 Workspace' : '📊 Table View'}
                    </button>
                  </div>
                </div>

                {/* Categories List Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredLeaveTypes.map((lt) => {
                    const isSelected = selectedLeaveType?.id === lt.id;
                    const isPaid = (lt.paidType || lt.paid_type) !== 'unpaid';

                    return (
                      <div
                        key={lt.id}
                        onClick={() => {
                          setSelectedLeaveType(lt);
                          if (viewMode === 'table') setViewMode('configure');
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/30 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">☀️</span>
                            <span className={`text-xs font-bold truncate max-w-[130px] ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {lt.leaveName || lt.leave_name}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                            {lt.annualQuota ?? lt.annual_quota ?? 0}d
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">
                            {lt.leaveCode || lt.leave_code}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${isPaid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                            {lt.status === 'inactive' && (
                              <span className="text-[8px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">Off</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT WORKSPACE: Full Roster Table OR 3-Tab Master Configuration */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* VIEW 1: FULL ROSTER TABLE (Apponext Styling) */}
            {viewMode === 'table' && (
              <div className="p-6 space-y-5 max-w-7xl mx-auto w-full">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Leave Category Directory</h2>
                    <p className="text-xs text-slate-500">Overview of all active leave entitlements and rules across the organization.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsAddLeaveModalOpen(true)}
                      className="h-8 px-3.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New</span>
                    </Button>

                    <Button
                      onClick={() => setViewMode('configure')}
                      variant="outline"
                      className="h-8 px-3.5 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Configure Active Policy</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        fetchLeaveYearSettings();
                        setViewMode('leave-year');
                      }}
                      className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-center cursor-pointer shadow-2xs"
                      title="Leave year setting"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <Card className="border border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Leave Category Name</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Leave Code</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Pay Type</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Leave Unit</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Accrual Basis</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5">Status</TableHead>
                          <TableHead className="text-xs font-bold text-slate-900 dark:text-white py-3.5 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeaveTypes.map((lt) => {
                          const isPaid = (lt.paidType || lt.paid_type) !== 'unpaid';
                          const alloc = parseJson(lt.allocationSettings || lt.allocation_settings, {});
                          const entitlementType = alloc.accrualBasis === 'ratio' ? 'Attendance Ratio' : (alloc.fixedLeave ? 'Fixed Quota' : 'Request Based');

                          return (
                            <TableRow key={lt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60">
                              <TableCell className="text-xs font-bold text-slate-900 dark:text-white py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                    ☀️
                                  </div>
                                  <span>{lt.leaveName || lt.leave_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 py-3">
                                {lt.leaveCode || lt.leave_code}
                              </TableCell>
                              <TableCell className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40'}`}>
                                  {isPaid ? 'Paid Leave' : 'Unpaid LWP'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400 py-3">
                                Days
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-400 py-3">
                                {entitlementType}
                              </TableCell>
                              <TableCell className="py-3">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLeaveStatus(lt)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${lt.status === 'active' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${lt.status === 'active' ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                </button>
                              </TableCell>
                              <TableCell className="text-right py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLeaveType(lt);
                                      setViewMode('edit');
                                    }}
                                    className="w-7 h-7 p-0 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg cursor-pointer flex items-center justify-center shadow-2xs"
                                    title="Edit Category Info"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLeaveType(lt);
                                      setViewMode('configure');
                                    }}
                                    className="h-7 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <SlidersHorizontal className="w-3 h-3 text-white" />
                                    <span>Configure</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* VIEW 2: EDIT LEAVE CATEGORY IDENTITY */}
            {viewMode === 'edit' && (
              <div className="p-6 max-w-3xl mx-auto space-y-5 w-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedLeaveType?.id ? `Edit Category: ${formData.leave_name}` : 'Create New Leave Category'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Define the name, code, display icon, color token, and validity dates for this leave type.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setViewMode('configure')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Workspace</span>
                  </Button>
                </div>

                <form onSubmit={handleSaveEditLeave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Category Name *</Label>
                      <Input
                        type="text"
                        value={formData.leave_name || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, leave_name: e.target.value }))}
                        placeholder="e.g. Annual Leave"
                        className="h-9 mt-1 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Short Code</Label>
                      <Input
                        type="text"
                        value={formData.leave_code || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, leave_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. AL_01"
                        className="h-9 mt-1 text-xs font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Theme Color</Label>
                      <select
                        value={(formData as any).color || 'Sky'}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, color: e.target.value }))}
                        className="w-full h-9 mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
                      >
                        <option value="Sky">🔵 Sky Blue</option>
                        <option value="Indigo">🟣 Indigo</option>
                        <option value="Emerald">🟢 Emerald Green</option>
                        <option value="Amber">🟠 Amber Gold</option>
                        <option value="Rose">🔴 Rose Red</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Category Icon</Label>
                      <select
                        value={(formData as any).icon || 'Sun'}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, icon: e.target.value }))}
                        className="w-full h-9 mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
                      >
                        <option value="Sun">☀️ Sun</option>
                        <option value="Palm">🌴 Palm</option>
                        <option value="Vacation">🏖️ Vacation</option>
                        <option value="Hospital">🏥 Hospital</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Effective From</Label>
                      <Input
                        type="date"
                        value={(formData as any).effective_from || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, effective_from: e.target.value }))}
                        className="h-9 mt-1 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Effective To</Label>
                      <Input
                        type="date"
                        value={(formData as any).effective_to || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, effective_to: e.target.value }))}
                        className="h-9 mt-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Policy Notes & Description</Label>
                    <textarea
                      rows={3}
                      value={(formData as any).description || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                      placeholder="Add organizational guidelines or notes for HR admins..."
                      className="w-full mt-1 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewMode('configure')}
                      className="h-9 px-4 text-xs font-semibold border-slate-200 cursor-pointer"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      className="h-9 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
                    >
                      Save Category Info
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* VIEW 4: LEAVE YEAR SETTING WORKSPACE */}
            {viewMode === 'leave-year' && (
              <div className="p-6 space-y-5 max-w-6xl mx-auto w-full">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>Leave year setting</span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      The day and month the leave year starts on. Cards are ordered narrowest filter first — the first one that matches an employee is the one that applies.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewMode('table')}
                      className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAuditModalOpen(true)}
                      className="h-8 px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Audit Log</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={() => {
                        setLeaveYearToEdit(null);
                        setIsLeaveYearModalOpen(true);
                      }}
                      className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </Button>
                  </div>
                </div>

                {/* Grid of Cards */}
                {isLoadingLeaveYear ? (
                  <div className="flex items-center justify-center py-12 text-slate-400 text-xs font-medium">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Loading leave year settings...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    {leaveYearSettings.map((item) => {
                      const locCount = item.locations?.length || 0;
                      const deptCount = item.departments?.length || 0;
                      const gradeCount = item.grades?.length || 0;
                      const compCount = item.companies?.length || 0;

                      const scopeParts: string[] = [];
                      if (compCount > 0) scopeParts.push(`Company (${compCount})`);
                      if (deptCount > 0) scopeParts.push(`Department (${deptCount})`);
                      if (gradeCount > 0) scopeParts.push(`Grade (${gradeCount})`);
                      if (locCount > 0) scopeParts.push(`Location (${locCount})`);

                      const scopeLabel = scopeParts.length > 0 ? scopeParts.join(', ') : 'All employees';
                      const isDefault = item.is_default || scopeParts.length === 0;

                      return (
                        <div
                          key={item.id}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                          {/* Card Header Row */}
                          <div className="flex items-start justify-between gap-3 w-full border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div className="flex-1 min-w-0 pr-1">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                APPLIES TO
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                  {scopeLabel}
                                </span>
                                {isDefault && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800 rounded-full shrink-0">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Active Switch Box */}
                            <div className="flex items-center gap-2 shrink-0 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                {item.status === 'inactive' ? 'Inactive' : 'Active'}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await apiClient.patch(`/settings/leave-year-settings/${item.id}/status`);
                                    toast.success('Status updated');
                                    fetchLeaveYearSettings();
                                  } catch (err) {
                                    toast.error('Failed to toggle status');
                                  }
                                }}
                                className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                                  item.status !== 'inactive' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                    item.status !== 'inactive' ? 'translate-x-[15px]' : 'translate-x-[2px]'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Start Date Body */}
                          <div className="py-1">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              LEAVE YEAR STARTS
                            </span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-2">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <span>{item.start_day} {item.start_month}</span>
                            </div>
                          </div>

                          {/* Footer Edit Button */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setLeaveYearToEdit(item);
                                setIsLeaveYearModalOpen(true);
                              }}
                              className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: 3-TAB MASTER CONFIGURATION WORKSPACE */}
            {viewMode === 'configure' && (
              <form onSubmit={handleSaveDetails} className="w-full max-w-4xl mx-auto px-5 py-6 space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 text-white shadow-sm border border-indigo-800/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-extrabold tracking-tight">
                        {formData.leave_name || 'Configure Leave'}
                      </h1>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        {formData.leave_code || 'POLICY'}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80">
                      Configure accrual formulas, application constraints, sandwich rules, and encashment caps.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewMode('edit')}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-8 px-3 rounded-xl gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Identity</span>
                    </Button>

                    {selectedLeaveType?.id && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAuditModalOpen(true);
                          fetchAuditLogs();
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-8 px-3 rounded-xl gap-1 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Audit Log</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3 Main Segmented Configuration Tabs */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 dark:bg-slate-900/80 rounded-2xl border border-slate-300/60 dark:border-slate-800 shadow-2xs w-full sm:w-fit overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setConfigureTab('allocation')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                      configureTab === 'allocation'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>1. Allocation Rules</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigureTab('application')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                      configureTab === 'application'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>2. Application Rules</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigureTab('encashment')}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                      configureTab === 'encashment'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>3. Carry Forward & Encashment</span>
                  </button>
                </div>

                {/* Render Configuration Tab Content */}
                {configureTab === 'allocation' && (
                  <LeaveAllocationTab
                    formData={formData}
                    setFormData={setFormData}
                    companies={companiesList || []}
                    departments={departmentsList && departmentsList.length > 0 ? departmentsList : (departments || [])}
                    locations={locationsList && locationsList.length > 0 ? locationsList : (locations || [])}
                    gradeOptions={gradeOptions}
                    employeeTypeOptions={employeeTypeOptions}
                    leaveTypes={leaveTypes}
                  />
                )}

                {configureTab === 'application' && (
                  <LeaveApplicationTab
                    formData={formData}
                    setFormData={setFormData}
                    departments={departments}
                    locations={locations}
                    gradeOptions={gradeOptions}
                    employeeTypeOptions={employeeTypeOptions}
                    leaveTypes={leaveTypes}
                  />
                )}

                {configureTab === 'encashment' && (
                  <LeaveEncashmentTab
                    formData={formData}
                    setFormData={setFormData}
                    departments={departments}
                    locations={locations}
                    gradeOptions={gradeOptions}
                  />
                )}

                {/* Sticky Action Footer Bar */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div
                    onClick={() => setFormData((prev: any) => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs cursor-pointer select-none"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${formData.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Policy Status: <span className={formData.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>{formData.status === 'active' ? 'Active' : 'Disabled'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      onClick={handleTriggerCron}
                      disabled={isExecutingCron}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isExecutingCron ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Sync Balances</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="submit"
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs h-9 px-5 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Policy Configuration</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* POLICY VIEWS (ORIGINAL TABLES IN LEAVE POLICY TAB) */}
      {activeTab === 'policy' && (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Policy Configurations</h1>
              <p className="text-xs text-gray-500 mt-1">Manage leave policy mapping rules, blackout periods, and custom assignments.</p>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <Link to="/settings/org-leave-settings">
                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-850 font-extrabold text-xs h-9 rounded-xl gap-1.5 shadow-sm">
                  <Settings className="w-4 h-4" /> Org Leave Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Bulk Policy Mappings Section */}
          <Card className="border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Bulk Leave Policy Mappings
                  <HelpHint
                    title="Bulk Policy Mappings"
                    titleHi="स्वचालित लीव पॉलिसी मैपिंग"
                    description="Automatically assign specific leave policies to new employees based on their Department, Designation, or Employment Type."
                    descriptionHi="विभाग, पद या रोजगार प्रकार के आधार पर कर्मचारियों को स्वचालित रूप से छुट्टी नीतियां आवंटित करें।"
                  />
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure automatic mapping rules to assign leave policies to employees based on their Department, Designation, or Employment Type.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsMappingModalOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-9 rounded-xl gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Add New Mapping
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {mappings.length === 0 ? (
                <div className="p-10 text-center space-y-2 text-muted-foreground">
                  <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium">No bulk policy mappings defined.</p>
                  <p className="text-[10px] text-muted-foreground">Employees will receive the organization's default policy.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mapped Leave Policy</TableHead>
                        <TableHead className="text-xs">Criteria (Dept/Desig/Type)</TableHead>
                        <TableHead className="text-xs text-center">Priority</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((m) => {
                        const policyName = m.policyName || m.policy_name;
                        const departmentName = m.departmentName || m.department_name;
                        const designationName = m.designationName || m.designation_name;
                        const employmentType = m.employmentType || m.employment_type;

                        return (
                          <TableRow key={m.id} className="hover:bg-slate-50/50">
                            <TableCell className="text-xs font-bold text-foreground">
                              {policyName || 'Standard Policy'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex flex-wrap gap-1.5">
                                {m.role_name && (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                    Role: {m.role_name}
                                  </span>
                                )}
                                {departmentName && (
                                  <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                                    Dept: {departmentName}
                                  </span>
                                )}
                                {designationName && (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                                    Desig: {designationName}
                                  </span>
                                )}
                                {employmentType && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 capitalize">
                                    Type: {employmentType.replace('_', ' ')}
                                  </span>
                                )}
                                {!departmentName && !designationName && !employmentType && !m.role_name && (
                                  <span className="text-muted-foreground italic">Global Fallback</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-center font-mono font-bold text-foreground">
                              {m.priority}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMapping(m.id)}>
                                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blackout Periods Section */}
          <Card className="border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-600" /> Blackout Periods
                  <HelpHint
                    title="Blackout Periods"
                    titleHi="लीव बैन अवधि"
                    description="Block leave applications during critical business events or financial audit periods."
                    descriptionHi="महत्वपूर्ण व्यावसायिक आयोजनों या वित्तीय ऑडिट अवधि के दौरान कर्मचारियों द्वारा छुट्टी के आवेदन पर प्रतिबंध लगाएं।"
                  />
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Prevent employees from applying for leaves during critical periods. Apply rules globally or restrict them to a specific department or location.
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsBlackoutModalOpen(true)}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-9 rounded-xl gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Add Blackout Period
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {blackoutPeriods.length === 0 ? (
                <div className="p-10 text-center space-y-2 text-muted-foreground">
                  <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium">No blackout periods configured.</p>
                  <p className="text-[10px] text-muted-foreground">Employees can apply for leave freely on all calendar dates.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Reason / Event</TableHead>
                        <TableHead className="text-xs">Date Range</TableHead>
                        <TableHead className="text-xs">Target Scope</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blackoutPeriods.map((bp) => (
                        <TableRow key={bp.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs font-bold text-foreground">
                            {bp.reason}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground font-mono">
                            {(() => {
                              const formatSafe = (d: string) => {
                                if (!d) return 'N/A';
                                const dateObj = new Date(d);
                                return isNaN(dateObj.getTime()) ? String(d).split('T')[0] : dateObj.toLocaleDateString();
                              };
                              return `${formatSafe(bp.start_date || bp.startDate)} to ${formatSafe(bp.end_date || bp.endDate)}`;
                            })()}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap gap-1.5">
                              {(bp.department_name || bp.departmentName) && (
                                <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-100">
                                  Dept: {bp.department_name || bp.departmentName}
                                </span>
                              )}
                              {(bp.location_name || bp.locationName) && (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                                  Location: {bp.location_name || bp.locationName}
                                </span>
                              )}
                              {!(bp.department_name || bp.departmentName) && !(bp.location_name || bp.locationName) && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  Global (All Employees)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBlackout(bp.id)}>
                              <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ENCASHMENT VIEWS (SIMPLE HISTORY & INSTRUCTIONS) */}
      {activeTab === 'encashment' && (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: Encashment List */}
          <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-1.5 bg-white dark:bg-gray-900">
              <select
                value={encashmentStatusFilter}
                onChange={(e) => setEncashmentStatusFilter(e.target.value as any)}
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-gray-800 border rounded-lg outline-none text-gray-700 dark:text-gray-300 w-20"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search term..."
                  value={encashmentSearchQuery}
                  onChange={(e) => setEncashmentSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 w-full rounded-lg"
                />
              </div>
              <select
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-gray-800 border rounded-lg outline-none text-gray-700 dark:text-gray-300 w-20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-3 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <span className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                <CreditCard className="h-4 w-4 text-gray-500" /> Leave Encashment
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  <Database className="h-3 w-3 text-gray-500" /> {encashmentsList.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEncashmentId(null)}
                  className="px-2 py-1 text-[10px] font-bold bg-[#3c8dbc] hover:bg-[#357ebd] text-white rounded transition-colors flex items-center gap-1 shadow-sm border-none cursor-pointer"
                  title="Add New Leave Encashment Policy"
                >
                  <span>+</span> New
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-gray-950/20">
              {encashmentsList.map(enc => {
                const isActive = selectedEncashmentId && enc.id && String(selectedEncashmentId) === String(enc.id);
                return (
                  <button
                    key={enc.id}
                    onClick={() => setSelectedEncashmentId(enc.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all text-xs font-bold shadow-xs ${isActive
                      ? 'bg-[#26c6da] text-white'
                      : 'bg-white border border-gray-100 hover:border-[#26c6da]/50 text-gray-700 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-250'
                      }`}
                  >
                    <CreditCard className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span className="truncate">{enc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: Encashment Form */}
          <div className="flex-1 bg-gray-50/30 dark:bg-gray-950/10 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 space-y-6">

              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-850">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-3xl font-light text-gray-500">{selectedEncashmentId ? '✎' : '+'}</span>
                  {selectedEncashmentId ? 'Update Leave Encashment' : 'Create Leave Encashment'}
                </h1>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm p-8 space-y-6">

                {/* Form fields in a key-value grid with Labels on the left and Inputs on the right */}
                <div className="space-y-6">
                  {/* Leave Encashment Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 pt-2">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Leave Encashment Name <span className="text-red-500 font-bold">*</span>
                      </Label>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={encashmentTabForm.name}
                        onChange={e => setEncashmentTabForm({ ...encashmentTabForm, name: e.target.value })}
                        className="h-10 text-xs font-semibold rounded-lg bg-white border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-[#3c8dbc]"
                        placeholder=""
                      />
                    </div>
                  </div>

                  {/* Formula */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 pt-2">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Formula<span className="text-red-500 font-bold">*</span>
                      </Label>
                    </div>
                    <div className="md:col-span-2">
                      <textarea
                        value={encashmentTabForm.formula}
                        onChange={e => setEncashmentTabForm({ ...encashmentTabForm, formula: e.target.value })}
                        className="w-full h-24 p-3 text-xs font-semibold bg-white border border-gray-250 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3c8dbc] dark:bg-gray-800"
                        placeholder="Comp1 + Comp2"
                      />
                    </div>
                  </div>

                  {/* Limit */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 pt-2">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Total Encashment Limit for Last Working Month
                      </Label>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={encashmentTabForm.limit}
                        onChange={e => setEncashmentTabForm({ ...encashmentTabForm, limit: e.target.value })}
                        className="h-10 text-xs font-semibold rounded-lg bg-white border border-gray-205 dark:border-gray-700 focus:ring-1 focus:ring-[#3c8dbc]"
                        placeholder="Only number (e.g. 100 or 99.99)"
                      />
                    </div>
                  </div>

                  {/* Days Basis */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 pt-2">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Days Basis (per Month) <span className="text-red-500 font-bold">*</span>
                      </Label>
                    </div>
                    <div className="md:col-span-2">
                      <select
                        value={encashmentTabForm.daysBasis}
                        onChange={e => setEncashmentTabForm({ ...encashmentTabForm, daysBasis: parseInt(e.target.value, 10) })}
                        className="w-full h-10 px-3 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3c8dbc] dark:bg-gray-850 dark:border-gray-700 text-foreground font-semibold"
                      >
                        <option value={30}>30 Days</option>
                        <option value={26}>26 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Accordions */}
                <div className="space-y-4 pt-4">
                  {[
                    { key: 'locations', label: 'Company - Location' },
                    { key: 'departments', label: 'Department' },
                    { key: 'grades', label: 'Grade' },
                    { key: 'employeeTypes', label: 'Employee Type' }
                  ].map((sub: any) => {
                    const isSubExpanded = expandedEncashmentSub === sub.key;
                    return (
                      <div key={sub.key} className="border border-gray-250 dark:border-gray-700 rounded-lg overflow-hidden shadow-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedEncashmentSub(isSubExpanded ? null : sub.key)}
                          className="w-full flex items-center justify-between p-3 bg-[#e6e6e6] dark:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 text-left border-none"
                        >
                          <span>{isSubExpanded ? '[-]' : '[+]'} {sub.label}</span>
                        </button>

                        <div className={`grid transition-all duration-200 ease-in-out ${isSubExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-250 dark:border-gray-700 grid grid-cols-2 gap-3">
                              {sub.key === 'locations' && locations.map(loc => (
                                <label key={loc.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment?.locations?.includes(loc.id) || false}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('locations', loc.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                                  />
                                  {loc.locationName || loc.location_name || loc.name}
                                </label>
                              ))}

                              {sub.key === 'departments' && departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment?.departments?.includes(dept.id) || false}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('departments', dept.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                                  />
                                  {dept.name}
                                </label>
                              ))}

                              {sub.key === 'grades' && gradeOptions.map(grd => (
                                <label key={grd} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment?.grades?.includes(grd) || false}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('grades', grd)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                                  />
                                  {grd}
                                </label>
                              ))}

                              {sub.key === 'employeeTypes' && employeeTypeOptions.map(typ => (
                                <label key={typ} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment?.employeeTypes?.includes(typ) || false}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('employeeTypes', typ)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                                  />
                                  {typ.replace('_', ' ')}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Toggle Switch */}
                <div className="space-y-2 pt-4">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block font-bold">Active</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setEncashmentTabForm({ ...encashmentTabForm, isActive: !encashmentTabForm.isActive })}
                      className="relative inline-flex items-center h-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden cursor-pointer"
                    >
                      <span className={`flex items-center justify-center text-xs font-bold px-4 h-full transition-all ${encashmentTabForm.isActive
                        ? 'bg-[#1e88e5] text-white'
                        : 'bg-gray-150 text-gray-500'
                        }`}>
                        Yes
                      </span>
                      <span className={`flex items-center justify-center text-xs font-bold px-4 h-full transition-all ${!encashmentTabForm.isActive
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-gray-350'
                        }`}>
                        No
                      </span>
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-800 w-full">
                  <div>
                    {selectedEncashmentId && (
                      <Button
                        onClick={handleDeleteEncashmentSetting}
                        type="button"
                        className="bg-red-600 hover:bg-red-750 text-white font-bold text-xs px-5 h-9 rounded-lg flex items-center gap-1.5 cursor-pointer border-none animate-fade-in"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => {
                        setSelectedEncashmentId(encashmentsList.length > 0 ? encashmentsList[0].id : null);
                      }}
                      type="button"
                      className="bg-[#dd4b39] hover:bg-[#d73925] text-white font-bold text-xs px-5 h-9 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEncashmentTabForm}
                      type="button"
                      className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs px-5 h-9 rounded-lg flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      {selectedEncashmentId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {selectedEncashmentId ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* LATE DEDUCTION POLICY VIEW */}
      {activeTab === 'late_deduction_policy' && (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Late Deduction Policy</h1>
              <p className="text-xs text-gray-500 mt-1 font-semibold">Configure rules for late arrival leave deductions.</p>
            </div>
            <Button
              onClick={() => {
                setSelectedLatePolicyId(null);
                setLatePolicyForm({
                  name: '',
                  policy_type: 'Late Coming',
                  first_deduction_on: 3,
                  buffer_allowed: 15,
                  no_buffer_allowed: 0,
                  deduct_type: 'Leave',
                  deduction_unit: 1.0,
                  after_deduction_amount: 0.5,
                  after_deduction_every: 1,
                  deduction_sequence: ['LWP', 'Paid leaves', 'Privilege Leave', 'Salary'],
                  locations: [],
                  departments: [],
                  grades: [],
                  shifts: [],
                  employee_statuses: [],
                  status: 'active'
                });
                setSelectedAvailable([]);
                setSelectedSequence([]);
                setIsLatePolicyModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Plus className="h-4 w-4" /> Add Late Policy
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Full-width: Policies List */}
            <Card className="border shadow-sm rounded-xl">
              <CardHeader className="border-b pb-3.5">
                <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">Existing Late Policies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLatePolicies ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                  </div>
                ) : latePolicies.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs font-semibold">No late deduction policies defined yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-900/40">
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500">Policy Name</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">First Deduction Threshold</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Buffer Allowed (Mins)</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Deduction Type</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Deduction Unit</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Status</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latePolicies.map((p) => (
                          <TableRow key={p.id} className="hover:bg-gray-50/40">
                            <TableCell className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              <div>{p.name}</div>
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                                {p.policy_type || 'Late Coming'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-center">{p.first_deduction_on} Lates</TableCell>
                            <TableCell className="text-xs font-semibold text-center">{p.buffer_allowed} Mins</TableCell>
                            <TableCell className="text-xs font-semibold text-center text-indigo-650">{p.deduct_type}</TableCell>
                            <TableCell className="text-xs font-semibold text-center text-rose-600">-{p.deduction_unit} Day(s)</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(p.status === 'active' || p.is_active === 1 || p.is_active === true) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                                }`}>
                                {(p.status === 'active' || p.is_active === 1 || p.is_active === true) ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button onClick={() => handleEditLatePolicy(p)} variant="outline" className="h-7 w-7 p-0 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-100">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button onClick={() => handleDeleteLatePolicy(p.id)} variant="outline" className="h-7 w-7 p-0 rounded-lg border-red-100 hover:bg-red-50 text-red-655">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 📋 Add/Edit Late Policy Modal */}
      <Dialog open={isLatePolicyModalOpen} onOpenChange={setIsLatePolicyModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 border border-gray-200 bg-white dark:bg-gray-950 shadow-lg">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              {selectedLatePolicyId ? 'Edit Late Policy' : 'Add Late Policy'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLatePolicy} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Policy Name</Label>
              <Input
                type="text"
                placeholder="e.g. Standard Late Policy"
                value={latePolicyForm.name}
                onChange={(e) => setLatePolicyForm({ ...latePolicyForm, name: e.target.value })}
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Policy Type</Label>
              <select
                value={latePolicyForm.policy_type}
                onChange={(e) => setLatePolicyForm({ ...latePolicyForm, policy_type: e.target.value })}
                className="w-full h-9 px-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-650 outline-none"
              >
                <option value="Late Coming">Late Coming</option>
                <option value="Early Going">Early Going</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">First Deduction On (Lates)</Label>
                <Input
                  type="number"
                  value={latePolicyForm.first_deduction_on}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, first_deduction_on: Number(e.target.value) })}
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Deduct Type</Label>
                <select
                  value={latePolicyForm.deduct_type}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, deduct_type: e.target.value })}
                  className="w-full h-9 px-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-650 outline-none"
                >
                  <option value="Leave">Leave</option>
                  <option value="Salary">Salary</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Buffer Allowed (Mins)</Label>
                <Input
                  type="number"
                  value={latePolicyForm.buffer_allowed}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, buffer_allowed: Number(e.target.value) })}
                  className="h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Without Buffer (Mins)</Label>
                <Input
                  type="number"
                  value={latePolicyForm.no_buffer_allowed}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, no_buffer_allowed: Number(e.target.value) })}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Deduction Unit (Days)</Label>
              <Input
                type="number"
                step="0.1"
                value={latePolicyForm.deduction_unit}
                onChange={(e) => setLatePolicyForm({ ...latePolicyForm, deduction_unit: Number(e.target.value) })}
                className="h-9 text-xs font-semibold"
              />
            </div>

            <div className="bg-gray-50/70 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-150 space-y-2">
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">After First Deduction</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <span>Deduct</span>
                <Input
                  type="number"
                  step="0.1"
                  value={latePolicyForm.after_deduction_amount}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, after_deduction_amount: Number(e.target.value) })}
                  className="h-8 w-16 text-center text-xs font-bold px-1 bg-white dark:bg-gray-950"
                />
                <span>on Every</span>
                <Input
                  type="number"
                  value={latePolicyForm.after_deduction_every}
                  onChange={(e) => setLatePolicyForm({ ...latePolicyForm, after_deduction_every: Number(e.target.value) })}
                  className="h-8 w-14 text-center text-xs font-bold px-1 bg-white dark:bg-gray-950"
                />
                <span>Late Coming(s)</span>
              </div>
            </div>

            {/* Sequence of Deduction: Two-pane transfer box */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Sequence Of Deduction</Label>
              <div className="flex flex-col gap-2 p-3.5 border rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
                <div className="grid grid-cols-2 gap-3">
                  {/* Available */}
                  <div className="border rounded-lg bg-white dark:bg-gray-950 p-2 h-36 overflow-y-auto">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 border-b pb-1">Available</span>
                    {['LWP', 'Paid leaves', 'Privilege Leave', 'Salary']
                      .filter(item => !latePolicyForm.deduction_sequence.includes(item))
                      .map(item => (
                        <label key={item} className="flex items-center gap-1.5 p-0.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={selectedAvailable.includes(item)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAvailable([...selectedAvailable, item]);
                              else setSelectedAvailable(selectedAvailable.filter(x => x !== item));
                            }}
                            className="h-3 w-3 rounded border-gray-300 text-indigo-650"
                          />
                          {item}
                        </label>
                      ))}
                  </div>

                  {/* Selected Sequence */}
                  <div className="border rounded-lg bg-white dark:bg-gray-950 p-2 h-36 overflow-y-auto">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1 border-b pb-1">Sequence</span>
                    {latePolicyForm.deduction_sequence.map((item, idx) => (
                      <label key={item} className="flex items-center gap-1.5 p-0.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer text-[11px] font-semibold text-gray-850 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedSequence.includes(item)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSequence([...selectedSequence, item]);
                            else setSelectedSequence(selectedSequence.filter(x => x !== item));
                          }}
                          className="h-3 w-3 rounded border-gray-300 text-indigo-650"
                        />
                        <span className="text-gray-400 font-mono text-[9px]">#{idx + 1}</span>
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transfer & Sorting Action Buttons */}
                <div className="flex justify-between items-center gap-1.5 pt-1.5 border-t">
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedAvailable.length === 0) return;
                        setLatePolicyForm(prev => ({
                          ...prev,
                          deduction_sequence: [...prev.deduction_sequence, ...selectedAvailable]
                        }));
                        setSelectedAvailable([]);
                      }}
                      disabled={selectedAvailable.length === 0}
                      variant="outline"
                      className="h-7 px-2 text-[10px] font-bold rounded-lg flex items-center gap-0.5"
                    >
                      Add ➔
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedSequence.length === 0) return;
                        setLatePolicyForm(prev => ({
                          ...prev,
                          deduction_sequence: prev.deduction_sequence.filter(x => !selectedSequence.includes(x))
                        }));
                        setSelectedSequence([]);
                      }}
                      disabled={selectedSequence.length === 0}
                      variant="outline"
                      className="h-7 px-2 text-[10px] font-bold rounded-lg flex items-center gap-0.5"
                    >
                      ⬅ Remove
                    </Button>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedSequence.length !== 1) return;
                        const item = selectedSequence[0];
                        const idx = latePolicyForm.deduction_sequence.indexOf(item);
                        if (idx > 0) {
                          const newSeq = [...latePolicyForm.deduction_sequence];
                          newSeq[idx] = newSeq[idx - 1];
                          newSeq[idx - 1] = item;
                          setLatePolicyForm(prev => ({ ...prev, deduction_sequence: newSeq }));
                        }
                      }}
                      disabled={selectedSequence.length !== 1 || latePolicyForm.deduction_sequence.indexOf(selectedSequence[0]) === 0}
                      variant="outline"
                      className="h-7 w-7 p-0 rounded-lg flex items-center justify-center"
                    >
                      ▲
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedSequence.length !== 1) return;
                        const item = selectedSequence[0];
                        const idx = latePolicyForm.deduction_sequence.indexOf(item);
                        if (idx !== -1 && idx < latePolicyForm.deduction_sequence.length - 1) {
                          const newSeq = [...latePolicyForm.deduction_sequence];
                          newSeq[idx] = newSeq[idx + 1];
                          newSeq[idx + 1] = item;
                          setLatePolicyForm(prev => ({ ...prev, deduction_sequence: newSeq }));
                        }
                      }}
                      disabled={selectedSequence.length !== 1 || latePolicyForm.deduction_sequence.indexOf(selectedSequence[0]) === latePolicyForm.deduction_sequence.length - 1}
                      variant="outline"
                      className="h-7 w-7 p-0 rounded-lg flex items-center justify-center"
                    >
                      ▼
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Eligibility Accordions */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Eligibility Settings</Label>
              <div className="border rounded-xl overflow-hidden divide-y">

                {/* Location Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateSub(expandedLateSub === 'locations' ? null : 'locations')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Location ({latePolicyForm.locations.length} selected)</span>
                    {expandedLateSub === 'locations' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateSub === 'locations' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {orgLocation && (
                        <label key={orgLocation.id} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={latePolicyForm.locations.includes(Number(orgLocation.id))}
                            onChange={() => {
                              const lId = Number(orgLocation.id);
                              const list = latePolicyForm.locations;
                              const newList = list.includes(lId) ? list.filter(x => x !== lId) : [...list, lId];
                              setLatePolicyForm({ ...latePolicyForm, locations: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-650"
                          />
                          {orgLocation.name || orgLocation.locationName || orgLocation.location_name} (Company HQ)
                        </label>
                      )}
                      {locations.map(loc => {
                        const lId = Number(loc.id);
                        if (orgLocation && lId === Number(orgLocation.id)) return null;
                        return (
                          <label key={lId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={latePolicyForm.locations.includes(lId)}
                              onChange={() => {
                                const list = latePolicyForm.locations;
                                const newList = list.includes(lId) ? list.filter(x => x !== lId) : [...list, lId];
                                setLatePolicyForm({ ...latePolicyForm, locations: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-650"
                            />
                            {loc.name || loc.location_name || loc.locationName || 'Unnamed Location'}
                          </label>
                        );
                      })}
                      {!orgLocation && locations.length === 0 && (
                        <span className="text-[10px] text-gray-400">No locations loaded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Department Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateSub(expandedLateSub === 'departments' ? null : 'departments')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Department ({latePolicyForm.departments.length} selected)</span>
                    {expandedLateSub === 'departments' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateSub === 'departments' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {departments.length === 0 ? (
                        <span className="text-[10px] text-gray-400">No departments loaded</span>
                      ) : (
                        departments.map(dept => {
                          const dId = Number(dept.id);
                          return (
                            <label key={dId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={latePolicyForm.departments.includes(dId)}
                                onChange={() => {
                                  const list = latePolicyForm.departments;
                                  const newList = list.includes(dId) ? list.filter(x => x !== dId) : [...list, dId];
                                  setLatePolicyForm({ ...latePolicyForm, departments: newList });
                                }}
                                className="rounded border-gray-300 text-indigo-650"
                              />
                              {dept.name || dept.departmentName || dept.department_name}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Grade Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateSub(expandedLateSub === 'grades' ? null : 'grades')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Grade ({latePolicyForm.grades.length} selected)</span>
                    {expandedLateSub === 'grades' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateSub === 'grades' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {gradeOptions.length === 0 ? (
                        <label className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={latePolicyForm.grades.includes('NA')}
                            onChange={() => {
                              const list = latePolicyForm.grades;
                              const newList = list.includes('NA') ? list.filter(x => x !== 'NA') : [...list, 'NA'];
                              setLatePolicyForm({ ...latePolicyForm, grades: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-650"
                          />
                          NA
                        </label>
                      ) : (
                        gradeOptions.map(grade => (
                          <label key={grade} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={latePolicyForm.grades.includes(grade)}
                              onChange={() => {
                                const list = latePolicyForm.grades;
                                const newList = list.includes(grade) ? list.filter(x => x !== grade) : [...list, grade];
                                setLatePolicyForm({ ...latePolicyForm, grades: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-650"
                            />
                            {grade}
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Shift Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateSub(expandedLateSub === 'shifts' ? null : 'shifts')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Shift ({latePolicyForm.shifts.length} selected)</span>
                    {expandedLateSub === 'shifts' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateSub === 'shifts' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {shiftOptions.length === 0 ? (
                        <span className="text-[10px] text-gray-400">No shifts loaded</span>
                      ) : (
                        shiftOptions.map(shift => {
                          const sId = Number(shift.id);
                          return (
                            <label key={sId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={latePolicyForm.shifts.includes(sId)}
                                onChange={() => {
                                  const list = latePolicyForm.shifts;
                                  const newList = list.includes(sId) ? list.filter(x => x !== sId) : [...list, sId];
                                  setLatePolicyForm({ ...latePolicyForm, shifts: newList });
                                }}
                                className="rounded border-gray-300 text-indigo-650"
                              />
                              {shift.shift_name || shift.shiftName}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Employee Status Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateSub(expandedLateSub === 'employee_statuses' ? null : 'employee_statuses')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Employee Status ({latePolicyForm.employee_statuses.length} selected)</span>
                    {expandedLateSub === 'employee_statuses' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateSub === 'employee_statuses' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {employeeStatusOptions.length === 0 ? (
                        <label className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={latePolicyForm.employee_statuses.includes('NA')}
                            onChange={() => {
                              const list = latePolicyForm.employee_statuses;
                              const newList = list.includes('NA') ? list.filter(x => x !== 'NA') : [...list, 'NA'];
                              setLatePolicyForm({ ...latePolicyForm, employee_statuses: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-650"
                          />
                          NA
                        </label>
                      ) : (
                        employeeStatusOptions.map(status => (
                          <label key={status} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={latePolicyForm.employee_statuses.includes(status)}
                              onChange={() => {
                                const list = latePolicyForm.employee_statuses;
                                const newList = list.includes(status) ? list.filter(x => x !== status) : [...list, status];
                                setLatePolicyForm({ ...latePolicyForm, employee_statuses: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-650"
                            />
                            {status}
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Active</Label>
              <button
                type="button"
                onClick={() => setLatePolicyForm({ ...latePolicyForm, status: latePolicyForm.status === 'active' ? 'inactive' : 'active' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${latePolicyForm.status === 'active' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow ${latePolicyForm.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Add & Cancel Buttons */}
            <div className="flex items-center gap-2.5 pt-3 border-t">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex-1 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                {selectedLatePolicyId ? 'Update Policy' : '+ Add'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLatePolicyModalOpen(false);
                }}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs h-10 px-4 rounded-xl flex items-center justify-center gap-1.5"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Late Updation Dialog Modal */}
      <Dialog open={isLateUpdationModalOpen} onOpenChange={setIsLateUpdationModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-650" />
              {selectedLateUpdationId ? 'Edit Late Updation' : 'Add Late Updation'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLateUpdation} className="space-y-4 pt-3">
            {/* Late Updation Name */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Late Updation Name <span className="text-red-500">*</span></Label>
              <Input
                value={lateUpdationForm.name}
                onChange={(e) => setLateUpdationForm({ ...lateUpdationForm, name: e.target.value })}
                placeholder="e.g. Late Arrival Rule"
                className="h-9 text-xs font-semibold"
                required
              />
            </div>

            {/* Late Coming After & Update For */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Late Coming After <span className="text-red-500">*</span></Label>
                <Input
                  value={lateUpdationForm.late_coming_after}
                  onChange={(e) => setLateUpdationForm({ ...lateUpdationForm, late_coming_after: e.target.value })}
                  placeholder="HH:MM"
                  className="h-9 text-xs font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Update For <span className="text-red-500">*</span></Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="update_for"
                      value="Half Day"
                      checked={lateUpdationForm.update_for === 'Half Day'}
                      onChange={() => setLateUpdationForm({ ...lateUpdationForm, update_for: 'Half Day' })}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    Half Day
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="update_for"
                      value="No Pay"
                      checked={lateUpdationForm.update_for === 'No Pay'}
                      onChange={() => setLateUpdationForm({ ...lateUpdationForm, update_for: 'No Pay' })}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    No Pay
                  </label>
                </div>
              </div>
            </div>

            {/* Auto Apply Leave checkbox */}
            <div className="pt-1.5 pb-1">
              <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lateUpdationForm.auto_apply_leave}
                  onChange={() => setLateUpdationForm({ ...lateUpdationForm, auto_apply_leave: !lateUpdationForm.auto_apply_leave })}
                  className="rounded border-gray-300 text-indigo-600 h-4 w-4 focus:ring-indigo-500"
                />
                Auto Apply Leave
              </label>
            </div>

            {/* Eligibility Settings Accordion */}
            <div className="space-y-2 border-t pt-3.5">
              <Label className="text-xs font-extrabold text-gray-800 dark:text-gray-200">Target Eligibility</Label>
              <div className="border rounded-xl overflow-hidden divide-y">

                {/* Location Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateUpdationSub(expandedLateUpdationSub === 'locations' ? null : 'locations')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Company - Location ({lateUpdationForm.locations.length} selected)</span>
                    {expandedLateUpdationSub === 'locations' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateUpdationSub === 'locations' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {orgLocation && (
                        <label key={orgLocation.id} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lateUpdationForm.locations.includes(Number(orgLocation.id))}
                            onChange={() => {
                              const lId = Number(orgLocation.id);
                              const list = lateUpdationForm.locations;
                              const newList = list.includes(lId) ? list.filter(x => x !== lId) : [...list, lId];
                              setLateUpdationForm({ ...lateUpdationForm, locations: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          {orgLocation.name || orgLocation.locationName || orgLocation.location_name} (Company HQ)
                        </label>
                      )}
                      {locations.map(loc => {
                        const locId = Number(loc.id);
                        if (orgLocation && locId === Number(orgLocation.id)) return null;
                        return (
                          <label key={locId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={lateUpdationForm.locations.includes(locId)}
                              onChange={() => {
                                const list = lateUpdationForm.locations;
                                const newList = list.includes(locId) ? list.filter(x => x !== locId) : [...list, locId];
                                setLateUpdationForm({ ...lateUpdationForm, locations: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-600"
                            />
                            {loc.name || loc.location_name || loc.locationName || 'Unnamed Location'}
                          </label>
                        );
                      })}
                      {!orgLocation && locations.length === 0 && (
                        <span className="text-[10px] text-gray-400">No locations loaded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Department Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateUpdationSub(expandedLateUpdationSub === 'departments' ? null : 'departments')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Department ({lateUpdationForm.departments.length} selected)</span>
                    {expandedLateUpdationSub === 'departments' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateUpdationSub === 'departments' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {departments.length === 0 ? (
                        <span className="text-[10px] text-gray-400">No departments loaded</span>
                      ) : (
                        departments.map(dept => {
                          const deptId = Number(dept.id);
                          return (
                            <label key={deptId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lateUpdationForm.departments.includes(deptId)}
                                onChange={() => {
                                  const list = lateUpdationForm.departments;
                                  const newList = list.includes(deptId) ? list.filter(x => x !== deptId) : [...list, deptId];
                                  setLateUpdationForm({ ...lateUpdationForm, departments: newList });
                                }}
                                className="rounded border-gray-300 text-indigo-600"
                              />
                              {dept.name || dept.department_name || dept.departmentName || 'Unnamed Department'}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Grade Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateUpdationSub(expandedLateUpdationSub === 'grades' ? null : 'grades')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Grade ({lateUpdationForm.grades.length} selected)</span>
                    {expandedLateUpdationSub === 'grades' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateUpdationSub === 'grades' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {gradeOptions.length === 0 ? (
                        <label className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lateUpdationForm.grades.includes('NA')}
                            onChange={() => {
                              const list = lateUpdationForm.grades;
                              const newList = list.includes('NA') ? list.filter(x => x !== 'NA') : [...list, 'NA'];
                              setLateUpdationForm({ ...lateUpdationForm, grades: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          NA
                        </label>
                      ) : (
                        gradeOptions.map(grade => (
                          <label key={grade} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={lateUpdationForm.grades.includes(grade)}
                              onChange={() => {
                                const list = lateUpdationForm.grades;
                                const newList = list.includes(grade) ? list.filter(x => x !== grade) : [...list, grade];
                                setLateUpdationForm({ ...lateUpdationForm, grades: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-600"
                            />
                            {grade}
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Shift Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateUpdationSub(expandedLateUpdationSub === 'shifts' ? null : 'shifts')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Shift ({lateUpdationForm.shifts.length} selected)</span>
                    {expandedLateUpdationSub === 'shifts' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateUpdationSub === 'shifts' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {shiftOptions.length === 0 ? (
                        <span className="text-[10px] text-gray-400">No shifts loaded</span>
                      ) : (
                        shiftOptions.map(shift => {
                          const sId = Number(shift.id);
                          return (
                            <label key={sId} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lateUpdationForm.shifts.includes(sId)}
                                onChange={() => {
                                  const list = lateUpdationForm.shifts;
                                  const newList = list.includes(sId) ? list.filter(x => x !== sId) : [...list, sId];
                                  setLateUpdationForm({ ...lateUpdationForm, shifts: newList });
                                }}
                                className="rounded border-gray-300 text-indigo-600"
                              />
                              {shift.shift_name || shift.shiftName}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Employee Status Accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedLateUpdationSub(expandedLateUpdationSub === 'employee_statuses' ? null : 'employee_statuses')}
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 text-xs font-bold text-gray-700 dark:text-gray-300"
                  >
                    <span>Employee Status ({lateUpdationForm.employee_statuses.length} selected)</span>
                    {expandedLateUpdationSub === 'employee_statuses' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedLateUpdationSub === 'employee_statuses' && (
                    <div className="p-3 bg-white dark:bg-gray-950 space-y-1 max-h-40 overflow-y-auto border-t">
                      {employeeStatusOptions.length === 0 ? (
                        <label className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lateUpdationForm.employee_statuses.includes('NA')}
                            onChange={() => {
                              const list = lateUpdationForm.employee_statuses;
                              const newList = list.includes('NA') ? list.filter(x => x !== 'NA') : [...list, 'NA'];
                              setLateUpdationForm({ ...lateUpdationForm, employee_statuses: newList });
                            }}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          NA
                        </label>
                      ) : (
                        employeeStatusOptions.map(status => (
                          <label key={status} className="flex items-center gap-2 py-0.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={lateUpdationForm.employee_statuses.includes(status)}
                              onChange={() => {
                                const list = lateUpdationForm.employee_statuses;
                                const newList = list.includes(status) ? list.filter(x => x !== status) : [...list, status];
                                setLateUpdationForm({ ...lateUpdationForm, employee_statuses: newList });
                              }}
                              className="rounded border-gray-300 text-indigo-600"
                            />
                            {status}
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Active</Label>
              <button
                type="button"
                onClick={() => setLateUpdationForm({ ...lateUpdationForm, status: lateUpdationForm.status === 'active' ? 'inactive' : 'active' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${lateUpdationForm.status === 'active' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow ${lateUpdationForm.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            {/* Add & Cancel Buttons */}
            <div className="flex items-center gap-2.5 pt-3 border-t">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl flex-1 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
              >
                {selectedLateUpdationId ? 'Update Updation' : '+ Add'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLateUpdationModalOpen(false);
                }}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs h-10 px-4 rounded-xl flex items-center justify-center gap-1.5"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* LATE AUTO DEDUCTION VIEW */}
      {activeTab === 'late_auto_deduction' && (
        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Late Auto Deduction</h1>
              <p className="text-xs text-gray-500 mt-1 font-semibold">Configure rules and manage automated late check-in leave deduction tasks.</p>
            </div>
            <Button
              onClick={() => {
                setSelectedLateUpdationId(null);
                setLateUpdationForm({
                  name: '',
                  late_coming_after: '09:30',
                  update_for: 'Half Day',
                  auto_apply_leave: false,
                  locations: [],
                  departments: [],
                  grades: [],
                  shifts: [],
                  employee_statuses: [],
                  status: 'active'
                });
                setIsLateUpdationModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Plus className="h-4 w-4" /> Add Late Updation
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Existing Late Updations table */}
            <Card className="border shadow-sm rounded-xl">
              <CardHeader className="border-b pb-3.5">
                <CardTitle className="text-sm font-bold text-gray-800 dark:text-gray-200">Existing Late Updations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingLateUpdations ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                  </div>
                ) : lateUpdations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">No late updation rules defined yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-900/40">
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500">Rule Name</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Late Coming Threshold</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Attendance Update Type</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Auto Apply Leave</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Status</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lateUpdations.map((p) => (
                          <TableRow key={p.id} className="hover:bg-gray-50/40">
                            <TableCell className="text-xs font-bold text-gray-800 dark:text-gray-200 pl-6">{p.name}</TableCell>
                            <TableCell className="text-xs font-semibold text-center text-gray-700 dark:text-gray-300">
                              {p.late_coming_after || '09:30'}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600">
                                {p.update_for}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-center">
                              {p.auto_apply_leave ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">Yes</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-500">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {(p.status === 'active' || p.is_active === 1 || p.is_active === true) ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">Active</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-500">Inactive</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  onClick={() => handleEditLateUpdation(p)}
                                  variant="outline"
                                  className="h-7 w-7 p-0 rounded-lg border-indigo-100 hover:bg-indigo-50 text-indigo-600"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteLateUpdation(p.id)}
                                  variant="outline"
                                  className="h-7 w-7 p-0 rounded-lg border-red-100 hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ORIGINAL MODALS PRESERVED */}

      {/* Mapping Dialog Modal */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Bulk Policy Mapping</DialogTitle>
            <DialogDescription>
              Define the criteria for automatic policy assignment. Higher priority mappings will be resolved first.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMapping} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Leave Policy *</Label>
              <select
                value={mappingForm.leavePolicyId}
                onChange={(e) => setMappingForm({ ...mappingForm, leavePolicyId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
                required
              >
                <option value="">Select leave policy container...</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Role (Optional)</Label>
              <select
                value={mappingForm.roleId}
                onChange={(e) => setMappingForm({ ...mappingForm, roleId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Department (Optional)</Label>
              <select
                value={mappingForm.departmentId}
                onChange={(e) => setMappingForm({ ...mappingForm, departmentId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Designation (Optional)</Label>
              <select
                value={mappingForm.designationId}
                onChange={(e) => setMappingForm({ ...mappingForm, designationId: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Employment Type (Optional)</Label>
              <select
                value={mappingForm.employmentType}
                onChange={(e) => setMappingForm({ ...mappingForm, employmentType: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Types</option>
                <option value="full_time">Full-Time Permanent</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contractor</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Resolution Priority (Highest first)</Label>
              <Input
                type="number"
                value={mappingForm.priority}
                onChange={(e) => setMappingForm({ ...mappingForm, priority: parseInt(e.target.value, 10) || 10 })}
              />
              <p className="text-[10px] text-muted-foreground">Example: 100 will resolve before 10.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMappingModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
                Add Mapping Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Blackout Period Dialog Modal */}
      <Dialog open={isBlackoutModalOpen} onOpenChange={setIsBlackoutModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Blackout Period</DialogTitle>
            <DialogDescription>
              Block leave requests during a specific date range. Leaves overlapping these dates will be blocked for matching employees.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBlackout} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Start Date *</Label>
                <input
                  type="date"
                  value={blackoutForm.start_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, start_date: e.target.value })}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch (err) { }
                  }}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold cursor-pointer"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">End Date *</Label>
                <input
                  type="date"
                  value={blackoutForm.end_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, end_date: e.target.value })}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch (err) { }
                  }}
                  className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Reason / Event Name *</Label>
              <Input
                type="text"
                placeholder="e.g. Annual Audit, Release Freeze"
                value={blackoutForm.reason}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Applicable Department (Optional)</Label>
              <select
                value={blackoutForm.applicable_department_id}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_department_id: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Applicable Location (Optional)</Label>
              <select
                value={blackoutForm.applicable_location_id}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_location_id: e.target.value })}
                className="w-full h-10 px-3 text-xs bg-muted/50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground font-semibold"
              >
                <option value="">All Locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.locationName || l.location_name || l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBlackoutModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
                Add Blackout Period
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog Modal */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Leave Policy - {editingPolicy?.name}</DialogTitle>
            <DialogDescription>
              Configure the default adjustments and holiday counts for this policy container.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePolicy} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Earned Leave Entitlement %</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="100"
                value={policyForm.earnedLeaveEntitlementPercent}
                onChange={(e) => setPolicyForm({ ...policyForm, earnedLeaveEntitlementPercent: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">Percentage of standard quota credited to employees on accrual (e.g. 50%).</p>
            </div>

            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="policy-includes-holidays"
                checked={policyForm.entitlementIncludesPublicHolidays}
                onChange={(e) => setPolicyForm({ ...policyForm, entitlementIncludesPublicHolidays: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="policy-includes-holidays" className="text-xs font-bold cursor-pointer select-none">
                Entitlement Includes Public Holidays
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2 pl-7">If enabled, EL and PL duration calculations will count public holidays as consumed leave days.</p>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsPolicyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Policy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disbursement Setting Modal */}
      <Dialog open={isDisbursementModalOpen} onOpenChange={setIsDisbursementModalOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Encash Disbursement Setting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDisbursement} className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Disbursement Periodicity</Label>
                <select
                  value={disbursementForm.periodicity}
                  onChange={(e) => setDisbursementForm({ ...disbursementForm, periodicity: e.target.value })}
                  className="w-full h-10 px-3 text-xs bg-muted border rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="Select">- Select -</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="TriAnnually">TriAnnually</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Disbursement After</Label>
                <Input
                  type="number"
                  placeholder="Days"
                  value={disbursementForm.disbursementAfter}
                  onChange={(e) => setDisbursementForm({ ...disbursementForm, disbursementAfter: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDisbursementModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-5 rounded-xl font-bold">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Encashment / Carry Forward Add & Edit Rule Modal */}
      <Dialog open={isEncashRuleModalOpen} onOpenChange={setIsEncashRuleModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3 mb-2">
            <DialogTitle>Leave Encashment / Carry Forward</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 py-3">
            {/* LEAVE GROUP */}
            <div className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 bg-gray-50 flex items-center gap-2 border-b border-gray-150">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-700">Leave</span>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Encash CarryForward Periodicity</Label>
                  <select
                    value={ruleForm.periodicity}
                    onChange={(e) => setRuleForm({ ...ruleForm, periodicity: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-muted border rounded-xl focus:outline-none text-foreground font-semibold"
                  >
                    <option value="Select">Select</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="TriAnnually">TriAnnually</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleForm.requestableEncashment}
                      onChange={(e) => setRuleForm({ ...ruleForm, requestableEncashment: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    Requestable Leave Encashment
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleForm.allowMultipleEncashment}
                      onChange={(e) => setRuleForm({ ...ruleForm, allowMultipleEncashment: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    Allow Multiple Encashment
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Encash Year *</Label>
                  <select
                    value={ruleForm.encashYear}
                    onChange={(e) => setRuleForm({ ...ruleForm, encashYear: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-muted border rounded-xl focus:outline-none text-foreground font-semibold"
                    required
                  >
                    <option value="Select">Select</option>
                    <option value="Current Year">Current Year</option>
                    <option value="Previous Year">Previous Year</option>
                  </select>
                </div>

                {/* Sub-Box Carry Forward and Encashment */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Carry Forward and Encashment</p>
                  <span className="absolute top-3 right-4 text-xs text-gray-400">↑↓</span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-755">Max carry forward unit</Label>
                      <Input
                        type="number"
                        value={ruleForm.maxCarryForward}
                        onChange={(e) => setRuleForm({ ...ruleForm, maxCarryForward: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-755">Max encash unit</Label>
                      <Input
                        type="number"
                        value={ruleForm.maxEncash}
                        onChange={(e) => setRuleForm({ ...ruleForm, maxEncash: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Maximum encashment & carryforward limit</Label>
                  <Input
                    type="number"
                    value={ruleForm.maxLimit}
                    onChange={(e) => setRuleForm({ ...ruleForm, maxLimit: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Expire CarryForward Leave After Number of Days</Label>
                  <Input
                    type="number"
                    value={ruleForm.expireAfterDays}
                    onChange={(e) => setRuleForm({ ...ruleForm, expireAfterDays: e.target.value })}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Custom Hook</Label>
                  <textarea
                    value={ruleForm.customHook}
                    onChange={(e) => setRuleForm({ ...ruleForm, customHook: e.target.value })}
                    placeholder="Write custom validation logic..."
                    className="w-full min-h-20 p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* EMPLOYMENT ACCORDION */}
            <div className="border border-gray-150 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setIsRuleModalEmploymentExpanded(!isRuleModalEmploymentExpanded)}
                className="w-full p-3 bg-gray-50 flex items-center justify-between border-b border-gray-155 text-xs font-bold text-gray-700"
              >
                <span className="flex items-center flex-wrap gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-teal-600" /> Employment
                </span>
                {isRuleModalEmploymentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isRuleModalEmploymentExpanded && (
                <div className="p-4 space-y-4 bg-white">
                  {[
                    { key: 'locations', label: 'Company - Location' },
                    { key: 'departments', label: 'Department' },
                    { key: 'grades', label: 'Grade' },
                    { key: 'employeeTypes', label: 'Employee Type' },
                    { key: 'employeeStatuses', label: 'Employee Status' }
                  ].map((sub: any) => {
                    const isSubExpanded = expandedRuleSub === sub.key;
                    return (
                      <div key={sub.key} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedRuleSub(isSubExpanded ? null : sub.key)}
                          className="w-full flex items-center justify-between p-2.5 bg-gray-50 text-xs font-semibold text-gray-700"
                        >
                          <span>{isSubExpanded ? '[-]' : '[+]'} {sub.label}</span>
                        </button>

                        {isSubExpanded && (
                          <div className="p-3 bg-white border-t grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                            {sub.key === 'locations' && locations.map(loc => (
                              <label key={loc.id} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ruleForm.employment?.locations?.includes(loc.id) || false}
                                  onChange={() => handleToggleRuleEmploymentTarget('locations', loc.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {loc.locationName || loc.location_name || loc.name}
                              </label>
                            ))}

                            {sub.key === 'departments' && departments.map(dept => (
                              <label key={dept.id} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ruleForm.employment?.departments?.includes(dept.id) || false}
                                  onChange={() => handleToggleRuleEmploymentTarget('departments', dept.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {dept.name}
                              </label>
                            ))}

                            {sub.key === 'grades' && gradeOptions.map(grd => (
                              <label key={grd} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ruleForm.employment?.grades?.includes(grd) || false}
                                  onChange={() => handleToggleRuleEmploymentTarget('grades', grd)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {grd}
                              </label>
                            ))}

                            {sub.key === 'employeeTypes' && employeeTypeOptions.map(typ => (
                              <label key={typ} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer capitalize">
                                <input
                                  type="checkbox"
                                  checked={ruleForm.employment?.employeeTypes?.includes(typ) || false}
                                  onChange={() => handleToggleRuleEmploymentTarget('employeeTypes', typ)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {typ.replace('_', ' ')}
                              </label>
                            ))}

                            {sub.key === 'employeeStatuses' && employeeStatusOptions.map(stat => (
                              <label key={stat} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer capitalize">
                                <input
                                  type="checkbox"
                                  checked={ruleForm.employment?.employeeStatuses?.includes(stat) || false}
                                  onChange={() => handleToggleRuleEmploymentTarget('employeeStatuses', stat)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {stat}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t">
              <Button type="button" variant="outline" className="bg-red-50 text-red-650 hover:bg-red-100" onClick={() => setIsEncashRuleModalOpen(false)}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl">
                <Check className="h-4 w-4 mr-1" /> Save Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ⚙️ Audit Log Dialog/Modal */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500 animate-spin-slow" />
              Audit Log: {selectedLeaveType?.leaveName || selectedLeaveType?.leave_name || 'Leave Category'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Complete historical trail of policy updates and changes.
            </DialogDescription>
          </DialogHeader>

          {isLoadingAudit ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
              <p className="text-xs text-gray-500 font-semibold">Fetching audit trails...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-full mb-3">
                <Settings className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No Audit Trail Found</p>
              <p className="text-xs text-gray-500 max-w-xs mt-1">No configuration changes have been recorded for this leave category yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {auditLogs.map((log) => {
                const isCreate = log.action === 'CREATE_LEAVE_TYPE';
                const formattedDate = new Date(log.createdAt || log.created_at).toLocaleString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                // Helper to format state changes nicely
                const renderStateDiff = () => {
                  const before = log.beforeState || {};
                  const after = log.afterState || {};
                  const keys = Object.keys(after);

                  return (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-1.5 border border-gray-100 dark:border-gray-800">
                      {keys.map((key) => {
                        const beforeVal = before[key];
                        const afterVal = after[key];

                        // Skip if no change
                        if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) return null;

                        const formatVal = (v: any) => {
                          if (v === null || v === undefined) return 'None';
                          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
                          if (typeof v === 'object') return JSON.stringify(v);
                          return String(v);
                        };

                        const friendlyKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                        return (
                          <div key={key} className="grid grid-cols-3 gap-2 text-xs py-0.5">
                            <span className="font-semibold text-gray-600 dark:text-gray-400 capitalize">{friendlyKey}</span>
                            {isCreate ? (
                              <span className="col-span-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                Set to: <strong className="font-bold">{formatVal(afterVal)}</strong>
                              </span>
                            ) : (
                              <span className="col-span-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 flex-wrap">
                                <span className="line-through text-red-500/80 bg-red-500/5 px-1 rounded">{formatVal(beforeVal)}</span>
                                <span className="text-gray-400 font-bold">➔</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 px-1 rounded">{formatVal(afterVal)}</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                };

                return (
                  <div key={log.id} className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-900/40 pb-6 last:pb-0">
                    {/* Circle badge */}
                    <div className={`absolute -left-2.5 top-0.5 w-5 h-5 rounded-full border-2 bg-white dark:bg-gray-950 flex items-center justify-center ${isCreate ? 'border-emerald-500 text-emerald-500' : 'border-indigo-500 text-indigo-500'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-1.5">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mr-2 uppercase ${isCreate ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                          {isCreate ? 'Created' : 'Updated'}
                        </span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200">by {log.actorName}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono font-medium">{formattedDate}</span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1 font-medium flex items-center gap-2">
                      <span>IP Address: <strong>{log.ipAddress || log.ip_address || '127.0.0.1'}</strong></span>
                    </div>

                    {renderStateDiff()}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-5 border-t mt-6">
            <Button type="button" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl" onClick={() => setIsAuditModalOpen(false)}>
              Close Audit Trail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📋 Late Deduction Dry-Run Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto rounded-2xl p-6 border border-gray-200 bg-white dark:bg-gray-950 shadow-lg">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-500 animate-pulse" />
              Late Deduction Dry Run Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Evaluated leave deductions for the month of <strong>{manualRunMonth}</strong>.
            </DialogDescription>
          </DialogHeader>

          {previewData.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 font-semibold">
              No employees met late deduction thresholds for this period.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-xl overflow-hidden shadow-sm max-h-[40vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 dark:bg-gray-900/40">
                      <TableHead className="text-[10px] font-bold uppercase text-gray-500">Employee Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Late Arrivals Count</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-center">Leaves Deducted</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-gray-500 text-right">Deduction Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50/30">
                        <TableCell className="text-xs font-bold text-gray-800 dark:text-gray-200">{row.employeeName}</TableCell>
                        <TableCell className="text-xs font-semibold text-center">{row.lateCount} times</TableCell>
                        <TableCell className="text-xs font-bold text-center text-rose-600">-{row.deductedDays} Day(s)</TableCell>
                        <TableCell className="text-[11px] text-right font-medium text-gray-500">{row.details || 'Salary / LWP fallback'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 text-xs text-indigo-850 dark:text-indigo-300 leading-relaxed font-semibold">
                📢 <strong>Note:</strong> Since this is a <strong>Dry Run</strong>, no actual leaves have been deducted. Disable Dry Run mode and execute to update actual balances.
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t mt-4 gap-2">
            <Button type="button" variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs" onClick={() => setIsPreviewModalOpen(false)}>
              Close Preview
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 h-9 rounded-xl shadow active:scale-[0.98] transition-all"
              onClick={() => {
                setIsDryRun(false);
                setIsPreviewModalOpen(false);
                toast.info('Dry run mode disabled. Click Run Job to finalize deductions.');
              }}
            >
              Configure Live Run
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🛡️ Add New Policy Mapping Modal */}
      <Dialog open={isMappingModalOpen} onOpenChange={setIsMappingModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Add Bulk Policy Mapping
              <HelpHint
                title="Add Bulk Mapping Rule"
                titleHi="नया मैपिंग नियम जोड़ें"
                description="Target employees by criteria and automatically grant the selected leave policy."
                descriptionHi="मापदंडों के आधार पर कर्मचारियों को स्वचालित रूप से चुनी गई लीव पॉलिसी दें।"
              />
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create an automatic mapping rule for leave policy assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Leave Policy <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsCreatePolicyOpen(!isCreatePolicyOpen)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCreatePolicyOpen ? 'Cancel' : '+ Create New Policy Name'}</span>
                </button>
              </div>

              {isCreatePolicyOpen ? (
                <div className="flex items-center gap-2 pt-1 pb-1">
                  <Input
                    type="text"
                    placeholder="e.g. IT Department Policy / Executive Policy"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    required
                    className="h-8 text-xs font-medium"
                  />
                </div>
              ) : (
                <select
                  value={mappingForm.leavePolicyId}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCreatePolicyOpen(true);
                    } else {
                      setMappingForm({ ...mappingForm, leavePolicyId: e.target.value });
                    }
                  }}
                  required
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">-- Select Policy --</option>
                  {policies.map((p: any) => (
                    <option key={`p-${p.id}`} value={p.id}>{p.name || p.policy_name}</option>
                  ))}
                  {leaveTypes.length > 0 && (
                    <optgroup label="Leave Categories / Types">
                      {leaveTypes.map((lt: any) => (
                        <option key={`lt-${lt.id}`} value={lt.id}>{lt.leaveName || lt.leave_name || lt.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value="custom" className="font-bold text-indigo-600">+ Create Custom Named Policy...</option>
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Department</Label>
                <select
                  value={mappingForm.departmentId}
                  onChange={(e) => setMappingForm({ ...mappingForm, departmentId: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">All Departments (Global)</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Designation</Label>
                <select
                  value={mappingForm.designationId}
                  onChange={(e) => setMappingForm({ ...mappingForm, designationId: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">All Designations (Global)</option>
                  {designations.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name || d.designation_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Employment Type</Label>
                <select
                  value={mappingForm.employmentType}
                  onChange={(e) => setMappingForm({ ...mappingForm, employmentType: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">All Employment Types</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="probation">Probation</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rule Priority</Label>
                <Input
                  type="number"
                  value={mappingForm.priority}
                  onChange={(e) => setMappingForm({ ...mappingForm, priority: parseInt(e.target.value) || 10 })}
                  placeholder="e.g. 10"
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsMappingModalOpen(false)} className="h-8 text-xs rounded-lg cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs px-4 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Save Mapping Rule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 📅 Add Blackout Period Modal */}
      <Dialog open={isBlackoutModalOpen} onOpenChange={setIsBlackoutModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="border-b pb-3 mb-4">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" />
              Add Blackout Period
              <HelpHint
                title="Add Blackout Period"
                titleHi="लीव बैन अवधि जोड़ें"
                description="Set start/end dates and reason to restrict leave booking."
                descriptionHi="छुट्टी की बुकिंग रोकने के लिए तारीखें और कारण दर्ज करें।"
              />
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Prevent employees from taking leaves during critical business dates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBlackout} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason / Event Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                value={blackoutForm.reason}
                onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
                placeholder="e.g. Annual Financial Audit / Product Launch"
                required
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={blackoutForm.start_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, start_date: e.target.value })}
                  required
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  End Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={blackoutForm.end_date}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, end_date: e.target.value })}
                  required
                  className="h-9 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Department (Optional)</Label>
                <select
                  value={blackoutForm.applicable_department_id}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_department_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">Global (All Departments)</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Location (Optional)</Label>
                <select
                  value={blackoutForm.applicable_location_id}
                  onChange={(e) => setBlackoutForm({ ...blackoutForm, applicable_location_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">Global (All Locations)</option>
                  {locations.map((l: any) => (
                    <option key={l.id || l.uuid} value={l.id}>{l.name || l.location_name || l.locationName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsBlackoutModalOpen(false)} className="h-8 text-xs rounded-lg cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs px-4 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Save Blackout Period
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AUDIT TRAIL MODAL */}
      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Audit Trail"
        subtitle={selectedLeaveType ? `Leave Category: ${selectedLeaveType.leaveName || selectedLeaveType.leave_name} (${selectedLeaveType.leaveCode || selectedLeaveType.leave_code || ''})` : 'Leave Type Settings'}
        logs={auditLogs}
        isLoading={isLoadingAudit}
        onRefresh={fetchAuditLogs}
      />

      {/* ADD LEAVE TYPE MODAL DIALOG */}
      <AddLeaveTypeModal
        isOpen={isAddLeaveModalOpen}
        onClose={() => setIsAddLeaveModalOpen(false)}
        onCreateApi={handleCreateLeaveTypeApi}
        onSuccess={(newLeaveType) => {
          setSelectedLeaveType(newLeaveType);
          setViewMode('configure');
        }}
      />

      {/* LEAVE YEAR SETTINGS MODAL DIALOG */}
      <LeaveYearSettingsModal
        isOpen={isLeaveYearModalOpen}
        onClose={() => setIsLeaveYearModalOpen(false)}
        settingToEdit={leaveYearToEdit}
        onSaved={fetchLeaveYearSettings}
        locationsList={locationsList}
        departmentsList={departmentsList}
        gradesList={gradesList}
        companiesList={companiesList}
        subDepartmentsList={subDepartmentsList}
        designationsList={designationsList}
        employmentTypesList={employmentTypesList}
        employmentStatusesList={employmentStatusesList}
      />
    </div>
  );
}
