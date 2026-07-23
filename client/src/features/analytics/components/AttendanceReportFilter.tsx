import React, { useState } from 'react';
import { Filter, RotateCcw, Smartphone, ChevronDown, Check, Calendar as CalendarIcon } from 'lucide-react';
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
  onOpenMobileTracking: () => void;
  isSubmitting?: boolean;
}

export function AttendanceReportFilter({
  onFilterSubmit,
  onOpenMobileTracking,
  isSubmitting = false,
}: AttendanceReportFilterProps) {
  const { data: optionsData } = useReportFilterOptions();

  // Selected multi-select states
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedReportingOfficers, setSelectedReportingOfficers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Base filter states
  const [status, setStatus] = useState<'active' | 'inactive' | 'both'>('active');
  const [fromDate, setFromDate] = useState<string>('2026-04-14');
  const [toDate, setToDate] = useState<string>('2026-07-23');
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
    setFromDate('2026-04-14');
    setToDate('2026-07-23');
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
      <div className="flex flex-col space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-9 px-3 text-xs font-normal bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md shadow-2xs transition-colors"
            >
              <span className="truncate">{labelCountText}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60 text-slate-600 dark:text-slate-400" />
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
    <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 sm:p-5 space-y-5">
      {/* Title Header */}
      <div className="pb-1 border-b border-border/50">
        <h2 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <span>Attendance Report</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Dropdowns - Company, Location, Department, Reporting Officer, Employee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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

        {/* Row 2: Status, From Date *, To Date *, Tabular View, Work Type, Inline Checkboxes */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4 pt-1">
          {/* Status */}
          <div className="flex flex-col space-y-1.5 w-full sm:w-36">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'both')}
              className="h-9 px-3 rounded-md border border-slate-300/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* From Date * */}
          <div className="flex flex-col space-y-1.5 w-full sm:w-40">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-0.5">
              <span>From Date</span>
              <span className="text-rose-500 font-bold">*</span>
            </Label>
            <div className="relative">
              <Input
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs pr-7 bg-slate-100/80 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* To Date * */}
          <div className="flex flex-col space-y-1.5 w-full sm:w-40">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-0.5">
              <span>To Date</span>
              <span className="text-rose-500 font-bold">*</span>
            </Label>
            <div className="relative">
              <Input
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs pr-7 bg-slate-100/80 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Tabular View Checkbox */}
          <div className="flex items-center space-x-2 h-9 pb-1">
            <Checkbox
              id="tabularView"
              checked={isTabularView}
              onCheckedChange={(checked) => setIsTabularView(!!checked)}
            />
            <label
              htmlFor="tabularView"
              className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap"
            >
              Tabular View
            </label>
          </div>

          {/* Work Type (Shown when Tabular View is checked) */}
          {isTabularView && (
            <div className="flex flex-col space-y-1.5 w-full sm:w-40 animate-in fade-in-50 duration-150">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Work Type</Label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as any)}
                className="h-9 px-3 rounded-md border border-slate-300/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="choose">Choose</option>
                <option value="full_day">Full day</option>
                <option value="half_day">Half day</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}
        </div>

        {/* Tabular View Extended Status Checkboxes (Matching Reference Screenshot layout) */}
        {isTabularView && (
          <div className="pt-2 animate-in fade-in-50 duration-200">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_present"
                  checked={statusFilters.present}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, present: !!c })}
                />
                <label htmlFor="cb_present" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  Present
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_leave"
                  checked={statusFilters.leave}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, leave: !!c })}
                />
                <label htmlFor="cb_leave" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  Leave
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_absent"
                  checked={statusFilters.absent}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, absent: !!c })}
                />
                <label htmlFor="cb_absent" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  Absent User(s)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_expected"
                  checked={statusFilters.expected}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, expected: !!c })}
                />
                <label htmlFor="cb_expected" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  Expected User(s)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_lateMark"
                  checked={statusFilters.lateMark}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, lateMark: !!c })}
                />
                <label htmlFor="cb_lateMark" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  Late Mark
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_shortWorking"
                  checked={statusFilters.shortWorkingHour}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, shortWorkingHour: !!c })}
                />
                <label htmlFor="cb_shortWorking" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  Short Working Hour
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_breakLog"
                  checked={statusFilters.breakLog}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, breakLog: !!c })}
                />
                <label htmlFor="cb_breakLog" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap">
                  Break Log
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cb_halfDay"
                  checked={statusFilters.halfDay}
                  onCheckedChange={(c) => setStatusFilters({ ...statusFilters, halfDay: !!c })}
                />
                <label htmlFor="cb_halfDay" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  Half Day
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Blue Submit / Filter Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#2b82b9] hover:bg-[#236d9c] text-white font-bold text-xs px-5 h-9 rounded-md shadow-2xs space-x-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Filtering...' : 'Filter'}</span>
          </Button>

          {/* Reset Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-semibold text-xs px-4 h-9 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </Button>

          {/* Mobile Tracking Records Green Button */}
          <Button
            type="button"
            onClick={onOpenMobileTracking}
            className="bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs px-4 h-9 rounded-md shadow-2xs space-x-1.5 transition-colors ml-auto sm:ml-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Tracking Records</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
