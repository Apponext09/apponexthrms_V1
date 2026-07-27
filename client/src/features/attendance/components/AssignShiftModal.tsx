import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserCheck, Search, X, ChevronDown, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiClient } from '@/config/api';
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
  }, [open]);

  const loadEmployees = async (search = '') => {
    setLoadingEmployees(true);
    try {
      const params: any = { pageSize: 100, status: 'active' };
      if (search) params.search = search;
      const resp = await apiClient.get('/employees', { params });
      const items = resp.data?.data || resp.data?.items || [];
      setEmployees(items);
    } catch (err) {
      // Fallback: show empty list, don't block the modal
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    loadEmployees(val);
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
      e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedShift = shifts.find((s) => s.id === selectedShiftId);

  const getInitials = (e: EmployeeItem) =>
    `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`.toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftId) { toast.error('Please select a shift'); return; }
    if (selectedEmployees.length === 0) { toast.error('Select at least one employee'); return; }
    if (!startDate) { toast.error('Start date is required'); return; }

    setLoading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const emp of selectedEmployees) {
      try {
        await assignShift({
          employeeId: emp.id,
          shiftId: selectedShiftId,
          startDate,
          endDate: endDate || undefined,
        });
        successCount++;
      } catch (err: any) {
        errors.push(`${emp.firstName} ${emp.lastName}: ${err?.response?.data?.message || err?.message || 'Failed'}`);
      }
    }

    setLoading(false);

    if (successCount > 0) {
      toast.success(
        `Shift assigned to ${successCount} employee${successCount > 1 ? 's' : ''} successfully!`
      );
    }
    if (errors.length > 0) {
      errors.forEach((e) => toast.error(e));
    }

    if (successCount > 0) {
      onAssigned();
      setSelectedEmployees([]);
      setEndDate('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            Assign Shift to Employees
          </DialogTitle>
          <DialogDescription>
            Assign a shift template to one or more employees. All roles including HR and Managers can be assigned.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-4 py-2">
          {/* Shift selector */}
          <div className="space-y-1.5 flex-shrink-0">
            <Label className="text-xs font-semibold">Select Shift *</Label>
            <div className="relative">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-input bg-background text-sm hover:border-muted-foreground/50 transition-colors"
                onClick={() => setShowShiftDropdown(!showShiftDropdown)}
              >
                {selectedShift ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedShift.color }} />
                    <span className="font-semibold">{selectedShift.shiftName || selectedShift.shift_name}</span>
                    <span className="text-muted-foreground font-mono text-xs">({selectedShift.shiftCode || selectedShift.shift_code})</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a shift template...</span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showShiftDropdown && 'rotate-180')} />
              </button>
              {showShiftDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
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
                            'w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 text-left transition-colors',
                            selectedShiftId === s.id && 'bg-indigo-50 dark:bg-indigo-950/30'
                          )}
                          onClick={() => { setSelectedShiftId(s.id); setShowShiftDropdown(false); }}
                        >
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <div>
                            <p className="text-xs font-bold text-foreground">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{code}</p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="text-[10px] text-muted-foreground">
                              {start ? `${start} – ${end}` : 'Flexible'}
                            </p>
                            {duration !== undefined && <p className="text-[10px] text-muted-foreground">{duration}h</p>}
                          </div>
                        </button>
                      );
                    })}
                    {shifts.filter((s) => s.status === 'active').length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">No active shifts found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Start Date *
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> End Date (optional)
              </Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Selected employees chips */}
          {selectedEmployees.length > 0 && (
            <div className="flex-shrink-0 flex flex-wrap gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <p className="w-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5" /> {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''} selected
              </p>
              {selectedEmployees.map((emp) => (
                <Badge
                  key={emp.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1 rounded-full text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700">{getInitials(emp)}</AvatarFallback>
                  </Avatar>
                  {emp.firstName} {emp.lastName}
                  <button type="button" onClick={() => toggleEmployee(emp)} className="ml-0.5 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Employee search + list */}
          <div className="flex flex-col flex-1 overflow-hidden min-h-0 space-y-2">
            <Label className="text-xs font-semibold flex-shrink-0">Select Employees *</Label>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 rounded-xl text-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted/20 divide-y divide-border">
              {loadingEmployees ? (
                <div className="flex items-center justify-center p-8 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-sm text-muted-foreground">
                  <Users className="w-8 h-8 mb-2 opacity-30" />
                  No employees found
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployees.some((e) => e.id === emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 hover:bg-background text-left transition-colors',
                        isSelected && 'bg-indigo-50 dark:bg-indigo-950/30'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-muted-foreground/40'
                      )}>
                        {isSelected && <X className="w-3 h-3 text-white rotate-45" />}
                      </div>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={cn('text-xs font-bold', isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground')}>
                          {getInitials(emp)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {emp.employeeCode} • {emp.departmentName || emp.jobTitle || emp.email}
                        </p>
                      </div>
                      {emp.designationName && (
                        <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                          {emp.designationName}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedEmployees.length === 0 || !selectedShiftId}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Assigning...' : `Assign to ${selectedEmployees.length > 0 ? selectedEmployees.length : ''} Employee${selectedEmployees.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
