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
import { AlertCircle, UserPlus } from 'lucide-react';

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
  });

  const { createEmployee, isLoading, error } = useCreateEmployee();
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });
  const { data: departmentsData } = useDepartments(1, 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee({
        ...formData,
        reportingManagerId: formData.reportingManagerId ? parseInt(formData.reportingManagerId, 10) : undefined,
        departmentId: formData.departmentId ? parseInt(formData.departmentId, 10) : undefined,
        avatarUrl: formData.avatarUrl || undefined,
      } as any);
      onSuccess();
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
      });
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Employee
          </DialogTitle>
          <DialogDescription>
            Enter details below to create an employee and position them in the organization structure.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex justify-end gap-2 pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  );
}
