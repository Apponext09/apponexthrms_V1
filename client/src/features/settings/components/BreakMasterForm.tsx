import React, { useState, useMemo, useEffect } from 'react';
import {
  Coffee, Plus, RotateCcw, Search, Clock,
  Check, X, Cpu, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BreakRecordItem {
  id: string | number;
  uuid?: string;
  name: string;
  // Knex postProcessResponse converts snake_case → camelCase
  breakType?: 'Manual' | 'Auto';
  break_type?: 'Manual' | 'Auto'; // fallback for raw/direct
  biometricDevice?: string | null;
  biometric_device?: string | null; // fallback
  maxAllowTime?: string; // HH:MM
  max_allow_time?: string; // fallback
  isActive?: 'Yes' | 'No';
  is_active?: 'Yes' | 'No'; // fallback
  createdAt?: string;
  created_at?: string;
}

// ─── Biometric Options (restricted to 3 types only) ──────────────────────────
const BIOMETRIC_OPTIONS = [
  '- Select -',
  'Face Recognition Web',
  'Mobile',
  'Device',
] as const;

type BiometricOption = typeof BIOMETRIC_OPTIONS[number];

interface BreakMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: BreakRecordItem) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BreakMasterForm({ onCancel, onSave }: BreakMasterFormProps) {
  const { selectedCompanyId } = useCompanyStore();
  const [breaks, setBreaks] = useState<BreakRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State
  const [breakName, setBreakName] = useState<string>('');
  const [breakType, setBreakType] = useState<'Manual' | 'Auto'>('Manual');
  const [biometricDevice, setBiometricDevice] = useState<string>('- Select -');
  const [maxAllowTime, setMaxAllowTime] = useState<string>('00:30');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Manual' | 'Auto'>('All');

  // ─── Load breaks from API ──────────────────────────────────────────────────
  const fetchBreaks = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await apiClient.get('/settings/breaks?pageSize=100');
      const items: BreakRecordItem[] = res.data?.data || [];
      setBreaks(items);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load breaks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreaks();
  }, [selectedCompanyId]);

  // Currently selected item for edit
  const selectedBreak = useMemo(() => {
    return breaks.find((b) => b.id === selectedId) || null;
  }, [breaks, selectedId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setBreakName('');
    setBreakType('Manual');
    setBiometricDevice('- Select -');
    setMaxAllowTime('00:30');
    setIsActive('Yes');
  };

  const handleSelectBreak = (item: BreakRecordItem) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setBreakName(item.name);
    setBreakType((item.breakType || item.break_type) as 'Manual' | 'Auto');
    setBiometricDevice(item.biometricDevice || item.biometric_device || '- Select -');
    setMaxAllowTime(item.maxAllowTime || item.max_allow_time || '00:30');
    setIsActive((item.isActive || item.is_active) as 'Yes' | 'No');
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedBreak) {
      setBreakName(selectedBreak.name);
      setBreakType((selectedBreak.breakType || selectedBreak.break_type) as 'Manual' | 'Auto');
      setBiometricDevice(selectedBreak.biometricDevice || selectedBreak.biometric_device || '- Select -');
      setMaxAllowTime(selectedBreak.maxAllowTime || selectedBreak.max_allow_time || '00:30');
      setIsActive((selectedBreak.isActive || selectedBreak.is_active) as 'Yes' | 'No');
    }
    showToast.info('Form Reset', 'Form fields restored to original values.');
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!breakName.trim()) {
      showToast.error('Validation Error', 'Break Name is required.');
      return;
    }

    if (breakType === 'Auto' && (!biometricDevice || biometricDevice === '- Select -')) {
      showToast.error('Validation Error', 'Please select a Biometric Device for Auto Break Type.');
      return;
    }

    const payload = {
      name: breakName.trim(),
      break_type: breakType,
      biometric_device: breakType === 'Auto' ? biometricDevice : null,
      max_allow_time: maxAllowTime.trim() || '00:15',
      is_active: isActive,
    };

    try {
      setSaving(true);

      let savedItem: BreakRecordItem;

      if (isNewMode) {
        const res = await apiClient.post('/settings/breaks', payload);
        savedItem = res.data?.data;
        setBreaks((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(savedItem.id);
        showToast.success('Break Added', `${savedItem.name} break added successfully.`);
      } else {
        const res = await apiClient.patch(`/settings/breaks/${selectedId}`, payload);
        savedItem = res.data?.data;
        setBreaks((prev) => prev.map((b) => (b.id === savedItem.id ? savedItem : b)));
        showToast.success('Break Updated', `${savedItem.name} updated successfully.`);
      }

      if (onSave) onSave(savedItem);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'An error occurred. Please try again.';
      showToast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string | number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/settings/breaks/${id}`);
      setBreaks((prev) => prev.filter((b) => b.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('Break Removed', `${name} break deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete break.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filteredBreaks = useMemo(() => {
    return breaks.filter((b) => {
      const activeVal = b.isActive || b.is_active;
      const typeVal = b.breakType || b.break_type || '';
      if (statusFilter === 'Active' && activeVal !== 'Yes') return false;
      if (statusFilter === 'Inactive' && activeVal !== 'No') return false;
      if (typeFilter !== 'All' && typeVal !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || typeVal.toLowerCase().includes(q);
      }
      return true;
    });
  }, [breaks, statusFilter, typeFilter, searchQuery]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ───────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: Add / Edit Break Form                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? 'Add Break Information' : 'Edit Break Information'}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {isNewMode ? 'New' : 'Editing'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure break timing, tracking mode, biometric mapping, and duration limits.
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
            {/* Break Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Break Name <span className="text-rose-500">*</span>
                </span>
                {breakName && <span className="text-[10px] text-muted-foreground">{breakName.length} chars</span>}
              </label>
              <Input
                type="text"
                value={breakName}
                onChange={(e) => setBreakName(e.target.value)}
                placeholder="e.g. Lunch Break / Tea Break / MISC"
                className="text-xs h-10 bg-background rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                required
                disabled={saving}
              />
            </div>

            {/* Break Type Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Break Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setBreakType('Manual')}
                  disabled={saving}
                  className={cn(
                    'h-10 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50',
                    breakType === 'Manual'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  {breakType === 'Manual' && <Check className="h-4 w-4 stroke-[2.5]" />}
                  <span>Manual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBreakType('Auto')}
                  disabled={saving}
                  className={cn(
                    'h-10 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50',
                    breakType === 'Auto'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  {breakType === 'Auto' && <Check className="h-4 w-4 stroke-[2.5]" />}
                  <span>Auto</span>
                </button>
              </div>
            </div>

            {/* Biometric Device Dropdown (only for Auto) */}
            {breakType === 'Auto' && (
              <div className="space-y-1.5 p-3.5 border border-primary/20 bg-primary/5 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  <span>Biometric Device <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={biometricDevice}
                  onChange={(e) => setBiometricDevice(e.target.value)}
                  disabled={saving}
                  className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold disabled:opacity-50"
                  required
                >
                  {BIOMETRIC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Auto breaks trigger automatically upon punch events from the selected biometric source.
                </p>
              </div>
            )}

            {/* Max Allow Time & Active Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              {/* Max Allow Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Max Allow Time (HH:MM)</span>
                </label>
                <Input
                  type="text"
                  value={maxAllowTime}
                  onChange={(e) => setMaxAllowTime(e.target.value)}
                  placeholder="HH:MM (e.g. 00:30)"
                  className="text-xs h-10 font-mono bg-background rounded-xl"
                  disabled={saving}
                />
              </div>

              {/* Active Toggle */}
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
            </div>

            {/* Form Actions */}
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
                    New Break
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
                      <span>{isNewMode ? 'Add Break' : 'Update Break Information'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: Break List Directory                           */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Break List</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredBreaks.length}
              </Badge>
            </div>

            <Button
              type="button"
              onClick={handleAddNewClick}
              size="sm"
              className="text-xs font-semibold h-8 px-3 rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Break</span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search breaks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background rounded-xl"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
            >
              <option value="All">All Types</option>
              <option value="Manual">Manual</option>
              <option value="Auto">Auto</option>
            </select>

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

          {/* Break Items */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {/* Loading State */}
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading breaks...</p>
              </div>
            )}

            {/* Error State */}
            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load breaks</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{loadError}</p>
                  <button
                    onClick={fetchBreaks}
                    className="text-[11px] text-primary font-semibold mt-1 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !loadError && filteredBreaks.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No break configurations found.</p>
                <p className="text-[11px]">Click "+ Add Break" above to create one.</p>
              </div>
            )}

            {/* Break Cards */}
            {!loading && !loadError && filteredBreaks.map((item) => {
              const isSelected = !isNewMode && item.id === selectedId;
              // Knex converts snake_case → camelCase; support both for safety
              const breakTypeDisplay = item.breakType || item.break_type || 'Manual';
              const maxTimeDisplay = item.maxAllowTime || item.max_allow_time || '00:00';
              const bioDevice = item.biometricDevice || item.biometric_device;
              const activeStatus = item.isActive || item.is_active || 'No';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectBreak(item)}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Coffee className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                      <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                            : breakTypeDisplay === 'Auto'
                            ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20'
                        )}
                      >
                        {breakTypeDisplay}
                      </Badge>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, item.name, e)}
                        title="Delete Break"
                        className={cn(
                          'p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                          isSelected
                            ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
                            : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub Details Row */}
                  <div className={cn(
                    'pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2',
                    isSelected ? 'border-primary-foreground/20 text-primary-foreground/80' : 'border-border/40 text-muted-foreground'
                  )}>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> Max: {maxTimeDisplay}
                    </span>

                    {bioDevice && (
                      <span className="flex items-center gap-1 truncate max-w-[180px]">
                        <Cpu className="h-3 w-3 shrink-0" /> {bioDevice}
                      </span>
                    )}

                    <span className={cn(
                      'font-semibold px-1.5 rounded text-[10px]',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : activeStatus === 'Yes'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {activeStatus === 'Yes' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
