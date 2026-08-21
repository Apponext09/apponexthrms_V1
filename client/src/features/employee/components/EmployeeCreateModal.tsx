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
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEmployee, useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { useGrades } from '../../settings/hooks/useGrades';
import { useDesignations } from '../../settings/hooks/useDesignations';
import { useEmployeeTypes } from '../../settings/hooks/useEmployeeTypes';
import { useLocations } from '../../settings/hooks/useLocations';
import { useEmployeeStatuses } from '../../settings/api/useEmployeeStatuses';
import { AlertCircle, UserPlus, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useEmployeeCustomizationStore } from '../store/employeeCustomizationStore';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export const createEmployeeCode = (nextNum: number = 1) =>
  `EMP${String(nextNum % 1000).padStart(3, '0')}`;

interface EmployeeCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slabs, setSlabs] = useState<any[]>([]);

  React.useEffect(() => {
    if (open) {
      const initialCode = generateEmployeeCode(nextCodeNum);
      const initialPwd = customConfig.enableCustomPasswordFormat ? generatePassword() : '';
      setFormData(prev => ({
        ...prev,
        employeeCode: initialCode,
        ...(initialPwd ? { password: initialPwd, confirmPassword: initialPwd } : {})
      }));

      apiClient.get('/payroll/slabs').then((res: any) => {
        const list = res.data?.data || res.data || [];
        setSlabs(list);
      }).catch(() => {});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      const msg = 'Please enter a valid email address';
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    if (formData.mobile) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(formData.mobile)) {
        const msg = 'Mobile number must be exactly 10 digits';
        setValidationError(msg);
        toast.error(msg);
        return;
      }
    }

    const pwd = formData.password ? formData.password.trim() : '';
    const confirmPwd = formData.confirmPassword ? formData.confirmPassword.trim() : '';

    if (!pwd) {
      const msg = 'Password is required';
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (pwd.length < 6) {
      const msg = 'Password must be at least 6 characters long';
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (pwd !== confirmPwd) {
      const msg = 'Passwords do not match';
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (['department_head', 'team_lead'].includes(formData.accessRole) && !formData.departmentId) {
      const msg = 'Select a department before assigning Team Lead or Department Manager access';
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    if (isSubmitting || isLoading) return;
    setIsSubmitting(true);

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
      toast.success('Employee created & Salary Slab linked successfully!');

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        {createdCredentials ? (
          <div className="space-y-6 pt-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success-foreground">
                <Check className="w-6 h-6 text-success bg-success/20 p-1 rounded-full" />
                Employee Created Successfully!
              </DialogTitle>
              <DialogDescription>
                An employee profile has been created. Use the temporary credentials below to log in.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-muted p-4 rounded-lg space-y-4 border">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Login Email</span>
                <p className="font-mono text-sm break-all font-medium text-foreground bg-background px-3 py-2 rounded border">{createdCredentials.email}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Temporary Password</span>
                <div className="flex gap-2 items-center">
                  <p className="font-mono text-sm flex-1 font-medium text-foreground bg-background px-3 py-2 rounded border tracking-wide">{createdCredentials.password}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleCopyCredentials} variant="outline" className="w-full gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
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
                className="w-full"
              >
                Close & Refresh
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="pb-2 border-b">
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add New Employee
              </DialogTitle>
              <DialogDescription>
                Enter details below to create an employee and position them in the organization structure.
              </DialogDescription>
            </DialogHeader>

            {(validationError || error) && (
              <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-200 text-sm mt-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{validationError || error}</span>
              </div>
            )}

            {/* Sub Tabs Navigation */}
            <div className="flex border-b border-border mt-2 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'basic'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'personal'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                👤 Personal Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('professional')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'professional'
                    ? 'border-primary text-primary font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                💼 Professional Info
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                {/* 1. Basic Info Sub Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="employeeCode">Employee Code *</Label>
                      <Input
                        id="employeeCode"
                        required
                        value={formData.employeeCode}
                        onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="mobile">Mobile Number *</Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* 2. Personal Info Sub Tab */}
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="">-- Select Gender --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                      <Input
                        id="dateOfJoining"
                        type="date"
                        required
                        value={formData.dateOfJoining}
                        onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pr-10"
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
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pr-10"
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
                    </div>
                  </div>
                )}

                {/* 3. Professional Info Sub Tab */}
                {activeTab === 'professional' && (
                  <div className="grid grid-cols-2 gap-4 pb-2">
                    <div>
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <select
                        id="employmentType"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      >
                        <option value="">Select Type...</option>
                        {employeeTypes.map((type) => (
                          <option key={type.id} value={type.name}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <select
                        id="department"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.departmentId}
                        onChange={(e) => {
                          const deptId = e.target.value;
                          const selectedDept = departmentsData?.data?.find((d: any) => String(d.id) === deptId);
                          let nextAccessRole = formData.accessRole;
                          if (selectedDept && (selectedDept.name.toLowerCase() === 'hr' || selectedDept.name.toLowerCase() === 'human resources')) {
                            nextAccessRole = 'hr_manager';
                          }
                          setFormData({
                            ...formData,
                            departmentId: deptId,
                            accessRole: nextAccessRole,
                            reportingManagerId: '',
                          });
                        }}
                      >
                        <option value="">-- Select Department --</option>
                        {departmentsData?.data?.map((dept: any) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="grade">Grade / Level</Label>
                      <select
                        id="grade"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.gradeId}
                        onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                      >
                        <option value="">-- Select Grade --</option>
                        {gradesData?.data?.filter((g: any) => g.status === 'active').map((grade: any) => (
                          <option key={grade.id} value={grade.id}>
                            {grade.name} ({grade.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="employeeStatus">Employee Status</Label>
                      <select
                        id="employeeStatus"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="">Select Status...</option>
                        {employeeStatuses
                          ?.filter((st: any) => st.status === 'active' || st.isActive === true)
                          .map((st: any) => (
                            <option key={st.id} value={st.name}>{st.name}</option>
                          ))}
                      </select>
                    </div>

                    {/* Job Title / Designation */}
                    <div>
                      <Label htmlFor="jobTitle">Designation (Job Title)</Label>
                      <select
                        id="jobTitle"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      >
                        <option value="">-- Select Designation --</option>
                        {designations.map((desig: any) => (
                          <option key={desig.id} value={desig.name}>
                            {desig.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Select from the master designations list.</p>
                    </div>

                    <div>
                      <Label htmlFor="location">Branch / Work Location</Label>
                      <select
                        id="location"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.locationId}
                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      >
                        <option value="">-- Select Branch / Location --</option>
                        {locationsData?.data?.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name || loc.location_name || loc.title} {loc.code ? `(${loc.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Access Role — controls portal access after login */}
                    <div className="col-span-2">
                      <Label htmlFor="accessRole">System Access Role</Label>
                      <select
                        id="accessRole"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
                        value={formData.accessRole}
                        onChange={(e) => setFormData({ ...formData, accessRole: e.target.value })}
                      >
                        <option value="employee">Employee (Standard View)</option>
                        <option value="team_lead">Team Lead (Team Portal View)</option>
                        <option value="department_head">Department Head / Manager</option>
                        <option value="hr_manager">HR Manager (HR Portal View)</option>
                        <option value="admin">System Administrator</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Controls which portal they log into.{' '}
                        <span className="font-medium text-foreground">Department Manager & Team Lead require a department.</span>
                      </p>
                    </div>

                    {/* Reporting Manager */}
                    <div className="col-span-2">
                      <Label htmlFor="reportingManager">Reports To</Label>
                      {['department_head', 'hr_manager'].includes(formData.accessRole) ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-900 dark:text-amber-200 text-sm font-medium">
                          🛡️ <strong>Organization Admin</strong> (Manager & HR roles directly report to the Organization Admin)
                        </div>
                      ) : (
                        <>
                          <select
                            id="reportingManager"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.reportingManagerId}
                            onChange={(e) => setFormData({ ...formData, reportingManagerId: e.target.value })}
                            disabled={!formData.departmentId}
                          >
                            <option value="">-- Select Reporting Manager --</option>
                            {departmentManagers.map((mgr: any) => (
                              <option key={mgr.id} value={String(mgr.id)}>
                                {mgr.name} ({mgr.designation || 'Manager'})
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    {/* Assigned Salary Slab (Slab Template Only - No CTC needed here) */}
                    <div className="col-span-2">
                      <Label htmlFor="salarySlabId">Assigned Salary Slab</Label>
                      <select
                        id="salarySlabId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                        value={formData.salarySlabId}
                        onChange={(e) => setFormData({ ...formData, salarySlabId: e.target.value })}
                      >
                        <option value="">-- Select Salary Slab (Optional) --</option>
                        {slabs.map((s: any) => (
                          <option key={s.id} value={String(s.id)}>
                            🏷️ {s.name || s.slab_name} {s.min_ctc ? `(₹${(Number(s.min_ctc) / 100000).toFixed(1)}L - ₹${(Number(s.max_ctc || 10000000) / 100000).toFixed(1)}L CTC)` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select the salary slab template. CTC amount and component breakdown will be configured in Employee Profile &rarr; Payroll Setting.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading || isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || isSubmitting}>
                  {isLoading || isSubmitting ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </form >
          </>
        )}
      </DialogContent >
    </Dialog >
  );
}
