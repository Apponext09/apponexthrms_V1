import React, { useState, useMemo } from 'react';
import {
  Coffee, Plus, RotateCcw, Search, CheckCircle2, XCircle, Clock,
  Check, X, Cpu, Layers, Trash2, Edit2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';

export interface BreakRecordItem {
  id: string;
  name: string;
  type: 'Manual' | 'Auto';
  biometricDevice?: string;
  maxAllowTime: string; // HH:MM
  isActive: 'Yes' | 'No';
  createdAt?: string;
}

const INITIAL_BREAKS: BreakRecordItem[] = [
  { id: 'brk-1', name: 'Break Time', type: 'Manual', maxAllowTime: '00:15', isActive: 'Yes', createdAt: '2026-01-01' },
  { id: 'brk-2', name: 'Lunch', type: 'Manual', maxAllowTime: '00:45', isActive: 'Yes', createdAt: '2026-01-01' },
  { id: 'brk-3', name: 'MISC', type: 'Manual', maxAllowTime: '00:15', isActive: 'Yes', createdAt: '2026-01-01' },
  { id: 'brk-4', name: 'Non Working Break', type: 'Auto', biometricDevice: 'Gate Punch Terminal', maxAllowTime: '00:30', isActive: 'Yes', createdAt: '2026-01-01' },
  { id: 'brk-5', name: 'Stray Checkout', type: 'Auto', biometricDevice: 'Face Recognition Kiosk', maxAllowTime: '01:00', isActive: 'Yes', createdAt: '2026-01-01' },
  { id: 'brk-6', name: 'Tea', type: 'Manual', maxAllowTime: '00:15', isActive: 'Yes', createdAt: '2026-01-01' },
];

const BIOMETRIC_OPTIONS = [
  '- Select -',
  'Main Entrance Biometric',
  'Gate Punch Terminal',
  'Face Recognition Kiosk',
  'Canteen Terminal',
  'Floor 2 Attendance Scanner',
];

interface BreakMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: BreakRecordItem) => void;
}

export function BreakMasterForm({ onCancel, onSave }: BreakMasterFormProps) {
  const [breaks, setBreaks] = useState<BreakRecordItem[]>(INITIAL_BREAKS);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  // Form State
  const [breakName, setBreakName] = useState<string>('');
  const [breakType, setBreakType] = useState<'Manual' | 'Auto'>('Manual');
  const [biometricDevice, setBiometricDevice] = useState<string>('- Select -');
  const [maxAllowTime, setMaxAllowTime] = useState<string>('00:30');
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');

  // Filter & Search State for Right Side Directory
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Manual' | 'Auto'>('All');

  // Currently selected item for edit
  const selectedBreak = useMemo(() => {
    return breaks.find((b) => b.id === selectedId) || null;
  }, [breaks, selectedId]);

  // Switch to "Add New Break" mode
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setBreakName('');
    setBreakType('Manual');
    setBiometricDevice('- Select -');
    setMaxAllowTime('00:30');
    setIsActive('Yes');
  };

  // Select an existing break to edit
  const handleSelectBreak = (item: BreakRecordItem) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setBreakName(item.name);
    setBreakType(item.type);
    setBiometricDevice(item.biometricDevice || '- Select -');
    setMaxAllowTime(item.maxAllowTime);
    setIsActive(item.isActive);
  };

  // Reset form
  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedBreak) {
      setBreakName(selectedBreak.name);
      setBreakType(selectedBreak.type);
      setBiometricDevice(selectedBreak.biometricDevice || '- Select -');
      setMaxAllowTime(selectedBreak.maxAllowTime);
      setIsActive(selectedBreak.isActive);
    }
    showToast.info('Form Reset', 'Form fields restored to original values.');
  };

  // Submit Handler (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!breakName.trim()) {
      showToast.error('Validation Error', 'Break Name is required.');
      return;
    }

    if (breakType === 'Auto' && (!biometricDevice || biometricDevice === '- Select -')) {
      showToast.error('Validation Error', 'Please select a Biometric Device for Auto Break Type.');
      return;
    }

    const payload: BreakRecordItem = {
      id: isNewMode ? `brk-${Date.now()}` : selectedId,
      name: breakName.trim(),
      type: breakType,
      biometricDevice: breakType === 'Auto' ? biometricDevice : undefined,
      maxAllowTime: maxAllowTime.trim() || '00:15',
      isActive,
      createdAt: isNewMode ? new Date().toISOString().split('T')[0] : selectedBreak?.createdAt,
    };

    setBreaks((prev) => {
      const exists = prev.some((b) => b.id === payload.id);
      if (exists) {
        return prev.map((b) => (b.id === payload.id ? payload : b));
      }
      return [...prev, payload];
    });

    setIsNewMode(false);
    setSelectedId(payload.id);

    if (onSave) onSave(payload);

    showToast.success(
      isNewMode ? 'Break Added' : 'Break Updated',
      isNewMode ? `${payload.name} break added successfully.` : `${payload.name} updated successfully.`
    );
  };

  // Delete Handler
  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBreaks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) {
      handleAddNewClick();
    }
    showToast.info('Break Removed', `${name} break deleted.`);
  };

  // Filtered List for Right Side Directory
  const filteredBreaks = useMemo(() => {
    return breaks.filter((b) => {
      if (statusFilter === 'Active' && b.isActive !== 'Yes') return false;
      if (statusFilter === 'Inactive' && b.isActive !== 'No') return false;
      if (typeFilter !== 'All' && b.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) || b.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [breaks, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Responsive Layout: Left Form (lg:col-span-7), Right Directory List (lg:col-span-5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ========================================================================= */}
        {/* LEFT COLUMN: Add / Edit Break Information Form (lg:col-span-7)            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? 'Add Break Information' : `Edit Break Information`}
                  {isNewMode ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      New
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                      Editing
                    </Badge>
                  )}
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
              />
            </div>

            {/* Break Type Toggle (Manual vs Auto) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Break Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setBreakType('Manual')}
                  className={cn(
                    'h-10 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
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
                  className={cn(
                    'h-10 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
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

            {/* Biometric Dropdown (Appears when Break Type is Auto) */}
            {breakType === 'Auto' && (
              <div className="space-y-1.5 p-3.5 border border-primary/20 bg-primary/5 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  <span>Biometric Device <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={biometricDevice}
                  onChange={(e) => setBiometricDevice(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                  required
                >
                  {BIOMETRIC_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Auto breaks trigger automatically upon punch events on the selected biometric device.
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
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Active</label>
                <div className="flex items-center gap-2 max-w-[160px]">
                  <button
                    type="button"
                    onClick={() => setIsActive('Yes')}
                    className={cn(
                      'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer',
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
                    className={cn(
                      'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer',
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

            {/* Form Actions Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isNewMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewClick}
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
                    className="text-xs h-10 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-6 rounded-xl shadow-xs gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isNewMode ? 'Add Break' : 'Update Break Information'}</span>
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Break List Directory Cards (lg:col-span-5)                  */}
        {/* ========================================================================= */}
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
            {/* Search Input */}
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

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
            >
              <option value="All">All Types</option>
              <option value="Manual">Manual</option>
              <option value="Auto">Auto</option>
            </select>

            {/* Status Filter */}
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

          {/* Scrollable Break Items Directory */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredBreaks.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No break configurations found.</p>
                <p className="text-[11px]">Click "+ Add Break" above to create one.</p>
              </div>
            ) : (
              filteredBreaks.map((item) => {
                const isSelected = !isNewMode && item.id === selectedId;

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
                              : item.type === 'Auto'
                              ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20'
                          )}
                        >
                          {item.type}
                        </Badge>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, item.name, e)}
                          title="Delete Break"
                          className={cn(
                            'p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                            isSelected ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10' : 'text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
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
                        <Clock className="h-3 w-3" /> Max: {item.maxAllowTime}
                      </span>

                      {item.biometricDevice && (
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <Cpu className="h-3 w-3 shrink-0" /> {item.biometricDevice}
                        </span>
                      )}

                      <span className={cn(
                        'font-semibold px-1.5 py-0.2 rounded text-[10px]',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : item.isActive === 'Yes'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {item.isActive === 'Yes' ? 'Active' : 'Inactive'}
                      </span>
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
