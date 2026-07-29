import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AttendanceReportFilterParams,
  useReportFilterOptions,
} from '../hooks/useAttendanceReports';
import { cn } from '@/lib/utils';

interface AttendanceReportFilterProps {
  onFilterSubmit: (filters: AttendanceReportFilterParams) => void;
  isSubmitting?: boolean;
}

export function AttendanceReportFilter({
  onFilterSubmit,
  isSubmitting = false,
}: AttendanceReportFilterProps) {
  const { data: optionsData } = useReportFilterOptions();

  // Selected multi-select states
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedReportingOfficers, setSelectedReportingOfficers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Dynamic date helpers
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get14DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  };

  // Base filter states
  const [status, setStatus] = useState<'active' | 'inactive' | 'both'>('active');
  const [fromDate, setFromDate] = useState<string>(get14DaysAgoStr());
  const [toDate, setToDate] = useState<string>(getTodayStr());
  const [isTabularView, setIsTabularView] = useState<boolean>(true);

  // Tabular specific filter states
  const [workType, setWorkType] = useState<'choose' | 'full_day' | 'half_day' | 'both'>('choose');
  const [statusFilters, setStatusFilters] = useState({
    present: true,
    leave: true,
    absent: true,
    expected: true,
    lateMark: false,
    shortWorkingHour: false,
    breakLog: true,
    halfDay: true,
  });

  const toggleMultiSelect = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    if (currentList.includes(id)) {
      setList(currentList.filter((item) => item !== id));
    } else {
      setList([...currentList, id]);
    }
  };

  const handleReset = () => {
    setSelectedCompanies([]);
    setSelectedLocations([]);
    setSelectedDepartments([]);
    setSelectedReportingOfficers([]);
    setSelectedEmployees([]);
    setStatus('active');
    setFromDate(get14DaysAgoStr());
    setToDate(getTodayStr());
    setIsTabularView(true);
    setWorkType('choose');
    setStatusFilters({
      present: true,
      leave: true,
      absent: true,
      expected: true,
      lateMark: false,
      shortWorkingHour: false,
      breakLog: true,
      halfDay: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterSubmit({
      companies: selectedCompanies,
      locations: selectedLocations,
      departments: selectedDepartments,
      reportingOfficers: selectedReportingOfficers,
      employees: selectedEmployees,
      status,
      fromDate,
      toDate,
      isTabularView,
      workType,
      statusFilters,
    });
  };

  // Render multi-select dropdown trigger button with exact background and chevron
  const renderMultiSelectDropdown = (
    label: string,
    selectedIds: string[],
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
    items: Array<{ id: string; name: string }>
  ) => {
    const isAllSelected = items.length > 0 && selectedIds.length === items.length;

    const handleToggleSelectAll = () => {
      if (isAllSelected) {
        setSelectedIds([]);
      } else {
        setSelectedIds(items.map((i) => i.id));
      }
    };

    const labelCountText = items.length > 0 && isAllSelected
      ? `${label} (All)`
      : `${label} (${selectedIds.length})`;

    return (
      <div className="flex flex-col space-y-1">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-8 px-2.5 text-xs font-semibold bg-background border border-border text-foreground rounded-md shadow-2xs transition-colors"
            >
              <span className="truncate">{labelCountText}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2 shadow-lg border border-slate-200 dark:border-slate-700 bg-popover" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No options available</p>
              ) : (
                <>
                  {/* Check All / Select All Option */}
                  <div
                    onClick={handleToggleSelectAll}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 font-bold mb-1 pb-1.5"
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        isAllSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                      )}
                    >
                      {isAllSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">Select All</span>
                  </div>

                  {items.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMultiSelect(selectedIds, setSelectedIds, item.id)}
                        className={cn(
                          'flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                          isChecked && 'bg-primary/10 font-semibold text-primary'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-2xs p-3.5 space-y-3.5">
      {/* Title Header */}
      <div className="pb-1 border-b border-border/60">
        <h2 className="text-xs font-extrabold text-foreground tracking-tight flex items-center gap-1.5 uppercase">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Attendance Report Filter</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {renderMultiSelectDropdown(
            'Company',
            selectedCompanies,
            setSelectedCompanies,
            optionsData?.companies || []
          )}
          {renderMultiSelectDropdown(
            'Location',
            selectedLocations,
            setSelectedLocations,
            optionsData?.locations || []
          )}
          {renderMultiSelectDropdown(
            'Department',
            selectedDepartments,
            setSelectedDepartments,
            optionsData?.departments || []
          )}
          {renderMultiSelectDropdown(
            'Reporting Officer',
            selectedReportingOfficers,
            setSelectedReportingOfficers,
            optionsData?.reportingOfficers || []
          )}
          {renderMultiSelectDropdown(
            'Employee',
            selectedEmployees,
            setSelectedEmployees,
            optionsData?.employees || []
          )}
        </div>

        {/* Row 2: Status, From Date *, To Date *, Tabular View, Work Type */}
        <div className="flex flex-wrap items-end gap-3 pt-1">
          {/* Status */}
          <div className="flex flex-col space-y-1 w-full sm:w-32">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'both')}
              className="h-8 px-2.5 rounded-md border border-border bg-background text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* From Date * */}
          <div className="flex flex-col space-y-1 w-full sm:w-36">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
              <span>From Date</span>
              <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs bg-background border-border text-foreground font-semibold"
            />
          </div>

          {/* To Date * */}
          <div className="flex flex-col space-y-1 w-full sm:w-36">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-0.5">
              <span>To Date</span>
              <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              type="date"
              required
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs bg-background border-border text-foreground font-semibold"
            />
          </div>

          {/* Tabular View Checkbox */}
          <div className="flex items-center space-x-2 h-8 pb-1">
            <Checkbox
              id="tabularView"
              checked={isTabularView}
              onCheckedChange={(checked) => setIsTabularView(!!checked)}
            />
            <label
              htmlFor="tabularView"
              className="text-xs font-bold text-foreground cursor-pointer select-none whitespace-nowrap"
            >
              Tabular View
            </label>
          </div>

          {/* Work Type */}
          {isTabularView && (
            <div className="flex flex-col space-y-1 w-full sm:w-36 animate-in fade-in-50 duration-150">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Work Type</Label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as any)}
                className="h-8 px-2.5 rounded-md border border-border bg-background text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="choose">Choose</option>
                <option value="full_day">Full day</option>
                <option value="half_day">Half day</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}
        </div>

        {/* Tabular View Extended Status Checkboxes */}
        {isTabularView && (
          <div className="pt-1 animate-in fade-in-50 duration-200">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/60">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_present"
                  checked={statusFilters.present}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, present: !!c })}
                />
                <label htmlFor="cb_present" className="text-xs font-medium text-foreground cursor-pointer">
                  Present
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_leave"
                  checked={statusFilters.leave}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, leave: !!c })}
                />
                <label htmlFor="cb_leave" className="text-xs font-medium text-foreground cursor-pointer">
                  Leave
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_absent"
                  checked={statusFilters.absent}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, absent: !!c })}
                />
                <label htmlFor="cb_absent" className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
                  Absent User(s)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_expected"
                  checked={statusFilters.expected}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, expected: !!c })}
                />
                <label htmlFor="cb_expected" className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
                  Expected User(s)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_lateMark"
                  checked={statusFilters.lateMark}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, lateMark: !!c })}
                />
                <label htmlFor="cb_lateMark" className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
                  Late Mark
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_shortWorking"
                  checked={statusFilters.shortWorkingHour}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, shortWorkingHour: !!c })}
                />
                <label htmlFor="cb_shortWorking" className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
                  Short Working Hour
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_breakLog"
                  checked={statusFilters.breakLog}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, breakLog: !!c })}
                />
                <label htmlFor="cb_breakLog" className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap">
                  Break Log
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_halfDay"
                  checked={statusFilters.halfDay}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, halfDay: !!c })}
                />
                <label htmlFor="cb_halfDay" className="text-xs font-medium text-foreground cursor-pointer">
                  Half Day
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4 h-8 rounded-md shadow-2xs gap-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Filtering...' : 'Apply Filter'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="font-semibold text-xs px-3 h-8 rounded-md gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Reset</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
