import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter, Plus, X, ChevronDown, ChevronUp, Search } from 'lucide-react';

export interface ScopeOptionItem {
  id: string | number;
  name: string;
}

export type ScopeFieldKey =
  | 'companies'
  | 'locations'
  | 'departments'
  | 'subDepartments'
  | 'designations'
  | 'grades'
  | 'employeeTypes'
  | 'employeeStatuses';

export interface ScopeDefinition {
  fieldKey: ScopeFieldKey;
  label: string;
  cardTitle: string;
}

export const ALL_SCOPES: ScopeDefinition[] = [
  { fieldKey: 'employeeStatuses', label: 'Employment Status', cardTitle: 'Employment Status' },
  { fieldKey: 'companies', label: 'Custom Company', cardTitle: 'Company' },
  { fieldKey: 'locations', label: 'Custom Location', cardTitle: 'Location' },
  { fieldKey: 'departments', label: 'Custom Department', cardTitle: 'Department' },
  { fieldKey: 'designations', label: 'Custom Designation', cardTitle: 'Designation' },
  { fieldKey: 'grades', label: 'Custom Grade', cardTitle: 'Grade' },
  { fieldKey: 'subDepartments', label: 'Sub-Department', cardTitle: 'Sub-Department' },
  { fieldKey: 'employeeTypes', label: 'Employment Type', cardTitle: 'Employment Type' },
];

interface ScopeSelectPopoverProps {
  options: ScopeOptionItem[];
  selectedValues: (string | number)[];
  onChange: (newValues: (string | number)[]) => void;
  placeholder?: string;
}

const ScopeSelectPopover: React.FC<ScopeSelectPopoverProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'All',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

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
    (opt.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected =
    options.length > 0 &&
    options.every((opt) => selectedValues.some((v) => String(v) === String(opt.id)));

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

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const item = options.find((o) => String(o.id) === String(selectedValues[0]));
      return item ? item.name : String(selectedValues[0]);
    }
    if (isAllSelected) {
      return `All (${options.length})`;
    }
    return `${selectedValues.length} Selected`;
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-2.5 rounded-lg border border-border/60 dark:border-slate-700 bg-background dark:bg-slate-900 flex items-center justify-between gap-1.5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors shadow-2xs select-none"
      >
        <span
          className={`text-xs truncate ${
            selectedValues.length === 0
              ? 'text-muted-foreground dark:text-muted-foreground/70 font-medium'
              : 'text-foreground dark:text-slate-200 font-semibold'
          }`}
        >
          {getDisplayText()}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground/70 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Popover Content */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-xl shadow-2xl p-2.5 space-y-2 animate-in fade-in-50 zoom-in-95">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 text-muted-foreground/70 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-7 pr-2.5 text-xs bg-muted/30 dark:bg-slate-950 border border-border/60 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground dark:text-slate-200"
              autoFocus
            />
          </div>

          {/* Select All Row */}
          {options.length > 0 && (
            <div
              onClick={toggleSelectAll}
              className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-muted/30 dark:hover:bg-slate-800/60 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Select All</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70">
                {selectedValues.length}/{options.length}
              </span>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.some((v) => String(v) === String(opt.id));
                return (
                  <label
                    key={opt.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 dark:hover:bg-slate-800/70 text-xs text-foreground dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOption(opt.id)}
                    />
                    <span className="truncate flex-1">{opt.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground/70 italic">
                {options.length === 0 ? 'No options available' : 'No matches found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface LeaveScopeCardsProps {
  title?: string;
  description?: string;
  scopeData: Record<string, any[]>;
  onUpdateScope: (key: string, values: any[]) => void;
  companies?: { id: number | string; name: string }[];
  locations?: { id: number | string; name: string }[];
  departments?: { id: number | string; name: string }[];
  subDepartments?: { id: number | string; name: string }[];
  designations?: { id: number | string; name: string }[];
  grades?: ({ id?: number | string; name: string } | string)[];
  employeeTypes?: ({ id?: number | string; name: string } | string)[];
  employeeStatuses?: ({ id?: number | string; name: string } | string)[];
}

export const LeaveScopeCards: React.FC<LeaveScopeCardsProps> = ({
  title = 'Applies to',
  description = 'Leave this empty and this accrual applies to every employee.',
  scopeData = {},
  onUpdateScope,
  companies = [],
  locations = [],
  departments = [],
  subDepartments = [],
  designations = [],
  grades = [],
  employeeTypes = [],
  employeeStatuses = [],
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close "+ Add Scope" dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute active scopes
  const [activeScopes, setActiveScopes] = useState<ScopeFieldKey[]>(() => {
    const initial: ScopeFieldKey[] = [];
    ALL_SCOPES.forEach((s) => {
      const arr = scopeData[s.fieldKey];
      if (Array.isArray(arr) && arr.length > 0) {
        initial.push(s.fieldKey);
      }
    });
    // Default initial scopes if none have data yet
    if (initial.length === 0) {
      return ['companies', 'locations', 'departments'];
    }
    return initial;
  });

  // Keep activeScopes updated when external scopeData receives populated arrays
  useEffect(() => {
    ALL_SCOPES.forEach((s) => {
      const arr = scopeData[s.fieldKey];
      if (Array.isArray(arr) && arr.length > 0) {
        setActiveScopes((prev) => (prev.includes(s.fieldKey) ? prev : [...prev, s.fieldKey]));
      }
    });
  }, [scopeData]);

  // Format master options for each scope field
  const getOptionsForScope = (fieldKey: ScopeFieldKey): ScopeOptionItem[] => {
    switch (fieldKey) {
      case 'companies':
        return companies.map((c) => ({
          id: c.id,
          name: c.name || `Company ${c.id}`,
        }));
      case 'locations':
        return locations.map((l) => ({
          id: l.id,
          name: l.name || `Location ${l.id}`,
        }));
      case 'departments':
        return departments.map((d) => ({
          id: d.id,
          name: d.name || `Dept ${d.id}`,
        }));
      case 'subDepartments':
        return subDepartments.map((sd: any) => ({
          id: sd.id,
          name: sd.name || `Sub Dept ${sd.id}`,
        }));
      case 'designations':
        return designations.map((ds: any) => ({
          id: ds.id,
          name: ds.name || ds.designation_name || `Designation ${ds.id}`,
        }));
      case 'grades':
        return grades.map((g: any, idx: number) => ({
          id: typeof g === 'object' ? (g.id || g.name || idx + 1) : g,
          name: typeof g === 'object' ? (g.name || String(g.id)) : String(g),
        }));
      case 'employeeTypes':
        return employeeTypes.map((et: any, idx: number) => ({
          id: typeof et === 'object' ? (et.id || et.name || idx + 1) : et,
          name: typeof et === 'object' ? (et.name || String(et.id)) : String(et),
        }));
      case 'employeeStatuses':
        return employeeStatuses.map((es: any, idx: number) => ({
          id: typeof es === 'object' ? (es.id || es.name || idx + 1) : es,
          name: typeof es === 'object' ? (es.name || String(es.id)) : String(es),
        }));
      default:
        return [];
    }
  };

  const handleAddScope = (fieldKey: ScopeFieldKey) => {
    if (!activeScopes.includes(fieldKey)) {
      setActiveScopes((prev) => [...prev, fieldKey]);
    }
    setIsAddMenuOpen(false);
  };

  const handleRemoveScope = (fieldKey: ScopeFieldKey) => {
    setActiveScopes((prev) => prev.filter((k) => k !== fieldKey));
    onUpdateScope(fieldKey, []);
  };

  const unaddedScopes = ALL_SCOPES.filter((s) => !activeScopes.includes(s.fieldKey));

  return (
    <Card className="border border-border/60/90 dark:border-slate-800 shadow-2xs rounded-xl bg-background dark:bg-slate-950">
      <CardHeader className="bg-muted/30/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <CardTitle className="text-xs font-bold text-foreground dark:text-white">
            {title}
          </CardTitle>
        </div>
        <CardDescription className="text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start gap-3.5">
          {/* Active Scope Cards */}
          {activeScopes.map((fieldKey) => {
            const scopeDef = ALL_SCOPES.find((s) => s.fieldKey === fieldKey);
            if (!scopeDef) return null;

            const selectedValues = scopeData[fieldKey] || [];
            const options = getOptionsForScope(fieldKey);
            const selectedCount = selectedValues.length;

            return (
              <div
                key={fieldKey}
                className="relative w-full sm:w-64 md:w-64 p-3.5 rounded-xl border border-border/60/90 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900/40 shadow-2xs flex flex-col justify-between"
              >
                {/* Red Circular Close Badge (Top-Right) */}
                <button
                  type="button"
                  onClick={() => handleRemoveScope(fieldKey)}
                  className="absolute -top-2.5 -right-2.5 z-10 w-5 h-5 rounded-full bg-background dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center shadow-xs cursor-pointer transition-all"
                  title={`Remove ${scopeDef.cardTitle}`}
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                </button>

                {/* Scope Header */}
                <div className="flex items-center justify-between text-xs font-semibold mb-2.5 text-foreground dark:text-slate-200 select-none">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="text-[#1677ff] dark:text-blue-400 font-mono font-bold">[-]</span>
                    <span className="truncate text-foreground dark:text-slate-200 font-medium">{scopeDef.cardTitle}</span>
                  </div>
                  <span className="text-[11px] bg-muted/80 dark:bg-slate-800 text-muted-foreground dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold shrink-0">
                    {selectedCount}
                  </span>
                </div>

                {/* Scope Selector Popover */}
                <ScopeSelectPopover
                  options={options}
                  selectedValues={selectedValues}
                  onChange={(newVals) => onUpdateScope(fieldKey, newVals)}
                  placeholder="All"
                />
              </div>
            );
          })}

          {/* + Add Scope Dropdown Button */}
          {unaddedScopes.length > 0 && (
            <div className="relative inline-block self-start" ref={addMenuRef}>
              <button
                type="button"
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                className="bg-[#1677ff] hover:bg-[#0958d9] text-white font-medium text-xs px-4 h-9 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all select-none"
              >
                <span className="text-sm font-semibold leading-none">+</span>
                <span>Add Scope</span>
                {isAddMenuOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.5] ml-0.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] ml-0.5" />
                )}
              </button>

              {isAddMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-56 bg-background dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl p-1 overflow-hidden animate-in fade-in-50 zoom-in-95">
                  {unaddedScopes.map((scope) => (
                    <div
                      key={scope.fieldKey}
                      onClick={() => handleAddScope(scope.fieldKey)}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-foreground dark:text-slate-300 hover:bg-[#1677ff] hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors cursor-pointer select-none"
                    >
                      {scope.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
