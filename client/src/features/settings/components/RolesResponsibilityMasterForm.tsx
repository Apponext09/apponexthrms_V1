import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShieldCheck, Plus, RotateCcw, Search, Clock,
  Check, X, Trash2, Loader2, AlertCircle, Building2,
  Layers, Briefcase, FileText, Bold, Italic, Underline,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Eye, Edit3, Type, Strikethrough
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { useCompanies } from '../hooks/useCompanies';
import { useDepartments } from '../hooks/useDepartments';
import { useDesignations } from '../hooks/useDesignations';
import { TipTapRichTextEditor } from './TipTapRichTextEditor';

// ─── Record Item Interface ───────────────────────────────────────────────────
export interface RolesResponsibilityRecord {
  id: string | number;
  uuid?: string;
  companyId?: number | string | null;
  company_id?: number | string | null;
  companyName?: string | null;
  company_name?: string | null;
  departmentId?: number | string | null;
  department_id?: number | string | null;
  departmentName?: string | null;
  department_name?: string | null;
  designationId?: number | string | null;
  designation_id?: number | string | null;
  designationName?: string | null;
  designation_name?: string | null;
  kraFormId?: number | string | null;
  kra_form_id?: number | string | null;
  kraForm?: string | null;
  kra_form?: string | null;
  responsibilities: string;
  isActive?: 'Yes' | 'No';
  is_active?: 'Yes' | 'No';
  createdAt?: string;
  created_at?: string;
}

interface KraOption {
  id: number;
  title: string;
}

interface RolesResponsibilityMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: RolesResponsibilityRecord) => void;
}

export function RolesResponsibilityMasterForm({ onCancel, onSave }: RolesResponsibilityMasterFormProps) {
  const { selectedCompanyId } = useCompanyStore();
  // Hooks for Companies, Departments, Designations
  const { data: companies = [] } = useCompanies();
  const { data: deptResponse } = useDepartments(1, 100);
  const { designations = [] } = useDesignations();

  const departments = useMemo(() => {
    return (deptResponse?.data || deptResponse?.items || deptResponse || []) as any[];
  }, [deptResponse]);

  // KRA Forms fetched from API
  const [kraOptions, setKraOptions] = useState<KraOption[]>([]);

  useEffect(() => {
    apiClient.get('/settings/kras?pageSize=100&is_active=Yes').then((res) => {
      const items = res.data?.data || [];
      setKraOptions(items.map((k: any) => ({ id: k.id, title: k.title })));
    }).catch(() => { /* silently ignore */ });
  }, [selectedCompanyId]);

  // Main State
  const [records, setRecords] = useState<RolesResponsibilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State
  const [companyId, setCompanyId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [designationId, setDesignationId] = useState<string>('');
  const [kraFormId, setKraFormId] = useState<string>('');  // stores the selected KRA form ID
  const [responsibilities, setResponsibilities] = useState<string>('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Preview tab toggle for rich text area
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // Directory Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Fetch Records ────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/settings/roles-responsibilities?pageSize=100');
      const items: RolesResponsibilityRecord[] = res.data?.data || [];
      setRecords(items);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load roles & responsibilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedCompanyId]);

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedId) || null;
  }, [records, selectedId]);

  // ─── Form Control Handlers ─────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setCompanyId('');
    setDepartmentId('');
    setDesignationId('');
    setKraFormId('');
    setResponsibilities('');
    setIsActive('Yes');
    setEditorTab('write');
  };

  const handleSelectRecord = (item: RolesResponsibilityRecord) => {
    setIsNewMode(false);
    setSelectedId(item.id);

    const cId = item.companyId || item.company_id;
    const dId = item.departmentId || item.department_id;
    const desId = item.designationId || item.designation_id;
    const kId = item.kraFormId || item.kra_form_id;

    setCompanyId(cId ? String(cId) : '');
    setDepartmentId(dId ? String(dId) : '');
    setDesignationId(desId ? String(desId) : '');
    setKraFormId(kId ? String(kId) : '');
    setResponsibilities(item.responsibilities || '');
    setIsActive((item.isActive || item.is_active || 'Yes') as 'Yes' | 'No');
    setEditorTab('write');
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedRecord) {
      handleSelectRecord(selectedRecord);
    }
    showToast.info('Form Reset', 'Form fields restored to original values.');
  };

  // ─── Toolbar Formatting Helper for Customized Textarea ───────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let replacement = '';
    if (selectedText) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      replacement = `${prefix}text${suffix}`;
    }

    const newText = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setResponsibilities(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 0);
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responsibilities.trim()) {
      showToast.error('Validation Error', 'Responsibilities content is required.');
      return;
    }

    // Resolve Names from selected IDs
    const selectedCompanyObj = companies.find((c: any) => String(c.id) === companyId);
    const selectedDeptObj = departments.find((d: any) => String(d.id) === departmentId);
    const selectedDesigObj = designations.find((des: any) => String(des.id) === designationId);
    const selectedKraObj = kraOptions.find((k) => String(k.id) === kraFormId);

    const payload = {
      company_id: companyId ? parseInt(companyId, 10) : null,
      company_name: (selectedCompanyObj as any)?.name || (selectedCompanyObj as any)?.companyName || (companyId ? `Company #${companyId}` : null),
      department_id: departmentId ? parseInt(departmentId, 10) : null,
      department_name: (selectedDeptObj as any)?.departmentName || (selectedDeptObj as any)?.name || (departmentId ? `Department #${departmentId}` : null),
      designation_id: designationId ? parseInt(designationId, 10) : null,
      designation_name: (selectedDesigObj as any)?.designationName || (selectedDesigObj as any)?.name || (designationId ? `Designation #${designationId}` : null),
      kra_form_id: kraFormId ? parseInt(kraFormId, 10) : null,
      kra_form: selectedKraObj?.title || null,
      responsibilities: responsibilities.trim(),
      is_active: isActive,
    };

    try {
      setSaving(true);
      let savedItem: RolesResponsibilityRecord;

      if (isNewMode) {
        const res = await apiClient.post('/settings/roles-responsibilities', payload);
        savedItem = res.data?.data;
        setRecords((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(savedItem.id);
        showToast.success('Record Added', 'Roles & Responsibilities record created successfully.');
      } else {
        const res = await apiClient.patch(`/settings/roles-responsibilities/${selectedId}`, payload);
        savedItem = res.data?.data;
        setRecords((prev) => prev.map((r) => (r.id === savedItem.id ? savedItem : r)));
        showToast.success('Record Updated', 'Roles & Responsibilities updated successfully.');
      }

      if (onSave) onSave(savedItem);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save record.';
      showToast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/settings/roles-responsibilities/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('Record Removed', `${name || 'Roles'} deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete record.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const activeVal = r.isActive || r.is_active || 'Yes';
      const deptName = r.departmentName || r.department_name || '';
      const desigName = r.designationName || r.designation_name || '';
      const compName = r.companyName || r.company_name || '';
      const respContent = (r.responsibilities || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      if (statusFilter === 'Active' && activeVal !== 'Yes') return false;
      if (statusFilter === 'Inactive' && activeVal !== 'No') return false;
      if (departmentFilter !== 'All' && deptName !== departmentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          desigName.toLowerCase().includes(q) ||
          deptName.toLowerCase().includes(q) ||
          compName.toLowerCase().includes(q) ||
          respContent.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, statusFilter, departmentFilter, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form (lg:col-span-7), Right Directory List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: Add / Edit Roles & Responsibilities Form        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? 'Add Roles & Responsibilities Information' : 'Edit Roles & Responsibilities Information'}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {isNewMode ? 'New' : 'Editing'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define job responsibilities, company structure mappings, and KRA form assignment.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              title="Reset Form"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company * */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Company <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose Company...</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.name || `Company #${c.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Department * */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Department <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose Department...</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentName || d.name || `Department #${d.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation * */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Designation <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose Designation...</option>
                {designations.map((des: any) => (
                  <option key={des.id} value={des.id}>
                    {des.designationName || des.name || `Designation #${des.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* KRA Form - loaded from kra_forms table */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>KRA Form</span>
              </label>
              <select
                value={kraFormId}
                onChange={(e) => setKraFormId(e.target.value)}
                disabled={saving}
                className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Select KRA Form --</option>
                {kraOptions.map((kra) => (
                  <option key={kra.id} value={kra.id}>
                    {kra.title}
                  </option>
                ))}
              </select>
              {kraOptions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No KRA forms available. Add them via the <span className="font-semibold text-primary">KRA Form</span> master.
                </p>
              )}
            </div>

            {/* TipTap Open-Source Rich Text Editor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Responsibilities <span className="text-rose-500">*</span>
              </label>
              <TipTapRichTextEditor
                content={responsibilities}
                onChange={(html) => setResponsibilities(html)}
                disabled={saving}
              />
            </div>

            {/* Active Toggle Switch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Active</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <button
                  type="button"
                  onClick={() => setIsActive('Yes')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'Yes'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive('No')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'No'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <X className="h-3.5 w-3.5" /> No
                </button>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isNewMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewClick}
                    disabled={saving}
                    className="text-xs h-10 px-3 rounded-xl gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Record
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    disabled={saving}
                    className="text-xs h-10 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isNewMode ? 'Adding...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{isNewMode ? 'Add Responsibilities' : 'Update Responsibilities'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: Directory List of Roles & Responsibilities     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Roles & Responsibilities</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredRecords.length}
              </Badge>
            </div>

            <Button
              type="button"
              onClick={handleAddNewClick}
              size="sm"
              className="text-xs font-semibold h-8 px-3 rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </div>

          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search designation or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background rounded-xl"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Scrollable Records Directory */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {/* Loading */}
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading roles & responsibilities...</p>
              </div>
            )}

            {/* Error */}
            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load records</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{loadError}</p>
                  <button
                    onClick={fetchRecords}
                    className="text-[11px] text-primary font-semibold mt-1 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !loadError && filteredRecords.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No roles & responsibilities found.</p>
                <p className="text-[11px]">Fill out the form on the left to add one.</p>
              </div>
            )}

            {/* Item Cards */}
            {!loading && !loadError && filteredRecords.map((item) => {
              const isSelected = !isNewMode && item.id === selectedId;
              const desigName = item.designationName || item.designation_name || 'Designation Unassigned';
              const deptName = item.departmentName || item.department_name || 'All Depts';
              const compName = item.companyName || item.company_name;
              const kraFormVal = item.kraForm || item.kra_form;
              const activeStatus = item.isActive || item.is_active || 'Yes';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecord(item)}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                        <h4 className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                          {desigName}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {deptName && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.2 rounded-md',
                              isSelected ? 'bg-background/20 text-white border-white/30' : 'bg-muted/60 text-muted-foreground'
                            )}
                          >
                            {deptName}
                          </Badge>
                        )}

                        {compName && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.2 rounded-md',
                              isSelected ? 'bg-background/20 text-white border-white/30' : 'bg-primary/10 text-primary border-primary/20'
                            )}
                          >
                            {compName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        'font-semibold px-2 py-0.5 rounded-full text-[10px] border',
                        isSelected
                          ? 'bg-background/20 text-white border-white/30'
                          : activeStatus === 'Yes'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      )}>
                        {activeStatus === 'Yes' ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, desigName, e)}
                        title="Delete Record"
                        className={cn(
                          'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                          isSelected
                            ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/10'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Responsibilities Snippet — renders TipTap HTML output */}
                  <div
                    className={cn(
                      'tiptap-preview p-2.5 rounded-xl border text-[11px] leading-snug line-clamp-3 overflow-hidden',
                      isSelected ? 'bg-background/10 border-white/20 text-white/90' : 'bg-muted/30 border-border/40 text-muted-foreground'
                    )}
                    dangerouslySetInnerHTML={{
                      __html: item.responsibilities || '<em>No content provided.</em>'
                    }}
                  />

                  {/* Footer Info */}
                  {kraFormVal && (
                    <div className={cn(
                      'flex items-center justify-between text-[10px] pt-1 font-mono',
                      isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      <span>KRA: {kraFormVal}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}
