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
import { MoreHorizontal, Edit } from 'lucide-react';
import { useDepartments } from '../../settings/hooks/useDepartments';
import type { Employee } from '@/types';

interface EmployeeDataTableProps {
  employees: Employee[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export function EmployeeDataTable({
  employees,
  isLoading,
}: EmployeeDataTableProps) {
  const navigate = useNavigate();
  const { data: departmentsData } = useDepartments(1, 100);

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
          <TableHead>Department</TableHead>
          <TableHead>Date of Joining</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => {
          const departmentName = departmentsData?.data?.find(
            (d: any) => d.id === employee.currentDepartmentId
          )?.name || '-';

          return (
            <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell
                onClick={() => navigate(`/employees/${employee.id}`)}
                className="font-medium"
              >
                {employee.employeeCode}
              </TableCell>
              <TableCell
                onClick={() => navigate(`/employees/${employee.id}`)}
              >
                {employee.firstName} {employee.lastName}
              </TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.mobile || '-'}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  employee.status === 'inactive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {employee.status}
                </span>
              </TableCell>
              <TableCell>{departmentName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    title="View Profile Details"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
