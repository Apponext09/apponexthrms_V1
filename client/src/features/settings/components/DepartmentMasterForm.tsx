import React, { useState } from 'react';
import {
  Plus, X, Info, Layers, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, Building2, MapPin, Mail, Palette, Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments';
import { useCompanies } from '../hooks/useCompanies';
import { showToast } from '@/components/ui/toast';

interface DepartmentMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: any) => void;
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

export function DepartmentMasterForm({ onCancel, onSave }: DepartmentMasterFormProps) {
  const { data: deptResponse, isLoading: deptsLoading } = useDepartments(1, 100);
  const { data: companies = [], isLoading: companiesLoading } = useCompanies();

  const createDeptMutation = useCreateDepartment();
  const updateDeptMutation = useUpdateDepartment();

  const deptList = (deptResponse?.data || deptResponse?.items || deptResponse || []) as any[];

  // Right Side Display Panel Filter & Search State
  const [displaySearch, setDisplaySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Form State (Left Side)
  const [editingId, setEditingId] = useState<number | string | null>(null);
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

  // UI State
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setDepartmentName(val);
    if (!editingId) {
      setDepartmentCode(generateDeptCode(val));
    }
  };

  const handleSelectForEdit = (dept: any) => {
    setEditingId(dept.id);
    setDepartmentName(dept.name || dept.departmentName || '');
    setDepartmentCode(dept.code || dept.departmentCode || '');
    setEmail(dept.email || '');
    setColour(dept.colour || dept.color || '#00b4d8');
    setDescription(dept.description || '');
    const isInactive = dept.status === 'Inactive' || dept.is_active === 'No' || dept.isActive === 'No';
    setIsActive(isInactive ? 'No' : 'Yes');
    const compId = dept.company_id || dept.companyId;
    if (compId) {
      setSelectedCompanyIds([Number(compId)]);
    } else {
      setSelectedCompanyIds([]);
    }
    setSubmitError(null);
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

  const resetForm = () => {
    setEditingId(null);
    setDepartmentName('');
    setDepartmentCode('');
    setEmail('');
    setColour('#00b4d8');
    setDescription('');
    setIsActive('Yes');
    setSelectedCompanyIds([]);
    setDefaultEmails({});
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!departmentName.trim()) {
      setSubmitError('Department Name is required.');
      return;
    }

    try {
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

      if (editingId) {
        const result = await updateDeptMutation.mutateAsync({ id: editingId, data: payload as any });
        if (onSave) onSave(result);
        showToast.success('Department Updated', `${departmentName} updated successfully.`);
      } else {
        const result = await createDeptMutation.mutateAsync(payload as any);
        if (onSave) onSave(result);
        showToast.success('Department Created', `${departmentName} created successfully.`);
      }
      resetForm();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save department. Please try again.');
    }
  };

  // Filtered list for display panel
  const filteredDepartments = deptList.filter((d) => {
    const active = d.is_active === 'Yes' || d.isActive === 'Yes' || d.status === 'active';
    if (statusFilter === 'Active' && !active) return false;
    if (statusFilter === 'Inactive' && active) return false;

    if (displaySearch.trim()) {
      const q = displaySearch.toLowerCase();
      const name = (d.name || d.departmentName || '').toLowerCase();
      const code = (d.code || d.departmentCode || '').toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form Card (lg:col-span-7), Right Display List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Add / Update Department Information Form (lg:col-span-7)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 md:p-6 shadow-xs text-foreground space-y-5">
          
          {/* Title Bar */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {editingId ? <Edit2 className="w-4.5 h-4.5" /> : <Plus className="w-4.5 h-4.5 stroke-[2.5]" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground tracking-tight">
                  {editingId ? 'Update Department Information' : 'Add Department Information'}
                </h3>
                <p className="text-[11px] text-muted-foreground">Configure department name, code, email, theme color, and company mapping.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            {/* Department Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-foreground font-bold">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Accounts / Human Resources"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                  placeholder="DEPT-01"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-medium"
                />
              </div>
            </div>

            {/* Email & Colour */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Department Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="department@company.com"
                  className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-foreground font-bold">
                  Badge / Accent Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colour.startsWith('#') && colour.length === 7 ? colour : '#00b4d8'}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-9 h-9 p-1 rounded-xl border border-input bg-background cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val && !val.startsWith('#')) val = '#' + val;
                      setColour(val);
                    }}
                    placeholder="#00b4d8"
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-foreground font-bold">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Department responsibilities and notes..."
                className="w-full p-3 border border-input rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/60 resize-none"
              />
            </div>

            {/* Company - Location Accordion Section */}
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
              <button
                type="button"
                onClick={() => setIsCompanyExpanded(!isCompanyExpanded)}
                className="w-full p-2.5 bg-muted/60 hover:bg-muted transition-colors flex items-center justify-between font-bold text-foreground border-b border-border text-xs cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span>Company Assignment <span className="text-rose-500">*</span></span>
                </span>
                {isCompanyExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {isCompanyExpanded && (
                <div className="p-3.5 bg-background space-y-3">
                  <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer border-b border-border/40 pb-2.5 text-xs">
                    <input
                      type="checkbox"
                      checked={companies.length > 0 && selectedCompanyIds.length === companies.length}
                      onChange={handleToggleSelectAllCompanies}
                      className="h-3.5 w-3.5 rounded text-primary focus:ring-primary border-input cursor-pointer"
                    />
                    <span>Select All Companies</span>
                  </label>

                  {companiesLoading ? (
                    <div className="text-[11px] text-muted-foreground py-2 text-center">Loading companies...</div>
                  ) : companies.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground py-2 text-center">No companies available yet.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {companies.map((comp) => {
                        const isChecked = selectedCompanyIds.includes(comp.id);
                        return (
                          <div key={comp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            <label className="sm:col-span-6 flex items-center gap-2 text-foreground font-semibold cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCompany(comp.id)}
                                className="h-3.5 w-3.5 rounded text-primary focus:ring-primary border-input cursor-pointer"
                              />
                              <span>{comp.name}</span>
                            </label>

                            <div className="sm:col-span-6">
                              <input
                                type="email"
                                value={defaultEmails[comp.id] || ''}
                                onChange={(e) =>
                                  setDefaultEmails((prev) => ({ ...prev, [comp.id]: e.target.value }))
                                }
                                placeholder="Company Dept Email"
                                className="w-full h-8 px-3 border border-input rounded-xl bg-background text-foreground text-xs font-medium placeholder:text-muted-foreground/60"
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

            {/* Active Status Toggle */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-foreground font-bold">
                Active Status
              </label>
              <div className="flex border border-input rounded-xl w-fit overflow-hidden bg-muted/30 p-0.5 h-9 items-center">
                <button
                  type="button"
                  onClick={() => setIsActive('Yes')}
                  className={cn(
                    'px-5 h-full text-xs font-bold rounded-lg transition-all cursor-pointer',
                    isActive === 'Yes' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive('No')}
                  className={cn(
                    'px-5 h-full text-xs font-bold rounded-lg transition-all cursor-pointer',
                    isActive === 'No' ? 'bg-rose-600 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  No
                </button>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="submit"
                disabled={createDeptMutation.isPending || updateDeptMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                {createDeptMutation.isPending || updateDeptMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : editingId ? (
                  <><Edit2 className="h-4 w-4 stroke-[2.5]" /> Update Department</>
                ) : (
                  <><Plus className="h-4 w-4 stroke-[2.5]" /> Add Department</>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="bg-muted hover:bg-muted/80 text-foreground font-bold h-9 px-5 rounded-xl flex items-center gap-1.5 text-xs border border-input shadow-xs transition-all cursor-pointer"
              >
                <X className="h-4 w-4 stroke-[2.5]" /> Cancel
              </button>
            </div>
          </form>
        </div>


        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Department Display Panel (lg:col-span-5)                    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
          
          {/* List Header Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">
                Departments List
              </h3>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-muted text-foreground">
              {filteredDepartments.length}
            </span>
          </div>

          {/* Top Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2.5 border border-input rounded-xl bg-background text-foreground font-semibold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All Status</option>
              </select>
            </div>

            <div className="sm:col-span-8 relative">
              <input
                type="text"
                value={displaySearch}
                onChange={(e) => setDisplaySearch(e.target.value)}
                placeholder="Search departments..."
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Department List Items */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
            {deptsLoading ? (
              <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-primary" />
                <p>Loading departments...</p>
              </div>
            ) : filteredDepartments.map((dept: any) => {
              const name = dept.name || dept.departmentName || 'Department';
              const code = dept.code || dept.departmentCode || '';
              const itemColour = dept.colour || dept.color || '#00b4d8';
              const isSelected = editingId === dept.id;
              const isActiveDept = dept.is_active === 'Yes' || dept.isActive === 'Yes' || dept.status === 'active';

              return (
                <div
                  key={dept.id}
                  onClick={() => handleSelectForEdit(dept)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col gap-2',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                      : 'border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40'
                  )}
                >
                  {/* Top Row: Name, Color Circle & Code */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/20"
                        style={{ backgroundColor: itemColour }}
                      />
                      <h4 className="font-bold text-xs text-foreground truncate">{name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {code && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary shrink-0">
                          {code}
                        </span>
                      )}
                      {isActiveDept ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description if present */}
                  {dept.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                      {dept.description}
                    </p>
                  )}

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
                    <span>Click to edit or manage</span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground/70">
                      ID: #{dept.id}
                    </span>
                  </div>
                </div>
              );
            })}

            {!deptsLoading && filteredDepartments.length === 0 && (
              <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-1.5 bg-muted/20">
                <Layers className="h-6 w-6 mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-foreground">No departments found</p>
                <p className="text-[11px] text-muted-foreground">Add a department using the form on the left.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
