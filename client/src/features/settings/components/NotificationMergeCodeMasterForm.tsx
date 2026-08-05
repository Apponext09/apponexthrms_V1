import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, RotateCcw, Search, Check, X, Trash2,
  Loader2, AlertCircle, Edit2, Layers, Grid, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

// ─── Record Item Interface ───────────────────────────────────────────────────
export interface MergeCodeRecordItem {
  id: string | number;
  uuid?: string;
  moduleName?: string;
  module_name?: string;
  subModuleName?: string;
  sub_module_name?: string;
  description?: string | null;
  isActive?: 'Yes' | 'No';
  is_active?: 'Yes' | 'No';
  createdAt?: string;
  created_at?: string;
}

interface NotificationMergeCodeMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: MergeCodeRecordItem) => void;
}

export function NotificationMergeCodeMasterForm({ onCancel, onSave }: NotificationMergeCodeMasterFormProps) {
  const [records, setRecords] = useState<MergeCodeRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State (Module Name & Sub-Module Name)
  const [moduleName, setModuleName] = useState<string>('');
  const [subModuleName, setSubModuleName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // ─── Fetch Records ────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/settings/merge-codes?pageSize=100');
      const items: MergeCodeRecordItem[] = res.data?.data || [];
      setRecords(items);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load notification merge codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedId) || null;
  }, [records, selectedId]);

  // ─── Form Control Handlers ─────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setModuleName('');
    setSubModuleName('');
    setDescription('');
    setIsActive('Yes');
  };

  const handleSelectRecord = (item: MergeCodeRecordItem) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setModuleName(item.moduleName || item.module_name || '');
    setSubModuleName(item.subModuleName || item.sub_module_name || '');
    setDescription(item.description || '');
    setIsActive((item.isActive || item.is_active || 'Yes') as 'Yes' | 'No');
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedRecord) {
      handleSelectRecord(selectedRecord);
    }
    showToast.info('Form Reset', 'Form fields restored.');
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalModule = moduleName.trim();
    const finalSubModule = subModuleName.trim();

    if (!finalModule) {
      showToast.error('Validation Error', 'Module Name is required.');
      return;
    }
    if (!finalSubModule) {
      showToast.error('Validation Error', 'Sub-Module Name is required.');
      return;
    }

    const payload = {
      module_name: finalModule,
      sub_module_name: finalSubModule,
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      setSaving(true);
      let savedItem: MergeCodeRecordItem;

      if (isNewMode) {
        const res = await apiClient.post('/settings/merge-codes', payload);
        savedItem = res.data?.data;
        setRecords((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(savedItem.id);
        showToast.success('Merge Code Created', `Notification merge code for "${finalModule} - ${finalSubModule}" added.`);
      } else {
        const res = await apiClient.patch(`/settings/merge-codes/${selectedId}`, payload);
        savedItem = res.data?.data;
        setRecords((prev) => prev.map((r) => (r.id === savedItem.id ? savedItem : r)));
        showToast.success('Merge Code Updated', `Notification merge code for "${finalModule} - ${finalSubModule}" updated.`);
      }

      if (onSave) onSave(savedItem);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save merge code.';
      showToast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/settings/merge-codes/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('Merge Code Deleted', `Merge code "${name}" deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete merge code.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const activeVal = r.isActive || r.is_active || 'Yes';
      const mod = r.moduleName || r.module_name || '';
      const subMod = r.subModuleName || r.sub_module_name || '';
      const descVal = r.description || '';

      if (statusFilter === 'Active' && activeVal !== 'Yes') return false;
      if (statusFilter === 'Inactive' && activeVal !== 'No') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mod.toLowerCase().includes(q) ||
          subMod.toLowerCase().includes(q) ||
          descVal.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Notification Merge Codes</h2>
            <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
              Templates & System
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Store and manage module and sub-module notification merge codes.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAddNewClick}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Merge Code</span>
        </Button>
      </div>

      {/* Main 2-Column Layout: Left = Form (7 Cols), Right = Directory (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Add / Edit Merge Code Form (7 Cols) ─────────────── */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>{isNewMode ? 'Add Notification Merge Code' : 'Edit Notification Merge Code'}</span>
            </h3>
            {!isNewMode && (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                ID: #{selectedId}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Module Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Module Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Workhour, Leave, Attendance..."
                  className="h-10 text-xs border-input rounded-xl bg-background text-foreground font-semibold focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Sub-Module Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Grid className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Sub-Module Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={subModuleName}
                  onChange={(e) => setSubModuleName(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Application, Approval, Cancellation..."
                  className="h-10 text-xs border-input rounded-xl bg-background text-foreground font-semibold focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Description</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                rows={3}
                placeholder="Describe what this notification merge code represents..."
                className="w-full p-3 text-xs border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-normal"
              />
            </div>

            {/* Active Toggle Switch */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-foreground block">Active</label>
              <div className="flex items-center gap-2 max-w-[160px]">
                <button
                  type="button"
                  onClick={() => setIsActive('Yes')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'Yes'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Yes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive('No')}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-9 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isActive === 'No'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>No</span>
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{isNewMode ? 'Add Merge Code' : 'Update Merge Code'}</span>
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleReset}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-10 px-5 rounded-xl text-xs gap-1.5 cursor-pointer ml-auto"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ── RIGHT COLUMN: Merge Codes Directory List (5 Cols) ─────────────── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Search & Filter Header */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search module, sub-module..."
                  className="pl-9 h-9 text-xs border-input rounded-xl bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="h-9 text-xs px-2.5 border border-input rounded-xl bg-background text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Header Title Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                <span>Stored Merge Codes</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {filteredRecords.length}
              </Badge>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {/* Loading */}
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading merge codes...</p>
              </div>
            )}

            {/* Error */}
            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load merge codes</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{loadError}</p>
                  <button
                    onClick={fetchRecords}
                    className="text-[11px] text-primary font-semibold mt-1 hover:underline cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !loadError && filteredRecords.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                <Layers className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No merge codes found.</p>
                <p className="text-[11px] text-muted-foreground">Add a new merge code using the form on the left.</p>
              </div>
            )}

            {/* Item Cards Stack */}
            {!loading && !loadError && filteredRecords.map((item) => {
              const isSelected = selectedId === item.id;
              const activeStatus = item.isActive || item.is_active || 'Yes';
              const mod = item.moduleName || item.module_name || '';
              const subMod = item.subModuleName || item.sub_module_name || '';
              const desc = item.description || '';
              const fullName = `${mod} - ${subMod}`;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecord(item)}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer group space-y-2 relative shadow-2xs',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                      <h4 className="text-xs font-bold truncate leading-tight">
                        {fullName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn(
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-colors',
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : activeStatus === 'Yes'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      )}>
                        {activeStatus === 'Yes' ? 'Active' : 'Inactive'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, fullName, e)}
                        title="Delete Merge Code"
                        className={cn(
                          'p-1.5 rounded-lg transition-colors cursor-pointer',
                          isSelected
                            ? 'text-primary-foreground/80 hover:text-white hover:bg-white/10'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {desc && (
                    <p className={cn(
                      'text-[11px] leading-snug line-clamp-2 pt-0.5',
                      isSelected ? 'text-white/80' : 'text-muted-foreground'
                    )}>
                      {desc}
                    </p>
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
