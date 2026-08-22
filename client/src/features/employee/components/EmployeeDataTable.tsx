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
import {
  Edit2,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Building2,
  User,
  Briefcase,
  MapPin,
  ShieldCheck,
  Eye,
  Crown,
} from 'lucide-react';
import type { Employee } from '@/types';
import { useDeleteEmployee } from '../hooks/useEmployees';
import { EmployeeCustomizationConfig } from '../store/employeeCustomizationStore';
import { cn } from '@/lib/utils';

interface EmployeeDataTableProps {
  onEdit?: (employee: any) => void;
  employees: Employee[];
  isLoading: boolean;
  onRefresh?: () => void;
  tableColumns?: EmployeeCustomizationConfig['tableColumns'];
}

export function EmployeeDataTable({
  employees,
  isLoading,
  onRefresh,
  tableColumns,
}: EmployeeDataTableProps) {
  const navigate = useNavigate();
  const { deleteEmployee } = useDeleteEmployee();

  const cols = tableColumns || {
    employeeNameAvatar: true,
    employeeCode: true,
    contactInfo: true,
    statusBadge: true,
    accessRole: true,
    department: true,
    designation: true,
    employmentType: true,
    location: true,
    reportingManager: true,
    dateOfJoining: true,
    actions: true,
    actionViewProfile: true,
    actionEdit: false,
    actionDelete: true,
  };

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
            {cols.employeeNameAvatar && <TableHead className="py-3 px-4 text-muted-foreground">Employee</TableHead>}
            {cols.employeeCode && <TableHead className="py-3 px-4 text-muted-foreground">Code</TableHead>}
            {cols.contactInfo && <TableHead className="py-3 px-4 text-muted-foreground">Contact</TableHead>}
            {cols.statusBadge && <TableHead className="py-3 px-4 text-muted-foreground">Status</TableHead>}
            {cols.accessRole && <TableHead className="py-3 px-4 text-muted-foreground">Access Role</TableHead>}
            {cols.department && <TableHead className="py-3 px-4 text-muted-foreground">Department</TableHead>}
            {cols.designation && <TableHead className="py-3 px-4 text-muted-foreground">Designation</TableHead>}
            {cols.employmentType && <TableHead className="py-3 px-4 text-muted-foreground">Employment Type</TableHead>}
            {cols.location && <TableHead className="py-3 px-4 text-muted-foreground">Location</TableHead>}
            {cols.reportingManager && <TableHead className="py-3 px-4 text-muted-foreground">Reporting Manager</TableHead>}
            {cols.dateOfJoining && <TableHead className="py-3 px-4 text-muted-foreground">Joining Date</TableHead>}
            {cols.actions && <TableHead className="py-3 px-4 text-right text-muted-foreground">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/40">
          {employees.map((employee: any) => {
            const initials = `${employee.firstName ? employee.firstName[0] : ''}${employee.lastName ? employee.lastName[0] : ''}`.toUpperCase() || 'E';
            const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unnamed';
            const isCeo = Boolean(
              employee.isCeo ||
              employee.is_ceo ||
              employee.accessRole === 'organization_admin' ||
              (employee.employeeCode || employee.employee_code || '').startsWith('CEO-')
            );

            return (
              <TableRow
                key={employee.id}
                className={cn(
                  'group transition-colors',
                  isCeo
                    ? 'bg-amber-500/10 dark:bg-amber-950/25 hover:bg-amber-500/15 border-l-4 border-l-amber-500 font-medium'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                )}
              >
                {/* Employee Name & Avatar */}
                {cols.employeeNameAvatar && (
                  <TableCell
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    className="py-3 px-4 font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full font-black flex items-center justify-center shrink-0 border text-xs shadow-2xs group-hover:scale-105 transition-transform',
                          isCeo
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        )}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {fullName}
                          </p>
                          {isCeo && (
                            <Badge className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0 border-amber-400 gap-0.5 shadow-2xs">
                              <Crown className="w-2.5 h-2.5 fill-slate-950" /> CEO
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          {employee.email || '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                )}

                {/* Employee Code */}
                {cols.employeeCode && (
                  <TableCell
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    className="py-3 px-4 cursor-pointer font-mono font-semibold text-foreground/80"
                  >
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] border',
                        isCeo
                          ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 font-bold'
                          : 'bg-muted/60 border-border/50'
                      )}
                    >
                      {employee.employeeCode || employee.employee_code || `EMP-${employee.id}`}
                    </span>
                  </TableCell>
                )}

                {/* Mobile Contact */}
                {cols.contactInfo && (
                  <TableCell className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                      <span>{employee.mobile || employee.phone || '—'}</span>
                    </div>
                  </TableCell>
                )}

                {/* Status Pill Badge */}
                {cols.statusBadge && (
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
                )}

                {/* Access Role Badge */}
                {cols.accessRole && (
                  <TableCell className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        isCeo
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-black'
                          : employee.accessRole === 'hr_manager' || employee.accessRole === 'organization_admin'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                          : employee.accessRole === 'department_head' || employee.accessRole === 'manager'
                          ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20'
                          : employee.accessRole === 'team_lead'
                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                          : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
                      }`}
                    >
                      {isCeo ? (
                        <>
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" /> CEO / Executive
                        </>
                      ) : employee.accessRole === 'organization_admin' ? (
                        'Admin'
                      ) : employee.accessRole === 'hr_manager' ? (
                        'HR'
                      ) : employee.accessRole === 'department_head' || employee.accessRole === 'manager' ? (
                        'Manager'
                      ) : employee.accessRole === 'team_lead' ? (
                        'Team Lead'
                      ) : (
                        'Employee'
                      )}
                    </span>
                  </TableCell>
                )}


                {/* Department */}
                {cols.department && (
                  <TableCell className="py-3 px-4 text-foreground/80 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{employee.department || employee.departmentName || '—'}</span>
                    </div>
                  </TableCell>
                )}

                {/* Designation */}
                {cols.designation && (
                  <TableCell className="py-3 px-4 text-foreground/80 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{employee.jobTitle || employee.designationName || '—'}</span>
                    </div>
                  </TableCell>
                )}

                {/* Employment Type */}
                {cols.employmentType && (
                  <TableCell className="py-3 px-4 text-muted-foreground capitalize">
                    {employee.employmentType ? employee.employmentType.replace('_', ' ') : 'Full Time'}
                  </TableCell>
                )}

                {/* Location */}
                {cols.location && (
                  <TableCell className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{employee.locationName || employee.location || 'Headquarters'}</span>
                    </div>
                  </TableCell>
                )}

                {/* Reporting Manager */}
                {cols.reportingManager && (
                  <TableCell className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{employee.reportingManagerName || employee.reportingManager || '—'}</span>
                    </div>
                  </TableCell>
                )}

                {/* Date of Joining */}
                {cols.dateOfJoining && (
                  <TableCell className="py-3 px-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                      <span>
                        {employee.dateOfJoining
                          ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </TableCell>
                )}

                {/* Actions */}
                {cols.actions && (
                  <TableCell className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cols.actionViewProfile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Profile"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/employees/${employee.id}`);
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {cols.actionDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete Employee"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
