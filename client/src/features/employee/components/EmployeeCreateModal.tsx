import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEmployee, useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { useGrades } from '../../settings/hooks/useGrades';
import { useDesignations } from '../../settings/hooks/useDesignations';
import { useEmployeeTypes } from '../../settings/hooks/useEmployeeTypes';
import { useLocations } from '../../settings/hooks/useLocations';
import { useEmployeeStatuses } from '../../settings/api/useEmployeeStatuses';
import {
  AlertCircle,
  UserPlus,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useEmployeeCustomizationStore } from '../store/employeeCustomizationStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { usePolicies } from '@/features/policy/api/usePolicies';

export const createEmployeeCode = (nextNum: number = 1) =>
  `EMP${String(nextNum % 1000).padStart(3, '0')}`;

interface EmployeeCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface MasterFieldInfoProps {
  id?: string;
  fieldName: string;
  category: string;
  masterName: string;
  path: string;
  description?: string;
  onRefresh?: () => Promise<any> | void;
  customUrl?: string;
}

const ActiveInfoContext = React.createContext<{
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}>({
  activeId: null,
  setActiveId: () => {},
});

/**
 * "I" (Info) Button for master-driven and configurable fields.
 * Shows where the field is set/configured in the system with direct navigation & refresh action.
 * Ensures only ONE popover is open at a time across all fields.
 */
function MasterFieldInfo({
  id,
  fieldName,
  category,
  masterName,
  path,
  description,
  onRefresh,
  customUrl,
}: MasterFieldInfoProps) {
  const infoId = id || `${category}_${fieldName}`;
  const { activeId, setActiveId } = React.useContext(ActiveInfoContext);
  const isOpen = activeId === infoId;
  const isHrPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/hr');
  const targetUrl = customUrl || (isHrPortal ? `/hr/masters/${category}` : `/masters/${category}`);
  const [refreshing, setRefreshing] = useState(false);

  const handleOpenMaster = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success(`${masterName} list refreshed!`);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setActiveId(nextOpen ? infoId : null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveId(isOpen ? null : infoId);
          }}
          className={cn(
            "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary ml-1 shrink-0",
            isOpen
              ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
              : "bg-primary/10 hover:bg-primary/25 text-primary"
          )}
          title={`Click to see where to configure ${fieldName}`}
          aria-label={`Configure ${fieldName}`}
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        className="z-[100] w-80 p-3.5 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl space-y-2.5 text-popover-foreground"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-1.5 font-extrabold text-xs text-foreground">
            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-black">
              i
            </span>
            <span>{fieldName} Setup</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="text-muted-foreground hover:text-foreground text-xs p-0.5 rounded-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {description || (
              <>
                Options for this field are populated from Master settings. To configure or add new entries:
              </>
            )}
          </p>
          <div className="p-2 rounded-xl bg-muted/60 border border-border/70 text-[11px] font-semibold text-foreground flex items-center gap-2">
            <span className="text-sm shrink-0">📍</span>
            <span className="font-mono text-[10.5px] text-primary break-all">{path}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border/60">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenMaster}
            className="flex-1 h-7 text-[11px] font-bold gap-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            Open in Master Hub <ExternalLink className="w-3 h-3" />
          </Button>
          {onRefresh && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 text-[11px] font-semibold gap-1 px-2.5 rounded-lg border-border cursor-pointer hover:bg-muted"
              title="Reload options after adding in Master"
            >
              <RotateCcw className={`w-3 h-3 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              Reload
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EmployeeCreateModal({
  open,
  onOpenChange,
  onSuccess,
}: EmployeeCreateModalProps) {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyStore();
  const { config: customConfig, generateEmployeeCode, generatePassword } = useEmployeeCustomizationStore();
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { employeeTypes } = useEmployeeTypes();
  const { employeeStatuses } = useEmployeeStatuses();
  const { data: allOrgPolicies = [] } = usePolicies();
  const nextCodeNum = (allEmployees?.length || 0) + 1;

  const [formData, setFormData] = useState({
    employeeCode: generateEmployeeCode(nextCodeNum),
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employmentType: '',
    status: '',
    reportingManagerId: '',
    avatarUrl: '',
    departmentId: '',
    gradeId: '',
    jobTitle: '',
    locationId: '',
    accessRole: 'employee',
    password: '',
    confirmPassword: '',
    salarySlabId: '',
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'personal' | 'professional'>('basic');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slabs, setSlabs] = useState<any[]>([]);
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const initialCode = generateEmployeeCode(nextCodeNum);
      const initialPwd = customConfig.enableCustomPasswordFormat ? generatePassword() : '';
      setFormData(prev => ({
        ...prev,
        employeeCode: initialCode,
        ...(initialPwd ? { password: initialPwd, confirmPassword: initialPwd } : {})
      }));
      setFieldErrors({});
      setValidationError(null);
      setActiveInfoId(null);

      apiClient.get('/payroll/slabs').then((res: any) => {
        const list = res.data?.data || res.data || [];
        setSlabs(list);
      }).catch(() => {});
    } else {
      setActiveInfoId(null);
    }
  }, [open]);

  const { createEmployee, isLoading, error } = useCreateEmployee();
  const { data: departmentsData } = useDepartments(1, 100);
  const { data: gradesData } = useGrades(1, 100);
  const { designations } = useDesignations();
  const { data: locationsData } = useLocations(1, 100);

  const departmentEmployees = formData.departmentId
    ? (allEmployees || []).filter((employee: any) =>
      String(employee.currentDepartmentId ?? employee.current_department_id ?? '') === formData.departmentId
    )
    : [];

  const departmentManagers = (departmentEmployees.length > 0 ? departmentEmployees : (allEmployees || [])).map((e: any) => ({
    id: e.id,
    name: `${e.firstName || e.first_name || ''} ${e.lastName || e.last_name || ''}`.trim() || e.name || e.email || `Employee #${e.id}`,
    designation: e.designation || e.designation_name || e.role || 'Employee'
  }));

  const handleOpenChange = (openVal: boolean) => {
    if (!openVal) {
      setCreatedCredentials(null);
      setCopied(false);
      setValidationError(null);
      setFieldErrors({});
      setActiveInfoId(null);
    }
    onOpenChange(openVal);
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real-time field change with automatic error clearing
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (validationError) {
      setValidationError(null);
    }
  };

  // Comprehensive Form Validation: ONLY 'reportingManagerId' and 'salarySlabId' are NOT mandatory
  const validateForm = (): { isValid: boolean; errors: Record<string, string>; firstTabWithError: 'basic' | 'personal' | 'professional' | null } => {
    const errors: Record<string, string> = {};
    let firstTabWithError: 'basic' | 'personal' | 'professional' | null = null;

    // ── 1. Basic Info Validations (Mandatory) ──
    if (!formData.employeeCode?.trim()) {
      errors.employeeCode = 'Employee code is required';
      if (!firstTabWithError) firstTabWithError = 'basic';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email?.trim()) {
      errors.email = 'Email address is required';
      if (!firstTabWithError) firstTabWithError = 'basic';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
      if (!firstTabWithError) firstTabWithError = 'basic';
    }

    if (!formData.firstName?.trim()) {
      errors.firstName = 'First name is required';
      if (!firstTabWithError) firstTabWithError = 'basic';
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
      if (!firstTabWithError) firstTabWithError = 'basic';
    }

    const cleanMobile = formData.mobile ? formData.mobile.trim() : '';
    if (!cleanMobile) {
      errors.mobile = 'Mobile number is required';
      if (!firstTabWithError) firstTabWithError = 'basic';
    } else if (!/^[0-9]{10}$/.test(cleanMobile)) {
      errors.mobile = 'Mobile number must be exactly 10 digits';
      if (!firstTabWithError) firstTabWithError = 'basic';
    }

    // ── 2. Personal Info Validations (Mandatory) ──
    if (!formData.gender) {
      errors.gender = 'Gender selection is required';
      if (!firstTabWithError) firstTabWithError = 'personal';
    }

    if (!formData.dateOfJoining) {
      errors.dateOfJoining = 'Date of joining is required';
      if (!firstTabWithError) firstTabWithError = 'personal';
    }

    const pwd = formData.password ? formData.password.trim() : '';
    const confirmPwd = formData.confirmPassword ? formData.confirmPassword.trim() : '';

    if (!pwd) {
      errors.password = 'Password is required';
      if (!firstTabWithError) firstTabWithError = 'personal';
    } else if (pwd.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
      if (!firstTabWithError) firstTabWithError = 'personal';
    }

    if (!confirmPwd) {
      errors.confirmPassword = 'Confirm password is required';
      if (!firstTabWithError) firstTabWithError = 'personal';
    } else if (pwd && confirmPwd && pwd !== confirmPwd) {
      errors.confirmPassword = 'Passwords do not match';
      if (!firstTabWithError) firstTabWithError = 'personal';
    }

    // ── 3. Professional Info Validations (Mandatory except Reports To & Salary Slab) ──
    if (!formData.employmentType) {
      errors.employmentType = 'Employment type is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.departmentId) {
      errors.departmentId = 'Department is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.gradeId) {
      errors.gradeId = 'Grade / Level is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.status) {
      errors.status = 'Employee status is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.jobTitle) {
      errors.jobTitle = 'Designation (Job Title) is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.locationId) {
      errors.locationId = 'Branch / Work location is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (!formData.accessRole) {
      errors.accessRole = 'System access role is required';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    if (['department_head', 'team_lead'].includes(formData.accessRole) && !formData.departmentId) {
      errors.departmentId = 'Select a department before assigning Team Lead or Department Manager access';
      if (!firstTabWithError) firstTabWithError = 'professional';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      firstTabWithError,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const { isValid, errors, firstTabWithError } = validateForm();
    if (!isValid) {
      setFieldErrors(errors);
      if (firstTabWithError) {
        setActiveTab(firstTabWithError);
      }
      const firstMsg = Object.values(errors)[0] || 'Please fill in all mandatory fields';
      setValidationError(firstMsg);
      toast.error(firstMsg);
      return;
    }

    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);

    const pwd = formData.password.trim();

    try {
      const response = await createEmployee({
        ...formData,
        gender: formData.gender || undefined,
        employmentType: formData.employmentType || undefined,
        mobile: formData.mobile || undefined,
        middleName: (formData as any).middleName || undefined,
        phone: (formData as any).phone || undefined,
        reportingManagerId: formData.reportingManagerId ? parseInt(formData.reportingManagerId, 10) : undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        currentGradeId: formData.gradeId ? parseInt(formData.gradeId, 10) : undefined,
        locationId: formData.locationId ? parseInt(formData.locationId, 10) : undefined,
        jobTitle: formData.jobTitle || undefined,
        status: formData.status || 'active',
        accessRole: formData.accessRole,
        avatarUrl: formData.avatarUrl || undefined,
        password: pwd,
        companyId: (customConfig as any)?.companyId || selectedCompanyId || undefined,
      } as any);

      const newEmpId = (response as any)?.id || (response as any)?.data?.id;

      // If a Salary Slab is selected, assign the slab template so it links to Employee Profile Payroll Setting
      if (newEmpId && formData.salarySlabId) {
        try {
          const chosenSlab = slabs.find(s => String(s.id) === String(formData.salarySlabId));
          const defaultMinCtc = Number(chosenSlab?.min_ctc || chosenSlab?.minCtc || 0);
          await apiClient.post('/payroll/structures/assign', {
            employeeId: newEmpId,
            slabId: formData.salarySlabId,
            structureName: chosenSlab?.name || chosenSlab?.slab_name || 'Assigned Salary Slab',
            effectiveFrom: formData.dateOfJoining || new Date().toISOString().slice(0, 10),
            annualCtc: defaultMinCtc,
            grossSalary: Math.round(defaultMinCtc / 12),
            grossMonthly: Math.round(defaultMinCtc / 12),
            baseSalary: Math.round((defaultMinCtc / 12) * 0.5),
            netSalary: Math.round((defaultMinCtc / 12) * 0.9)
          });
        } catch (e) {
          console.error('Failed to link initial slab:', e);
        }
      }

      setCreatedCredentials({
        email: formData.email,
        password: response.generatedPassword ?? pwd,
      });
      toast.success('Employee created successfully!');

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      onSuccess?.();

      setFormData({
        employeeCode: createEmployeeCode(),
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        gender: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        employmentType: '',
        status: '',
        reportingManagerId: '',
        avatarUrl: '',
        departmentId: '',
        gradeId: '',
        jobTitle: '',
        locationId: '',
        accessRole: 'employee',
        password: '',
        confirmPassword: '',
        salarySlabId: '',
      });
      setFieldErrors({});
    } catch (err: any) {
      console.error('Failed to create employee:', err);
      const errorData = err.response?.data?.error;
      let errMsg = 'Failed to create employee';

      if (Array.isArray(errorData?.details) && errorData.details.length > 0) {
        errMsg = errorData.details.map((d: any) => `${d.path?.join('.') || 'Field'}: ${d.message}`).join(', ');
      } else if (errorData?.details?.body && typeof errorData.details.body === 'object') {
        const bodyErrors = errorData.details.body;
        const messages: string[] = [];
        for (const [field, errs] of Object.entries(bodyErrors)) {
          if (Array.isArray(errs)) {
            messages.push(`${field}: ${errs.join(', ')}`);
          } else if (typeof errs === 'string') {
            messages.push(`${field}: ${errs}`);
          }
        }
        if (messages.length > 0) {
          errMsg = messages.join(' | ');
        }
      } else {
        errMsg = errorData?.details?.message || errorData?.message || err.response?.data?.message || 'Failed to create employee';
      }
      setValidationError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab error counts for badges
  const basicErrorCount = ['employeeCode', 'email', 'firstName', 'lastName', 'mobile'].filter(k => !!fieldErrors[k]).length;
  const personalErrorCount = ['gender', 'dateOfJoining', 'password', 'confirmPassword'].filter(k => !!fieldErrors[k]).length;
  const professionalErrorCount = ['employmentType', 'departmentId', 'gradeId', 'status', 'jobTitle', 'locationId', 'accessRole'].filter(k => !!fieldErrors[k]).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <ActiveInfoContext.Provider value={{ activeId: activeInfoId, setActiveId: setActiveInfoId }}>
          {createdCredentials ? (
            <div className="space-y-6 pt-2">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-6 h-6 text-emerald-600 bg-emerald-500/20 p-1 rounded-full" />
                  Employee Created Successfully!
                </DialogTitle>
                <DialogDescription>
                  An employee profile has been created. Use the temporary credentials below to log in.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-muted p-4 rounded-xl space-y-4 border border-border">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Login Email</span>
                  <p className="font-mono text-sm break-all font-medium text-foreground bg-background px-3 py-2 rounded-lg border border-border">{createdCredentials.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Temporary Password</span>
                  <div className="flex gap-2 items-center">
                    <p className="font-mono text-sm flex-1 font-medium text-foreground bg-background px-3 py-2 rounded-lg border border-border tracking-wide">{createdCredentials.password}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleCopyCredentials} variant="outline" className="w-full gap-2 rounded-xl h-10">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Login Credentials
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setCreatedCredentials(null);
                    onSuccess();
                  }}
                  className="w-full rounded-xl h-10 bg-primary"
                >
                  Close & Refresh
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="pb-2 border-b border-border">
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Add New Employee
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Enter details below to create an employee and position them in the organization structure.
                </DialogDescription>
              </DialogHeader>

              {(validationError || error) && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-200 text-xs mt-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{validationError || error}</span>
                </div>
              )}

              {/* Sub Tabs Navigation with Error Badges */}
              <div className="flex border-b border-border mt-2 gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('basic');
                    setActiveInfoId(null);
                  }}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'basic'
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Basic Info
                  {basicErrorCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black shadow-xs">
                      {basicErrorCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('personal');
                    setActiveInfoId(null);
                  }}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'personal'
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>👤</span> Personal Info
                  {personalErrorCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black shadow-xs">
                      {personalErrorCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('professional');
                    setActiveInfoId(null);
                  }}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'professional'
                      ? 'border-primary text-primary font-extrabold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>💼</span> Professional Info
                  {professionalErrorCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black shadow-xs">
                      {professionalErrorCount}
                    </span>
                  )}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 pt-3" noValidate>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                {/* 1. Basic Info Sub Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="employeeCode" className="flex items-center text-xs font-bold text-foreground">
                        Employee Code <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="empCode"
                          fieldName="Employee Code"
                          category="company"
                          masterName="Employee Code Prefix"
                          path="Settings → Company Profile"
                          description="Auto-generated using company sequence prefix. You can edit it manually or configure prefix in Company Profile."
                        />
                      </Label>
                      <Input
                        id="employeeCode"
                        value={formData.employeeCode}
                        onChange={(e) => handleFieldChange('employeeCode', e.target.value)}
                        placeholder="e.g. EMP001"
                        className={cn("mt-1", fieldErrors.employeeCode && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.employeeCode && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.employeeCode}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="flex items-center text-xs font-bold text-foreground">
                        Email Address <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="employee@company.com"
                        className={cn("mt-1", fieldErrors.email && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.email && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.email}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="firstName" className="flex items-center text-xs font-bold text-foreground">
                        First Name <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                        placeholder="e.g. John"
                        className={cn("mt-1", fieldErrors.firstName && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.firstName && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.firstName}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="lastName" className="flex items-center text-xs font-bold text-foreground">
                        Last Name <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                        placeholder="e.g. Doe"
                        className={cn("mt-1", fieldErrors.lastName && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.lastName && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.lastName}</span>
                        </p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="mobile" className="flex items-center text-xs font-bold text-foreground">
                        Mobile Number <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => handleFieldChange('mobile', e.target.value)}
                        placeholder="10-digit mobile number (e.g. 9876543210)"
                        maxLength={10}
                        className={cn("mt-1", fieldErrors.mobile && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.mobile && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.mobile}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Personal Info Sub Tab */}
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="gender" className="flex items-center text-xs font-bold text-foreground">
                        Gender <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <select
                        id="gender"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.gender && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                      >
                        <option value="">-- Select Gender --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {fieldErrors.gender && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.gender}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dateOfJoining" className="flex items-center text-xs font-bold text-foreground">
                        Date of Joining <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <Input
                        id="dateOfJoining"
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={(e) => handleFieldChange('dateOfJoining', e.target.value)}
                        className={cn("mt-1", fieldErrors.dateOfJoining && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                      />
                      {fieldErrors.dateOfJoining && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.dateOfJoining}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password" className="flex items-center text-xs font-bold text-foreground">
                        Password <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={(e) => handleFieldChange('password', e.target.value)}
                          className={cn("pr-10", fieldErrors.password && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          tabIndex={-1}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.password}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="flex items-center text-xs font-bold text-foreground">
                        Confirm Password <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                          className={cn("pr-10", fieldErrors.confirmPassword && "border-red-500 focus-visible:ring-red-500 bg-red-50/15")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          tabIndex={-1}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.confirmPassword}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Professional Info Sub Tab */}
                {activeTab === 'professional' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="employmentType" className="flex items-center text-xs font-bold text-foreground">
                        Employment Type <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="empType"
                          fieldName="Employment Type"
                          category="emp-type"
                          masterName="Employment Type"
                          path="Settings → Masters Hub → Emp. Type"
                          description="Add or configure employment types (e.g. Full-Time, Contract, Intern) in Masters Hub."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['employee_types'] })}
                        />
                      </Label>
                      <select
                        id="employmentType"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.employmentType && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.employmentType}
                        onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                      >
                        <option value="">Select Type...</option>
                        {employeeTypes.map((type) => (
                          <option key={type.id} value={type.name}>{type.name}</option>
                        ))}
                      </select>
                      {fieldErrors.employmentType && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.employmentType}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="department" className="flex items-center text-xs font-bold text-foreground">
                        Department <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="department"
                          fieldName="Department"
                          category="department"
                          masterName="Department"
                          path="Settings → Masters Hub → Department"
                          description="Add or manage organizational departments in Masters Hub (Settings → Masters Hub → Department)."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['departments'] })}
                        />
                      </Label>
                      <select
                        id="department"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.departmentId && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.departmentId}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          const selectedDept = departmentsData?.data?.find((d: any) => String(d.id) === deptId);
                          let nextAccessRole = formData.accessRole;
                          if (selectedDept && (selectedDept.name.toLowerCase() === 'hr' || selectedDept.name.toLowerCase() === 'human resources')) {
                            nextAccessRole = 'hr_manager';
                          }
                          setFormData(prev => ({
                            ...prev,
                            departmentId: deptId,
                            accessRole: nextAccessRole,
                            reportingManagerId: '',
                          }));
                          if (fieldErrors.departmentId) {
                            setFieldErrors(prev => {
                              const next = { ...prev };
                              delete next.departmentId;
                              return next;
                            });
                          }
                        }}
                      >
                        <option value="">-- Select Department --</option>
                        {departmentsData?.data?.map((dept: any) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.departmentId && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.departmentId}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="grade" className="flex items-center text-xs font-bold text-foreground">
                        Grade / Level <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="grade"
                          fieldName="Grade / Level"
                          category="grade"
                          masterName="Grade"
                          path="Settings → Masters Hub → Grade"
                          description="Add or configure employee pay grades, seniority levels, and compensation bands in Masters Hub."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['grades'] })}
                        />
                      </Label>
                      <select
                        id="grade"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.gradeId && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.gradeId}
                        onChange={(e) => handleFieldChange('gradeId', e.target.value)}
                      >
                        <option value="">-- Select Grade --</option>
                        {gradesData?.data?.filter((g: any) => g.status === 'active').map((grade: any) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name} ({grade.code})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.gradeId && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.gradeId}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="employeeStatus" className="flex items-center text-xs font-bold text-foreground">
                        Employee Status <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="empStatus"
                          fieldName="Employee Status"
                          category="employee-status"
                          masterName="Employee Status"
                          path="Settings → Masters Hub → Employee Status"
                          description="Manage custom employee statuses (e.g. Active, On Probation, Notice Period) in Masters Hub."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['employeeStatuses'] })}
                        />
                      </Label>
                      <select
                        id="employeeStatus"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.status && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                      >
                        <option value="">Select Status...</option>
                        {employeeStatuses
                          ?.filter((st: any) => st.status === 'active' || st.isActive === true)
                          .map((st: any) => (
                            <option key={st.id} value={st.name}>{st.name}</option>
                          ))}
                      </select>
                      {fieldErrors.status && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.status}</span>
                        </p>
                      )}
                    </div>

                    {/* Job Title / Designation */}
                    <div>
                      <Label htmlFor="jobTitle" className="flex items-center text-xs font-bold text-foreground">
                        Designation (Job Title) <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="designation"
                          fieldName="Designation"
                          category="designation"
                          masterName="Designation"
                          path="Settings → Masters Hub → Designation"
                          description="Add or manage official job titles and designations in Masters Hub."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['designations'] })}
                        />
                      </Label>
                      <select
                        id="jobTitle"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.jobTitle && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.jobTitle}
                        onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
                      >
                        <option value="">-- Select Designation --</option>
                        {designations.map((desig: any) => (
                          <option key={desig.id} value={desig.name}>
                            {desig.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.jobTitle ? (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.jobTitle}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Select from the master designations list.</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="location" className="flex items-center text-xs font-bold text-foreground">
                        Branch / Work Location <span className="text-red-500 ml-0.5">*</span>
                        <MasterFieldInfo
                          id="location"
                          fieldName="Branch / Work Location"
                          category="location"
                          masterName="Location"
                          path="Settings → Masters Hub → Location"
                          description="Add or configure office branches and physical work locations in Masters Hub."
                          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
                        />
                      </Label>
                      <select
                        id="location"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer",
                          fieldErrors.locationId && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.locationId}
                        onChange={(e) => handleFieldChange('locationId', e.target.value)}
                      >
                        <option value="">-- Select Branch / Location --</option>
                        {locationsData?.data?.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name || loc.location_name || loc.title} {loc.code ? `(${loc.code})` : ''}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.locationId && (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.locationId}</span>
                        </p>
                      )}
                    </div>

                    {/* Access Role — controls portal access after login */}
                    <div className="col-span-2">
                      <Label htmlFor="accessRole" className="flex items-center text-xs font-bold text-foreground">
                        System Access Role <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <select
                        id="accessRole"
                        className={cn(
                          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium mt-1 cursor-pointer",
                          fieldErrors.accessRole && "border-red-500 focus-visible:ring-red-500 bg-red-50/15"
                        )}
                        value={formData.accessRole}
                        onChange={(e) => handleFieldChange('accessRole', e.target.value)}
                      >
                        <option value="employee">Employee (Standard View)</option>
                        <option value="team_lead">Team Lead (Team Portal View)</option>
                        <option value="department_head">Department Head / Manager</option>
                        <option value="hr_manager">HR Manager (HR Portal View)</option>
                        <option value="intern">Intern (Intern Portal View)</option>
                        <option value="consultant">Consultant (Consultant Portal View)</option>
                        <option value="admin">System Administrator</option>
                      </select>
                      {fieldErrors.accessRole ? (
                        <p className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{fieldErrors.accessRole}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Controls which portal they log into.{' '}
                          <span className="font-medium text-foreground">Department Manager & Team Lead require a department.</span>
                        </p>
                      )}

                      {/* Mapped Policy Preview */}
                      {(() => {
                        const targetRole = (formData.accessRole || 'employee').toLowerCase().trim();
                        const expandRoleCodes = (role: string): string[] => {
                          const norm = role.toLowerCase().trim();
                          const set = new Set<string>([norm]);
                          if (['organization_admin', 'org_admin', 'ceo', 'admin'].includes(norm)) {
                            set.add('organization_admin');
                            set.add('org_admin');
                            set.add('ceo');
                            set.add('admin');
                          }
                          if (['hr_manager', 'hr', 'hr_admin', 'support'].includes(norm)) {
                            set.add('hr_manager');
                            set.add('hr');
                            set.add('hr_admin');
                            set.add('support');
                          }
                          if (['department_head', 'manager', 'dept_head', 'dept_manager'].includes(norm)) {
                            set.add('department_head');
                            set.add('manager');
                            set.add('dept_head');
                            set.add('dept_manager');
                          }
                          if (['team_lead', 'teamlead', 'lead'].includes(norm)) {
                            set.add('team_lead');
                            set.add('teamlead');
                            set.add('lead');
                          }
                          set.add('all');
                          return Array.from(set);
                        };

                        const expandedTargetRoles = expandRoleCodes(targetRole);
                        const mappedPolicies = allOrgPolicies.filter((p) => {
                          if (!p.isActive) return false;
                          const roleCodes = p.roleMappings?.map((rm) => rm.roleCode.toLowerCase()) || [];
                          return roleCodes.some((r) => expandedTargetRoles.includes(r));
                        });

                        if (mappedPolicies.length === 0) {
                          return (
                            <div className="mt-2.5 p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                                <span>No mandatory policies currently assigned for this role.</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Role-specific policies can be assigned in Policy & Governance Master settings.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="mt-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-primary">
                              <ShieldCheck className="w-4 h-4" />
                              <span>Applicable Mandatory Policies ({mappedPolicies.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {mappedPolicies.map((p) => (
                                <span
                                  key={p.id}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-card border border-primary/25 text-foreground font-semibold flex items-center gap-1 shadow-2xs"
                                >
                                  {p.title} <span className="text-muted-foreground font-normal">v{p.version}</span>
                                </span>
                              ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              * The new employee will be prompted to acknowledge these policies upon first login.
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Reporting Manager - NOT MANDATORY */}
                    <div className="col-span-2">
                      <Label htmlFor="reportingManager" className="flex items-center text-xs font-bold text-foreground">
                        Reports To <span className="text-xs text-muted-foreground font-normal ml-1.5">(Optional)</span>
                      </Label>
                      {['department_head', 'hr_manager'].includes(formData.accessRole) ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-sm font-medium mt-1">
                          🛡️ <strong>Organization Admin</strong> (Manager & HR roles directly report to the Organization Admin)
                        </div>
                      ) : (
                        <>
                          <select
                            id="reportingManager"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer"
                            value={formData.reportingManagerId}
                            onChange={(e) => handleFieldChange('reportingManagerId', e.target.value)}
                            disabled={!formData.departmentId}
                          >
                            <option value="">-- Select Reporting Manager (Optional) --</option>
                            {departmentManagers.map((mgr: any) => (
                              <option key={mgr.id} value={String(mgr.id)}>
                                {mgr.name} ({mgr.designation || 'Manager'})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {!formData.departmentId ? 'Select department first to see reporting managers.' : 'Optional field: Can be assigned later.'}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Assigned Salary Slab - NOT MANDATORY */}
                    <div className="col-span-2">
                      <Label htmlFor="salarySlabId" className="flex items-center text-xs font-bold text-foreground">
                        Assigned Salary Slab <span className="text-xs text-muted-foreground font-normal ml-1.5">(Optional)</span>
                      </Label>
                      <select
                        id="salarySlabId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 cursor-pointer"
                        value={formData.salarySlabId}
                        onChange={(e) => handleFieldChange('salarySlabId', e.target.value)}
                      >
                        <option value="">-- Select Salary Slab (Optional) --</option>
                        {slabs.map((s: any) => (
                          <option key={s.id} value={String(s.id)}>
                            🏷️ {s.name || s.slab_name} {s.min_ctc ? `(₹${(Number(s.min_ctc) / 100000).toFixed(1)}L - ₹${(Number(s.max_ctc || 10000000) / 100000).toFixed(1)}L CTC)` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional: Select the salary slab template. CTC amount and component breakdown can be configured in Employee Profile &rarr; Payroll Setting.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || isSubmitting}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || isSubmitting}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {isLoading || isSubmitting ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </>
        )}
        </ActiveInfoContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
