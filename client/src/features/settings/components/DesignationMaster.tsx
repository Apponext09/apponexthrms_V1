import React, { useState, useMemo } from 'react';
import { useDesignations, useDummyMappings, Designation } from '../hooks/useDesignations';
import {
  Search,
  Users,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Trash2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  Loader2,
  Building2,
  MapPin,
  Layers,
  Clock,
  Award,
  AlertCircle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface DesignationMasterProps {
  onCancel?: () => void;
}

function generateDesigCode(name: string): string {
  if (!name.trim()) return '';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 15);
}

export function DesignationMaster({ onCancel }: DesignationMasterProps) {
  const { designations, isLoading, createDesignation, updateDesignation, deleteDesignation } = useDesignations();
  const mappings = useDummyMappings();

  // Search & Filter state for Right-hand listing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesignationFilter, setSelectedDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form editing state
  const [selectedDesignationId, setSelectedDesignationId] = useState<string | number | 'NEW' | null>('NEW');

  const [formData, setFormData] = useState<Partial<Designation>>({
    name: '',
    code: '',
    description: '',
    status: 'active',
    mapped_companies: [],
    mapped_locations: [],
    mapped_departments: [],
    mapped_shifts: [],
    mapped_grades: [],
  });

  // Accordion & Section UI state
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('Company');
  const [accordionSearch, setAccordionSearch] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear field-level error
  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      code: selectedDesignationId === 'NEW' ? generateDesigCode(val) : prev.code,
    }));
    clearFieldError('name');
  };

  const handleCodeChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      code: val.toUpperCase(),
    }));
    clearFieldError('code');
  };

  const handleDescriptionChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      description: val,
    }));
  };

  // Filtered designations for right panel
  const filteredDesignations = useMemo(() => {
    let result = designations;

    // Name filter
    if (selectedDesignationFilter) {
      result = result.filter((d) => d.name === selectedDesignationFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((d) => (d.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.code?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [designations, searchQuery, selectedDesignationFilter, statusFilter]);

  const uniqueDesignationNames = useMemo(() => {
    const names = designations.map((d) => d.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [designations]);

  const handleSelect = (desig: any) => {
    setSelectedDesignationId(desig.id);

    const parseArr = (val: any) => {
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string' && val.trim()) {
        try {
          const p = JSON.parse(val);
          return Array.isArray(p) ? p.map(String) : [String(val)];
        } catch {
          return [String(val)];
        }
      }
      return [];
    };

    setFormData({
      name: desig.name || desig.designation_name || desig.designationName || desig.title || '',
      code: desig.code || desig.designation_code || desig.designationCode || '',
      description: desig.description || desig.desc || '',
      status: desig.status || 'active',
      mapped_companies: parseArr(desig.mapped_companies ?? desig.mappedCompanies ?? (desig.company_id ? [desig.company_id] : [])),
      mapped_locations: parseArr(desig.mapped_locations ?? desig.mappedLocations ?? (desig.location_id ? [desig.location_id] : [])),
      mapped_departments: parseArr(desig.mapped_departments ?? desig.mappedDepartments ?? (desig.department_id ? [desig.department_id] : [])),
      mapped_shifts: parseArr(desig.mapped_shifts ?? desig.mappedShifts),
      mapped_grades: parseArr(desig.mapped_grades ?? desig.mappedGrades),
    });

    setErrors({});
    setSubmitError(null);
  };

  const handleAddNew = () => {
    setSelectedDesignationId('NEW');
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'active',
      mapped_companies: [],
      mapped_locations: [],
      mapped_departments: [],
      mapped_shifts: [],
      mapped_grades: [],
    });
    setErrors({});
    setSubmitError(null);
  };

  const toggleAccordion = (name: string) => {
    setExpandedAccordion((prev) => (prev === name ? null : name));
  };

  const handleAccordionSearchChange = (accordionKey: string, query: string) => {
    setAccordionSearch((prev) => ({
      ...prev,
      [accordionKey]: query,
    }));
  };

  const handleSelectAllInAccordion = (field: keyof Designation, dataList: any[]) => {
    const current = (formData[field] as string[]) || [];
    const allIds = dataList.map((item, idx) => {
      const idVal = item.id ?? item.companyId ?? item.company_id ?? item.locationId ?? item.location_id ?? item.departmentId ?? item.department_id ?? item.gradeId ?? item.grade_id ?? item.code ?? idx;
      return String(idVal);
    });

    const isAllSelected = allIds.length > 0 && allIds.every((id) => current.includes(id));

    if (isAllSelected) {
      // Unselect all in this category
      setFormData((prev) => ({
        ...prev,
        [field]: current.filter((id) => !allIds.includes(id)),
      }));
    } else {
      // Select all in this category
      const merged = Array.from(new Set([...current, ...allIds]));
      setFormData((prev) => ({
        ...prev,
        [field]: merged,
      }));
    }
  };

  const handleCheckbox = (
    field: keyof Designation,
    id: string | number,
    isSingleSelect: boolean = false,
    categoryDataList: any[] = []
  ) => {
    const strId = String(id);
    const current = (formData[field] as string[]) || [];

    if (isSingleSelect && categoryDataList.length > 0) {
      const categoryIds = new Set(
        categoryDataList.map((item, idx) =>
          String(item.id ?? item.shiftId ?? item.shift_id ?? item.code ?? idx)
        )
      );
      const otherSelected = current.filter((x) => !categoryIds.has(String(x)));

      if (current.includes(strId)) {
        setFormData((prev) => ({ ...prev, [field]: otherSelected }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: [...otherSelected, strId] }));
      }
      return;
    }

    if (isSingleSelect) {
      if (current.includes(strId)) {
        setFormData((prev) => ({ ...prev, [field]: [] }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: [strId] }));
      }
      return;
    }

    if (current.includes(strId)) {
      setFormData((prev) => ({ ...prev, [field]: current.filter((x) => x !== strId) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: [...current, strId] }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Designation Name is required.';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Designation Name must be at least 2 characters.';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Designation Name cannot exceed 100 characters.';
    }

    return newErrors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstMsg = Object.values(validationErrors)[0];
      showToast.error('Validation Error', firstMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      const code = formData.code?.trim() || generateDesigCode(formData.name || '');
      const payload: Partial<Designation> = {
        ...formData,
        name: formData.name?.trim().toUpperCase(),
        code,
        description: formData.description?.trim() || undefined,
      };

      if (selectedDesignationId === 'NEW') {
        await createDesignation(payload);
        showToast.success('Designation Created', `${payload.name} created successfully.`);
        handleAddNew();
      } else if (selectedDesignationId) {
        await updateDesignation({ id: selectedDesignationId, data: payload });
        showToast.success('Designation Updated', `${payload.name} updated successfully.`);
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'An error occurred while saving.';
      setSubmitError(errMsg);
      showToast.error('Save Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render mapping accordion
  const renderAccordion = (
    title: string,
    field: keyof Designation,
    dataList: any[],
    icon: React.ElementType,
    isSingleSelect: boolean = false
  ) => {
    const Icon = icon;
    const isExpanded = expandedAccordion === title;
    const rawSelected = formData[field];
    let selectedList: string[] = [];
    if (Array.isArray(rawSelected)) {
      selectedList = rawSelected.map(String);
    } else if (typeof rawSelected === 'string' && (rawSelected as string).trim()) {
      try {
        const parsed = JSON.parse(rawSelected as string);
        selectedList = Array.isArray(parsed) ? parsed.map(String) : [String(rawSelected)];
      } catch {
        selectedList = [String(rawSelected)];
      }
    }

    // Filter by search inside accordion
    const q = (accordionSearch[title] || '').toLowerCase().trim();
    const filteredList = dataList.filter((item, idx) => {
      if (!q) return true;
      const itemName = (item.name || item.company_name || item.location_name || item.department_name || item.grade_name || item.code || '').toLowerCase();
      const itemCode = (item.code || '').toLowerCase();
      return itemName.includes(q) || itemCode.includes(q);
    });

    const totalSelectedInCategory = dataList.filter((item, idx) => {
      const itemId = item.id ?? item.companyId ?? item.company_id ?? item.locationId ?? item.location_id ?? item.departmentId ?? item.department_id ?? item.gradeId ?? item.grade_id ?? item.code ?? idx;
      return selectedList.includes(String(itemId));
    }).length;

    const isAllSelected = dataList.length > 0 && totalSelectedInCategory === dataList.length;

    return (
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs transition-all">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-3 bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
          onClick={() => toggleAccordion(title)}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground tracking-tight">{title} Mappings</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={totalSelectedInCategory > 0 ? "default" : "secondary"}
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                totalSelectedInCategory > 0 ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground"
              )}
            >
              {totalSelectedInCategory} Selected
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="p-3.5 bg-background border-t border-border/60 space-y-3">
            {/* Search and Select All Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={accordionSearch[title] || ''}
                  onChange={(e) => handleAccordionSearchChange(title, e.target.value)}
                  className="w-full h-8 pl-2.5 pr-7 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {!isSingleSelect && dataList.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectAllInAccordion(field, dataList)}
                  className="h-8 px-2.5 rounded-lg border border-input hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {isAllSelected ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 text-primary" /> Unselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5 text-muted-foreground" /> Select All
                    </>
                  )}
                </button>
              )}
            </div>

            {/* List options */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {mappings.isLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading options...
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-3 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border rounded-lg">
                  {q ? `No ${title.toLowerCase()} match "${q}"` : `No ${title.toLowerCase()} available.`}
                </div>
              ) : (
                filteredList.map((item, idx) => {
                  const itemId = item.id ?? item.companyId ?? item.company_id ?? item.locationId ?? item.location_id ?? item.departmentId ?? item.department_id ?? item.gradeId ?? item.grade_id ?? item.code ?? idx;
                  const strId = String(itemId);
                  const itemName = item.name || item.company_name || item.companyName || item.location_name || item.department_name || item.grade_name || item.code || `Item #${strId}`;
                  const itemCode = item.code || item.officeType || '';
                  const isChecked = selectedList.includes(strId);

                  return (
                    <label
                      key={strId}
                      className={cn(
                        'flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all text-xs font-medium border',
                        isChecked
                          ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-2xs'
                          : 'bg-card border-border/60 hover:bg-muted/40 text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type={isSingleSelect ? 'radio' : 'checkbox'}
                          className={cn(
                            'border-input text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer',
                            isSingleSelect ? 'rounded-full' : 'rounded'
                          )}
                          checked={isChecked}
                          onChange={() => handleCheckbox(field, strId, isSingleSelect, dataList)}
                          onClick={(e) => {
                            if (isSingleSelect && isChecked) {
                              e.preventDefault();
                              handleCheckbox(field, strId, isSingleSelect, dataList);
                            }
                          }}
                        />
                        <span className="truncate">{itemName}</span>
                      </div>

                      {itemCode && (
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted shrink-0">
                          {itemCode}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Add / Update Designation Form (lg:col-span-7)                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-6">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  {selectedDesignationId === 'NEW' ? 'Add Designation' : 'Edit Designation'}
                  {selectedDesignationId !== 'NEW' ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      {formData.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      New
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configure job designation details, code, and mapped organizational attributes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddNew}
                title="Reset Form"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* ─── SECTION 1: Designation Identity & Code ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span>1. Designation Information & Identity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>
                      Designation Name <span className="text-rose-500">*</span>
                    </span>
                    {formData.name && <span className="text-[10px] text-muted-foreground">{formData.name.length} chars</span>}
                  </label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. SENIOR SOFTWARE ENGINEER"
                    className={cn(
                      'h-10 text-xs bg-background rounded-xl uppercase font-semibold transition-all',
                      errors.name && 'border-rose-500 focus-visible:ring-rose-500 bg-rose-50/10'
                    )}
                  />
                  {errors.name && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Designation Code
                  </label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="DESIG-01"
                    className="h-10 text-xs bg-background rounded-xl font-mono font-bold uppercase transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Description & Job Profile Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Provide role summary, key expectations, or organizational notes..."
                  className="w-full p-3 border border-input rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium placeholder:text-muted-foreground/60 resize-none"
                />
              </div>
            </div>

            {/* ─── SECTION 2: Organizational Mappings ─── */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span>2. Organizational Mappings</span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Select mapped companies, locations, departments, shifts & grades
                </span>
              </div>

              <div className="space-y-2.5">
                {renderAccordion('Company', 'mapped_companies', mappings.companies, Building2)}
                {renderAccordion('Location', 'mapped_locations', mappings.locations, MapPin)}
                {renderAccordion('Department', 'mapped_departments', mappings.departments, Layers)}
                {renderAccordion('Shift', 'mapped_shifts', mappings.shifts, Clock, true)}
                {renderAccordion('Grade', 'mapped_grades', mappings.grades, Award)}
              </div>
            </div>

            {/* ─── SECTION 3: Designation Status ─── */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>3. Designation Status</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                <div>
                  <p className="font-bold text-foreground text-xs">Active Status</p>
                  <p className="text-[11px] text-muted-foreground">Inactive designations won't appear in employee allocations.</p>
                </div>
                <div className="flex border border-input rounded-xl overflow-hidden bg-muted/40 p-0.5 h-9 items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={cn(
                      'px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1',
                      formData.status === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                    className={cn(
                      'px-4 h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1',
                      formData.status === 'inactive'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <XCircle className="h-3.5 w-3.5" /> No
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-6 rounded-xl flex items-center gap-2 text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : selectedDesignationId !== 'NEW' ? (
                  <>
                    <Edit2 className="h-4 w-4 stroke-[2.5]" /> Update Designation
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 stroke-[2.5]" /> Add Designation
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAddNew}
                className="bg-muted hover:bg-muted/80 text-foreground font-bold h-10 px-5 rounded-xl flex items-center gap-1.5 text-xs border border-input shadow-xs transition-all cursor-pointer"
              >
                <X className="h-4 w-4 stroke-[2.5]" /> Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Designation Display List (lg:col-span-5)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
          {/* List Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Designations List</h3>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-foreground">
              {filteredDesignations.length} total
            </span>
          </div>

          {/* Top Filters & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-4">
              <select
                className="w-full h-8 px-2.5 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedDesignationFilter}
                onChange={(e) => setSelectedDesignationFilter(e.target.value)}
              >
                <option value="">All Names</option>
                {uniqueDesignationNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5 relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="sm:col-span-3">
              <select
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Designation Cards List */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading designations...
              </div>
            ) : filteredDesignations.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border rounded-xl">
                No designations found.
              </div>
            ) : (
              filteredDesignations.map((desig) => {
                const isSelected = selectedDesignationId === desig.id;
                const isActiveDesig = (desig.status || 'active').toLowerCase() === 'active';

                const compCount = desig.mapped_companies?.length || 0;
                const locCount = desig.mapped_locations?.length || 0;
                const deptCount = desig.mapped_departments?.length || 0;
                const gradeCount = desig.mapped_grades?.length || 0;

                return (
                  <div
                    key={desig.id}
                    onClick={() => handleSelect(desig)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40'
                    )}
                  >
                    {/* Top Row: Name, Code & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <h4 className="font-bold text-xs text-foreground truncate uppercase">{desig.name}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {desig.code && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                            {desig.code}
                          </span>
                        )}

                        {isActiveDesig ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase">
                            Inactive
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(desig);
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                            title="Edit Designation"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!await window.appConfirm(`Delete designation “${desig.name}”? This action cannot be undone.`)) return;

                              try {
                                await deleteDesignation(desig.id);
                                showToast.success('Designation deleted', `“${desig.name}” has been deleted successfully.`);
                                if (selectedDesignationId === desig.id) handleAddNew();
                              } catch (error: any) {
                                const message = error?.response?.data?.message || error?.message || 'Unable to delete this designation.';
                                showToast.error('Delete failed', message);
                              }
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                            title="Delete Designation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mapped Pills */}
                    {(compCount > 0 || locCount > 0 || deptCount > 0 || gradeCount > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {compCount > 0 && (
                          <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {compCount} {compCount === 1 ? 'Company' : 'Companies'}
                          </span>
                        )}
                        {locCount > 0 && (
                          <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {locCount} {locCount === 1 ? 'Location' : 'Locations'}
                          </span>
                        )}
                        {deptCount > 0 && (
                          <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
                            <Layers className="h-3 w-3" /> {deptCount} {deptCount === 1 ? 'Dept' : 'Depts'}
                          </span>
                        )}
                        {gradeCount > 0 && (
                          <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-md text-muted-foreground flex items-center gap-1">
                            <Award className="h-3 w-3" /> {gradeCount} {gradeCount === 1 ? 'Grade' : 'Grades'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
