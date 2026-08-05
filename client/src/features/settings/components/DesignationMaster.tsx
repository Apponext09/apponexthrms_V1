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
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DesignationMasterProps {
  onCancel?: () => void;
}

export function DesignationMaster({ onCancel }: DesignationMasterProps) {
  const { designations, isLoading, createDesignation, updateDesignation, deleteDesignation } = useDesignations();
  const mappings = useDummyMappings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDesignationFilter, setSelectedDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDesignationId, setSelectedDesignationId] = useState<string | number | 'NEW' | null>('NEW');

  const [formData, setFormData] = useState<Partial<Designation>>({
    name: '',
    code: '',
    status: 'active',
    mapped_companies: [],
    mapped_locations: [],
    mapped_departments: [],
    mapped_shifts: [],
    mapped_grades: [],
  });

  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDesignations = useMemo(() => {
    let result = designations;

    // Name filter
    if (selectedDesignationFilter) {
      result = result.filter(d => d.name === selectedDesignationFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(d => (d.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q));
    }

    return result;
  }, [designations, searchQuery, selectedDesignationFilter, statusFilter]);

  const uniqueDesignationNames = useMemo(() => {
    const names = designations.map(d => d.name);
    return Array.from(new Set(names)).sort();
  }, [designations]);

  const handleSelect = (desig: Designation) => {
    setSelectedDesignationId(desig.id);
    setFormData({
      name: desig.name,
      code: desig.code || '',
      status: desig.status || 'active',
      mapped_companies: Array.isArray(desig.mapped_companies) ? desig.mapped_companies : (typeof desig.mapped_companies === 'string' ? JSON.parse(desig.mapped_companies) : []),
      mapped_locations: Array.isArray(desig.mapped_locations) ? desig.mapped_locations : (typeof desig.mapped_locations === 'string' ? JSON.parse(desig.mapped_locations) : []),
      mapped_departments: Array.isArray(desig.mapped_departments) ? desig.mapped_departments : (typeof desig.mapped_departments === 'string' ? JSON.parse(desig.mapped_departments) : []),
      mapped_shifts: Array.isArray(desig.mapped_shifts) ? desig.mapped_shifts : (typeof desig.mapped_shifts === 'string' ? JSON.parse(desig.mapped_shifts) : []),
      mapped_grades: Array.isArray(desig.mapped_grades) ? desig.mapped_grades : (typeof desig.mapped_grades === 'string' ? JSON.parse(desig.mapped_grades) : []),
    });
  };

  const handleAddNew = () => {
    setSelectedDesignationId('NEW');
    setFormData({
      name: '',
      status: 'active',
      mapped_companies: [],
      mapped_locations: [],
      mapped_departments: [],
      mapped_shifts: [],
      mapped_grades: [],
    });
  };

  const toggleAccordion = (name: string) => {
    setExpandedAccordion(prev => prev === name ? null : name);
  };

  const handleCheckbox = (field: keyof Designation, id: string | number) => {
    const strId = String(id);
    const current = (formData[field] as string[]) || [];
    if (current.includes(strId)) {
      setFormData({ ...formData, [field]: current.filter(x => x !== strId) });
    } else {
      setFormData({ ...formData, [field]: [...current, strId] });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Designation Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedDesignationId === 'NEW') {
        await createDesignation(formData);
        toast.success('Designation created successfully!');
        handleAddNew();
      } else if (selectedDesignationId) {
        await updateDesignation({ id: selectedDesignationId, data: formData });
        toast.success('Designation updated successfully!');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAccordion = (title: string, field: keyof Designation, dataList: any[]) => {
    const isExpanded = expandedAccordion === title;
    const selectedCount = (formData[field] as string[])?.length || 0;

    return (
      <div className="border border-border/80 rounded-xl overflow-hidden bg-background shadow-xs transition-all">
        <button
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-left"
          onClick={() => toggleAccordion(title)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-bold text-xs text-foreground">{title} Mappings</span>
          </div>

        </button>

        {isExpanded && (
          <div className="p-3 bg-background border-t border-border/60 max-h-44 overflow-y-auto space-y-1.5">
            {dataList.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium p-1">No options available.</p>
            ) : (
              dataList.map(item => {
                const strId = String(item.id);
                const isChecked = ((formData[field] as string[]) || []).includes(strId);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium',
                      isChecked ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-input text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                      checked={isChecked}
                      onChange={() => handleCheckbox(field, item.id)}
                    />
                    <span className="truncate">{item.name}</span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: Designation Form (lg:col-span-7)                             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5 text-foreground">
          <form onSubmit={handleSave} className="space-y-5 text-xs font-semibold">

            {/* Form Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground tracking-tight">
                      {selectedDesignationId === 'NEW' ? 'Add Designation Information' : 'Edit Designation Information'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Configure job designation details, code, and mapped organizational attributes.
                    </p>
                  </div>
                </div>

                {selectedDesignationId !== 'NEW' && (
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    Editing Mode
                  </Badge>
                )}
              </div>

              {/* Input Fields Grid */}
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Designation Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. SENIOR ACCOUNTANT"
                  className="h-9 border-input bg-background text-foreground text-xs rounded-xl uppercase focus-visible:ring-2 focus-visible:ring-primary/20 font-medium"
                  required
                />
              </div>

              {/* Mappings Accordions Header */}
              <div className="space-y-2 pt-1">
                <label className="block text-foreground font-bold text-xs uppercase tracking-tight">
                  Organizational Mappings
                </label>
                {renderAccordion('Company', 'mapped_companies', mappings.companies)}
                {renderAccordion('Location', 'mapped_locations', mappings.locations)}
                {renderAccordion('Department', 'mapped_departments', mappings.departments)}
                {renderAccordion('General Shift', 'mapped_shifts', mappings.generalShifts)}
                {renderAccordion('Roster Shift', 'mapped_shifts', mappings.rosterShifts)}
                {renderAccordion('Grade', 'mapped_grades', mappings.grades)}
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-foreground font-bold">
                  Active Status
                </label>
                <div className="flex items-center border border-input rounded-xl overflow-hidden bg-background h-9 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={cn(
                      'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
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
                      'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                      formData.status === 'inactive'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <XCircle className="h-3.5 w-3.5" /> No
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : selectedDesignationId !== 'NEW' ? (
                    <><Check className="h-4 w-4 stroke-[2.5]" /> Update Designation</>
                  ) : (
                    <><Plus className="h-4 w-4 stroke-[2.5]" /> Add Designation</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleAddNew}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer"
                >
                  <X className="h-4 w-4 stroke-[2.5]" /> Cancel
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Designation Display List (lg:col-span-5)                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">

          {/* Top Filters & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-4">
              <select
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedDesignationFilter}
                onChange={e => setSelectedDesignationFilter(e.target.value)}
              >
                <option value="">All Names</option>
                {uniqueDesignationNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5 relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="sm:col-span-3">
              <select
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Title Bar with Count */}
          <div className="flex justify-between items-center border-b border-border pb-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs text-foreground tracking-tight uppercase">Designations List</span>
            </div>
            <Badge variant="secondary" className="font-bold text-[11px] px-2 py-0.5 rounded-lg bg-muted text-foreground">
              {filteredDesignations.length} total
            </Badge>
          </div>

          {/* Designation Cards List */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading designations...
              </div>
            ) : filteredDesignations.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border rounded-xl">
                No designations found.
              </div>
            ) : (
              filteredDesignations.map(desig => {
                const isSelected = selectedDesignationId === desig.id;

                return (
                  <div
                    key={desig.id}
                    onClick={() => handleSelect(desig)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer relative group flex items-center justify-between gap-3',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                        : 'border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-foreground truncate uppercase">{desig.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(desig.status || 'active').toLowerCase() === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this designation?')) {
                              deleteDesignation(desig.id);
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
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
