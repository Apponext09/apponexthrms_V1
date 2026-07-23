import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useEmployees, useUpdateEmployee } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import type { Employee } from '@/types';

interface EmployeeBasicInfoProps {
  employee: Employee;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

function titleCase(value?: string | null): string {
  if (!value) return '-';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInputDate(value: any): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

// Colored badge component for status/type fields
function InfoBadge({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
  const color = colorMap[value] || 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${color}`}>
      {titleCase(value) || '—'}
    </span>
  );
}

const employmentTypeColors: Record<string, string> = {
  full_time: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  part_time: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  contract: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  internship: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  inactive: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  on_leave: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
};

const roleColors: Record<string, string> = {
  hr_manager: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  department_head: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  team_lead: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
  employee: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export function EmployeeBasicInfo({ employee }: EmployeeBasicInfoProps) {
  const { updateEmployee, isLoading: isSaving } = useUpdateEmployee(employee.id as number);
  const { employees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<Partial<Employee> & { password?: string; confirmPassword?: string; jobTitle?: string; accessRole?: string }>({});

  useEffect(() => {
    setForm({
      ...(employee || {}),
      password: '',
      confirmPassword: '',
      jobTitle: (employee as any).jobTitle || '',
      accessRole: (employee as any).accessRole || 'employee',
    });
  }, [employee]);

  const handleSave = async () => {
    // Only validate password if the user intentionally typed a new one
    const newPassword = form.password?.trim() || '';
    const confirmPwd = form.confirmPassword?.trim() || '';
    if (newPassword) {
      if (newPassword.length < 6) {
        showToast.error('Password must be at least 6 characters long');
        return;
      }
      if (!confirmPwd) {
        showToast.error('Please enter the confirm password to change it');
        return;
      }
      if (newPassword !== confirmPwd) {
        showToast.error('Passwords do not match — please re-enter both fields');
        return;
      }
    }

    if (['department_head', 'team_lead'].includes(form.accessRole || '') && !form.currentDepartmentId) {
      showToast.error('Select a department before assigning Team Lead or Department Manager access');
      return;
    }

    try {
      const formattedDob = form.dateOfBirth ? formatInputDate(form.dateOfBirth) : null;
      const formattedDoj = form.dateOfJoining ? formatInputDate(form.dateOfJoining) : undefined;

      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || null,
        email: form.email,
        mobile: form.mobile || null,
        dateOfBirth: formattedDob === '' ? null : formattedDob,
        gender: form.gender || null,
        nationality: form.nationality || null,
        bloodGroup: form.bloodGroup || null,
        dateOfJoining: formattedDoj === '' ? undefined : formattedDoj,
        employmentType: form.employmentType || 'full_time',
        departmentId: form.currentDepartmentId ? Number(form.currentDepartmentId) : null,
        employeeCode: form.employeeCode,
        reportingManagerId: form.reportingManagerId ? Number(form.reportingManagerId) : null,
        avatarUrl: form.avatarUrl || null,
        status: form.status || 'active',
        jobTitle: form.jobTitle || null,
        accessRole: form.accessRole || 'employee',
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      await updateEmployee(payload);
      showToast.success('Employee basic information saved');
      // Clear password fields after save
      setForm((prev: any) => ({ ...prev, password: '', confirmPassword: '' }));
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      showToast.error(err.response?.data?.message || 'Failed to save basic details');
    }
  };

  const handleCancel = () => {
    setForm({
      ...(employee || {}),
      password: '',
      confirmPassword: '',
      jobTitle: (employee as any).jobTitle || '',
      accessRole: (employee as any).accessRole || 'employee',
    });
    setIsEditing(false);
  };

  // Find department name for display
  const departmentName = departmentsData?.data?.find(
    (d: any) => d.id === employee.currentDepartmentId
  )?.name || '-';

  const accessRole = (employee as any).accessRole;
  const jobTitle = (employee as any).jobTitle;
  const reportingManagerName =
    (employee as any).reportingManagerName ||
    (employee.reportingManager
      ? `${(employee.reportingManager as any).firstName || ''} ${(employee.reportingManager as any).lastName || ''}`.trim()
      : '-');

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Employee personal and employment details</CardDescription>
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCancel} disabled={isSaving}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* ─── EDIT MODE ─── */}
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="employeeCode">Employee Code *</Label>
              <Input id="employeeCode" value={form.employeeCode || ''} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={formatInputDate(form.dateOfBirth)} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value as any })}>
                <option value="">-- Select Gender --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <select id="nationality" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.nationality || ''} onChange={(e) => setForm({ ...form, nationality: e.target.value })}>
                <option value="">-- Select Nationality --</option>
                <option value="Indian">Indian</option>
                <option value="American">American</option>
                <option value="British">British</option>
                <option value="Canadian">Canadian</option>
                <option value="Australian">Australian</option>
                <option value="Singaporean">Singaporean</option>
                <option value="German">German</option>
                <option value="French">French</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <select id="bloodGroup" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.bloodGroup || ''} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                <option value="">-- Select Blood Group --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining *</Label>
              <Input id="dateOfJoining" type="date" value={formatInputDate(form.dateOfJoining)} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="employmentType">Employment Type</Label>
              <select id="employmentType" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.employmentType || 'full_time'} onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select id="department" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.currentDepartmentId || ''} onChange={(e) => setForm({ ...form, currentDepartmentId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">-- Select Department --</option>
                {departmentsData?.data?.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="reportingManager">Reports To</Label>
              <select id="reportingManager" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={form.reportingManagerId || ''} onChange={(e) => setForm({ ...form, reportingManagerId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">-- No reporting manager --</option>
                {employees.filter((item: any) => item.id !== employee.id).map((item: any) => (
                  <option key={item.id} value={item.id}>{item.firstName} {item.lastName} ({item.employeeCode})</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="probation">Probation</option>
                <option value="onboarding">Onboarding</option>
                <option value="notice">Notice</option>
                <option value="exit">Exit</option>
                <option value="alumni">Alumni</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>
            <div>
              <Label htmlFor="accessRole">Access Role</Label>
              <select id="accessRole" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1" value={form.accessRole || 'employee'} onChange={(e) => setForm({ ...form, accessRole: e.target.value })}>
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="department_head">Manager</option>
                <option value="hr_manager">HR</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" value={form.jobTitle || ''} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} className="mt-1" placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <Label htmlFor="avatarUrl">Profile Photo URL</Label>
              <Input id="avatarUrl" value={form.avatarUrl || ''} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Change Password (optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Leave blank to keep current"
                      value={form.password || ''}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={form.confirmPassword || ''}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
              <p className="text-[11px] text-muted-foreground mt-1.5">🔒 Leave both fields empty to keep the current password unchanged.</p>
            </div>
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="space-y-6">

            {/* Identity */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
                Identity
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Employee Code</p>
                  <p className="mt-0.5 text-sm font-mono font-semibold text-foreground">{formatValue(employee.employeeCode)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">First Name</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(employee.firstName)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last Name</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(employee.lastName)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Gender</p>
                  <p className="mt-0.5 text-sm text-foreground">{titleCase(employee.gender)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Date of Birth</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatDate(employee.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nationality</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(employee.nationality)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Blood Group</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(employee.bloodGroup)}</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
                Contact
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="mt-0.5 text-sm text-foreground break-all">{formatValue(employee.email)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Mobile Number</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(employee.mobile)}</p>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
                Employment
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Date of Joining</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatDate(employee.dateOfJoining)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Employment Type</p>
                  <div className="mt-1">
                    <InfoBadge value={employee.employmentType || ''} colorMap={employmentTypeColors} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="mt-1">
                    <InfoBadge value={employee.status || ''} colorMap={statusColors} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Job Title</p>
                  <p className="mt-0.5 text-sm text-foreground">{formatValue(jobTitle)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Access Role</p>
                  <div className="mt-1">
                    <InfoBadge value={accessRole || 'employee'} colorMap={roleColors} />
                  </div>
                </div>
              </div>
            </div>

            {/* Organization */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pb-1 border-b border-border">
                Organization
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Department</p>
                  <p className="mt-0.5 text-sm text-foreground">{departmentName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reports To</p>
                  <p className="mt-0.5 text-sm text-foreground">{reportingManagerName || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Profile Photo</p>
                  {employee.avatarUrl ? (
                    <a
                      href={employee.avatarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 text-xs text-primary underline underline-offset-2 break-all"
                    >
                      View Photo
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
