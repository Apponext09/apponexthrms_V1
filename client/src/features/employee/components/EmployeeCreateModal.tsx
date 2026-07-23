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
import { AlertCircle, UserPlus, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

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
  const [formData, setFormData] = useState({
    employeeCode: `EMP${Math.floor(100 + Math.random() * 900)}`,
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employmentType: 'full_time',
    reportingManagerId: '',
    avatarUrl: '',
    departmentId: '',
    password: '',
    confirmPassword: '',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { createEmployee, isLoading, error } = useCreateEmployee();
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);

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

    if (!formData.password) {
      const msg = 'Password is required';
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (formData.password.length < 6) {
      const msg = 'Password must be at least 6 characters long';
      setValidationError(msg);
      toast.error(msg);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match';
      setValidationError(msg);
      toast.error(msg);
      return;
    }

    try {
      const result = await createEmployee({
        ...formData,
        reportingManagerId: formData.reportingManagerId ? parseInt(formData.reportingManagerId, 10) : undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        avatarUrl: formData.avatarUrl || undefined,
        password: formData.password,
      } as any);

      toast.success('Employee created successfully!');
      if (result && result.data) {
        setCreatedCredentials({
          email: result.data.email,
          password: formData.password,
        });
      }

      setFormData({
        employeeCode: `EMP${Math.floor(100 + Math.random() * 900)}`,
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        employmentType: 'full_time',
        reportingManagerId: '',
        avatarUrl: '',
        departmentId: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Failed to create employee:', err);
      const errorData = err.response?.data?.error;
      const errMsg = errorData?.details?.message || errorData?.message || err.response?.data?.message || 'Failed to create employee';
      setValidationError(errMsg);
      toast.error(errMsg);
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
                      onChange={(e) =>
                        setFormData({ ...formData, employeeCode: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                    <Input
                      id="dateOfJoining"
                      type="date"
                      required
                      value={formData.dateOfJoining}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfJoining: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      required
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <select
                      id="department"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
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
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <select
                      id="employmentType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.employmentType}
                      onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>

                  {/* Reporting Manager Selection */}
                  <div className="col-span-2">
                    <Label htmlFor="reportingManager">Reporting Manager (Org Hierarchy)</Label>
                    <select
                      id="reportingManager"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formData.reportingManagerId}
                      onChange={(e) => setFormData({ ...formData, reportingManagerId: e.target.value })}
                    >
                      <option value="">-- No Manager (Reports to Root/Company Admin) --</option>
                      {allEmployees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Profile Photo URL Optional */}
                  <div className="col-span-2">
                    <Label htmlFor="avatarUrl">Profile Photo URL (Optional)</Label>
                    <Input
                      id="avatarUrl"
                      placeholder="https://example.com/photo.jpg"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You can also upload a photo anytime directly on the employee's profile page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
