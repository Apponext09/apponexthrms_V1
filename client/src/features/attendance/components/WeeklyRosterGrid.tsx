import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  X,
  UserCheck,
  RefreshCw,
  GripVertical,
  Users,
  Clock,
  Sparkles,
  Save,
  MoreVertical,
  Filter,
  Download,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/config/api';

interface EmployeeItem {
  id: number;
  employeeCode?: string;
  employee_code?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  departmentName?: string;
  department_name?: string;
  designationName?: string;
  designation_name?: string;
}

interface WeeklyRosterGridProps {
  rosterShifts: any[];
  assignments: any[];
  onRefreshAssignments: () => void;
  assignShift: (data: any) => Promise<any>;
  deleteAssignment?: (assignmentId: number) => Promise<any>;
}

// ─────────────────────────────────────────────────────────────
// Helpers for Date & Week Calculations
// ─────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getWeekDates(monday: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateHeader(d: Date): string {
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthStr = d.toLocaleString('default', { month: 'short' });
  const dayName = d.toLocaleString('default', { weekday: 'long' });
  return `${dayNum} ${monthStr}, ${dayName}`;
}

export function WeeklyRosterGrid({
  rosterShifts,
  assignments,
  onRefreshAssignments,
  assignShift,
  deleteAssignment,
}: WeeklyRosterGridProps) {
  const [mondayDate, setMondayDate] = useState<Date>(() => getMonday(new Date()));
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [empSearch, setEmpSearch] = useState('');
  
  const [draggingEmployee, setDraggingEmployee] = useState<EmployeeItem | null>(null);
  const [assigningCell, setAssigningCell] = useState<{ shift: any; dateStr: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const weekDates = getWeekDates(mondayDate);
  const weekStartStr = formatDateISO(weekDates[0]);
  const weekEndStr = formatDateISO(weekDates[6]);

  // Dynamic filter option lists from backend employee data
  const companyOptions = Array.from(
    new Set(
      employees.map((e: any) => e.companyName || e.company_name || e.company).filter(Boolean)
    )
  );

  const locationOptions = Array.from(
    new Set(
      employees.map((e: any) => e.locationName || e.location_name || e.branchName || e.branch_name || e.location).filter(Boolean)
    )
  );

  const departmentOptions = Array.from(
    new Set(
      employees.map((e: any) => e.departmentName || e.department_name || e.department).filter(Boolean)
    )
  );

  // Load employees and initial assignments
  useEffect(() => {
    fetchEmployees();
    onRefreshAssignments();
  }, []);

  const fetchEmployees = async (search = '') => {
    setLoadingEmployees(true);
    try {
      const params: any = { pageSize: 200, status: 'active' };
      if (search) params.search = search;
      const resp = await apiClient.get('/employees', { params });
      const items = resp.data?.data || resp.data?.items || [];
      setEmployees(items);
    } catch (err) {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handlePrevWeek = () => {
    setMondayDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setMondayDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  // Check if employee matches selected filters
  const isEmployeeMatchFilter = (e: any) => {
    if (!e) return true;

    const empCompany = (e.companyName || e.company_name || e.company || '').toString().toLowerCase();
    const empLocation = (e.locationName || e.location_name || e.branchName || e.branch_name || e.location || '').toString().toLowerCase();
    const empDept = (e.departmentName || e.department_name || e.department || '').toString().toLowerCase();

    const matchesCompany =
      selectedCompany === 'all' ||
      !selectedCompany ||
      empCompany === selectedCompany.toLowerCase();

    const matchesLocation =
      selectedLocation === 'all' ||
      !selectedLocation ||
      empLocation === selectedLocation.toLowerCase();

    const matchesDept =
      selectedDepartment === 'all' ||
      !selectedDepartment ||
      empDept === selectedDepartment.toLowerCase();

    const matchesEmpSelect =
      selectedEmployeeId === 'all' || String(e.id) === selectedEmployeeId;

    return matchesCompany && matchesLocation && matchesDept && matchesEmpSelect;
  };

  // Filter employees by department, company, location & search
  const filteredEmployees = employees.filter((e) => {
    const fName = e.firstName || e.first_name || '';
    const lName = e.lastName || e.last_name || '';
    const code = e.employeeCode || e.employee_code || '';
    const name = `${fName} ${lName}`.toLowerCase();
    const query = empSearch.toLowerCase();

    const matchesSearch = name.includes(query) || code.toLowerCase().includes(query);

    return matchesSearch && isEmployeeMatchFilter(e);
  });

  // Helper to find assigned employees for a shift & date
  const getCellAssignments = (shiftId: number, dateStr: string) => {
    return assignments.filter((a) => {
      const matchShift = Number(a.shiftId || a.shift_id) === Number(shiftId);
      if (!matchShift) return false;

      const empId = Number(a.employeeId || a.employee_id);
      const empObj = employees.find((e) => Number(e.id) === empId) || {
        id: empId,
        firstName: a.firstName || a.first_name,
        lastName: a.lastName || a.last_name,
        companyName: a.companyName || a.company_name,
        locationName: a.locationName || a.location_name || a.branchName,
        departmentName: a.departmentName || a.department_name,
      };

      if (!isEmployeeMatchFilter(empObj)) {
        return false;
      }

      const rawStart = a.assignmentStartDate || a.assignment_start_date || a.startDate || a.start_date || '';
      const rawEnd = a.assignmentEndDate || a.assignment_end_date || a.endDate || a.end_date || '';

      const startDate = rawStart ? formatDateISO(new Date(rawStart)) : '';
      const endDate = rawEnd ? formatDateISO(new Date(rawEnd)) : '';

      // Direct date match
      if (startDate === dateStr) return true;

      // Date range / ongoing assignment match
      if (startDate && startDate <= dateStr && (!endDate || endDate >= dateStr)) {
        return true;
      }

      return false;
    });
  };

  // Assign employee to shift for date
  const handleAssignEmployee = async (emp: EmployeeItem, shift: any, dateStr: string) => {
    setSaving(true);
    const fName = emp.firstName || emp.first_name || '';
    const lName = emp.lastName || emp.last_name || '';
    const empName = `${fName} ${lName}`.trim() || 'Employee';
    const shiftName = shift.shiftName || shift.shift_name || 'Roster Shift';

    const submit = (confirmReassignment: boolean) =>
      assignShift({
        employeeId: emp.id,
        employeeIds: [emp.id],
        shiftId: shift.id,
        startDate: dateStr,
        assignmentStartDate: dateStr,
        effectiveUntil: dateStr,
        isCurrent: true,
        confirmReassignment,
      });

    try {
      await submit(false);
      showToast.success('Shift Assigned', `Assigned ${empName} to ${shiftName} for ${dateStr}`);
      onRefreshAssignments();
    } catch (err: any) {
      const conflicts = err?.response?.data?.error?.details?.conflicts;
      if (err?.response?.status === 409 && Array.isArray(conflicts) && conflicts.length > 0) {
        const proceed = await window.appConfirm(
          `${empName} already has an active shift assignment that overlaps ${dateStr}. Assigning ${shiftName} will end it.\n\nProceed anyway?`
        );
        if (proceed) {
          try {
            await submit(true);
            showToast.success('Shift Assigned', `Assigned ${empName} to ${shiftName} for ${dateStr}`);
            onRefreshAssignments();
          } catch (err2: any) {
            showToast.error('Assignment Failed', err2?.response?.data?.message || err2?.message || 'Failed to assign shift');
          }
        }
      } else {
        showToast.error('Assignment Failed', err?.response?.data?.message || err?.message || 'Failed to assign shift');
      }
    } finally {
      setSaving(false);
      setAssigningCell(null);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, emp: EmployeeItem & { sourceDate?: string; sourceShiftId?: number }) => {
    e.dataTransfer.setData('application/json', JSON.stringify(emp));
    setDraggingEmployee(emp);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, shift: any, dateStr: string) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const emp = JSON.parse(dataStr);
        if (emp && emp.id) {
          if (emp.sourceDate && (emp.sourceDate !== dateStr || emp.sourceShiftId !== shift.id)) {
            handleMoveEmployee(emp, shift, dateStr, emp.sourceDate);
          } else {
            handleAssignEmployee(emp, shift, dateStr);
          }
        }
      } else if (draggingEmployee) {
        handleAssignEmployee(draggingEmployee, shift, dateStr);
      }
    } catch (err) {
      if (draggingEmployee) {
        handleAssignEmployee(draggingEmployee, shift, dateStr);
      }
    } finally {
      setDraggingEmployee(null);
    }
  };

  // Move employee to shift for date
  const handleMoveEmployee = async (emp: any, shift: any, dateStr: string, moveFromDate: string) => {
    setSaving(true);
    const fName = emp.firstName || emp.first_name || '';
    const lName = emp.lastName || emp.last_name || '';
    const empName = `${fName} ${lName}`.trim() || 'Employee';
    const shiftName = shift.shiftName || shift.shift_name || 'Roster Shift';

    try {
      await assignShift({
        employeeId: emp.id,
        employeeIds: [emp.id],
        shiftId: shift.id,
        startDate: dateStr,
        assignmentStartDate: dateStr,
        effectiveUntil: dateStr,
        isCurrent: true,
        moveFromDate: moveFromDate,
        sourceAssignmentId: emp.sourceAssignmentId,
      });
      showToast.success('Shift Moved', `Moved ${empName} to ${shiftName} on ${dateStr}`);
      onRefreshAssignments();
    } catch (err: any) {
      showToast.error('Move Failed', err?.response?.data?.message || err?.message || 'Failed to move shift');
    } finally {
      setSaving(false);
      setAssigningCell(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!deleteAssignment) return;
    try {
      setSaving(true);
      await deleteAssignment(assignmentId);
      showToast.success('Assignment Deleted', 'Assignment deleted successfully');
      onRefreshAssignments();
    } catch (err: any) {
      showToast.error('Delete Failed', err?.response?.data?.message || err?.message || 'Failed to delete assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoster = () => {
    onRefreshAssignments();
    showToast.success('Roster Saved', 'Roster schedule saved successfully!');
  };

  const handleExportExcel = () => {
    try {
      const headers = ['Shift Name', 'Timing', ...weekDates.map((d) => formatDateHeader(d))];
      const rows: any[][] = [];

      rosterShifts.forEach((shift) => {
        const shiftName = shift.shiftName || shift.shift_name || 'Shift';
        const startTime = String(shift.startTime || shift.start_time || '09:00').slice(0, 5);
        const endTime = String(shift.endTime || shift.end_time || '18:00').slice(0, 5);
        const timing = `${startTime} - ${endTime}`;

        const rowData: any[] = [shiftName, timing];

        weekDates.forEach((d) => {
          const dateStr = formatDateISO(d);
          const cellAssignments = getCellAssignments(shift.id, dateStr);

          const names = cellAssignments.map((a) => {
            const fName = a.firstName || a.first_name || '';
            const lName = a.lastName || a.last_name || '';
            let empName = `${fName} ${lName}`.trim();
            if (!empName) {
              const found = employees.find((e) => Number(e.id) === Number(a.employeeId || a.employee_id));
              if (found) {
                const fn = found.firstName || found.first_name || '';
                const ln = found.lastName || found.last_name || '';
                empName = `${fn} ${ln}`.trim();
              }
            }
            return empName || a.employeeName || a.employee_name || 'Employee';
          });

          rowData.push(names.join(', ') || '-');
        });

        rows.push(rowData);
      });

      const worksheetData = [headers, ...rows];
      const worksheet = utils.aoa_to_sheet(worksheetData);

      const colWidths = headers.map((h, i) => {
        let maxLen = h.length;
        rows.forEach((r) => {
          const cellVal = String(r[i] || '');
          if (cellVal.length > maxLen) maxLen = cellVal.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Weekly Roster');

      const fileName = `Weekly_Roster_${weekStartStr}_to_${weekEndStr}.xlsx`;
      writeFile(workbook, fileName);
      showToast.success('Export Successful', `Exported ${fileName} successfully!`);
    } catch (err: any) {
      showToast.error('Export Failed', 'Failed to export Excel file');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar Filter Controls (Exact Match to User UI) ───────────── */}
      <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Range Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-foreground">Date Range</label>
            <div className="flex items-center gap-1 bg-background border border-input rounded-md px-1.5 py-1 text-xs">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 hover:bg-muted rounded text-foreground font-bold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono px-2 font-medium text-foreground">
                {weekStartStr} to {weekEndStr}
              </span>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1 hover:bg-muted rounded text-foreground font-bold cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Company Dropdown */}
          <div className="space-y-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-foreground">Company</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Companies</option>
              {companyOptions.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="space-y-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-foreground">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Locations</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="space-y-1 min-w-[130px]">
            <label className="text-[11px] font-bold text-foreground">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Dropdown */}
          <div className="space-y-1 min-w-[140px]">
            <label className="text-[11px] font-bold text-foreground">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Choose Employee...</option>
              {employees.map((emp) => {
                const fName = emp.firstName || emp.first_name || '';
                const lName = emp.lastName || emp.last_name || '';
                return (
                  <option key={emp.id} value={emp.id}>
                    {`${fName} ${lName}`.trim() || `Employee ${emp.id}`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRoster}
              className="h-8 bg-[#387FBF] hover:bg-[#2C68A0] text-white rounded-md px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" /> Save Roster
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Employee Quick Palette + Table Board ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Optional Draggable Employee Palette (Left) */}
        <div className="lg:col-span-3 p-3 rounded-xl border border-border/80 bg-card shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" />
              Draggable Employees
            </h4>
            <Badge variant="secondary" className="text-[9px] rounded-full">
              {filteredEmployees.length}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="pl-7 text-[11px] h-7 rounded-md"
            />
          </div>

          <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const fName = emp.firstName || emp.first_name || '';
              const lName = emp.lastName || emp.last_name || '';
              const empName = `${fName} ${lName}`.trim() || 'Employee';

              return (
                <div
                  key={emp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, emp)}
                  className="flex items-center gap-2 p-1.5 rounded-md border border-border/60 bg-background hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all cursor-grab active:cursor-grabbing text-xs select-none"
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                  <Avatar className="w-5 h-5 flex-shrink-0">
                    <AvatarFallback className="text-[8px] font-bold bg-sky-100 text-sky-700">
                      {empName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground truncate text-[11px]">
                    {empName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roster Table Board (Exact Match to User Screenshot) */}
        <div className="lg:col-span-9">
          {rosterShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed border-border bg-card">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs font-bold text-foreground">No Roster Shifts Available</p>
              <p className="text-[11px] text-muted-foreground">
                Create a Roster Shift template under "Shift Templates" first.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[760px]">
                  <thead>
                    {/* Header Row: Slate-blue Background */}
                    <tr className="bg-[#B5C9DF] dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-b border-slate-300 dark:border-slate-700">
                      <th className="text-center px-3 py-3 font-extrabold w-36 border-r border-slate-300/70 dark:border-slate-700">
                        Shifts
                      </th>
                      {weekDates.map((d) => {
                        const dateStr = formatDateISO(d);
                        const headerLabel = formatDateHeader(d);

                        return (
                          <th
                            key={dateStr}
                            className="text-center px-2 py-3 font-extrabold border-r border-slate-300/70 dark:border-slate-700 text-[11px]"
                          >
                            {headerLabel}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rosterShifts.map((shift) => {
                      const shiftName = shift.shiftName || shift.shift_name || 'Shift';
                      const startTime = shift.startTime || shift.start_time || '09:00';
                      const endTime = shift.endTime || shift.end_time || '18:00';
                      const startFormatted = String(startTime).slice(0, 5);
                      const endFormatted = String(endTime).slice(0, 5);
                      const shiftColor = shift.color || '#0096FF';

                      return (
                        <tr key={shift.id} className="hover:bg-muted/10 transition-colors">
                          {/* Shifts Name Column */}
                          <td className="px-3 py-4 text-center align-middle font-bold text-foreground border-r border-border bg-card">
                            <span className="text-xs">{shiftName}</span>
                          </td>

                          {/* 7 Days Columns */}
                          {weekDates.map((d) => {
                            const dateStr = formatDateISO(d);
                            const cellAssignments = getCellAssignments(shift.id, dateStr);

                            return (
                              <td
                                key={dateStr}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, shift, dateStr)}
                                className="px-2 py-2 border-r border-border align-top transition-colors hover:bg-sky-50/20 dark:hover:bg-sky-950/20 min-h-[90px]"
                              >
                                <div className="space-y-2 min-h-[75px] flex flex-col justify-between">
                                  {/* Assigned Employee Cards */}
                                  <div className="space-y-1.5">
                                    {cellAssignments.map((a) => {
                                      const fName = a.firstName || a.first_name || '';
                                      const lName = a.lastName || a.last_name || '';
                                      let empName = `${fName} ${lName}`.trim();

                                      if (!empName) {
                                        const found = employees.find((e) => Number(e.id) === Number(a.employeeId || a.employee_id));
                                        if (found) {
                                          const fn = found.firstName || found.first_name || '';
                                          const ln = found.lastName || found.last_name || '';
                                          empName = `${fn} ${ln}`.trim();
                                        }
                                      }
                                      if (!empName) empName = a.employeeName || a.employee_name || 'Employee';

                                      return (
                                        <div
                                          key={a.id || `${a.employee_id}-${dateStr}`}
                                          draggable
                                          onDragStart={(e) => {
                                            const empObj = {
                                              id: a.employeeId || a.employee_id,
                                              firstName: fName,
                                              lastName: lName,
                                              sourceDate: dateStr,
                                              sourceShiftId: shift.id,
                                              sourceAssignmentId: a.id,
                                            };
                                            handleDragStart(e, empObj as any);
                                          }}
                                          className="relative rounded-md border border-[#B8D9EF] bg-[#D6E6F2] dark:bg-sky-950/80 dark:border-sky-800 p-1.5 shadow-2xs overflow-hidden text-slate-800 dark:text-slate-100 cursor-grab active:cursor-grabbing hover:ring-2 ring-sky-400 transition-all"
                                        >
                                          {/* Left Accent Strip */}
                                          <div
                                            className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-md"
                                            style={{ backgroundColor: shiftColor }}
                                          />

                                          <div className="pl-2 space-y-1">
                                            {/* Top Row: Timings + F Badge */}
                                            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                              <div className="flex items-center gap-1">
                                                <span className="bg-white/80 dark:bg-slate-900 px-1 py-0.2 rounded text-[9px]">
                                                  {startFormatted}
                                                </span>
                                                <span className="bg-white/80 dark:bg-slate-900 px-1 py-0.2 rounded text-[9px]">
                                                  {endFormatted}
                                                </span>
                                                <span className="w-3.5 h-3.5 rounded-full bg-[#0096FF] text-white flex items-center justify-center text-[8px] font-extrabold ml-0.5">
                                                  F
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                title="Remove Assignment"
                                                onClick={() => handleDeleteAssignment(a.id)}
                                                className="text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Bottom Row: Employee Name */}
                                            <p className="text-[10px] font-extrabold truncate text-slate-900 dark:text-slate-100 pt-0.5">
                                              {empName}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Plus (+) Button at bottom of cell */}
                                  <button
                                    type="button"
                                    onClick={() => setAssigningCell({ shift, dateStr })}
                                    className="w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-800 hover:bg-sky-200 dark:hover:bg-sky-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-sky-700 transition-colors mx-auto cursor-pointer shadow-2xs"
                                    title="Add employee shift assignment"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign Employee Modal for Click Assignment ───────────── */}
      <Dialog open={Boolean(assigningCell)} onOpenChange={(open) => !open && setAssigningCell(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-600" />
              Assign Roster Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an employee to assign to shift{' '}
              <strong className="text-foreground font-bold">
                {assigningCell?.shift?.shiftName || assigningCell?.shift?.shift_name}
              </strong>{' '}
              for <span className="font-mono text-foreground font-bold">{assigningCell?.dateStr}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employee by name..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="pl-8 text-xs h-9 rounded-xl"
              />
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {filteredEmployees.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching employees
                </div>
              )}

              {filteredEmployees.map((emp) => {
                const fName = emp.firstName || emp.first_name || '';
                const lName = emp.lastName || emp.last_name || '';
                const empName = `${fName} ${lName}`.trim() || 'Employee';
                const code = emp.employeeCode || emp.employee_code || '';

                return (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      assigningCell && handleAssignEmployee(emp, assigningCell.shift, assigningCell.dateStr)
                    }
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-300 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-sky-100 text-sky-700">
                          {empName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-sky-600 truncate">
                          {empName}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{code}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full dark:bg-sky-950/80">
                      Assign
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
