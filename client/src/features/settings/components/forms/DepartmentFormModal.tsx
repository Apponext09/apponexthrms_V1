import React, { useState, useEffect } from 'react';
import { useDepartment } from '../../hooks/useDepartments';
import { useCompanies } from '../../hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentFormModalProps {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  editingId?: string | number | null;
}

function generateDeptCode(name: string): string {
  if (!name.trim()) return '';
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 12);
}

export function DepartmentFormModal({ onSubmit, onClose, editingId }: DepartmentFormModalProps) {
  const { data: existingDeptResponse } = useDepartment(editingId || '');
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [email, setEmail] = useState('');
  const [colour, setColour] = useState('#00b4d8');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Company Accordion & Selection State
  const [isCompanyExpanded, setIsCompanyExpanded] = useState(true);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [defaultEmails, setDefaultEmails] = useState<Record<number, string>>({});

  useEffect(() => {
    const dept = (existingDeptResponse as any)?.data || existingDeptResponse;
    if (dept && (dept.name || dept.departmentName || dept.department_code)) {
      const name = dept.name || dept.departmentName || dept.department_name || '';
      const code = dept.code || dept.departmentCode || dept.department_code || '';
      setDepartmentName(name);
      setDepartmentCode(code);
      setEmail(dept.email || dept.departmentMail || '');
      setColour(dept.colour || dept.color || '#00b4d8');
      setDescription(dept.description || '');
      setIsActive(dept.is_active || dept.isActive || 'Yes');
      if (dept.company_id || dept.companyId) {
        setSelectedCompanyIds([Number(dept.company_id || dept.companyId)]);
      }
    }
  }, [existingDeptResponse]);

  const handleNameChange = (val: string) => {
    setDepartmentName(val);
    if (!editingId) {
      setDepartmentCode(generateDeptCode(val));
    }
  };

  const handleToggleSelectAllCompanies = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map((c) => c.id));
    }
  };

  const handleToggleCompany = (companyId: number) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!departmentName.trim()) {
      setSubmitError('Department Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const code = departmentCode.trim() || generateDeptCode(departmentName);
      const firstCompanyId = selectedCompanyIds.length > 0 ? selectedCompanyIds[0] : null;

      const payload = {
        name: departmentName.trim(),
        departmentName: departmentName.trim(),
        code,
        departmentCode: code,
        email: email.trim() || null,
        colour,
        color: colour,
        description: description.trim() || null,
        companyId: firstCompanyId,
        company_id: firstCompanyId,
        isActive,
        is_active: isActive,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save department. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {editingId ? 'Edit Department' : 'Add Department Information'}
              </h2>
              <p className="text-xs text-muted-foreground">Configure department details, email, color, and company mapping</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onFormSubmit} className="p-5 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
          {/* Department Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Department Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                value={departmentName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-9 text-xs"
                placeholder="e.g. Accounts / Human Resources"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">
                Department Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                className="h-9 text-xs uppercase font-mono"
                placeholder="DEPT-01"
              />
            </div>
          </div>

          {/* Email & Colour */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
                placeholder="department@company.com"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colour.startsWith('#') && colour.length === 7 ? colour : '#00b4d8'}
                  onChange={(e) => setColour(e.target.value)}
                  className="w-9 h-9 p-1 rounded-xl border border-input bg-background cursor-pointer flex-shrink-0"
                />
                <Input
                  type="text"
                  value={colour}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val && !val.startsWith('#')) val = '#' + val;
                    setColour(val);
                  }}
                  className="h-9 text-xs font-mono"
                  placeholder="#00b4d8"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs resize-none"
              placeholder="Department responsibilities and notes..."
              rows={3}
            />
          </div>

          {/* Company - Location Accordion */}
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              type="button"
              onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
              className="w-full p-2.5 bg-muted/60 hover:bg-muted transition-colors flex items-center justify-between font-bold text-foreground border-b border-border text-xs"
            >
              <span>[+] Company - Location <span className="text-rose-500">*</span></span>
              {isCompanyExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>

            {isCompanyExpanded && (
              <div className="p-3 bg-background space-y-2.5">
                <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer border-b border-border/40 pb-2 text-xs">
                  <input
                    type="checkbox"
                    checked={companies.length > 0 && selectedCompanyIds.length === companies.length}
                    onChange={handleToggleSelectAllCompanies}
                    className="h-3.5 w-3.5 rounded text-cyan-600 focus:ring-cyan-500 border-input"
                  />
                  <span>Select All</span>
                </label>

                {companiesLoading ? (
                  <div className="text-[11px] text-muted-foreground py-1 text-center">Loading companies...</div>
                ) : companies.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground py-1 text-center">No companies available.</div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {companies.map((comp) => {
                      const isChecked = selectedCompanyIds.includes(comp.id);
                      return (
                        <div key={comp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <label className="sm:col-span-6 flex items-center gap-2 text-foreground font-semibold cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCompany(comp.id)}
                              className="h-3.5 w-3.5 rounded text-cyan-600 focus:ring-cyan-500 border-input"
                            />
                            <span className="truncate">{comp.name}</span>
                          </label>

                          <div className="sm:col-span-6">
                            <Input
                              type="email"
                              value={defaultEmails[comp.id] || ''}
                              onChange={(e) =>
                                setDefaultEmails((prev) => ({ ...prev, [comp.id]: e.target.value }))
                              }
                              placeholder="Default Email"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Status */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Active</Label>
            <div className="inline-flex rounded-xl border border-border bg-muted p-1 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setIsActive('Yes')}
                className={cn(
                  'px-4 py-1 font-semibold rounded-lg transition-all',
                  isActive === 'Yes' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setIsActive('No')}
                className={cn(
                  'px-4 py-1 font-semibold rounded-lg transition-all',
                  isActive === 'No' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                No
              </button>
            </div>
          </div>

          {submitError && (
            <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {submitError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-border flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-700 rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                'Save Department'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
