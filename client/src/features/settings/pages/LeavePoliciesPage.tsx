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
  ChevronDown, ChevronUp, Play, ArrowLeft, Clock, FileText, Check, X, AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

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
  allocation_settings?: any;
  application_settings?: any;
  payroll_settings?: any;
  employment_allocation_settings?: any;
  employment_application_settings?: any;
  encashment_settings?: any;
}

export function LeavePoliciesPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'leave' | 'policy' | 'encashment'>('leave');
  
  // Master lists
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  
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
  const [mappings, setMappings] = useState<any[]>([]);
  const [blackoutPeriods, setBlackoutPeriods] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fixed options lists for employment targets
  const gradeOptions = ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Executive', 'Manager', 'Staff'];
  const employeeTypeOptions = ['full_time', 'part_time', 'contract', 'intern'];
  const employeeStatusOptions = ['active', 'probation', 'resigned', 'terminated'];

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

  // Helper to parse JSON safely
  const parseJson = (val: any, fallback: any) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return fallback;
    }
  };

  // State for Advanced Form Configuration (Right panel)
  const [formData, setFormData] = useState({
    leave_name: '',
    leave_code: '',
    leave_classification: 'calendar' as 'calendar' | 'non-calendar' | 'uncategorized',
    status: 'active' as 'active' | 'inactive',
    paid_type: 'paid' as 'paid' | 'unpaid' | 'half_paid',
    annual_quota: 12,

    // Allocation Settings
    allocation: {
      considerLeaveStartYearAsFrom: false,
      entitlementDays: '0',
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
      const res = await apiClient.get('/settings/leave-types');
      if (res.data?.success) {
        const types = res.data.data || [];
        setLeaveTypes(types);
        
        // Auto-select first leave type or LWP if exists
        if (types.length > 0) {
          const paid = types.find((t: any) => (t.leaveName || t.leave_name || '').toLowerCase().includes('paid'));
          setSelectedLeaveType(paid || types[0]);
        } else {
          setSelectedLeaveType(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leave categories.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Policies and Mappings (Original mapping metadata)
  const fetchMappingMetadata = async () => {
    try {
      const [policiesRes, mappingsRes, deptsRes, optsRes, locsRes] = await Promise.all([
        apiClient.get('/leaves/policies').catch(() => ({ data: { data: [] } })),
        apiClient.get('/leaves/policy-mappings').catch(() => ({ data: { data: [] } })),
        apiClient.get('/settings/departments').catch(() => apiClient.get('/departments')).catch(() => ({ data: { data: [] } })),
        apiClient.get('/reports/options').catch(() => ({ data: { data: {} } })),
        apiClient.get('/settings/locations').catch(() => apiClient.get('/attendance/locations')).catch(() => ({ data: { data: [] } })),
      ]);

      setPolicies(policiesRes.data?.data || []);
      setMappings(mappingsRes.data?.data || []);
      setDepartments(deptsRes.data?.data || deptsRes.data || []);
      setDesignations(optsRes.data?.data?.designations || []);
      setLocations(locsRes.data?.data || locsRes.data || []);
      
      // Load blackout periods
      const blackoutRes = await apiClient.get('/leaves/blackout-periods').catch(() => ({ data: { data: [] } }));
      setBlackoutPeriods(blackoutRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load policy mappings metadata', err);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchMappingMetadata();
  }, []);

  // When selected Leave Type changes, populate form
  useEffect(() => {
    if (selectedLeaveType) {
      const lt = selectedLeaveType;
      
      const alloc = parseJson(lt.allocation_settings, {});
      const app = parseJson(lt.application_settings, {});
      const pay = parseJson(lt.payroll_settings, {});
      const empAlloc = parseJson(lt.employment_allocation_settings, {});
      const empApp = parseJson(lt.employment_application_settings, {});
      const enc = parseJson(lt.encashment_settings, { rules: [], disbursement: { periodicity: 'Select', disbursementAfter: '' } });

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
          considerLeaveStartYearAsFrom: alloc.considerLeaveStartYearAsFrom ?? false,
          entitlementDays: alloc.entitlementDays ?? '0',
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
          gender: alloc.gender || 'All',
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
        },
        application: {
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
        },
        
        payroll: {
          conditionOn: pay.conditionOn || 'Choose',
          operator: pay.operator || 'Choose',
          value1: pay.value1 ?? '0',
          value2: pay.value2 ?? '0',
          considerMonths: pay.considerMonths ?? '0',
          reverseCondition: pay.reverseCondition ?? false,
        },

        employment_allocation: {
          locations: empAlloc.locations || [],
          departments: empAlloc.departments || [],
          grades: empAlloc.grades || [],
          employeeTypes: empAlloc.employeeTypes || [],
          employeeStatuses: empAlloc.employeeStatuses || [],
        },

        employment_application: {
          locations: empApp.locations || [],
          departments: empApp.departments || [],
          grades: empApp.grades || [],
          employeeTypes: empApp.employeeTypes || [],
          employeeStatuses: empApp.employeeStatuses || [],
        },

        encashment: {
          rules: enc.rules || [],
          disbursement: enc.disbursement || { periodicity: 'Select', disbursementAfter: '' }
        }
      });
    }
  }, [selectedLeaveType]);

  // Handle Save (Create or Update)
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leave_name || !formData.leave_code) {
      toast.error('Leave Name and Code are required.');
      return;
    }

    const payload = {
      leave_name: formData.leave_name,
      leave_code: formData.leave_code.toUpperCase(),
      leave_classification: formData.leave_classification,
      status: formData.status,
      paid_type: formData.allocation.noPayment ? 'unpaid' : formData.paid_type,
      annual_quota: formData.annual_quota,
      
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
          // Refresh list
          const updatedTypes = leaveTypes.map(t => 
            t.id === selectedLeaveType.id ? { ...t, ...payload, leave_name: payload.leave_name, leave_code: payload.leave_code } : t
          );
          setLeaveTypes(updatedTypes as any);
        }
      } else {
        // Create
        const res = await apiClient.post('/settings/leave-types', payload);
        if (res.data?.success) {
          toast.success('Leave category created successfully!');
          fetchLeaveTypes();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save leave settings.');
    }
  };

  // Trigger Cron allocation
  const handleTriggerCron = async () => {
    try {
      const res = await apiClient.post('/leaves/cron/allocate');
      if (res.data?.success) {
        toast.success(res.data.message || 'Leave allocation cron executed successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger cron allocation.');
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
    if (!mappingForm.leavePolicyId) {
      toast.error('Please select a leave policy');
      return;
    }
    try {
      const res = await apiClient.post('/leaves/policy-mappings', {
        leavePolicyId: parseInt(mappingForm.leavePolicyId, 10),
        departmentId: mappingForm.departmentId ? parseInt(mappingForm.departmentId, 10) : null,
        designationId: mappingForm.designationId ? parseInt(mappingForm.designationId, 10) : null,
        employmentType: mappingForm.employmentType || null,
        priority: parseInt(mappingForm.priority as any, 10) || 10,
      });

      if (res.data?.success) {
        toast.success('Policy mapping created successfully!');
        setIsMappingModalOpen(false);
        setMappingForm({
          leavePolicyId: '',
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
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-950 overflow-y-auto lg:overflow-hidden">
      
      {/* 1st COLUMN: Sidebar Sub-Navigation */}
      <div className="w-full lg:w-64 bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col lg:h-full shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>
        
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Leave Administration</p>
          
          <button
            onClick={() => setActiveTab('leave')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'leave'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Leave Categories</span>
          </button>
          
          <button
            onClick={() => setActiveTab('policy')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'policy'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Leave Policy Mappings</span>
          </button>
          
          <button
            onClick={() => setActiveTab('encashment')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'encashment'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Leave Encashment</span>
          </button>
        </div>
      </div>

      {/* RENDER DYNAMIC VIEWS DEPENDING ON SIDEBAR ACTIVE TAB */}
      
      {activeTab === 'leave' && (
        <>
          {/* 2nd COLUMN: Leave Types List */}
          <div className="w-full lg:w-80 bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col h-[400px] lg:h-full shrink-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Leave</h3>
                  <p className="text-[10px] text-gray-500 font-semibold">{filteredLeaveTypes.length} Categories</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setSelectedLeaveType(null)} 
                size="sm"
                className="h-8 w-8 p-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-gray-600 dark:text-gray-300 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={classificationFilter}
                  onChange={(e: any) => setClassificationFilter(e.target.value)}
                  className="px-2 py-1 text-[10px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-gray-600 dark:text-gray-300 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="calendar">Calendar</option>
                  <option value="non-calendar">Non-Calendar</option>
                  <option value="uncategorized">Uncategorized</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredLeaveTypes.map((lt) => {
                const isSelected = selectedLeaveType?.id === lt.id;
                const classification = lt.leave_classification || 
                  ((lt.leaveName || lt.leave_name || '').toLowerCase().includes('lwp') ? 'uncategorized' :
                   (lt.leaveName || lt.leave_name || '').toLowerCase().includes('privilage') || (lt.leaveName || lt.leave_name || '').toLowerCase().includes('privilege') ? 'non-calendar' : 'calendar');
                
                let typeColorClass = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30";
                if (classification === 'calendar') {
                  typeColorClass = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
                } else if (classification === 'non-calendar') {
                  typeColorClass = "bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30";
                }

                return (
                  <div
                    key={lt.id}
                    onClick={() => setSelectedLeaveType(lt)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-indigo-500 shadow-md ring-1 ring-indigo-500/10'
                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 hover:border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {lt.leaveName || lt.leave_name}
                      </span>
                      {lt.status === 'inactive' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">Inactive</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider ${typeColorClass}`}>
                        Type: {classification}
                      </span>
                      <span>{lt.annualQuota ?? lt.annual_quota} Days</span>
                    </div>
                  </div>
                );
              })}
              
              {filteredLeaveTypes.length === 0 && (
                <div className="text-center py-10 text-xs text-gray-400 font-medium">No leave categories found.</div>
              )}
            </div>
          </div>

          {/* 3rd COLUMN: Details Settings Config (Accordion Forms) */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-950 lg:overflow-y-auto">
            <form onSubmit={handleSaveDetails} className="max-w-4xl mx-auto p-8 space-y-8">
              
              {/* Details Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {selectedLeaveType ? `Configure ${selectedLeaveType.leaveName || selectedLeaveType.leave_name}` : 'Create Leave Setting'}
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">Define advanced policies, eligibility rules, sandwich conditions, and payroll logic.</p>
                </div>
                
                <div className="flex items-center flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Settings className="w-4 h-4" /> Audit Log
                  </Button>
                </div>
              </div>

              {/* ACCORDION 1: Leave Allocation Setting */}
              <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'allocation' ? null : 'allocation')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-850/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <Database className="h-4.5 w-4.5 text-teal-500" /> Leave Allocation Setting
                  </span>
                  {expandedAccordion === 'allocation' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expandedAccordion === 'allocation' && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Leave Name *</Label>
                        <Input
                          value={formData.leave_name}
                          onChange={(e) => setFormData({ ...formData, leave_name: e.target.value })}
                          placeholder="e.g. Paid leaves"
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Leave Code *</Label>
                        <Input
                          value={formData.leave_code}
                          onChange={(e) => setFormData({ ...formData, leave_code: e.target.value })}
                          placeholder="e.g. PL"
                          className="h-10 rounded-xl font-mono uppercase"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Leave Type</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {['calendar', 'non-calendar', 'uncategorized'].map((type) => {
                          const isSelected = formData.leave_classification === type;
                          
                          let activeClass = 'bg-gray-100 text-gray-800 dark:bg-gray-850 dark:text-gray-200 border-gray-200';
                          if (isSelected) {
                            if (type === 'calendar') activeClass = 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent';
                            else if (type === 'non-calendar') activeClass = 'bg-cyan-600 hover:bg-cyan-700 text-white border-transparent';
                            else activeClass = 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'; 
                          }
                          
                          return (
                            <button
                              type="button"
                              key={type}
                              onClick={() => setFormData({ ...formData, leave_classification: type as any })}
                              className={`px-4 py-2 text-xs font-bold capitalize border rounded-xl transition-all duration-200 shadow-sm ${
                                isSelected ? activeClass : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* --- 1. UNCATEGORIZED LEAVE TYPE --- */}
                    {formData.leave_classification === 'uncategorized' && (
                      <>
                        <div className="space-y-3 pt-2">
                          {[
                            { key: 'expireLeaveOnDashboard', label: 'Expire Leave On Dashboard' },
                            { key: 'considerLeaveCalendarYear', label: 'Consider Leave Calendar Year' },
                            { key: 'allocateLeaveIfConfirmationDatePresent', label: 'Allocate Leave If Confirmation Date Is Present [For Resigned Status Employees]' },
                            { key: 'noPayment', label: 'No Payment (Unpaid Leave)' },
                            { key: 'excludeLeaveFromSandwichPolicy', label: 'Exclude Leave from Sandwich Policy' },
                          ].map((chk) => (
                            <div key={chk.key} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`uncat-chk-${chk.key}`}
                                checked={(formData.allocation as any)[chk.key]}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, [chk.key]: e.target.checked }
                                })}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor={`uncat-chk-${chk.key}`} className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                                {chk.label}
                              </Label>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50 dark:border-gray-800/80">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Notify Leave Expire Before</span>
                            <Input
                              type="number"
                              placeholder="e.g. 30"
                              value={formData.allocation.notifyLeaveExpireBeforeDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, notifyLeaveExpireBeforeDays: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">days of expiration.</span>
                          </div>
                          
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Request leave within</span>
                            <Input
                              type="number"
                              placeholder="e.g. 15"
                              value={formData.allocation.requestLeaveWithinDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, requestLeaveWithinDays: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-medium">days.</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50 dark:border-gray-800/80 flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="uncat-chk-fnf-limits"
                            checked={formData.allocation.encashmentsSubjectToLimitsFNF}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, encashmentsSubjectToLimitsFNF: e.target.checked }
                            })}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="uncat-chk-fnf-limits" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                            Encashments subject to the limits defined for FNF
                          </Label>
                        </div>
                      </>
                    )}

                    {/* --- 2. CALENDAR LEAVE TYPE --- */}
                    {formData.leave_classification === 'calendar' && (
                      <>
                        <div className="flex items-center flex-wrap gap-3 pt-2">
                          <input
                            type="checkbox"
                            id="considerLeaveStartYearAsFrom"
                            checked={formData.allocation.considerLeaveStartYearAsFrom}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, considerLeaveStartYearAsFrom: e.target.checked }
                            })}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="considerLeaveStartYearAsFrom" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                            Consider Leave Start Year as From
                          </Label>
                        </div>

                        {/* Paid Leave Specific: Entitlement Sub-Panel */}
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entitlement</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-gray-655">Number of Days *</Label>
                              <Input
                                type="number"
                                value={formData.allocation.entitlementDays}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, entitlementDays: e.target.value }
                                })}
                                className="h-9 rounded-lg"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-gray-655 font-medium">Periodicity *</Label>
                              <select
                                value={formData.allocation.entitlementPeriodicity}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, entitlementPeriodicity: e.target.value }
                                })}
                                className="w-full h-9 px-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-lg text-xs font-semibold"
                              >
                                <option value="Select">Select</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Weekly">Weekly</option>
                              </select>
                            </div>
                          </div>

                        </div>

                        <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-gray-800/80">
                          {[
                            { key: 'expireLeaveOnDashboard', label: 'Expire Leave On Dashboard' },
                            { key: 'considerLeaveCalendarYear', label: 'Consider Leave Calendar Year' },
                            { key: 'allocateLeaveIfConfirmationDatePresent', label: 'Allocate Leave If Confirmation Date Is Present [For Resigned Status Employees]' },
                            { key: 'noPayment', label: 'No Payment (Unpaid Leave)' },
                            { key: 'excludeLeaveFromSandwichPolicy', label: 'Exclude Leave from Sandwich Policy' },
                          ].map((chk) => (
                            <div key={chk.key} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`cal-chk-${chk.key}`}
                                checked={(formData.allocation as any)[chk.key]}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, [chk.key]: e.target.checked }
                                })}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor={`cal-chk-${chk.key}`} className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                                {chk.label}
                              </Label>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-55 dark:border-gray-800">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-36">Minimum Service Required</span>
                            <Input
                              type="number"
                              placeholder="e.g. 6"
                              value={formData.allocation.minServiceRequired}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, minServiceRequired: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <select
                              value={formData.allocation.minServiceRequiredUnit}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, minServiceRequiredUnit: e.target.value }
                              })}
                              className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="Select">Select</option>
                              <option value="Months">Months</option>
                              <option value="Days">Days</option>
                              <option value="Years">Years</option>
                            </select>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-28">Gender</span>
                            <select
                              value={formData.allocation.gender}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, gender: e.target.value }
                              })}
                              className="w-full max-w-[200px] h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="All">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 pt-2">
                          <span className="text-xs font-semibold text-gray-655 min-w-36">Minimum Working Days</span>
                          <Input
                            type="number"
                            placeholder="e.g. 240"
                            value={formData.allocation.minWorkingDays}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, minWorkingDays: e.target.value }
                            })}
                            className="w-24 h-9"
                          />
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="chk-initial-date-range"
                              checked={formData.allocation.initialAllocationDateRange}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, initialAllocationDateRange: e.target.checked }
                              })}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-initial-date-range" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                              Initial Leave allocation based on Date Range
                            </Label>
                          </div>
                          
                          {formData.allocation.initialAllocationDateRange && (
                            <div className="space-y-3 pl-7">
                              <div className="flex items-center flex-wrap gap-3">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Consider full month, if date of</span>
                                <select
                                  value={formData.allocation.considerFullMonthIfDateOf}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, considerFullMonthIfDateOf: e.target.value }
                                  })}
                                  className="h-8 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-655"
                                >
                                  <option value="Confirmation">Confirmation</option>
                                  <option value="Joining">Joining</option>
                                </select>
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">is before</span>
                                <Input
                                  type="number"
                                  value={formData.allocation.considerFullMonthBeforeDay}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, considerFullMonthBeforeDay: e.target.value }
                                  })}
                                  className="w-16 text-center h-8"
                                />
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">of the month.</span>
                              </div>

                              <div className="flex items-center flex-wrap gap-3">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Allocate leave before</span>
                                <Input
                                  type="number"
                                  value={formData.allocation.allocateLeaveBeforeDays}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, allocateLeaveBeforeDays: e.target.value }
                                  })}
                                  className="w-16 text-center h-8"
                                />
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">days.</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="chk-round-off"
                              checked={formData.allocation.leaveRoundOff}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, leaveRoundOff: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-round-off" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Leave Round Off
                            </Label>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="chk-allocation-till-resigned"
                              checked={formData.allocation.considerAllocationTillResignedDate}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, considerAllocationTillResignedDate: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-allocation-till-resigned" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Consider leave allocation till resigned date
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 pt-2">
                          <span className="text-xs font-semibold text-gray-655 min-w-36">Expire Leave after</span>
                          <Input
                            type="number"
                            placeholder="e.g. 180"
                            value={formData.allocation.expireLeaveAfterValue}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, expireLeaveAfterValue: e.target.value }
                            })}
                            className="w-20 text-center h-9"
                          />
                          <span className="text-xs font-semibold text-gray-655 font-medium">days from date of credit</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-50 dark:border-gray-800/80">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Notify Leave Expire Before</span>
                            <Input
                              type="number"
                              placeholder="e.g. 30"
                              value={formData.allocation.notifyLeaveExpireBeforeDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, notifyLeaveExpireBeforeDays: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">days of expiration.</span>
                          </div>
                          
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Request leave within</span>
                            <Input
                              type="number"
                              placeholder="e.g. 15"
                              value={formData.allocation.requestLeaveWithinDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, requestLeaveWithinDays: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-medium">days.</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="flex items-center flex-wrap gap-4">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Disable pro-rata allocation</span>
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, disableProRata: !formData.allocation.disableProRata }
                              })}
                              className={`h-7 px-4 text-xs font-bold rounded-lg border transition-all ${
                                formData.allocation.disableProRata
                                  ? 'bg-indigo-650 border-transparent text-white shadow'
                                  : 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-855 dark:text-gray-300'
                              }`}
                            >
                              {formData.allocation.disableProRata ? 'Yes' : 'No'}
                            </button>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Leave Prorata Date Type *</span>
                            <select
                              value={formData.allocation.leaveProrataDateType}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, leaveProrataDateType: e.target.value }
                              })}
                              className="w-full max-w-[200px] h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="Select">Select</option>
                              <option value="Confirmation">Confirmation</option>
                              <option value="Joining">Joining</option>
                            </select>
                            <Input
                              type="number"
                              value={formData.allocation.leaveProrataDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, leaveProrataDays: e.target.value }
                              })}
                              className="w-16 text-center h-8"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">days.</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50 dark:border-gray-800/80 flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="chk-fnf-limits"
                            checked={formData.allocation.encashmentsSubjectToLimitsFNF}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, encashmentsSubjectToLimitsFNF: e.target.checked }
                            })}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="chk-fnf-limits" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                            Encashments subject to the limits defined for FNF
                          </Label>
                        </div>

                        <div className="pt-2 flex items-center flex-wrap gap-4">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Encashment on Prorata Basis</span>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, encashmentOnProrataBasis: !formData.allocation.encashmentOnProrataBasis }
                            })}
                            className={`h-7 px-4 text-xs font-bold rounded-lg border transition-all ${
                              formData.allocation.encashmentOnProrataBasis
                                ? 'bg-indigo-650 border-transparent text-white shadow'
                                : 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-850 dark:text-gray-300'
                            }`}
                          >
                            {formData.allocation.encashmentOnProrataBasis ? 'Yes' : 'No'}
                          </button>
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-4 relative">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Carry Forward and Encashment</p>
                            <span className="text-xs text-gray-400">↑↓</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Maximum encash unit</span>
                              <Input
                                type="number"
                                value={formData.allocation.maxEncashUnit}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, maxEncashUnit: e.target.value }
                                })}
                                className="h-9"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Maximum carry forward unit</span>
                              <Input
                                type="number"
                                value={formData.allocation.maxCarryForwardUnit}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, maxCarryForwardUnit: e.target.value }
                                })}
                                className="h-9"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* --- 3. NON-CALENDAR LEAVE TYPE --- */}
                    {formData.leave_classification === 'non-calendar' && (
                      <>
                        {/* Credit Type Buttons */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Credit Type *</Label>
                          <div className="flex gap-2">
                            {['manual', 'on_request', 'auto'].map((ct) => {
                              const isCtSel = formData.allocation.creditType === ct;
                              let ctClass = isCtSel ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 hover:bg-gray-50';
                              return (
                                <button
                                  type="button"
                                  key={ct}
                                  onClick={() => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, creditType: ct as any }
                                  })}
                                  className={`px-4 py-2 text-xs font-bold capitalize border rounded-xl transition-all duration-200 shadow-sm ${ctClass}`}
                                >
                                  {ct.replace('_', '-')}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Credit Type: Manual / Auto Rule Builder */}
                        {(formData.allocation.creditType === 'manual' || formData.allocation.creditType === 'auto') && (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-850 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 flex-wrap">
                            <span>Day Type</span>
                            <select
                              value={formData.allocation.dayType}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, dayType: e.target.value }
                              })}
                              className="h-8 px-2 bg-white dark:bg-gray-900 border rounded-lg text-xs"
                            >
                              <option value="Week Off">Week Off</option>
                              <option value="Working Day">Working Day</option>
                              <option value="Holiday">Holiday</option>
                            </select>
                            <span>is between</span>
                            <Input
                              type="number"
                              placeholder="Hour(s)"
                              className="w-16 h-8 text-center"
                              value={formData.allocation.hourStart}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, hourStart: e.target.value }
                              })}
                            />
                            <span>Hour(s) and</span>
                            <Input
                              type="number"
                              placeholder="Hour(s)"
                              className="w-16 h-8 text-center"
                              value={formData.allocation.hourEnd}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, hourEnd: e.target.value }
                              })}
                            />
                            <span>Hour(s) then allocate</span>
                            <Input
                              type="number"
                              placeholder="leave(s)"
                              className="w-16 h-8 text-center"
                              value={formData.allocation.allocateLeaves}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, allocateLeaves: e.target.value }
                              })}
                            />
                            <span>leave(s)</span>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {/* Credit Type: On-Request Checkboxes */}
                        {formData.allocation.creditType === 'on_request' && (
                          <div className="space-y-2 pl-2">
                            <div className="flex items-center flex-wrap gap-3">
                              <input
                                type="checkbox"
                                id="chk-working-date-req"
                                checked={formData.allocation.workingDateRequired}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, workingDateRequired: e.target.checked }
                                })}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor="chk-working-date-req" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                Working date required for date
                              </Label>
                            </div>
                            <div className="flex items-center flex-wrap gap-3">
                              <input
                                type="checkbox"
                                id="chk-apply-auto-req"
                                checked={formData.allocation.applyAutoRequestPolicy}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, applyAutoRequestPolicy: e.target.checked }
                                })}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor="chk-apply-auto-req" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                Apply Auto Request Policy on On-Request
                              </Label>
                            </div>
                          </div>
                        )}

                        {/* Non-Calendar Entitlement Box */}
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entitlement</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] font-bold text-gray-650">Number of Days *</Label>
                              <Input
                                type="number"
                                value={formData.allocation.entitlementDays}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, entitlementDays: e.target.value }
                                })}
                                className="h-9 rounded-lg"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5 justify-end">
                              <div className="flex items-center flex-wrap gap-2">
                                <Input
                                  type="text"
                                  className="w-16 h-8 text-xs font-semibold text-center"
                                  value={formData.allocation.entitlementEndTypeVal}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, entitlementEndTypeVal: e.target.value }
                                  })}
                                />
                                <button
                                  type="button"
                                  className="h-8 px-4 text-xs font-bold rounded-lg border bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                >
                                  {formData.allocation.entitlementEndType}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center flex-wrap gap-3">
                              <span className="text-xs font-semibold text-gray-655">Strictly Run Cron On Periodicity Start/End</span>
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, strictCronPeriodicity: !formData.allocation.strictCronPeriodicity }
                                })}
                                className={`h-7 px-4 text-xs font-bold rounded-lg border transition-all ${
                                  formData.allocation.strictCronPeriodicity
                                    ? 'bg-indigo-650 border-transparent text-white'
                                    : 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-850 dark:text-gray-300'
                                }`}
                              >
                                {formData.allocation.strictCronPeriodicity ? 'Yes' : 'No'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <Label className="text-[11px] font-bold text-gray-655 font-medium">No. of times in service *</Label>
                            <Input
                              type="number"
                              value={formData.allocation.noOfTimesInService}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, noOfTimesInService: e.target.value }
                              })}
                              className="h-9"
                            />
                          </div>

                          {formData.allocation.creditType === 'on_request' && (
                            <div className="flex items-center flex-wrap gap-3 pt-2">
                              <input
                                type="checkbox"
                                id="chk-fixed-leave"
                                checked={formData.allocation.fixedLeave}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, fixedLeave: e.target.checked }
                                })}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor="chk-fixed-leave" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                Fixed Leave
                              </Label>
                            </div>
                          )}
                        </div>

                        {/* Standard Checkboxes */}
                        <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-gray-800/80">
                          {[
                            { key: 'expireLeaveOnDashboard', label: 'Expire Leave On Dashboard' },
                            { key: 'considerLeaveCalendarYear', label: 'Consider Leave Calendar Year' },
                            { key: 'allocateLeaveIfConfirmationDatePresent', label: 'Allocate Leave If Confirmation Date Is Present [For Resigned Status Employees]' },
                            { key: 'noPayment', label: 'No Payment (Unpaid Leave)' },
                            { key: 'excludeLeaveFromSandwichPolicy', label: 'Exclude Leave from Sandwich Policy' },
                          ].map((chk) => (
                            <div key={chk.key} className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`non-chk-${chk.key}`}
                                checked={(formData.allocation as any)[chk.key]}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  allocation: { ...formData.allocation, [chk.key]: e.target.checked }
                                })}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <Label htmlFor={`non-chk-${chk.key}`} className="text-xs font-semibold text-gray-700 dark:text-gray-350 cursor-pointer">
                                {chk.label}
                              </Label>
                            </div>
                          ))}
                        </div>

                        {/* Non-Calendar Criteria Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-150 dark:border-gray-800">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-36">Minimum Service Required</span>
                            <Input
                              type="number"
                              placeholder="e.g. 6"
                              value={formData.allocation.minServiceRequired}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, minServiceRequired: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <select
                              value={formData.allocation.minServiceRequiredUnit}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, minServiceRequiredUnit: e.target.value }
                              })}
                              className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="Select">Select</option>
                              <option value="Months">Months</option>
                              <option value="Days">Days</option>
                              <option value="Years">Years</option>
                            </select>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-28">Gender</span>
                            <select
                              value={formData.allocation.gender}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, gender: e.target.value }
                              })}
                              className="w-full max-w-[200px] h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="All">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-36">Marital Status</span>
                            <select
                              value={formData.allocation.maritalStatus}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, maritalStatus: e.target.value }
                              })}
                              className="w-full max-w-[200px] h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                            >
                              <option value="All">All</option>
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Divorced">Divorced</option>
                            </select>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <span className="text-xs font-semibold text-gray-655 min-w-28">Maximum Allowed</span>
                            <Input
                              type="number"
                              value={formData.allocation.maximumAllowed}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, maximumAllowed: e.target.value }
                              })}
                              className="w-full max-w-[200px] h-9"
                            />
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="non-chk-round-off"
                              checked={formData.allocation.leaveRoundOff}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, leaveRoundOff: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="non-chk-round-off" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Leave Round Off
                            </Label>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="chk-weekend-holiday-req"
                              checked={formData.allocation.requestLeaveOnlyOnWeekendAndHoliday}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, requestLeaveOnlyOnWeekendAndHoliday: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-weekend-holiday-req" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Request leave only on Weekend and Holiday
                            </Label>
                          </div>

                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="chk-attendance-exists-req"
                              checked={formData.allocation.requestLeaveOnlyIfAttendanceExists}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, requestLeaveOnlyIfAttendanceExists: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-attendance-exists-req" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Request leave only if Attendance Exists
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 pt-2">
                          <span className="text-xs font-semibold text-gray-655 min-w-36">Expire Leave after</span>
                          <Input
                            type="number"
                            placeholder="e.g. 180"
                            value={formData.allocation.expireLeaveAfterValue}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, expireLeaveAfterValue: e.target.value }
                            })}
                            className="w-20 text-center h-9"
                          />
                          <span className="text-xs font-semibold text-gray-655 font-medium">days from</span>
                          <select
                            value={formData.allocation.expireLeaveAfterBase}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, expireLeaveAfterBase: e.target.value }
                            })}
                            className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                          >
                            <option value="Date of Credit/Approval">Date of Credit/Approval</option>
                            <option value="Joining Date">Joining Date</option>
                            <option value="Confirmation Date">Confirmation Date</option>
                          </select>
                        </div>

                        <div className="flex items-center flex-wrap gap-3 pt-2">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Notify Leave Expire Before</span>
                          <Input
                            type="number"
                            placeholder="e.g. 30"
                            value={formData.allocation.notifyLeaveExpireBeforeDays}
                            onChange={(e) => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, notifyLeaveExpireBeforeDays: e.target.value }
                            })}
                            className="w-20 text-center h-9"
                          />
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-medium">days of expiration.</span>
                        </div>

                        {formData.allocation.creditType === 'on_request' && (
                          <div className="flex items-center flex-wrap gap-3 pt-2">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Request leave within</span>
                            <Input
                              type="number"
                              placeholder="e.g. 15"
                              value={formData.allocation.requestLeaveWithinDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, requestLeaveWithinDays: e.target.value }
                              })}
                              className="w-20 text-center h-9"
                            />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-medium">days.</span>
                          </div>
                        )}

                        <div className="space-y-2 pt-2">
                          <div className="flex items-center flex-wrap gap-3">
                            <input
                              type="checkbox"
                              id="chk-restrict-till-expiry"
                              checked={formData.allocation.restrictLeaveApplicationTillExpiry}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, restrictLeaveApplicationTillExpiry: e.target.checked }
                              })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-restrict-till-expiry" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                              Restrict Leave Application till expiry
                            </Label>
                          </div>

                          {formData.allocation.creditType === 'on_request' && (
                            <>
                              <div className="flex items-center flex-wrap gap-3">
                                <input
                                  type="checkbox"
                                  id="chk-show-from-to-req"
                                  checked={formData.allocation.showFromToDateForRequest}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, showFromToDateForRequest: e.target.checked }
                                  })}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Label htmlFor="chk-show-from-to-req" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                                  Show From date and To date for Request
                                </Label>
                              </div>
                              <div className="flex items-center flex-wrap gap-3">
                                <input
                                  type="checkbox"
                                  id="chk-add-leave-after-approval"
                                  checked={formData.allocation.addLeaveApplicationAfterApproval}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    allocation: { ...formData.allocation, addLeaveApplicationAfterApproval: e.target.checked }
                                  })}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Label htmlFor="chk-add-leave-after-approval" className="text-xs font-semibold text-gray-750 dark:text-gray-355 cursor-pointer">
                                  Add Leave Application after approval of leave request
                                </Label>
                              </div>
                            </>
                          )}

                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="chk-non-fnf-limits"
                              checked={formData.allocation.encashmentsSubjectToLimitsFNF}
                              onChange={(e) => setFormData({
                                ...formData,
                                allocation: { ...formData.allocation, encashmentsSubjectToLimitsFNF: e.target.checked }
                              })}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="chk-non-fnf-limits" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                              Encashments subject to the limits defined for FNF
                            </Label>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center flex-wrap gap-4">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Encashment on Prorata Basis</span>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              allocation: { ...formData.allocation, encashmentOnProrataBasis: !formData.allocation.encashmentOnProrataBasis }
                            })}
                            className={`h-7 px-4 text-xs font-bold rounded-lg border transition-all ${
                              formData.allocation.encashmentOnProrataBasis
                                ? 'bg-indigo-650 border-transparent text-white shadow'
                                : 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-850 dark:text-gray-300'
                            }`}
                          >
                            {formData.allocation.encashmentOnProrataBasis ? 'Yes' : 'No'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                )}
              </div>

              {/* ACCORDION 2: Leave Application Setting */}
              <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-855 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'application' ? null : 'application')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-855/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <FileText className="h-4.5 w-4.5 text-indigo-500" /> Leave Application Setting
                  </span>
                  {expandedAccordion === 'application' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expandedAccordion === 'application' && (
                  <div className="p-6 space-y-6">
                    
                    <div className="flex items-center flex-wrap gap-6">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Category *</span>
                      <div className="flex items-center flex-wrap gap-6">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="category"
                            value="planned"
                            checked={formData.application.category === 'planned'}
                            onChange={() => setFormData({
                              ...formData,
                              application: { ...formData.application, category: 'planned' }
                            })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          Planned
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input
                            type="radio"
                            name="category"
                            value="unplanned"
                            checked={formData.application.category === 'unplanned'}
                            onChange={() => setFormData({
                              ...formData,
                              application: { ...formData.application, category: 'unplanned' }
                            })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          Unplanned
                        </label>
                      </div>
                    </div>

                    {/* Category Conditional Field */}
                    <div className="flex items-center flex-wrap gap-3">
                      {formData.application.category === 'planned' ? (
                        <>
                          <span className="text-xs font-semibold text-gray-750 dark:text-gray-355 min-w-48">Days in advance *</span>
                          <Input
                            type="number"
                            placeholder="e.g. 7"
                            value={formData.application.daysInAdvance}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, daysInAdvance: e.target.value }
                            })}
                            className="w-full max-w-[400px] h-9"
                          />
                          <select
                            value={formData.application.daysInAdvanceUnit}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, daysInAdvanceUnit: e.target.value }
                            })}
                            className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                          >
                            <option value="Days">Days</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Months">Months</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-gray-750 dark:text-gray-355 min-w-48">Grace period for leave application</span>
                          <Input
                            type="number"
                            placeholder="e.g. 7"
                            value={formData.application.gracePeriod}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, gracePeriod: e.target.value }
                            })}
                            className="w-full max-w-[400px] h-9"
                          />
                          <select
                            value={formData.application.gracePeriodUnit}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, gracePeriodUnit: e.target.value }
                            })}
                            className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                          >
                            <option value="Days">Days</option>
                            <option value="Weeks">Weeks</option>
                            <option value="Months">Months</option>
                          </select>
                        </>
                      )}
                    </div>

                    {/* Days Allowed at a Time Sub-Box */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Days Allowed at a Time</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center flex-wrap gap-3">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-20">Minimum</span>
                          <Input
                            type="number"
                            placeholder="Min"
                            value={formData.application.minDaysAllowed}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, minDaysAllowed: e.target.value }
                            })}
                            className="w-full h-9"
                          />
                        </div>
                        <div className="flex items-center flex-wrap gap-3">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-20">Maximum</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={formData.application.maxDaysAllowed}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, maxDaysAllowed: e.target.value }
                            })}
                            className="w-full h-9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remaining Fields */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center flex-wrap gap-3">
                        <span className="text-xs font-semibold text-gray-750 dark:text-gray-355 min-w-48">Gap between leave application</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.application.gapBetweenApplication}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, gapBetweenApplication: e.target.value }
                          })}
                          className="w-full max-w-[200px] h-9"
                        />
                        <select
                          value={formData.application.gapBetweenApplicationUnit}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, gapBetweenApplicationUnit: e.target.value }
                          })}
                          className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                        >
                          <option value="Days">Days</option>
                          <option value="Weeks">Weeks</option>
                          <option value="Months">Months</option>
                        </select>
                        <select
                          value={formData.application.gapBetweenApplicationWindow}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, gapBetweenApplicationWindow: e.target.value }
                          })}
                          className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600"
                        >
                          <option value="This">This</option>
                          <option value="Previous">Previous</option>
                        </select>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <span className="text-xs font-semibold text-gray-755 dark:text-gray-355 min-w-48">Number of times employee can apply</span>
                        <Input
                          type="number"
                          value={formData.application.numTimesEmployeeCanApply}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, numTimesEmployeeCanApply: e.target.value }
                          })}
                          className="w-full max-w-[200px] h-9"
                        />
                        <select
                          value={formData.application.numTimesEmployeeCanApplyUnit}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, numTimesEmployeeCanApplyUnit: e.target.value }
                          })}
                          className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600 w-full max-w-[200px]"
                        >
                          <option value="Select">Select</option>
                          <option value="Month">Per Month</option>
                          <option value="Year">Per Year</option>
                        </select>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <span className="text-xs font-semibold text-gray-755 dark:text-gray-355 min-w-48">Number of leaves employee can apply</span>
                        <Input
                          type="number"
                          value={formData.application.numLeavesEmployeeCanApply}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, numLeavesEmployeeCanApply: e.target.value }
                          })}
                          className="w-full max-w-[200px] h-9"
                        />
                        <select
                          value={formData.application.numLeavesEmployeeCanApplyUnit}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, numLeavesEmployeeCanApplyUnit: e.target.value }
                          })}
                          className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600 w-full max-w-[200px]"
                        >
                          <option value="Select">Select</option>
                          <option value="Month">Per Month</option>
                          <option value="Year">Per Year</option>
                        </select>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <span className="text-xs font-semibold text-gray-755 dark:text-gray-355 min-w-48">
                          Valid Upto<br/><span className="text-[10px] text-gray-400 font-normal">(From date of leave credit)</span>
                        </span>
                        <Input
                          type="number"
                          value={formData.application.validUpto}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, validUpto: e.target.value }
                          })}
                          className="w-full max-w-[200px] h-9"
                        />
                        <select
                          value={formData.application.validUptoUnit}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, validUptoUnit: e.target.value }
                          })}
                          className="h-9 px-2 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-600 w-full max-w-[200px]"
                        >
                          <option value="Select">Select</option>
                          <option value="Months">Months</option>
                          <option value="Years">Years</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-6">
                      <div className="flex items-center flex-wrap gap-3">
                        <input
                          type="checkbox"
                          id="chk-docs"
                          checked={formData.application.supportingDocumentsRequired}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, supportingDocumentsRequired: e.target.checked }
                          })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="chk-docs" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Supporting documents required
                        </Label>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <input
                          type="checkbox"
                          id="chk-ticket"
                          checked={formData.application.allowBookTicket}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, allowBookTicket: e.target.checked }
                          })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="chk-ticket" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Allow to book ticket
                        </Label>
                      </div>
                    </div>

                    {/* Sub-Box: Exclude Weekend & Holiday */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Exclude Weekend & Holiday In Leave Application</p>
                      
                      <div className="flex items-center flex-wrap gap-3">
                        <input
                          type="checkbox"
                          id="chk-ex-weekend"
                          checked={formData.application.excludeWeekend}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, excludeWeekend: e.target.checked }
                          })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="chk-ex-weekend" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Exclude Weekend in Leave Application
                        </Label>
                      </div>

                      <div className="flex items-center flex-wrap gap-3">
                        <input
                          type="checkbox"
                          id="chk-ex-holiday"
                          checked={formData.application.excludeHoliday}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, excludeHoliday: e.target.checked }
                          })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="chk-ex-holiday" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Exclude Holiday in Leave Application
                        </Label>
                      </div>
                    </div>

                    {/* Sub-Box: Restrict leave applying */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Restrict leave applying</p>
                      
                      {[
                        { key: 'restrictBeforeAfterHoliday', label: 'Before or after holiday' },
                        { key: 'restrictBeforeAfterWeekend', label: 'Before or after weekend' },
                        { key: 'restrictBeforeConfirmation', label: 'Before Confirmation' },
                        { key: 'applyLeaveFromThisDate', label: 'Apply Leave from this date' },
                        { key: 'applyInMultipleOfOne', label: 'Apply In Multiple of One' },
                        { key: 'applyLeaveBeforeConfirmationDate', label: 'Apply Leave Before Confirmation Date' },
                        { key: 'applyRestrictionForWeekoffHoliday', label: 'Apply Restriction for WeekOff and Holiday' },
                      ].map((rest) => (
                        <div key={rest.key} className="flex items-center flex-wrap gap-3">
                          <input
                            type="checkbox"
                            id={`chk-rest-${rest.key}`}
                            checked={(formData.application as any)[rest.key]}
                            onChange={(e) => setFormData({
                              ...formData,
                              application: { ...formData.application, [rest.key]: e.target.checked }
                            })}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor={`chk-rest-${rest.key}`} className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                            {rest.label}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Sub-Box: Leave Cancellation */}
                    <div className="p-4 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150 dark:border-gray-800 rounded-xl space-y-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leave Cancellation</p>
                      <div className="flex items-center flex-wrap gap-3">
                        <input
                          type="checkbox"
                          id="chk-cancel-resignation"
                          checked={formData.application.cancelFutureAppliedLeaveOnResignation}
                          onChange={(e) => setFormData({
                            ...formData,
                            application: { ...formData.application, cancelFutureAppliedLeaveOnResignation: e.target.checked }
                          })}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="chk-cancel-resignation" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Cancel future applied leave on resignation request
                        </Label>
                      </div>
                    </div>

                    {/* Custom Hook */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Custom Hook</Label>
                      <textarea
                        value={formData.application.customHook}
                        onChange={(e) => setFormData({
                          ...formData,
                          application: { ...formData.application, customHook: e.target.value }
                        })}
                        placeholder="Write custom validation hooks/functions here..."
                        className="w-full min-h-24 p-3 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 3: Leave Payroll Condition Setting */}
              <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-855 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'payroll' ? null : 'payroll')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-855/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <Clock className="h-4.5 w-4.5 text-rose-500" /> Leave Payroll Condition Setting
                  </span>
                  {expandedAccordion === 'payroll' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expandedAccordion === 'payroll' && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Condition On</Label>
                        <select
                          value={formData.payroll.conditionOn}
                          onChange={(e) => setFormData({
                            ...formData,
                            payroll: { ...formData.payroll, conditionOn: e.target.value }
                          })}
                          className="w-full h-10 px-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-600"
                        >
                          <option value="Choose">Choose</option>
                          <option value="attendance_days">Attendance Days</option>
                          <option value="total_lop_days">Total LOP Days</option>
                          <option value="leave_balance">Current Leave Balance</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Operator</Label>
                        <select
                          value={formData.payroll.operator}
                          onChange={(e) => setFormData({
                            ...formData,
                            payroll: { ...formData.payroll, operator: e.target.value }
                          })}
                          className="w-full h-10 px-3 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-600"
                        >
                          <option value="Choose">Choose</option>
                          <option value="greater_than">Greater Than (&gt;)</option>
                          <option value="less_than">Less Than (&lt;)</option>
                          <option value="equal_to">Equal To (=)</option>
                          <option value="not_equal_to">Not Equal To (!=)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Value1</Label>
                        <Input
                          type="number"
                          value={formData.payroll.value1}
                          onChange={(e) => setFormData({
                            ...formData,
                            payroll: { ...formData.payroll, value1: e.target.value }
                          })}
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Value2</Label>
                        <Input
                          type="number"
                          value={formData.payroll.value2}
                          onChange={(e) => setFormData({
                            ...formData,
                            payroll: { ...formData.payroll, value2: e.target.value }
                          })}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-3 pt-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Consider above condition for</span>
                      <Input
                        type="number"
                        value={formData.payroll.considerMonths}
                        onChange={(e) => setFormData({
                          ...formData,
                          payroll: { ...formData.payroll, considerMonths: e.target.value }
                        })}
                        className="w-20 text-center h-9"
                      />
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">months.</span>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center flex-wrap gap-4">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Reverse above condition</span>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          payroll: { ...formData.payroll, reverseCondition: !formData.payroll.reverseCondition }
                        })}
                        className={`h-7 px-4 text-xs font-bold rounded-lg border transition-all ${
                          formData.payroll.reverseCondition
                            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                            : 'bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-850 dark:text-gray-300'
                        }`}
                      >
                        {formData.payroll.reverseCondition ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ACCORDION 4: Employment Setting For Leave Allocation */}
              <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'employment_alloc' ? null : 'employment_alloc')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-850/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-teal-600" /> Employment Setting For Leave Allocation
                  </span>
                  {expandedAccordion === 'employment_alloc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedAccordion === 'employment_alloc' && (
                  <div className="p-6 space-y-4">
                    {/* Employment Sub-Accordions */}
                    {[
                      { key: 'locations', label: 'Company - Location', info: true },
                      { key: 'departments', label: 'Department' },
                      { key: 'grades', label: 'Grade' },
                      { key: 'employeeTypes', label: 'Employee Type' },
                      { key: 'employeeStatuses', label: 'Employee Status' }
                    ].map((sub) => {
                      const isSubExpanded = expandedAllocSub === sub.key;
                      return (
                        <div key={sub.key} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedAllocSub(isSubExpanded ? null : sub.key)}
                            className="w-full flex items-center justify-between p-3.5 bg-gray-50/40 dark:bg-gray-850/20 text-xs font-semibold text-gray-700 dark:text-gray-300"
                          >
                            <span className="flex items-center flex-wrap gap-2">
                              {isSubExpanded ? '[-]' : '[+]'} {sub.label}
                              {sub.info && <Info className="h-3 w-3 text-indigo-500" />}
                            </span>
                          </button>
                          
                          {isSubExpanded && (
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-3">
                              {sub.key === 'locations' && locations.map(loc => (
                                <label key={loc.id} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_allocation.locations.includes(loc.id)}
                                    onChange={() => handleToggleEmploymentTarget('allocation', 'locations', loc.id)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {loc.locationName || loc.location_name || loc.name}
                                </label>
                              ))}
                              
                              {sub.key === 'departments' && departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_allocation.departments.includes(dept.id)}
                                    onChange={() => handleToggleEmploymentTarget('allocation', 'departments', dept.id)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {dept.name}
                                </label>
                              ))}

                              {sub.key === 'grades' && gradeOptions.map(grd => (
                                <label key={grd} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_allocation.grades.includes(grd)}
                                    onChange={() => handleToggleEmploymentTarget('allocation', 'grades', grd)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {grd}
                                </label>
                              ))}

                              {sub.key === 'employeeTypes' && employeeTypeOptions.map(typ => (
                                <label key={typ} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_allocation.employeeTypes.includes(typ)}
                                    onChange={() => handleToggleEmploymentTarget('allocation', 'employeeTypes', typ)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {typ.replace('_', ' ')}
                                </label>
                              ))}

                              {sub.key === 'employeeStatuses' && employeeStatusOptions.map(stat => (
                                <label key={stat} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_allocation.employeeStatuses.includes(stat)}
                                    onChange={() => handleToggleEmploymentTarget('allocation', 'employeeStatuses', stat)}
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

              {/* ACCORDION 5: Employment Setting For Leave Application */}
              <div className="bg-white dark:bg-gray-900 border border-gray-155 dark:border-gray-855 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'employment_app' ? null : 'employment_app')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-850/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-indigo-600" /> Employment Setting For Leave Application
                  </span>
                  {expandedAccordion === 'employment_app' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedAccordion === 'employment_app' && (
                  <div className="p-6 space-y-4">
                    {/* Employment Sub-Accordions */}
                    {[
                      { key: 'locations', label: 'Company - Location', info: true },
                      { key: 'departments', label: 'Department' },
                      { key: 'grades', label: 'Grade' },
                      { key: 'employeeTypes', label: 'Employee Type' },
                      { key: 'employeeStatuses', label: 'Employee Status' }
                    ].map((sub) => {
                      const isSubExpanded = expandedAppSub === sub.key;
                      return (
                        <div key={sub.key} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedAppSub(isSubExpanded ? null : sub.key)}
                            className="w-full flex items-center justify-between p-3.5 bg-gray-50/40 dark:bg-gray-855/20 text-xs font-semibold text-gray-700 dark:text-gray-300"
                          >
                            <span className="flex items-center flex-wrap gap-2">
                              {isSubExpanded ? '[-]' : '[+]'} {sub.label}
                              {sub.info && <Info className="h-3 w-3 text-indigo-500" />}
                            </span>
                          </button>
                          
                          {isSubExpanded && (
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-3">
                              {sub.key === 'locations' && locations.map(loc => (
                                <label key={loc.id} className="flex items-center gap-2 text-xs font-semibold text-gray-650 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_application.locations.includes(loc.id)}
                                    onChange={() => handleToggleEmploymentTarget('application', 'locations', loc.id)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {loc.locationName || loc.location_name || loc.name}
                                </label>
                              ))}
                              
                              {sub.key === 'departments' && departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_application.departments.includes(dept.id)}
                                    onChange={() => handleToggleEmploymentTarget('application', 'departments', dept.id)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {dept.name}
                                </label>
                              ))}

                              {sub.key === 'grades' && gradeOptions.map(grd => (
                                <label key={grd} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_application.grades.includes(grd)}
                                    onChange={() => handleToggleEmploymentTarget('application', 'grades', grd)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {grd}
                                </label>
                              ))}

                              {sub.key === 'employeeTypes' && employeeTypeOptions.map(typ => (
                                <label key={typ} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_application.employeeTypes.includes(typ)}
                                    onChange={() => handleToggleEmploymentTarget('application', 'employeeTypes', typ)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  {typ.replace('_', ' ')}
                                </label>
                              ))}

                              {sub.key === 'employeeStatuses' && employeeStatusOptions.map(stat => (
                                <label key={stat} className="flex items-center gap-2 text-xs font-semibold text-gray-655 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={formData.employment_application.employeeStatuses.includes(stat)}
                                    onChange={() => handleToggleEmploymentTarget('application', 'employeeStatuses', stat)}
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

              {/* ACCORDION 6: Leave Encashment / Carry Forward */}
              <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedAccordion(expandedAccordion === 'encashment_settings' ? null : 'encashment_settings')}
                  className="w-full flex items-center justify-between p-5 bg-gray-50/50 dark:bg-gray-850/40 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-800 dark:text-gray-100 text-xs uppercase tracking-wider"
                >
                  <span className="flex items-center flex-wrap gap-2">
                    <Calendar className="h-4.5 w-4.5 text-indigo-500" /> Leave Encashment / Carry Forward
                  </span>
                  {expandedAccordion === 'encashment_settings' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                
                {expandedAccordion === 'encashment_settings' && (
                  <div className="p-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={handleOpenAddRule}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                        <Button
                          type="button"
                          onClick={handleOpenDisbursementSettings}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm"
                        >
                          Disbursement Setting
                        </Button>
                      </div>
                    </div>

                    {/* Rules Table */}
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="w-full overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50/70 dark:bg-gray-850/40">
                            <TableRow>
                              <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300">Filter</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300">Carry Fwd Unit</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300">Encash Unit</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300">Max Limit</TableHead>
                              <TableHead className="text-xs font-bold text-gray-700 dark:text-gray-300">Expire After</TableHead>
                              <TableHead className="text-xs font-bold text-gray-750 dark:text-gray-355 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(!formData.encashment?.rules || formData.encashment.rules.length === 0) ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-xs text-gray-400 py-6">
                                  No encashment/carry forward rules configured. Click Add to create one.
                                </TableCell>
                              </TableRow>
                            ) : (
                              formData.encashment.rules.map((rule, idx) => {
                                // Build a filter description based on locations/departments length
                                const locCount = rule.employment?.locations?.length || 0;
                                const deptCount = rule.employment?.departments?.length || 0;
                                const filterText = locCount > 0 || deptCount > 0 
                                  ? `${locCount} Locs, ${deptCount} Depts` 
                                  : '-';
                                  
                                return (
                                  <TableRow key={idx}>
                                    <TableCell className="text-xs font-semibold text-gray-600 dark:text-gray-400">{filterText}</TableCell>
                                    <TableCell className="text-xs font-semibold text-gray-600 dark:text-gray-400">{rule.maxCarryForward || '0'}</TableCell>
                                    <TableCell className="text-xs font-semibold text-gray-600 dark:text-gray-400">{rule.maxEncash || '0'}</TableCell>
                                    <TableCell className="text-xs font-semibold text-gray-600 dark:text-gray-400">{rule.maxLimit || '0'}</TableCell>
                                    <TableCell className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                      {rule.expireAfterDays ? `${rule.expireAfterDays} Days` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditRule(idx)}
                                          className="p-1.5 text-gray-400 hover:text-indigo-650 hover:bg-gray-50 rounded-lg transition-colors"
                                          title="Edit Rule"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRule(idx)}
                                          className="p-1.5 text-gray-400 hover:text-rose-650 hover:bg-gray-50 rounded-lg transition-colors"
                                          title="Delete Rule"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex items-start justify-between">
                <div className="flex flex-col gap-4">
                  {/* Active Switch */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">Active</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                      className="relative w-14 h-6 border border-gray-300 rounded cursor-pointer bg-white overflow-hidden shadow-sm flex items-center transition-all duration-250"
                    >
                      {formData.status === 'active' ? (
                        <div className="w-full h-full flex">
                          <div className="w-7 h-full bg-[#3c8dbc] flex items-center justify-center text-[10px] font-bold text-white">
                            Yes
                          </div>
                          <div className="w-7 h-full bg-white" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex">
                          <div className="w-7 h-full bg-white" />
                          <div className="w-7 h-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-650">
                            No
                          </div>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Update Button */}
                  <Button
                    type="submit"
                    className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs h-9 px-4 rounded shadow-sm flex items-center gap-1 w-fit"
                  >
                    + Update
                  </Button>
                </div>

                <div className="pt-5">
                  <Button
                    type="button"
                    onClick={handleTriggerCron}
                    className="bg-[#3c8dbc] hover:bg-[#357ca5] text-white font-bold text-xs h-8 px-4 rounded shadow-sm flex items-center gap-1"
                  >
                    ▶Run Allocate Leave Cron
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </>
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

          {/* Leave Policies Section */}
          <Card className="border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> Leave Policies
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Manage core policies, earned leave entitlement percentages, and public holiday inclusion rules.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {policies.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No leave policies found.</div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold">Policy Name</TableHead>
                        <TableHead className="text-xs font-bold">Code</TableHead>
                        <TableHead className="text-xs font-bold">Earned Leave Entitlement %</TableHead>
                        <TableHead className="text-xs font-bold">Includes Public Holidays</TableHead>
                        <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs font-bold text-foreground">{p.name}</TableCell>
                          <TableCell className="text-xs font-mono">{p.code}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {p.earned_leave_entitlement_percent !== null && p.earned_leave_entitlement_percent !== undefined
                              ? `${p.earned_leave_entitlement_percent}%`
                              : '100% (Default)'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.entitlement_includes_public_holidays || p.entitlementIncludesPublicHolidays ? (
                              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold dark:bg-green-950/20">Yes</span>
                            ) : (
                              <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded font-medium dark:bg-gray-800/40">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPolicy(p)}>
                              <Edit2 className="w-4 h-4 text-gray-500 hover:text-blue-600" />
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

          {/* Bulk Policy Mappings Section */}
          <Card className="border shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Bulk Leave Policy Mappings
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
                                {!departmentName && !designationName && !employmentType && (
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <select 
                  value={encashmentStatusFilter}
                  onChange={(e) => setEncashmentStatusFilter(e.target.value as any)}
                  className="h-8 px-2 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none text-gray-700 w-24 shrink-0"
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
                    className="h-8 pl-8 text-xs bg-gray-50 border-gray-200 w-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-1 pt-2">
                <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Leave Encashment</span>
                <span className="flex items-center gap-1"><Database className="h-3.5 w-3.5" /> {encashmentsList.length}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/50">
              {encashmentsList.map(enc => (
                <button
                  key={enc.id}
                  onClick={() => setSelectedEncashmentId(enc.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors text-xs font-semibold ${
                    selectedEncashmentId === enc.id 
                      ? 'bg-[#3c8dbc] text-white' 
                      : 'bg-white border border-gray-100 hover:border-blue-300 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 opacity-80" /> {enc.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* RIGHT SIDE: Encashment Form */}
          <div className="flex-1 bg-gray-50/30 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-6 w-6" /> Leave Encashment
                </h1>
              </div>

              {selectedEncashmentId ? (
                <div className="bg-white border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Label className="text-xs font-bold text-gray-700 flex items-center h-10">Leave Encashment Name <span className="text-red-500 ml-1">*</span></Label>
                    <Input 
                      value={encashmentTabForm.name} 
                      onChange={e => setEncashmentTabForm({...encashmentTabForm, name: e.target.value})}
                      className="h-10 text-xs"
                      placeholder="e.g. Leave encashment one"
                    />

                    <Label className="text-xs font-bold text-gray-700 pt-2">Formula <span className="text-red-500 ml-1">*</span></Label>
                    <textarea 
                      value={encashmentTabForm.formula}
                      onChange={e => setEncashmentTabForm({...encashmentTabForm, formula: e.target.value})}
                      className="w-full h-24 p-3 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[#3c8dbc]"
                      placeholder="e.g. [NUMBER_OF_LEAVE] * [PER_DAY_SALARY]"
                    />

                    <Label className="text-xs font-bold text-gray-700 flex items-center h-10">Total Encashment Limit for Last Working Month <span className="text-red-500 ml-1">*</span></Label>
                    <Input 
                      value={encashmentTabForm.limit} 
                      onChange={e => setEncashmentTabForm({...encashmentTabForm, limit: e.target.value})}
                      className="h-10 text-xs"
                      placeholder="Only number (e.g. 100 or 99.99)"
                    />
                  </div>

                  <div className="space-y-3 pt-4">
                    {[
                      { key: 'locations', label: 'Company - Location' },
                      { key: 'departments', label: 'Department' },
                      { key: 'grades', label: 'Grade' },
                      { key: 'employeeTypes', label: 'Employee Type' }
                    ].map((sub: any) => {
                      const isSubExpanded = expandedEncashmentSub === sub.key;
                      return (
                        <div key={sub.key} className="border border-gray-200 bg-gray-100/50 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedEncashmentSub(isSubExpanded ? null : sub.key)}
                            className="w-full flex items-center p-3 text-xs font-bold text-gray-700"
                          >
                            <span className="flex items-center gap-2">
                              {isSubExpanded ? '[-]' : '[+]'} {sub.label}
                            </span>
                          </button>
                          
                          {isSubExpanded && (
                            <div className="p-4 bg-white border-t border-gray-200 grid grid-cols-2 gap-3">
                              {sub.key === 'locations' && locations.map(loc => (
                                <label key={loc.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment.locations.includes(loc.id)}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('locations', loc.id)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  {loc.locationName || loc.location_name || loc.name}
                                </label>
                              ))}
                              
                              {sub.key === 'departments' && departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment.departments.includes(dept.id)}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('departments', dept.id)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  {dept.name}
                                </label>
                              ))}

                              {sub.key === 'grades' && gradeOptions.map(grd => (
                                <label key={grd} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment.grades.includes(grd)}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('grades', grd)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  {grd}
                                </label>
                              ))}

                              {sub.key === 'employeeTypes' && employeeTypeOptions.map(typ => (
                                <label key={typ} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={encashmentTabForm.employment.employeeTypes.includes(typ)}
                                    onChange={() => handleToggleEncashmentEmploymentTarget('employeeTypes', typ)}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  {typ.replace('_', ' ')}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 space-y-1">
                    <span className="text-xs font-bold text-gray-700 block">Active</span>
                    <button
                      type="button"
                      onClick={() => setEncashmentTabForm({...encashmentTabForm, isActive: !encashmentTabForm.isActive})}
                      className="relative w-14 h-7 border border-gray-300 rounded cursor-pointer bg-white overflow-hidden flex items-center transition-all duration-250"
                    >
                      {encashmentTabForm.isActive ? (
                        <div className="w-full h-full flex">
                          <div className="w-8 h-full bg-[#3c8dbc] flex items-center justify-center text-[11px] font-bold text-white">Yes</div>
                          <div className="flex-1 bg-white"></div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex">
                          <div className="flex-1 bg-white"></div>
                          <div className="w-8 h-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500">No</div>
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <Button type="button" className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs px-4 h-9 rounded-sm flex items-center gap-1.5 shadow-none">
                      <Plus className="h-3.5 w-3.5" /> Update
                    </Button>
                    <Button type="button" className="bg-[#dd4b39] hover:bg-[#d73925] text-white font-bold text-xs px-4 h-9 rounded-sm flex items-center gap-1.5 shadow-none">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm font-semibold">Select an encashment rule to edit</p>
                </div>
              )}
            </div>
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
                    try { e.currentTarget.showPicker(); } catch (err) {}
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
                    try { e.currentTarget.showPicker(); } catch (err) {}
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

    </div>
  );
}
