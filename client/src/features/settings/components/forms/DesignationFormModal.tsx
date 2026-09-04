import React, { useState, useEffect } from 'react';
import { useDesignations, useDummyMappings } from '../../hooks/useDesignations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, X, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesignationFormModalProps {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

function generateDesigCode(name: string): string {
  if (!name.trim()) return '';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 12);
}

export function DesignationFormModal({ onSubmit, onClose, editingId }: DesignationFormModalProps) {
  const { designations } = useDesignations();
  const mappings = useDummyMappings();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Mappings
  const [mappedCompanies, setMappedCompanies] = useState<string[]>([]);
  const [mappedLocations, setMappedLocations] = useState<string[]>([]);
  const [mappedDepartments, setMappedDepartments] = useState<string[]>([]);
  const [mappedShifts, setMappedShifts] = useState<string[]>([]);
  const [mappedGrades, setMappedGrades] = useState<string[]>([]);

  // Accordion open/close state
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('Company');

  useEffect(() => {
    if (editingId) {
      const desig = designations.find((d) => String(d.id) === String(editingId));
      if (desig) {
        setName(desig.name || '');
        setCode(desig.code || '');
        setDescription(desig.description || '');
        setStatus(desig.status || 'active');

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

        setMappedCompanies(parseArr(desig.mapped_companies ?? desig.mappedCompanies));
        setMappedLocations(parseArr(desig.mapped_locations ?? desig.mappedLocations));
        setMappedDepartments(parseArr(desig.mapped_departments ?? desig.mappedDepartments));
        setMappedShifts(parseArr(desig.mapped_shifts ?? desig.mappedShifts));
        setMappedGrades(parseArr(desig.mapped_grades ?? desig.mappedGrades));
      }
    }
  }, [editingId, designations]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setCode(generateDesigCode(val));
    }
  };

  const toggleAccordion = (accordionName: string) => {
    setExpandedAccordion((prev) => (prev === accordionName ? null : accordionName));
  };

  const handleCheckbox = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    id: string | number,
    isSingleSelect = false,
    categoryDataList: any[] = []
  ) => {
    const strId = String(id);

    if (isSingleSelect && categoryDataList.length > 0) {
      const categoryIds = new Set(
        categoryDataList.map((item, idx) =>
          String(item.id ?? item.shiftId ?? item.shift_id ?? item.code ?? idx)
        )
      );
      const otherSelected = currentList.filter((x) => !categoryIds.has(String(x)));

      if (currentList.includes(strId)) {
        setList(otherSelected);
      } else {
        setList([...otherSelected, strId]);
      }
      return;
    }

    if (isSingleSelect) {
      if (currentList.includes(strId)) {
        setList([]);
      } else {
        setList([strId]);
      }
      return;
    }

    if (currentList.includes(strId)) {
      setList(currentList.filter((x) => x !== strId));
    } else {
      setList([...currentList, strId]);
    }
  };

  const renderMappingAccordion = (
    title: string,
    list: any[],
    selectedList: string[],
    setSelectedList: React.Dispatch<React.SetStateAction<string[]>>,
    isSingleSelect = false
  ) => {
    const isExpanded = expandedAccordion === title;

    return (
      <div className="border border-border/80 rounded-xl overflow-hidden bg-background shadow-2xs transition-all">
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
          {selectedList.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {selectedList.length} selected
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="p-3 bg-background border-t border-border/60 max-h-40 overflow-y-auto space-y-1.5">
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground font-medium p-1">No options available.</p>
            ) : (
              list.map((item, idx) => {
                const itemId =
                  item.id ??
                  item.companyId ??
                  item.locationId ??
                  item.departmentId ??
                  item.gradeId ??
                  item.code ??
                  idx;
                const strId = String(itemId);
                const itemName =
                  item.name ||
                  item.company_name ||
                  item.companyName ||
                  item.location_name ||
                  item.department_name ||
                  item.grade_name ||
                  item.code ||
                  `Item #${strId}`;
                const isChecked = selectedList.includes(strId);

                return (
                  <label
                    key={strId}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium',
                      isChecked ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <input
                      type={isSingleSelect ? 'radio' : 'checkbox'}
                      className={cn(
                        'border-input text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer',
                        isSingleSelect ? 'rounded-full' : 'rounded'
                      )}
                      checked={isChecked}
                      onChange={() => handleCheckbox(selectedList, setSelectedList, strId, isSingleSelect, list)}
                      onClick={(e) => {
                        if (isSingleSelect && isChecked) {
                          e.preventDefault();
                          handleCheckbox(selectedList, setSelectedList, strId, isSingleSelect, list);
                        }
                      }}
                    />
                    <span className="truncate">{itemName}</span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError('Designation Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalCode = code.trim() || generateDesigCode(name);

      await onSubmit({
        name: name.trim(),
        code: finalCode,
        description: description.trim(),
        status,
        mapped_companies: mappedCompanies,
        mapped_locations: mappedLocations,
        mapped_departments: mappedDepartments,
        mapped_shifts: mappedShifts,
        mapped_grades: mappedGrades,
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save designation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground tracking-tight">
                {editingId ? 'Edit Designation' : 'Add New Designation'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure job title, code, and organizational mappings.
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-semibold">
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Designation Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Designation Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* Designation Code */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Designation Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SR-ENG"
                className="h-9 text-xs font-mono uppercase rounded-xl"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the job role and primary responsibilities..."
              className="text-xs rounded-xl min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* Organizational Mappings Accordions */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wide">
              Organizational Mappings
            </Label>
            {renderMappingAccordion('Company', mappings.companies, mappedCompanies, setMappedCompanies)}
            {renderMappingAccordion('Location', mappings.locations, mappedLocations, setMappedLocations)}
            {renderMappingAccordion('Department', mappings.departments, mappedDepartments, setMappedDepartments)}
            {renderMappingAccordion('General Shift', mappings.generalShifts, mappedShifts, setMappedShifts, true)}
            {renderMappingAccordion('Roster Shift', mappings.rosterShifts, mappedShifts, setMappedShifts, true)}
            {renderMappingAccordion('Grade', mappings.grades, mappedGrades, setMappedGrades)}
          </div>

          {/* Status Toggle */}
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs font-bold text-foreground">Active Status</Label>
            <div className="flex items-center border border-input rounded-xl overflow-hidden bg-background h-9 p-0.5">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={cn(
                  'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                  status === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={cn(
                  'flex-1 h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer',
                  status === 'inactive'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                <XCircle className="h-3.5 w-3.5" /> Inactive
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : editingId ? (
                'Update Designation'
              ) : (
                'Create Designation'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
