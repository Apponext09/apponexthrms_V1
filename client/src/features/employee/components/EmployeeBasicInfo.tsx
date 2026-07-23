import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { useUpdateEmployee } from '../hooks/useEmployees';
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

export function EmployeeBasicInfo({ employee }: EmployeeBasicInfoProps) {
  const { updateEmployee, isLoading: isSaving } = useUpdateEmployee(employee.id as number);
  const { data: departmentsData } = useDepartments(1, 100);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Employee> & { password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    setForm({
      ...(employee || {}),
      password: '',
      confirmPassword: '',
    });
  }, [employee]);

  const handleSave = async () => {
    if (form.password) {
      if (form.password.length < 6) {
        showToast.error('Password must be at least 6 characters long');
        return;
      }
      if (form.password !== form.confirmPassword) {
        showToast.error('Passwords do not match');
        return;
      }
    }

    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || null,
        email: form.email,
        mobile: form.mobile || null,
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth ? formatInputDate(form.dateOfBirth) : null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        bloodGroup: form.bloodGroup || null,
        dateOfJoining: form.dateOfJoining ? formatInputDate(form.dateOfJoining) : undefined,
        employmentType: form.employmentType || 'full_time',
        departmentId: form.currentDepartmentId ? Number(form.currentDepartmentId) : null,
      };

      if (form.password) {
        payload.password = form.password;
      }

      await updateEmployee(payload);
      showToast.success('Employee basic information saved');
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
    });
    setIsEditing(false);
  };

  // Find department name for display
  const departmentName = departmentsData?.data?.find(
    (d: any) => d.id === employee.currentDepartmentId
  )?.name || '-';

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
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={form.firstName || ''}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={form.lastName || ''}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={form.mobile || ''}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formatInputDate(form.dateOfBirth)}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={form.gender || ''}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
              >
                <option value="">-- Select Gender --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <select
                id="nationality"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={form.nationality || ''}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              >
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
              <select
                id="bloodGroup"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={form.bloodGroup || ''}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              >
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
              <Input
                id="dateOfJoining"
                type="date"
                value={formatInputDate(form.dateOfJoining)}
                onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employmentType">Employment Type</Label>
              <select
                id="employmentType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={form.employmentType || 'full_time'}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={form.currentDepartmentId || ''}
                onChange={(e) => setForm({ ...form, currentDepartmentId: e.target.value ? Number(e.target.value) : undefined })}
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
              <Label htmlFor="password">Password (Leave blank to keep unchanged)</Label>
              <Input
                id="password"
                type="password"
                placeholder="New Password"
                value={form.password || ''}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm New Password"
                value={form.confirmPassword || ''}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Employee Code</Label>
              <p className="mt-1 text-base">{formatValue(employee.employeeCode)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Department</Label>
              <p className="mt-1 text-base">{departmentName}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Email</Label>
              <p className="mt-1 text-base">{formatValue(employee.email)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Mobile</Label>
              <p className="mt-1 text-base">{formatValue(employee.mobile)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Date of Birth</Label>
              <p className="mt-1 text-base">{formatDate(employee.dateOfBirth)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Gender</Label>
              <p className="mt-1 text-base">{titleCase(employee.gender)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Nationality</Label>
              <p className="mt-1 text-base">{formatValue(employee.nationality)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Blood Group</Label>
              <p className="mt-1 text-base">{formatValue(employee.bloodGroup)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Date of Joining</Label>
              <p className="mt-1 text-base">{formatDate(employee.dateOfJoining)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Employment Type</Label>
              <p className="mt-1 text-base">{titleCase(employee.employmentType)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
              <p className="mt-1 text-base">{titleCase(employee.status)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
