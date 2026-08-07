import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserCheck, Search, ChevronDown, Calendar, Users } from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import type { ShiftTemplate } from '../types';

interface AssignShiftModalProps {
  open: boolean;
  onClose: () => void;
  shifts: ShiftTemplate[];
  preselectedShift?: ShiftTemplate | null;
  onAssigned: () => void;
  assignShift: (data: any) => Promise<any>;
}

interface EmployeeItem {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName?: string;
  designationName?: string;
  jobTitle?: string;
  role?: string;
}

export function AssignShiftModal({
  open,
  onClose,
  shifts,
  preselectedShift,
  onAssigned,
  assignShift,
}: AssignShiftModalProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeItem[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(preselectedShift?.id ?? null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);

  useEffect(() => {
    if (preselectedShift) setSelectedShiftId(preselectedShift.id);
  }, [preselectedShift]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open, selectedCompanyId]);

  const loadEmployees = async (search = '') => {
    setLoadingEmployees(true);
    try {
      const params: any = { pageSize: 100, status: 'active' };
      if (search) params.search = search;
      const resp = await apiClient.get('/employees', { params });
      const items = resp.data?.data || resp.data?.items || [];
      setEmployees(items);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const toggleEmployee = (emp: EmployeeItem) => {
    setSelectedEmployees((prev) =>
      prev.some((e) => e.id === emp.id) ? prev.filter((e) => e.id !== emp.id) : [...prev, emp]
    );
  };

  const filteredEmployees = employees.filter(
    (e) =>
      !searchQuery ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.departmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShiftId) {
      showToast.error('Validation Error', 'Please select a shift template');
      return;
    }
    if (selectedEmployees.length === 0) {
      showToast.error('Validation Error', 'Please select at least one employee');
      return;
    }
    if (!startDate) {
      showToast.error('Validation Error', 'Start Date is required');
      return;
    }

    setLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const emp of selectedEmployees) {
      try {
        await assignShift({
          employeeId: emp.id,
          shiftId: selectedShiftId,
          assignmentStartDate: startDate,
          assignmentEndDate: endDate || null,
        });
        successCount++;
      } catch (err: any) {
        errors.push(`${emp.firstName}: ${err?.response?.data?.message || err?.message || 'Failed'}`);
      }
    }

    setLoading(false);

    if (errors.length > 0) {
      showToast.error('Assignment Errors', errors.join(', '));
    }

    if (successCount > 0) {
      showToast.success('Shift Assigned', `Successfully assigned shift to ${successCount} employee(s)`);
      onAssigned();
      setSelectedEmployees([]);
      setEndDate('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col border border-border/80 shadow-lg rounded-xl bg-card overflow-hidden p-4">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <UserCheck className="w-4 h-4" />
            </div>
            Assign Shift to Employees
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Select a shift template and assign work schedules to employees.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-3 pt-2 text-xs">
          {/* Shift selector */}
          <div className="space-y-1 shrink-0">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Select Shift *</Label>
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold hover:border-primary/40 transition-colors"
                onClick={() => setShowShiftDropdown(!showShiftDropdown)}
              >
                {selectedShift ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedShift.color || '#2563eb' }} />
                    <span className="font-bold text-foreground">{selectedShift.shiftName || selectedShift.shift_name}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">({selectedShift.shiftCode || selectedShift.shift_code})</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a shift template...</span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showShiftDropdown && 'rotate-180')} />
              </button>

              {showShiftDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border/80 bg-card shadow-lg overflow-hidden">
                  <div className="max-h-44 overflow-y-auto divide-y divide-border/60">
                    {shifts.filter((s) => s.status === 'active').map((s) => {
                      const name = s.shiftName || s.shift_name;
                      const code = s.shiftCode || s.shift_code;
                      const start = s.startTime || s.start_time;
                      const end = s.endTime || s.end_time;
                      const duration = s.durationHours ?? s.duration_hours;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/40 text-left transition-colors',
                            selectedShiftId === s.id && 'bg-primary/10'
                          )}
                          onClick={() => { setSelectedShiftId(s.id); setShowShiftDropdown(false); }}
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color || '#2563eb' }} />
                          <div>
                            <p className="text-xs font-bold text-foreground">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{code}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-[10px] font-mono text-muted-foreground">
                              {start ? `${start} – ${end}` : 'Flexible'}
                            </p>
                            {duration !== undefined && <p className="text-[10px] font-bold text-foreground">{duration}h</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> Start Date *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" /> End Date (Optional)
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Employees Multi-select */}
          <div className="flex flex-col flex-1 min-h-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" /> Select Employees ({selectedEmployees.length})
              </Label>
              {selectedEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedEmployees([])}
                  className="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-background border-border"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-border/80 rounded-lg divide-y divide-border/60 min-h-[140px] max-h-[200px]">
              {loadingEmployees ? (
                <div className="flex items-center justify-center h-full py-8 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="flex items-center justify-center h-full py-8 text-xs text-muted-foreground">
                  No employees found matching "{searchQuery}"
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployees.some((e) => e.id === emp.id);
                  const name = `${emp.firstName} ${emp.lastName}`.trim();
                  const dept = emp.departmentName || emp.designationName || emp.jobTitle || emp.role || 'Employee';

                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployee(emp)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors',
                        isSelected && 'bg-primary/10 font-semibold'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-7 h-7 border border-border shrink-0">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{name}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">{emp.employeeCode} • {dept}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0 pointer-events-none"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !selectedShiftId || selectedEmployees.length === 0}
              className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Assign to {selectedEmployees.length || 0} Employee(s)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
