import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, RotateCcw, Search, Clock,
  Check, X, Trash2, Loader2, AlertCircle, Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

// ─── Record Item Interface ───────────────────────────────────────────────────
export interface KraRecordItem {
  id: string | number;
  uuid?: string;
  title: string;
  description?: string | null;
  isActive?: 'Yes' | 'No';
  is_active?: 'Yes' | 'No';
  createdAt?: string;
  created_at?: string;
}

interface KraMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: KraRecordItem) => void;
}

export function KraMasterForm({ onCancel, onSave }: KraMasterFormProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [records, setRecords] = useState<KraRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Directory Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // ─── Load Records ─────────────────────────────────────────────────────────
  const fetchRecords = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/settings/kras?pageSize=100');
      const items: KraRecordItem[] = res.data?.data || [];
      setRecords(items);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load KRA forms.');
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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setTitle('');
    setDescription('');
    setIsActive('Yes');
  };

  const handleSelectRecord = (item: KraRecordItem) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.description || '');
    setIsActive((item.isActive || item.is_active || 'Yes') as 'Yes' | 'No');
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedRecord) {
      handleSelectRecord(selectedRecord);
    }
    showToast.info('Form Reset', 'Form fields restored to original values.');
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast.error('Validation Error', 'KRA Title is required.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      setSaving(true);
      let savedItem: KraRecordItem;

      if (isNewMode) {
        const res = await apiClient.post('/settings/kras', payload);
        savedItem = res.data?.data;
        setRecords((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(savedItem.id);
        showToast.success('KRA Form Added', `${savedItem.title} created successfully.`);
      } else {
        const res = await apiClient.patch(`/settings/kras/${selectedId}`, payload);
        savedItem = res.data?.data;
        setRecords((prev) => prev.map((r) => (r.id === savedItem.id ? savedItem : r)));
        showToast.success('KRA Form Updated', `${savedItem.title} updated successfully.`);
      }

      if (onSave) onSave(savedItem);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save KRA form.';
      showToast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, itemTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/settings/kras/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('KRA Form Removed', `${itemTitle} deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete KRA form.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const activeVal = r.isActive || r.is_active || 'Yes';
      const itemTitle = r.title || '';
      const itemDesc = r.description || '';

      if (statusFilter === 'Active' && activeVal !== 'Yes') return false;
      if (statusFilter === 'Inactive' && activeVal !== 'No') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return itemTitle.toLowerCase().includes(q) || itemDesc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, statusFilter, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form (lg:col-span-7), Right Directory List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: Add / Edit KRA Form                              */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? 'Add KRA Form Information' : 'Edit KRA Form Information'}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {isNewMode ? 'New' : 'Editing'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure Key Result Area templates, performance evaluation frameworks, and active status.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title * */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  KRA Title <span className="text-rose-500">*</span>
                </span>
                {title && <span className="text-[10px] text-muted-foreground">{title.length} chars</span>}
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Engineering Lead KRA / Sales Target 2026 / HR Operations"
                className="text-xs h-10 bg-background rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                required
                disabled={saving}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information regarding Key Result Areas, targets, weighting criteria, and review rules..."
                disabled={saving}
                className="w-full p-3.5 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground font-normal resize-y min-h-[110px]"
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
                    New KRA Form
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isNewMode ? 'Adding...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{isNewMode ? 'Add KRA Form' : 'Update KRA Form'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: KRA Forms Directory List                        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">KRA Forms List</h3>
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
              <span>Add Form</span>
            </Button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search KRA forms..."
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

          {/* Scrollable Items */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {/* Loading */}
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading KRA forms...</p>
              </div>
            )}

            {/* Error */}
            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load KRA forms</p>
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
                <p className="font-semibold">No KRA forms found.</p>
                <p className="text-[11px]">Click "+ Add Form" above to create one.</p>
              </div>
            )}

            {/* Item Cards */}
            {!loading && !loadError && filteredRecords.map((item) => {
              const isSelected = !isNewMode && item.id === selectedId;
              const activeStatus = item.isActive || item.is_active || 'Yes';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectRecord(item)}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                      <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                        {item.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        'font-semibold px-2 py-0.5 rounded-full text-[10px] border',
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
                        onClick={(e) => handleDelete(item.id, item.title, e)}
                        title="Delete KRA Form"
                        className={cn(
                          'p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                          isSelected
                            ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description Snippet */}
                  {item.description && (
                    <div className={cn(
                      'pt-2 border-t text-[11px] line-clamp-2 leading-relaxed',
                      isSelected ? 'border-primary-foreground/20 text-primary-foreground/90' : 'border-border/40 text-muted-foreground'
                    )}>
                      {item.description}
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
