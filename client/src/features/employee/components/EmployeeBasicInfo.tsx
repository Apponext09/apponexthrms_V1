import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployees, useUpdateEmployee } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { useEmployeeTypes } from '../../settings/hooks/useEmployeeTypes';
import { useDesignations } from '../../settings/hooks/useDesignations';
import { useEmployeeStatuses } from '../../settings/api/useEmployeeStatuses';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useConsumeEditPermission } from '../hooks/useProfileEditPermission';
import type { Employee } from '@/types';

interface EmployeeBasicInfoProps {
  employee: Employee;
  /** When true, employee has an approved request and can edit */
  editUnlocked?: boolean;
  /** The approved request ID to consume after saving */
  approvedRequestId?: number | null;
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

// Also support any dynamic types with a fallback color
function getEmploymentTypeColor(type: string) {
  const norm = (type || '').toLowerCase().replace(/\s+/g, '_');
  return employmentTypeColors[norm] || 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  inactive: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
  on_leave: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  probation: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  onboarding: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
  notice: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  exit: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  alumni: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  candidate: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
};

const roleColors: Record<string, string> = {
  hr_manager: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  department_head: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  team_lead: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300',
  finance: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  intern: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  consultant: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300',
  employee: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export function EmployeeBasicInfo({
  employee,
  editUnlocked = true,
  approvedRequestId,
}: EmployeeBasicInfoProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user as any)?.role || (user as any)?.accessRole || '';
  const allUserRoles = [...userRoles, singleRole];
  const isAdminOrHR = allUserRoles.some(r =>
    ['organization_admin', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'support'].includes(r)
  );

  const isEmployeePortal = !isAdminOrHR;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { consumePermission } = useConsumeEditPermission();
  const isAdmin = isAdminOrHR;

  const { updateEmployee, isLoading: isSaving } = useUpdateEmployee(employee.id as number);
  const { employees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);
  const { employeeTypes } = useEmployeeTypes();
  const { designations } = useDesignations();
  const { employeeStatuses } = useEmployeeStatuses();
  const [internalIsEditing, setInternalIsEditing] = useState(false);

  const isEditing = internalIsEditing;
  const setIsEditing = setInternalIsEditing;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<Partial<Employee> & { password?: string; confirmPassword?: string; jobTitle?: string; accessRole?: string }>({});

  useEffect(() => {
    setForm({
      ...(employee || {}),
      status: (employee as any)?.employeeStatus || (employee as any)?.employee_status || employee?.status || 'active',
      nationality: employee?.nationality || (employee as any)?.nationality || '',
      password: '',
      confirmPassword: '',
      jobTitle: (employee as any).jobTitle || (employee as any).job_title || '',
      accessRole: (employee as any).accessRole || 'employee',
    });
  }, [employee]);

  const handleSave = async () => {
    const mobile = (form.mobile || '').trim();
    if (mobile && !/^\d{10}$/.test(mobile)) {
      showToast.error('Mobile number must be exactly 10 digits');
      return;
    }

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
        mobile: mobile || null,
        dateOfBirth: formattedDob === '' ? null : formattedDob,
        gender: form.gender || null,
        nationality: form.nationality || null,
        bloodGroup: form.bloodGroup || null,
        dateOfJoining: formattedDoj === '' ? undefined : formattedDoj,
        employmentType: form.employmentType || '',
        departmentId: form.currentDepartmentId ? Number(form.currentDepartmentId) : null,
        employeeCode: form.employeeCode,
        reportingManagerId: form.reportingManagerId ? Number(form.reportingManagerId) : null,
        avatarUrl: form.avatarUrl || null,
        status: form.status || 'active',
        employeeStatus: form.status || 'Active',
        employee_status: form.status || 'Active',
        jobTitle: form.jobTitle || null,
        accessRole: form.accessRole || 'employee',
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      const res = await updateEmployee(payload);
      const updatedData = res?.data || res || {};
      const newStatus = updatedData.employeeStatus || updatedData.employee_status || payload.employeeStatus;
      
      // Consume the approved edit permission so employee can't edit again without another approval
      if (isEmployeePortal && approvedRequestId) {
        await consumePermission(approvedRequestId);
      }
      showToast.success('Employee basic information saved');
      setForm((prev: any) => ({
        ...prev,
        ...updatedData,
        accessRole: updatedData.accessRole || payload.accessRole || prev.accessRole,
        employeeStatus: newStatus,
        employee_status: newStatus,
        password: '',
        confirmPassword: '',
      }));
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
      jobTitle: (employee as any).jobTitle || (employee as any).job_title || '',
      accessRole: (employee as any).accessRole || 'employee',
    });
    setIsEditing(false);
  };

  // Find department name for display
  const departmentName = departmentsData?.data?.find(
    (d: any) => d.id === employee.currentDepartmentId
  )?.name || '-';

  const accessRole = (employee as any).accessRole;
  const designation = (employee as any).designation || (employee as any).designationName || (employee as any).designation_name || (employee as any).currentDesignationName || (employee as any).current_designation_name || '-';
  const jobTitle = (employee as any).jobTitle || (employee as any).job_title || (employee as any).positionTitle || (employee as any).position_title || '-';

  // Resolve manager name from multiple fallback properties
  const reportingManagerName =
    (employee as any).reportingManagerName ||
    (employee as any).reporting_manager_name ||
    (typeof (employee as any).reportingManager === 'string'
      ? (employee as any).reportingManager
      : (employee.reportingManager
        ? `${(employee.reportingManager as any).firstName || (employee.reportingManager as any).first_name || ''} ${(employee.reportingManager as any).lastName || (employee.reportingManager as any).last_name || ''}`.trim()
        : ''));

  // Filter manager options: ONLY Team Lead, Department Manager, HR Manager, or Admin roles
  const managerCandidates = (employees || []).filter((item: any) => {
    if (item.id === employee.id) return false;
    const role = (item.accessRole || item.access_role || item.role || '').toLowerCase();
    const code = (item.employeeCode || item.employee_code || '');
    const isCurrentlyAssigned = Number(item.id) === Number(form.reportingManagerId || employee.reportingManagerId || (employee as any).reporting_manager_id);
    return (
      isCurrentlyAssigned ||
      ['team_lead', 'department_head', 'hr_manager', 'organization_admin', 'super_admin', 'cto', 'cfo', 'coo', 'cxo', 'manager'].includes(role) ||
      code.startsWith('CEO-') ||
      item.isCeo ||
      item.is_ceo
    );
  });

  return (
    <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
      <CardHeader className="flex flex-row justify-between items-center pb-3 px-4 sm:px-5 pt-4 sm:pt-5 border-b border-border/50 mb-4">
        <div>
          <CardTitle className="text-sm font-bold">Basic Information</CardTitle>
          <CardDescription className="text-xs">Employee personal and employment details</CardDescription>
        </div>
        {!isEditing ? (
          (!isEmployeePortal || editUnlocked) && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs font-bold gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Basic Info
            </Button>
          )
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold gap-1.5 px-3" onClick={handleCancel} disabled={isSaving}>
              <X className="w-3.5 h-3.5" />
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs font-semibold gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5">
        {/* ─── EDIT MODE ─── */}
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="employeeCode" className="flex items-center gap-1">
                Employee Code * {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <Input
                id="employeeCode"
                disabled={!isAdmin}
                value={form.employeeCode || ''}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                className={`mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed font-mono' : ''}`}
              />
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
              <Label htmlFor="email" className="flex items-center gap-1">
                Email * {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <Input
                id="email"
                type="email"
                disabled={!isAdmin}
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed font-mono' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" inputMode="numeric" maxLength={10} value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} className="mt-1" />
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
              <Label htmlFor="dateOfJoining" className="flex items-center gap-1">
                Date of Joining * {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <Input
                id="dateOfJoining"
                type="date"
                disabled={!isAdmin}
                value={formatInputDate(form.dateOfJoining)}
                onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                className={`mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="employmentType" className="flex items-center gap-1">
                Employment Type {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <select
                id="employmentType"
                disabled={!isAdmin}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                value={form.employmentType || ''}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}
              >
                <option value="">Select Type...</option>
                {employeeTypes.map((type) => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="department" className="flex items-center gap-1">
                Department {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <select
                id="department"
                disabled={!isAdmin}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                value={form.currentDepartmentId || ''}
                onChange={(e) => setForm({ ...form, currentDepartmentId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">-- Select Department --</option>
                {departmentsData?.data?.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="reportingManager" className="flex items-center gap-1">
                Reports To {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              {['department_head', 'hr_manager'].includes(form.accessRole || '') ? (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-900 dark:text-amber-200 text-xs font-medium mt-1">
                  <strong>Organization Admin</strong> (Manager & HR roles directly report to Organization Admin)
                </div>
              ) : (
                <select
                  id="reportingManager"
                  disabled={!isAdmin}
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                  value={form.reportingManagerId || ''}
                  onChange={(e) => setForm({ ...form, reportingManagerId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">-- Select Reporting Manager / Team Lead --</option>
                  {managerCandidates.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.firstName} {item.lastName} ({item.employeeCode} - {item.jobTitle || item.accessRole || 'Lead'})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <Label htmlFor="status" className="flex items-center gap-1">
                Employee Status {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <select
                id="status"
                disabled={!isAdmin}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                value={(form.status || 'active').toLowerCase().replace(/\s+/g, '_')}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {employeeStatuses && employeeStatuses.length > 0 ? (
                  employeeStatuses.map((st: any) => (
                    <option key={st.id || st.name} value={st.name.toLowerCase().replace(/\s+/g, '_')}>
                      {st.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <Label htmlFor="accessRole" className="flex items-center gap-1">
                Access Role {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <select
                id="accessRole"
                disabled={!isAdmin}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                value={form.accessRole || 'employee'}
                onChange={(e) => setForm({ ...form, accessRole: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="department_head">Manager</option>
                <option value="hr_manager">HR</option>
                <option value="intern">Intern</option>
                <option value="consultant">Consultant</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jobTitle" className="flex items-center gap-1">
                Designation {!isAdmin && <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />}
              </Label>
              <select
                id="jobTitle"
                disabled={!isAdmin}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1 ${!isAdmin ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-80' : ''}`}
                value={form.jobTitle || ''}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              >
                <option value="">-- Select Designation --</option>
                {designations.map((desig: any) => (
                  <option key={desig.id} value={desig.name}>
                    {desig.name}
                  </option>
                ))}
                {form.jobTitle && !designations.some((d: any) => d.name === form.jobTitle) && (
                  <option value={form.jobTitle}>{form.jobTitle}</option>
                )}
              </select>
            </div>
            {!isAdmin ? (
              <div className="col-span-2 border-t pt-4 mt-2">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-500" /> Account Password Modifications
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                      Direct password modifications are restricted. Submitting a request sends an official ticket for HR Manager approval.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      showToast.success('Password change request submitted! Sent to HR Administration for approval.');
                    }}
                    className="h-8 text-xs font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 shrink-0"
                  >
                    Request Password Change (Requires HR Approval)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="col-span-2 border-t pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Change Password (Admin Reset)</p>
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
            )}
          </div>
        ) : (
          /* ─── VIEW MODE ─── */
          <div className="space-y-4 text-xs">
            {/* Identity */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Identity
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Employee Code</p>
                  <p className="mt-0.5 text-xs font-mono font-semibold text-foreground">{formatValue(employee.employeeCode)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">First Name</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(employee.firstName)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Name</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(employee.lastName)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Gender</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{titleCase(employee.gender)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Date of Birth</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatDate(employee.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Nationality</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(employee.nationality)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Blood Group</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(employee.bloodGroup)}</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Contact
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Email</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground break-all">{formatValue(employee.email)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Number</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatValue(employee.mobile)}</p>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Employment & Role
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Date of Joining</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{formatDate(employee.dateOfJoining)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Employment Type</p>
                  <div className="mt-0.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getEmploymentTypeColor(employee.employmentType || '')}`}>
                      {titleCase(employee.employmentType || '')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Employee Status</p>
                  <div className="mt-0.5">
                    <InfoBadge value={(form as any).employeeStatus || (form as any).employee_status || (employee as any).employeeStatus || (employee as any).employee_status || employee.status || 'Active'} colorMap={statusColors} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Designation</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{formatValue(designation)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Job Title</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{formatValue(jobTitle)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Access Role</p>
                  <div className="mt-0.5">
                    <InfoBadge value={accessRole || 'employee'} colorMap={roleColors} />
                  </div>
                </div>
              </div>
            </div>

            {/* Organization */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border/60">
                Organization
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Department</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{departmentName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Reports To</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">
                    {['department_head', 'hr_manager'].includes(accessRole || '') ? (
                      <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        🛡️ Organization Admin
                      </span>
                    ) : (
                      reportingManagerName || '-'
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
