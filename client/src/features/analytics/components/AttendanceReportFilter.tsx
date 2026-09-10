import React, { useState, useEffect, useRef } from 'react';
import { Filter, RotateCcw, ChevronDown, Check, Building2, Lock } from 'lucide-react';
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
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedReportingOfficers, setSelectedReportingOfficers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get14DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  };

  const [status, setStatus] = useState<'active' | 'inactive' | 'both'>('active');
  const [fromDate, setFromDate] = useState<string>(get14DaysAgoStr());
  const [toDate, setToDate] = useState<string>(getTodayStr());
  const [isTabularView, setIsTabularView] = useState<boolean>(true);
  const [workType, setWorkType] = useState<'choose' | 'full_day' | 'half_day' | 'both'>('choose');
  const defaultStatusFilters = {
    present: true,
    leave: true,
    absent: true,
    expected: true,
    lateMark: false,
    shortWorkingHour: false,
    breakLog: false,
    halfDay: true,
  };

  const [statusFilters, setStatusFilters] = useState(defaultStatusFilters);

  const { data: optionsData, isLoading: isLoadingOptions } = useReportFilterOptions(
    selectedCompany || null,
    selectedDepartments
  );

  const isCompanySelected = !!selectedCompany;

  // Narrow the Employee list to the selected department(s); drop any
  // previously selected employee who no longer belongs to that department.
  const isFirstDeptRender = useRef(true);
  useEffect(() => {
    if (isFirstDeptRender.current) {
      isFirstDeptRender.current = false;
      return;
    }
    setSelectedEmployees([]);
  }, [selectedDepartments]);

  const handleSelectCompany = (id: string, name: string) => {
    if (selectedCompany === id) {
      // Toggle off — deselect
      setSelectedCompany('');
      setSelectedCompanyName('');
    } else {
      setSelectedCompany(id);
      setSelectedCompanyName(name);
    }
    // Always close the dropdown immediately — enforces single-select
    setCompanyDropdownOpen(false);
    // Always reset dependents on any company change
    setSelectedLocations([]);
    setSelectedDepartments([]);
    setSelectedReportingOfficers([]);
    setSelectedEmployees([]);
  };

  const toggleMultiSelect = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    setList(currentList.includes(id)
      ? currentList.filter((item) => item !== id)
      : [...currentList, id]
    );
  };

  const handleReset = () => {
    setSelectedCompany('');
    setSelectedCompanyName('');
    setCompanyDropdownOpen(false);
    setSelectedLocations([]);
    setSelectedDepartments([]);
    setSelectedReportingOfficers([]);
    setSelectedEmployees([]);
    setStatus('active');
    setFromDate(get14DaysAgoStr());
    setToDate(getTodayStr());
    setIsTabularView(true);
    setWorkType('choose');
    setStatusFilters(defaultStatusFilters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterSubmit({
      companies: selectedCompany ? [selectedCompany] : ['all'],
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

  const renderCompanyDropdown = () => {
    const companies = optionsData?.companies || [];
    const label = selectedCompanyName ? selectedCompanyName : 'All Companies';

    return (
      <div className="flex flex-col space-y-1">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          Company
        </Label>
        <Popover open={companyDropdownOpen} onOpenChange={setCompanyDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                'w-full justify-between h-8 px-2.5 text-xs font-semibold bg-background border border-border text-foreground rounded-md shadow-2xs transition-colors',
                selectedCompany && 'border-primary/50 bg-primary/5 text-primary'
              )}
            >
              <span className="truncate">{label}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 shadow-lg border border-slate-200 dark:border-slate-700 bg-popover" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
              {isLoadingOptions ? (
                <p className="text-xs text-muted-foreground p-2 animate-pulse">Loading companies...</p>
              ) : (
                <>
                  <div
                    onClick={() => handleSelectCompany('', '')}
                    className={cn(
                      'flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 mb-1 pb-1.5 font-bold',
                      !selectedCompany && 'bg-primary/10 text-primary'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center transition-colors flex-shrink-0',
                      !selectedCompany ? 'bg-primary border-primary' : 'border-slate-400 dark:border-slate-600'
                    )}>
                      {!selectedCompany && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span>All Companies (Select All)</span>
                  </div>
                  {companies.map((company: { id: string | number; name: string }) => {
                    const isSelected = selectedCompany === String(company.id);
                    return (
                      <div
                        key={company.id}
                        onClick={() => handleSelectCompany(String(company.id), company.name)}
                        className={cn(
                          'flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                          isSelected && 'bg-primary/10 font-semibold text-primary'
                        )}
                      >
                        <div className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center transition-colors flex-shrink-0',
                          isSelected ? 'bg-primary border-primary' : 'border-slate-400 dark:border-slate-600'
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="truncate">{company.name}</span>
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

  const renderMultiSelectDropdown = (
    label: string,
    selectedIds: string[],
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
    items: Array<{ id: string; name: string }>,
    disabled = false
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

    if (disabled) {
      return (
        <div className="flex flex-col space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">{label}</Label>
          <div
            title="Select a company first to enable this filter"
            className="flex items-center justify-between h-8 px-2.5 text-xs font-semibold bg-muted/40 border border-dashed border-border/50 text-muted-foreground/50 rounded-md cursor-not-allowed select-none"
          >
            <span className="truncate italic text-[11px]">Select company first</span>
            <Lock className="ml-1 h-3 w-3 shrink-0 text-muted-foreground/40" />
          </div>
        </div>
      );
    }

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
                  <div
                    onClick={handleToggleSelectAll}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 font-bold mb-1 pb-1.5"
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isAllSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                    )}>
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
                        <div className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                          isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                        )}>
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
      <div className="pb-1 border-b border-border/60">
        <h2 className="text-xs font-extrabold text-foreground tracking-tight flex items-center gap-1.5 uppercase">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Attendance Report Filter</span>
          {isCompanySelected && (
            <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full normal-case tracking-normal">
              Showing: {selectedCompanyName}
            </span>
          )}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {renderCompanyDropdown()}
          {renderMultiSelectDropdown(
            'Department',
            selectedDepartments,
            setSelectedDepartments,
            optionsData?.departments || [],
            false
          )}
          {renderMultiSelectDropdown(
            'Reporting Officer',
            selectedReportingOfficers,
            setSelectedReportingOfficers,
            optionsData?.reportingOfficers || [],
            false
          )}
          {renderMultiSelectDropdown(
            'Employee',
            selectedEmployees,
            setSelectedEmployees,
            optionsData?.employees || [],
            false
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 pt-1">
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

        {isTabularView && (
          <div className="pt-1 animate-in fade-in-50 duration-200">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/60">
              {[
                { key: 'present', label: 'Present' },
                { key: 'leave', label: 'Leave' },
                { key: 'absent', label: 'Absent User(s)' },
                { key: 'expected', label: 'Expected User(s)' },
                { key: 'lateMark', label: 'Late Mark' },
                { key: 'shortWorkingHour', label: 'Short Working Hour' },
                { key: 'breakLog', label: 'Break Log' },
                { key: 'halfDay', label: 'Half Day' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cb_${key}`}
                    checked={statusFilters[key as keyof typeof statusFilters]}
                    onCheckedChange={(c) =>
                      setStatusFilters({ ...statusFilters, [key]: !!c })
                    }
                  />
                  <label
                    htmlFor={`cb_${key}`}
                    className="text-xs font-medium text-foreground cursor-pointer whitespace-nowrap"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

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
