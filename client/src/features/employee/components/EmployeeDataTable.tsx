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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Eye, Trash2 } from 'lucide-react';
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
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                employee.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                employee.status === 'inactive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {employee.status}
              </span>
            </TableCell>
            <TableCell>{employee.status ? 'Dept' : '-'}</TableCell>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem 
                      onClick={() => navigate(`/employees/${employee.id}`)} 
                      className="gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
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
                      className="text-red-600 dark:text-red-400 gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


