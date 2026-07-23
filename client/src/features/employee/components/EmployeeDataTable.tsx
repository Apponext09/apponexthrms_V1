import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { Employee } from '@/types';
import { useDeleteEmployee } from '../hooks/useEmployees';

interface EmployeeDataTableProps {
  employees: Employee[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export function EmployeeDataTable({
  employees,
  isLoading,
  onRefresh,
}: EmployeeDataTableProps) {
  const navigate = useNavigate();
  const { deleteEmployee } = useDeleteEmployee();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading employees...</div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground">No employees found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Mobile</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Date of Joining</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id} className="hover:bg-muted/50">
            <TableCell
              onClick={() => navigate(`/employees/${employee.id}`)}
              className="font-medium cursor-pointer"
            >
              {employee.employeeCode}
            </TableCell>
            <TableCell
              onClick={() => navigate(`/employees/${employee.id}`)}
              className="cursor-pointer"
            >
              {employee.firstName} {employee.lastName}
            </TableCell>
            <TableCell>{employee.email}</TableCell>
            <TableCell>{employee.mobile || employee.phone || '-'}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  employee.status === 'inactive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                {employee.status}
              </span>
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                employee.accessRole === 'hr_manager' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200' :
                employee.accessRole === 'department_head' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200' :
                employee.accessRole === 'team_lead' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {employee.accessRole === 'hr_manager' ? 'HR' :
                  employee.accessRole === 'department_head' ? 'Manager' :
                  employee.accessRole === 'team_lead' ? 'Team Lead' :
                  'Employee'}
              </span>
            </TableCell>
            <TableCell>{employee.department || '-'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  title="View Profile / Edit"
                  onClick={() => navigate(`/employees/${employee.id}`)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (employee.id === undefined) return;
                    if (window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
                      try {
                        await deleteEmployee(employee.id);
                        onRefresh?.();
                      } catch (err) {
                        console.error('Failed to delete employee', err);
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
