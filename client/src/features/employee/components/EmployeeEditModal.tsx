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
import { useUpdateEmployee, useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { useEmployeeTypes } from '../../settings/hooks/useEmployeeTypes';
import { AlertCircle, Edit2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const updateEmployeeCode = () =>
  `EMP${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

interface EmployeeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  employee?: any;
}

export function EmployeeEditModal({
  open,
  onOpenChange,
  onSuccess,
  employee,
}: EmployeeEditModalProps) {
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employmentType: '',
    reportingManagerId: '',
    avatarUrl: '',
    departmentId: '',
    jobTitle: '',
    accessRole: 'employee',
    password: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    if (employee && open) {
      setFormData({
        employeeCode: employee.employeeCode || employee.employee_code || '',
        firstName: employee.firstName || employee.first_name || '',
        lastName: employee.lastName || employee.last_name || '',
        email: employee.email || '',
        mobile: employee.mobile || '',
        dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
        employmentType: employee.employmentType || employee.employment_type || '',
        reportingManagerId: employee.reportingManagerId ? String(employee.reportingManagerId) : '',
        avatarUrl: employee.avatarUrl || '',
        departmentId: employee.currentDepartmentId ? String(employee.currentDepartmentId) : '',
        jobTitle: employee.designation?.name || '',
        accessRole: employee.user?.role?.code || 'employee',
        password: '',
        confirmPassword: '',
      });
    }
  }, [employee, open]);


  const [createdCredentials, setCreatedCredentials] = useState<{ email?: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updateEmployee, isLoading, error } = useUpdateEmployee(employee?.id || 0);
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);
  const { employeeTypes } = useEmployeeTypes();
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

    
    const payload: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      mobile: formData.mobile || null,
      dateOfJoining: formData.dateOfJoining,
      employmentType: formData.employmentType,
      departmentId: formData.departmentId ? Number(formData.departmentId) : null,
      jobTitle: formData.jobTitle || undefined,
      reportingManagerId: formData.reportingManagerId ? Number(formData.reportingManagerId) : null,
      accessRole: formData.accessRole,
    };
    try {
      setIsSubmitting(true);
      await updateEmployee(payload);
      toast.success('Employee updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch(err: any) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to update');
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
                <Edit2 className="w-5 h-5 text-primary" />
                Edit Employee
              </DialogTitle>
              <DialogDescription>
                Update employee details below.
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
                      id="employeeCode" readOnly disabled className="bg-muted text-muted-foreground" value={formData.employeeCode}
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

                  {/* Job Title */}
                  <div>
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Sales Executive, HR Manager, Software Engineer"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Job titles are saved under the selected department.</p>
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
