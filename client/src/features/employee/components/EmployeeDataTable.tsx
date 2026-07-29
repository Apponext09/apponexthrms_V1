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
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Mail, Phone, Calendar, Building2, User } from 'lucide-react';
import type { Employee } from '@/types';
import { useDeleteEmployee } from '../hooks/useEmployees';

interface EmployeeDataTableProps {
  onEdit?: (employee: any) => void;
  employees: Employee[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export function EmployeeDataTable({
  employees,
  isLoading,
  onRefresh,
  onEdit,
}: EmployeeDataTableProps) {
  const navigate = useNavigate();
  const { deleteEmployee } = useDeleteEmployee();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading employees directory...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center p-6 space-y-2">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
          <User className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">No employees found</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          No records match your search or active filter criteria. Try clearing filters or searching for another term.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <Table className="w-full text-xs">
        <TableHeader className="bg-muted/40 uppercase text-[10px] font-bold tracking-wider">
          <TableRow className="border-b border-border/80 hover:bg-transparent">
            <TableHead className="py-3 px-4 text-muted-foreground">Employee</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Code</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Contact</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Status</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Access Role</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Department</TableHead>
            <TableHead className="py-3 px-4 text-muted-foreground">Joining Date</TableHead>
            <TableHead className="py-3 px-4 text-right text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/40">
          {employees.map((employee) => {
            const initials = `${employee.firstName ? employee.firstName[0] : ''}${employee.lastName ? employee.lastName[0] : ''}`.toUpperCase() || 'E';
            const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unnamed';

            return (
              <TableRow
                key={employee.id}
                className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
              >
                {/* Employee Name & Avatar */}
                <TableCell
                  onClick={() => navigate(`/employees/${employee.id}`)}
                  className="py-3 px-4 font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20 text-xs shadow-2xs group-hover:scale-105 transition-transform">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {fullName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                        {employee.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Employee Code */}
                <TableCell
                  onClick={() => navigate(`/employees/${employee.id}`)}
                  className="py-3 px-4 cursor-pointer font-mono font-semibold text-foreground/80"
                >
                  <span className="bg-muted/60 px-2 py-0.5 rounded text-[11px] border border-border/50">
                    {employee.employeeCode || `EMP-${employee.id}`}
                  </span>
                </TableCell>

                {/* Mobile Contact */}
                <TableCell className="py-3 px-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                    <span>{employee.mobile || employee.phone || '—'}</span>
                  </div>
                </TableCell>

                {/* Status Pill Badge */}
                <TableCell className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      employee.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : employee.status === 'inactive' || employee.status === 'exit'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        employee.status === 'active'
                          ? 'bg-emerald-500'
                          : employee.status === 'inactive' || employee.status === 'exit'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : 'Active'}
                  </span>
                </TableCell>

                {/* Access Role Badge */}
                <TableCell className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      employee.accessRole === 'hr_manager'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                        : employee.accessRole === 'department_head'
                        ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20'
                        : employee.accessRole === 'team_lead'
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
                    }`}
                  >
                    {employee.accessRole === 'hr_manager'
                      ? 'HR Manager'
                      : employee.accessRole === 'department_head'
                      ? 'Department Manager'
                      : employee.accessRole === 'team_lead'
                      ? 'Team Lead'
                      : 'Employee'}
                  </span>
                </TableCell>

                {/* Department */}
                <TableCell className="py-3 px-4 text-foreground/80 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span>{employee.department || '—'}</span>
                  </div>
                </TableCell>

                {/* Date of Joining */}
                <TableCell className="py-3 px-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                    <span>
                      {employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit Employee"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employees/${employee.id}/edit`);
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete Employee"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (employee.id === undefined) return;
                        if (window.confirm(`Are you sure you want to delete ${fullName}?`)) {
                          try {
                            await deleteEmployee(employee.id);
                            onRefresh?.();
                          } catch (err) {
                            console.error('Failed to delete employee', err);
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
