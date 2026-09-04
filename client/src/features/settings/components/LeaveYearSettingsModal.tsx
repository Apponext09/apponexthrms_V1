import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus, Calendar, ShieldCheck, ChevronDown, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export interface LeaveYearSettingItem {
  id?: number;
  organization_id?: number;
  company_id?: number | null;
  start_day: number;
  start_month: string;
  status: 'active' | 'inactive';
  is_default?: boolean;
  locations?: number[];
  departments?: number[];
  grades?: string[];
  companies?: number[];
}

interface LeaveYearSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingToEdit: LeaveYearSettingItem | null;
  onSaved: () => void;
  locationsList?: any[];
  departmentsList?: any[];
  gradesList?: any[];
  companiesList?: any[];
  subDepartmentsList?: any[];
  designationsList?: any[];
  employmentTypesList?: any[];
  employmentStatusesList?: any[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ALL_FILTER_OPTIONS = [
  'Company',
  'Location',
  'Department',
  'Sub Department',
  'Designation',
  'Employment Type',
  'Employment Status',
  'Grade',
];

interface FilterMultiSelectPopoverProps {
  options: { id: string | number; name: string; count?: number }[];
  selectedValues: (string | number)[];
  onChange: (newValues: (string | number)[]) => void;
}

const FilterMultiSelectPopover: React.FC<FilterMultiSelectPopoverProps> = ({
  options,
  selectedValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected = options.length > 0 && selectedValues.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.id));
    }
  };

  const toggleOption = (id: string | number) => {
    const isPresent = selectedValues.some((v) => String(v) === String(id));
    if (isPresent) {
      onChange(selectedValues.filter((v) => String(v) !== String(id)));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const removeChip = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => String(v) !== String(id)));
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[38px] p-1.5 rounded-xl border border-border/60 dark:border-slate-800 bg-background dark:bg-slate-900 flex items-center justify-between gap-2 cursor-pointer hover:border-border dark:hover:border-slate-700 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
          {selectedValues.length === 0 ? (
            <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 px-2 py-0.5">
              All
            </span>
          ) : (
            selectedValues.map((val) => {
              const item = options.find((o) => String(o.id) === String(val));
              const name = item ? item.name : String(val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] px-2.5 py-0.5 rounded-lg font-medium shadow-2xs"
                >
                  <span>{name}</span>
                  <X
                    className="w-3 h-3 hover:text-blue-900 dark:hover:text-white cursor-pointer"
                    onClick={(e) => removeChip(val, e)}
                  />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/70 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute left-0 top-11 z-50 w-72 bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl shadow-2xl p-3 space-y-2 animate-in fade-in-50 zoom-in-95">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground/70 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-muted/30 dark:bg-slate-950 border border-border/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Select All Row */}
          <div
            onClick={toggleSelectAll}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 dark:hover:bg-slate-800/60 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {}}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Select All</span>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {selectedValues.length}/{options.length}
            </span>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.map((opt) => {
              const isChecked = selectedValues.some((v) => String(v) === String(opt.id));
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 dark:hover:bg-slate-800/60 cursor-pointer select-none text-xs font-semibold text-foreground dark:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <span className="truncate">{opt.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 ml-2">
                    {opt.count ?? 0}
                  </span>
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="py-3 text-center text-xs text-muted-foreground/70 font-medium">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const LeaveYearSettingsModal: React.FC<LeaveYearSettingsModalProps> = ({
  isOpen,
  onClose,
  settingToEdit,
  onSaved,
  locationsList = [],
  departmentsList = [],
  gradesList = [],
  companiesList = [],
  subDepartmentsList = [],
  designationsList = [],
  employmentTypesList = [],
  employmentStatusesList = [],
}) => {
  const [startDay, setStartDay] = useState<number>(1);
  const [startMonth, setStartMonth] = useState<string>('April');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState<string[]>(['Company', 'Location', 'Grade']);

  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedSubDepartments, setSelectedSubDepartments] = useState<number[]>([]);
  const [selectedDesignations, setSelectedDesignations] = useState<number[]>([]);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([]);
  const [selectedEmploymentStatuses, setSelectedEmploymentStatuses] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>(['Grade 1']);

  const [isAddFilterOpen, setIsAddFilterOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (settingToEdit) {
      setStartDay(settingToEdit.start_day || 1);
      setStartMonth(settingToEdit.start_month || 'April');
      setIsActive(settingToEdit.status !== 'inactive');

      const locs = settingToEdit.locations || [];
      const depts = settingToEdit.departments || [];
      const grds = settingToEdit.grades || [];
      const comps = settingToEdit.companies || [];

      setSelectedLocations(locs);
      setSelectedDepartments(depts);
      setSelectedGrades(grds.length > 0 ? grds : []);
      setSelectedCompanies(comps);

      const filters: string[] = [];
      if (comps.length > 0) filters.push('Company');
      if (locs.length > 0) filters.push('Location');
      if (depts.length > 0) filters.push('Department');
      if (grds.length > 0) filters.push('Grade');
      setActiveFilters(filters.length > 0 ? filters : ['Company', 'Location', 'Grade']);
    } else {
      setStartDay(1);
      setStartMonth('April');
      setIsActive(true);
      setActiveFilters(['Company', 'Location', 'Grade']);
      setSelectedLocations([]);
      setSelectedDepartments([]);
      setSelectedGrades(['Grade 1']);
      setSelectedCompanies([]);
    }
  }, [settingToEdit, isOpen]);

  const handleAddFilter = (filterType: string) => {
    if (!activeFilters.includes(filterType)) {
      setActiveFilters((prev) => [...prev, filterType]);
    }
  };

  const handleRemoveFilter = (filterType: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filterType));
    if (filterType === 'Company') setSelectedCompanies([]);
    if (filterType === 'Location') setSelectedLocations([]);
    if (filterType === 'Department') setSelectedDepartments([]);
    if (filterType === 'Sub Department') setSelectedSubDepartments([]);
    if (filterType === 'Designation') setSelectedDesignations([]);
    if (filterType === 'Employment Type') setSelectedEmploymentTypes([]);
    if (filterType === 'Employment Status') setSelectedEmploymentStatuses([]);
    if (filterType === 'Grade') setSelectedGrades([]);
  };

  const getItemCount = (filterName: string): number => {
    if (filterName === 'Company') return selectedCompanies.length > 0 ? selectedCompanies.length : companiesList.length;
    if (filterName === 'Location') return selectedLocations.length > 0 ? selectedLocations.length : locationsList.length;
    if (filterName === 'Department') return selectedDepartments.length > 0 ? selectedDepartments.length : departmentsList.length;
    if (filterName === 'Sub Department') return selectedSubDepartments.length > 0 ? selectedSubDepartments.length : subDepartmentsList.length;
    if (filterName === 'Designation') return selectedDesignations.length > 0 ? selectedDesignations.length : designationsList.length;
    if (filterName === 'Employment Type') return selectedEmploymentTypes.length > 0 ? selectedEmploymentTypes.length : employmentTypesList.length;
    if (filterName === 'Employment Status') return selectedEmploymentStatuses.length > 0 ? selectedEmploymentStatuses.length : employmentStatusesList.length;
    if (filterName === 'Grade') return selectedGrades.length > 0 ? selectedGrades.length : gradesList.length;
    return 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      start_day: Number(startDay),
      start_month: startMonth,
      status: isActive ? 'active' : 'inactive',
      locations: selectedLocations,
      departments: selectedDepartments,
      grades: selectedGrades,
      companies: selectedCompanies,
    };

    try {
      if (settingToEdit?.id) {
        await apiClient.put(`/settings/leave-year-settings/${settingToEdit.id}`, payload);
        toast.success('Leave year setting updated successfully');
      } else {
        await apiClient.post('/settings/leave-year-settings', payload);
        toast.success('New leave year setting created successfully');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save leave year setting');
    } finally {
      setIsSaving(false);
    }
  };

  const daysCount = startMonth === 'February' ? 29 : 31;
  const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-background dark:bg-slate-950 border border-border/60 dark:border-slate-800 rounded-3xl shadow-2xl [&>button:last-child]:hidden">
        {/* Header */}
        <div className="bg-muted/30/80 dark:bg-slate-900 px-6 py-4 border-b border-border/60 dark:border-slate-800 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base font-extrabold text-foreground dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{settingToEdit?.id ? 'Edit leave year setting' : 'Add leave year setting'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground dark:text-muted-foreground/70 mt-0.5">
              The day and month the leave year starts on. Leave the filter empty and this applies to everyone.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 dark:bg-slate-800 text-muted-foreground hover:text-foreground dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {/* Start Day & Month Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-foreground dark:text-slate-200">
                Leave Year Start Day *
              </Label>
              <select
                value={startDay}
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="w-full h-10 mt-1.5 rounded-xl border border-border/60 dark:border-slate-800 bg-muted/30 dark:bg-slate-900 px-3 text-xs font-bold text-foreground dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {daysArray.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground dark:text-slate-200">
                Month *
              </Label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full h-10 mt-1.5 rounded-xl border border-border/60 dark:border-slate-800 bg-muted/30 dark:bg-slate-900 px-3 text-xs font-bold text-foreground dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Explanatory note */}
          <p className="text-[11px] text-muted-foreground dark:text-muted-foreground/70 bg-muted/30 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
            The leave year begins on this day and month, every year. The day list follows the month — February offers 29, which falls back to the 28th in years that have no 29th.
          </p>

          {/* Active Switch */}
          <div className="flex items-center gap-3 pt-1">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-indigo-600 cursor-pointer"
            />
            <span className="text-xs font-extrabold text-foreground dark:text-slate-200">
              Active
            </span>
          </div>

          {/* Applies to Section */}
          <div className="border border-border/60/90 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 bg-muted/30/30 dark:bg-slate-900/10">
            <div>
              <h4 className="text-sm font-extrabold text-foreground dark:text-white">Applies to</h4>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/70 mt-0.5">
                Leave this empty and the setting applies to every employee. Two settings cannot use the same filter.
              </p>
            </div>

            {/* Filter Cards Grid */}
            {activeFilters.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeFilters.map((f) => (
                  <div key={f} className="relative rounded-2xl shadow-2xs">
                    {/* Red Floating Close Badge */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFilter(f)}
                      className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 rounded-full bg-background border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-xs cursor-pointer transition-all"
                      title="Remove filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Card Header */}
                    <div className="bg-muted/30/90 dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-t-xl px-3.5 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground dark:text-slate-200">
                        <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">[-]</span>
                        <span>{f}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground/70">
                        {getItemCount(f)}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="bg-background dark:bg-slate-950 border-x border-b border-border/60 dark:border-slate-800 rounded-b-xl p-2.5 min-h-[52px] flex items-center">
                      {f === 'Company' && (
                        <FilterMultiSelectPopover
                          options={companiesList.map((c: any) => ({
                            id: c.id,
                            name: c.name || c.company_name || `Company ${c.id}`,
                            count: c.count ?? 0,
                          }))}
                          selectedValues={selectedCompanies}
                          onChange={(vals) => setSelectedCompanies(vals.map(Number))}
                        />
                      )}

                      {f === 'Location' && (
                        <FilterMultiSelectPopover
                          options={locationsList.map((l: any) => ({
                            id: l.id,
                            name: l.name || l.location_name || `Location ${l.id}`,
                            count: l.count ?? 0,
                          }))}
                          selectedValues={selectedLocations}
                          onChange={(vals) => setSelectedLocations(vals.map(Number))}
                        />
                      )}

                      {f === 'Department' && (
                        <FilterMultiSelectPopover
                          options={departmentsList.map((d: any) => ({
                            id: d.id,
                            name: d.name || d.department_name || `Dept ${d.id}`,
                            count: d.count ?? 0,
                          }))}
                          selectedValues={selectedDepartments}
                          onChange={(vals) => setSelectedDepartments(vals.map(Number))}
                        />
                      )}

                      {f === 'Sub Department' && (
                        <FilterMultiSelectPopover
                          options={subDepartmentsList.map((sd: any) => ({
                            id: sd.id,
                            name: sd.name || `Sub Dept ${sd.id}`,
                            count: sd.count ?? 0,
                          }))}
                          selectedValues={selectedSubDepartments}
                          onChange={(vals) => setSelectedSubDepartments(vals.map(Number))}
                        />
                      )}

                      {f === 'Designation' && (
                        <FilterMultiSelectPopover
                          options={designationsList.map((ds: any) => ({
                            id: ds.id,
                            name: ds.name || ds.designation_name || `Designation ${ds.id}`,
                            count: ds.count ?? 0,
                          }))}
                          selectedValues={selectedDesignations}
                          onChange={(vals) => setSelectedDesignations(vals.map(Number))}
                        />
                      )}

                      {f === 'Grade' && (
                        <FilterMultiSelectPopover
                          options={gradesList.map((g: any) => ({
                            id: g.id || g.name || g.grade_name,
                            name: g.name || g.grade_name || String(g.id),
                            count: g.count ?? 0,
                          }))}
                          selectedValues={selectedGrades}
                          onChange={(vals) => setSelectedGrades(vals.map(String))}
                        />
                      )}

                      {f === 'Employment Type' && (
                        <FilterMultiSelectPopover
                          options={employmentTypesList.map((et: any) => ({
                            id: et.id || et.name,
                            name: et.name || et.type_name,
                            count: et.count ?? 0,
                          }))}
                          selectedValues={selectedEmploymentTypes}
                          onChange={(vals) => setSelectedEmploymentTypes(vals.map(String))}
                        />
                      )}

                      {f === 'Employment Status' && (
                        <FilterMultiSelectPopover
                          options={employmentStatusesList.map((es: any) => ({
                            id: es.id || es.name,
                            name: es.name || es.status_name,
                            count: es.count ?? 0,
                          }))}
                          selectedValues={selectedEmploymentStatuses}
                          onChange={(vals) => setSelectedEmploymentStatuses(vals.map(String))}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* + Add Filter Dropdown Button */}
            <div className="relative inline-block pt-1">
              <Button
                type="button"
                onClick={() => setIsAddFilterOpen(!isAddFilterOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 h-9 rounded-xl flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add filter</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAddFilterOpen ? 'rotate-180' : ''}`} />
              </Button>

              {isAddFilterOpen && (
                <div className="absolute left-0 bottom-11 z-30 w-56 bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95">
                  {ALL_FILTER_OPTIONS.filter((f) => !activeFilters.includes(f)).map((filterName) => (
                    <button
                      key={filterName}
                      type="button"
                      onClick={() => {
                        handleAddFilter(filterName);
                        setIsAddFilterOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-foreground dark:text-slate-300 hover:bg-muted/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{filterName}</span>
                    </button>
                  ))}
                  {ALL_FILTER_OPTIONS.filter((f) => !activeFilters.includes(f)).length === 0 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground/70 font-medium">All filters added</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-5 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 px-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
