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
import { useCreateEmployee } from '../hooks/useEmployees';
import { AlertCircle } from 'lucide-react';

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
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employmentType: 'full_time',
  });

  const { createEmployee, isLoading, error } = useCreateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee(formData);
      onSuccess();
      setFormData({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        dateOfJoining: new Date().toISOString().split('T')[0],
        employmentType: 'full_time',
      });
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the employee details below
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeCode">Employee Code</Label>
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="firstName">First Name</Label>
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
              <Label htmlFor="lastName">Last Name</Label>
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
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) =>
                  setFormData({ ...formData, mobile: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
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

