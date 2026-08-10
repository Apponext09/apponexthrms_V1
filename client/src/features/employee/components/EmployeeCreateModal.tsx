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
import { useCreateEmployee, useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { useGrades } from '../../settings/hooks/useGrades';
import { useDesignations } from '../../settings/hooks/useDesignations';
import { useEmployeeTypes } from '../../settings/hooks/useEmployeeTypes';
import { useEmployeeStatuses } from '../../settings/api/useEmployeeStatuses';
import { AlertCircle, UserPlus, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const createEmployeeCode = (nextNum: number = 1) =>
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
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { employeeTypes } = useEmployeeTypes();
  const { employeeStatuses } = useEmployeeStatuses();
  const nextCodeNum = (allEmployees?.length || 0) + 1;

  const [formData, setFormData] = useState({
    employeeCode: createEmployeeCode(nextCodeNum),
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
    accessRole: 'employee',
    password: '',
    confirmPassword: '',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createEmployee, isLoading, error } = useCreateEmployee();
  const { data: departmentsData } = useDepartments(1, 100);
  const { data: gradesData } = useGrades(1, 100);
  const { designations } = useDesignations();
  const departmentEmployees = formData.departmentId
    ? allEmployees.filter((employee: any) =>
        String(employee.currentDepartmentId ?? employee.current_department_id ?? '') === formData.departmentId
      )
    : [];

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
        jobTitle: formData.jobTitle || undefined,
        status: formData.status || 'active',
        accessRole: formData.accessRole,
        avatarUrl: formData.avatarUrl || undefined,
        password: pwd,
      } as any);

      setCreatedCredentials({
        email: formData.email,
        password: response.generatedPassword ?? pwd,
      });
      toast.success('Employee created successfully!');

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
        accessRole: 'employee',
        password: '',
        confirmPassword: '',
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

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 pt-4">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4" style={{ maxHeight: 'calc(90vh - 200px)' }}>
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
                  <div>
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                  </div>
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

                  {/* Department */}
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

                  {/* Grade */}
                  <div>
                    <Label htmlFor="grade">Grade</Label>
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

                  {/* Employment Type */}
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

                  {/* Employee Status */}
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

                  {/* Access Role — controls portal access after login */}
                  <div>
                    <Label htmlFor="accessRole">Role in this organization</Label>
                    <select
                      id="accessRole"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.accessRole}
                      onChange={(e) => setFormData({ ...formData, accessRole: e.target.value })}
                    >
                      <option value="employee">Employee</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="department_head">Manager</option>
                      <option value="hr_manager">HR</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Controls which portal they log into.{' '}
                      <span className="font-medium text-foreground">Department Manager & Team Lead require a department.</span>
                    </p>
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
                      {designations.map((desig) => (
                        <option key={desig.id} value={desig.name}>
                          {desig.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Select from the master designations list.</p>
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
                          <option value="">{formData.departmentId ? '-- No reporting manager yet --' : '-- Select a department first --'}</option>
                          {departmentEmployees.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} ({emp.employeeCode})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">Only people already assigned to this department are listed.</p>
                      </>
                    )}
                  </div>
                </div>
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
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
