import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar, Plus, RotateCcw, Search, CalendarDays,
  Check, X, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HolidayRecordItem {
  id: string | number;
  uuid?: string;
  holidayName?: string;
  holiday_name?: string;
  holidayDate?: string;
  holiday_date?: string;
  holidayType?: string;
  holiday_type?: string;
  isOptional?: boolean;
  is_optional?: boolean;
  description?: string;
}

const HOLIDAY_TYPES = ['national', 'regional', 'company', 'restricted'] as const;

interface HolidayMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: HolidayRecordItem) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HolidayMasterForm({ onCancel, onSave }: HolidayMasterFormProps) {
  const [calendarId, setCalendarId] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<HolidayRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | number>('');
  const [isNewMode, setIsNewMode] = useState<boolean>(true);

  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState(todayStr);
  const [holidayType, setHolidayType] = useState<string>('national');
  const [isOptional, setIsOptional] = useState(false);
  const [description, setDescription] = useState('');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | string>('All');

  // ─── Ensure a default holiday calendar exists, then load its holidays ──────
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const year = new Date().getFullYear();
      const calRes = await apiClient.get(`/settings/holiday-calendars?year=${year}`);
      const calendars = calRes.data?.data || [];

      let activeCalendarId: number;
      const defaultCal = calendars.find((c: any) => c.isDefault || c.is_default) || calendars[0];

      if (defaultCal) {
        activeCalendarId = defaultCal.id;
      } else {
        try {
          const createRes = await apiClient.post('/settings/holiday-calendars', {
            name: `Company Holidays ${year}`,
            year,
            is_default: true,
          });
          activeCalendarId = createRes.data?.data?.id;
        } catch (createErr) {
          // Another concurrent request may have already created the default calendar
          // (e.g. React StrictMode double-invocation, or two admins loading the tab at once).
          const retryRes = await apiClient.get(`/settings/holiday-calendars?year=${year}`);
          const retryCalendars = retryRes.data?.data || [];
          const retryDefault = retryCalendars.find((c: any) => c.isDefault || c.is_default) || retryCalendars[0];
          if (!retryDefault) throw createErr;
          activeCalendarId = retryDefault.id;
        }
      }

      setCalendarId(activeCalendarId);

      const holRes = await apiClient.get(`/settings/holiday-calendars/${activeCalendarId}/holidays`);
      setHolidays(holRes.data?.data || []);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const selectedHoliday = useMemo(() => {
    return holidays.find((h) => h.id === selectedId) || null;
  }, [holidays, selectedId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddNewClick = () => {
    setIsNewMode(true);
    setSelectedId('');
    setHolidayName('');
    setHolidayDate(todayStr);
    setHolidayType('national');
    setIsOptional(false);
    setDescription('');
  };

  const handleSelectHoliday = (item: HolidayRecordItem) => {
    setIsNewMode(false);
    setSelectedId(item.id);
    setHolidayName(item.holidayName || item.holiday_name || '');
    const rawDate = item.holidayDate || item.holiday_date || todayStr;
    setHolidayDate(String(rawDate).split('T')[0]);
    setHolidayType(item.holidayType || item.holiday_type || 'national');
    setIsOptional(Boolean(item.isOptional ?? item.is_optional));
    setDescription(item.description || '');
  };

  const handleReset = () => {
    if (isNewMode) {
      handleAddNewClick();
    } else if (selectedHoliday) {
      handleSelectHoliday(selectedHoliday);
    }
    showToast.info('Form Reset', 'Form fields restored to original values.');
  };

  // ─── Submit (Create or Update) ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!holidayName.trim()) {
      showToast.error('Validation Error', 'Holiday Name is required.');
      return;
    }
    if (!holidayDate) {
      showToast.error('Validation Error', 'Holiday Date is required.');
      return;
    }
    if (!calendarId) {
      showToast.error('Error', 'No holiday calendar available. Please retry.');
      return;
    }

    const payload = {
      holiday_name: holidayName.trim(),
      holiday_date: holidayDate,
      holiday_type: holidayType,
      is_optional: isOptional,
      description: description.trim() || undefined,
    };

    try {
      setSaving(true);

      if (isNewMode) {
        const res = await apiClient.post(`/settings/holiday-calendars/${calendarId}/holidays`, payload);
        const newId = res.data?.data?.id;
        const savedItem: HolidayRecordItem = { id: newId, ...payload };
        setHolidays((prev) => [savedItem, ...prev]);
        setIsNewMode(false);
        setSelectedId(newId);
        showToast.success('Holiday Added', `${holidayName} added successfully.`);
        if (onSave) onSave(savedItem);
      } else {
        await apiClient.put(`/settings/holidays/${selectedId}`, payload);
        const savedItem: HolidayRecordItem = { id: selectedId, ...payload };
        setHolidays((prev) => prev.map((h) => (h.id === selectedId ? savedItem : h)));
        showToast.success('Holiday Updated', `${holidayName} updated successfully.`);
        if (onSave) onSave(savedItem);
      }
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
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/settings/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      if (selectedId === id) {
        handleAddNewClick();
      }
      showToast.info('Holiday Removed', `${name} deleted.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete holiday.';
      showToast.error('Delete Failed', msg);
    }
  };

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filteredHolidays = useMemo(() => {
    return [...holidays]
      .sort((a, b) => {
        const da = String(a.holidayDate || a.holiday_date || '');
        const db_ = String(b.holidayDate || b.holiday_date || '');
        return da.localeCompare(db_);
      })
      .filter((h) => {
        const typeVal = h.holidayType || h.holiday_type || '';
        if (typeFilter !== 'All' && typeVal !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const name = (h.holidayName || h.holiday_name || '').toLowerCase();
          return name.includes(q) || typeVal.toLowerCase().includes(q);
        }
        return true;
      });
  }, [holidays, typeFilter, searchQuery]);

  const formatDisplayDate = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ───────────────────────── LEFT: Add / Edit Holiday Form ───────────────────────── */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-5">

          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  {isNewMode ? 'Add Holiday' : 'Edit Holiday'}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    {isNewMode ? 'New' : 'Editing'}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure holiday date, category, and optional/restricted status.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 text-xs rounded-lg"
                >
                  Close
                </Button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Holiday Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="e.g. Diwali / Independence Day"
                className="text-xs h-10 bg-background rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                required
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="text-xs h-10 bg-background rounded-xl"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Type</label>
                <select
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value)}
                  disabled={saving}
                  className="w-full h-10 px-3 text-xs border border-input rounded-xl bg-background text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold capitalize disabled:opacity-50"
                >
                  {HOLIDAY_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief note about this holiday..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">Optional / Restricted Holiday</label>
              <div className="flex items-center gap-2 max-w-[220px]">
                <button
                  type="button"
                  onClick={() => setIsOptional(true)}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    isOptional
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> Optional
                </button>
                <button
                  type="button"
                  onClick={() => setIsOptional(false)}
                  disabled={saving}
                  className={cn(
                    'flex-1 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50',
                    !isOptional
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent/50'
                  )}
                >
                  <X className="h-3.5 w-3.5" /> Mandatory
                </button>
              </div>
            </div>

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
                    New Holiday
                  </Button>
                )}
              </div>

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
                    <span>{isNewMode ? 'Add Holiday' : 'Update Holiday'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* ───────────────────────── RIGHT: Holiday List Directory ───────────────────────── */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 shadow-xs text-foreground space-y-4">

          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Holiday List</h3>
              <Badge variant="secondary" className="text-xs font-semibold rounded-full px-2.5">
                {filteredHolidays.length}
              </Badge>
            </div>

            <Button
              type="button"
              onClick={handleAddNewClick}
              size="sm"
              className="text-xs font-semibold h-8 px-3 rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Holiday</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search holidays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-background rounded-xl"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-2.5 text-xs border border-input rounded-xl bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs capitalize"
            >
              <option value="All">All Types</option>
              {HOLIDAY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading holidays...</p>
              </div>
            )}

            {!loading && loadError && (
              <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-600">Failed to load holidays</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{loadError}</p>
                  <button
                    onClick={fetchHolidays}
                    className="text-[11px] text-primary font-semibold mt-1 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!loading && !loadError && filteredHolidays.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border space-y-2">
                <p className="font-semibold">No holidays found.</p>
                <p className="text-[11px]">Click "+ Add Holiday" above to create one.</p>
              </div>
            )}

            {!loading && !loadError && filteredHolidays.map((item) => {
              const isSelected = !isNewMode && item.id === selectedId;
              const nameDisplay = item.holidayName || item.holiday_name || 'Untitled';
              const typeDisplay = item.holidayType || item.holiday_type || 'national';
              const optional = Boolean(item.isOptional ?? item.is_optional);
              const dateDisplay = formatDisplayDate(item.holidayDate || item.holiday_date);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectHoliday(item)}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group shadow-2xs space-y-2',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md font-medium'
                      : 'bg-card border-border/80 hover:border-primary/50 hover:bg-accent/40 text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Calendar className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary-foreground' : 'text-primary')} />
                      <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                        {nameDisplay}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                            : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20'
                        )}
                      >
                        {typeDisplay}
                      </Badge>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, nameDisplay, e)}
                        title="Delete Holiday"
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

                  <div className={cn(
                    'pt-2 border-t flex flex-wrap items-center justify-between text-[11px] gap-2',
                    isSelected ? 'border-primary-foreground/20 text-primary-foreground/80' : 'border-border/40 text-muted-foreground'
                  )}>
                    <span className="flex items-center gap-1 font-mono">
                      <CalendarDays className="h-3 w-3" /> {dateDisplay}
                    </span>

                    <span className={cn(
                      'font-semibold px-1.5 rounded text-[10px]',
                      isSelected
                        ? 'bg-white/20 text-white'
                        : optional
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {optional ? 'Optional' : 'Mandatory'}
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
