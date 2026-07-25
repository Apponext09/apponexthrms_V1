import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, Plus, Clock, CalendarDays, Info, CheckCircle2, ShieldAlert, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────

export interface CreateShiftModalProps {
  open: boolean;
  onClose: () => void;
  onShiftCreated: (shift: any) => void;
  createShift: (data: any) => Promise<any>;
  existingShifts?: any[];
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ExcludedDayPattern {
  first: boolean;
  second: boolean;
  third: boolean;
  fourth: boolean;
  fifth: boolean;
  last: boolean;
  halfDay: boolean;
  checkInTime: string;
}

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string; defaultColor: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon', defaultColor: 'indigo' },
  { key: 'tue', label: 'Tuesday', short: 'Tue', defaultColor: 'indigo' },
  { key: 'wed', label: 'Wednesday', short: 'Wed', defaultColor: 'indigo' },
  { key: 'thu', label: 'Thursday', short: 'Thu', defaultColor: 'indigo' },
  { key: 'fri', label: 'Friday', short: 'Fri', defaultColor: 'indigo' },
  { key: 'sat', label: 'Saturday', short: 'Sat', defaultColor: 'orange' },
  { key: 'sun', label: 'Sunday', short: 'Sun', defaultColor: 'red' },
];

const SHIFT_TYPES = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

const DEFAULT_EXCLUDED_PATTERN: ExcludedDayPattern = {
  first: false,
  second: false,
  third: false,
  fourth: false,
  fifth: false,
  last: false,
  halfDay: false,
  checkInTime: '09:00',
};

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

function parseHHMM(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function formatMinutesToHHMM(mins: number): string {
  const clamped = Math.max(0, mins);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calculateActualHours(totalTime: string, logBreakTime: string): string {
  const totalMins = parseHHMM(totalTime);
  const breakMins = parseHHMM(logBreakTime);
  const actualMins = totalMins - breakMins;
  return formatMinutesToHHMM(actualMins);
}

function calculateTotalTimeFromStartEnd(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '00:00';
  const startMins = parseHHMM(startTime);
  const endMins = parseHHMM(endTime);
  let diff = endMins - startMins;
  if (diff < 0) {
    diff += 1440; // 24 hours in minutes for night shifts crossing midnight
  }
  return formatMinutesToHHMM(diff);
}

// ─────────────────────────────────────────────────────
// Main Create Shift Modal Component
// ─────────────────────────────────────────────────────

export function CreateShiftModal({
  open,
  onClose,
  onShiftCreated,
  createShift,
}: CreateShiftModalProps) {
  const [loading, setLoading] = useState(false);

  // 1. Top-Level Fields
  const [shiftName, setShiftName] = useState('');
  const [shiftType, setShiftType] = useState('Daily');
  const [isFlexible, setIsFlexible] = useState(false);

  // 2. Time Settings (Fixed vs Flexible)
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [bufferTime, setBufferTime] = useState('00:15');
  const [considerHalfDayAfterCheckin, setConsiderHalfDayAfterCheckin] = useState('11:00');
  const [totalTime, setTotalTime] = useState('09:00');
  const [logBreakTime, setLogBreakTime] = useState('01:00');

  // Computed Actual Hours
  const actualHours = calculateActualHours(totalTime, logBreakTime);

  // Handlers for automatic totalTime calculation
  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    setCheckInTime(val);
    if (val && endTime) {
      setTotalTime(calculateTotalTimeFromStartEnd(val, endTime));
    }
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    if (startTime && val) {
      setTotalTime(calculateTotalTimeFromStartEnd(startTime, val));
    }
  };

  // 3. Days Included
  const [daysIncluded, setDaysIncluded] = useState<WeekdayKey[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

  // 4. Working Pattern For Excluded Days
  const [excludedPatterns, setExcludedPatterns] = useState<Record<WeekdayKey, ExcludedDayPattern>>({
    mon: { ...DEFAULT_EXCLUDED_PATTERN },
    tue: { ...DEFAULT_EXCLUDED_PATTERN },
    wed: { ...DEFAULT_EXCLUDED_PATTERN },
    thu: { ...DEFAULT_EXCLUDED_PATTERN },
    fri: { ...DEFAULT_EXCLUDED_PATTERN },
    sat: { ...DEFAULT_EXCLUDED_PATTERN, second: true, fourth: true },
    sun: { ...DEFAULT_EXCLUDED_PATTERN },
  });

  // 5. Global Attendance Rules
  const [minHoursFullDayExcluded, setMinHoursFullDayExcluded] = useState('08:00');
  const [minHoursFullDayIncluded, setMinHoursFullDayIncluded] = useState('08:00');
  const [minHoursHalfDay, setMinHoursHalfDay] = useState('04:00');
  const [minExcludedDaysWorked, setMinExcludedDaysWorked] = useState(1);
  const [shiftCutOffTime, setShiftCutOffTime] = useState('04:00');

  // 6. Behavior Toggles
  const [behaviorToggles, setBehaviorToggles] = useState({
    excludeBreakTime: true,
    disableCheckInAfterBuffer: false,
    disableCheckOutBeforeTotalHours: false,
    noLateDeduction: false,
    considerShiftHoursForExcluded: true,
    enableHalfDayRuleForExcluded: true,
  });

  // 7. Status
  const [isActive, setIsActive] = useState(true);

  // Clear hidden fields when flexible mode is toggled ON
  useEffect(() => {
    if (isFlexible) {
      setStartTime('');
      setEndTime('');
      setCheckInTime('');
      setBufferTime('');
      setConsiderHalfDayAfterCheckin('');
    } else if (!startTime) {
      setStartTime('09:00');
      setEndTime('18:00');
      setCheckInTime('09:00');
      setBufferTime('00:15');
      setConsiderHalfDayAfterCheckin('11:00');
    }
  }, [isFlexible]);

  const toggleDayIncluded = (dayKey: WeekdayKey) => {
    if (daysIncluded.includes(dayKey)) {
      if (daysIncluded.length === 1) {
        toast.error('At least one working day must be included in the schedule.');
        return;
      }
      setDaysIncluded(daysIncluded.filter((d) => d !== dayKey));
    } else {
      setDaysIncluded([...daysIncluded, dayKey]);
    }
  };

  const updateExcludedPattern = (dayKey: WeekdayKey, field: keyof ExcludedDayPattern, value: any) => {
    setExcludedPatterns((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const resetForm = () => {
    setShiftName('');
    setShiftType('Daily');
    setIsFlexible(false);
    setStartTime('09:00');
    setEndTime('18:00');
    setCheckInTime('09:00');
    setBufferTime('00:15');
    setConsiderHalfDayAfterCheckin('11:00');
    setTotalTime('09:00');
    setLogBreakTime('01:00');
    setDaysIncluded(['mon', 'tue', 'wed', 'thu', 'fri']);
    setExcludedPatterns({
      mon: { ...DEFAULT_EXCLUDED_PATTERN },
      tue: { ...DEFAULT_EXCLUDED_PATTERN },
      wed: { ...DEFAULT_EXCLUDED_PATTERN },
      thu: { ...DEFAULT_EXCLUDED_PATTERN },
      fri: { ...DEFAULT_EXCLUDED_PATTERN },
      sat: { ...DEFAULT_EXCLUDED_PATTERN, second: true, fourth: true },
      sun: { ...DEFAULT_EXCLUDED_PATTERN },
    });
    setMinHoursFullDayExcluded('08:00');
    setMinHoursFullDayIncluded('08:00');
    setMinHoursHalfDay('04:00');
    setMinExcludedDaysWorked(1);
    setShiftCutOffTime('04:00');
    setBehaviorToggles({
      excludeBreakTime: true,
      disableCheckInAfterBuffer: false,
      disableCheckOutBeforeTotalHours: false,
      noLateDeduction: false,
      considerShiftHoursForExcluded: true,
      enableHalfDayRuleForExcluded: true,
    });
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 8. Validation Rules
    if (!shiftName.trim()) {
      toast.error('Shift Name is required');
      return;
    }

    if (!shiftType) {
      toast.error('Shift Type is required');
      return;
    }

    if (daysIncluded.length === 0) {
      toast.error('At least one day must be selected under Days Included.');
      return;
    }

    if (!totalTime || !logBreakTime) {
      toast.error('Total Time and Log Break Time are required.');
      return;
    }

    if (!isFlexible && (!startTime || !endTime)) {
      toast.error('Shift Start Time and End Time are required for Fixed shifts.');
      return;
    }

    setLoading(true);
    try {
      const shiftCode = shiftName
        .toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 12) || 'SHIFT';

      // Parse hours for backend payload
      const totalMins = parseHHMM(totalTime);
      const breakMins = parseHHMM(logBreakTime);
      const durationHours = parseFloat((totalMins / 60).toFixed(2));
      const gracePeriodMinutes = parseHHMM(bufferTime);

      // Excluded days pattern map
      const excludedDays = WEEKDAYS.filter((d) => !daysIncluded.includes(d.key));
      const excludedWorkingPattern = excludedDays.reduce((acc, d) => {
        acc[d.key] = excludedPatterns[d.key];
        return acc;
      }, {} as Record<string, ExcludedDayPattern>);

      const payload = {
        shiftName: shiftName.trim(),
        shift_name: shiftName.trim(),
        shiftCode: shiftCode,
        shift_code: shiftCode,
        shiftType: isFlexible ? 'flexible' : 'fixed',
        shift_type: isFlexible ? 'flexible' : 'fixed',
        shiftCategory: shiftType,
        isFlexible,
        is_flexible: isFlexible,
        startTime: !isFlexible && startTime ? `${startTime}:00` : null,
        start_time: !isFlexible && startTime ? `${startTime}:00` : null,
        endTime: !isFlexible && endTime ? `${endTime}:00` : null,
        end_time: !isFlexible && endTime ? `${endTime}:00` : null,
        checkInTime: startTime,
        totalTime,
        logBreakTime,
        actualHours,
        durationHours,
        duration_hours: durationHours,
        gracePeriodMinutes,
        grace_period_minutes: gracePeriodMinutes,
        breakDurationMinutes: breakMins,
        break_duration_minutes: breakMins,
        bufferTime: !isFlexible ? bufferTime : null,
        considerHalfDayAfterCheckin: !isFlexible ? considerHalfDayAfterCheckin : null,
        daysIncluded,
        excludedWorkingPattern,
        globalAttendanceRules: {
          minHoursFullDayExcluded,
          minHoursFullDayIncluded,
          minHoursHalfDay,
          minExcludedDaysWorked,
          shiftCutOffTime,
        },
        behaviorToggles,
        status: isActive ? 'active' : 'inactive',
        color: '#10B981',
      };

      const newShift = await createShift(payload);
      toast.success(`Shift "${shiftName}" created successfully!`);
      if (onShiftCreated) onShiftCreated(newShift);
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create shift');
    } finally {
      setLoading(false);
    }
  };

  const excludedDays = WEEKDAYS.filter((d) => !daysIncluded.includes(d.key));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-background border border-border shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-3 text-foreground">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Plus className="w-5 h-5" />
            </div>
            <span>Add Shift Information</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Configure shift details, fixed or flexible timings, working days, excluded day patterns, and attendance rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">

          {/* ── Section 1: Top-level fields ─────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 rounded-2xl bg-muted/30 border border-border/60">
            {/* Shift Name */}
            <div className="space-y-1.5">
              <Label htmlFor="shift-name" className="text-xs font-bold text-foreground flex items-center gap-1">
                Shift Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="shift-name"
                placeholder="e.g. Morning Shift"
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="rounded-xl text-sm font-medium h-10 border-input bg-background focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Shift Type */}
            <div className="space-y-1.5">
              <Label htmlFor="shift-type" className="text-xs font-bold text-foreground flex items-center gap-1">
                Shift Type <span className="text-rose-500">*</span>
              </Label>
              <select
                id="shift-type"
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SHIFT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Mark as Flexible Shift Toggle */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                Flexible Mode
              </Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch
                  id="mark-flexible"
                  checked={isFlexible}
                  onCheckedChange={setIsFlexible}
                />
                <Label htmlFor="mark-flexible" className="text-xs font-semibold cursor-pointer select-none text-foreground flex items-center gap-1.5">
                  <Zap className={cn('w-4 h-4 transition-colors', isFlexible ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                  Mark as Flexible Shift
                </Label>
              </div>
            </div>
          </div>

          {/* ── Section 2: Conditional Block - Fixed vs Flexible Shift ───── */}
          <div className="rounded-2xl border border-border p-5 space-y-4 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                {isFlexible ? 'Flexible Shift Timing & Hours' : 'Fixed Shift Timing & Hours'}
              </h4>
              <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider', isFlexible ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300')}>
                {isFlexible ? 'Flexible Mode Active' : 'Fixed Timing Active'}
              </span>
            </div>

            {!isFlexible ? (
              /* 2a. Fixed Shift Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Shift Start Time <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    placeholder="HH:MM"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="rounded-xl text-sm font-mono h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    Shift End Time <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    placeholder="HH:MM"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="rounded-xl text-sm font-mono h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Buffer Time <span className="text-muted-foreground font-normal">(Grace Period)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="00:15"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(e.target.value)}
                    className="rounded-xl text-sm font-mono h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Consider Half Day after
                  </Label>
                  <Input
                    type="time"
                    placeholder="HH:MM"
                    value={considerHalfDayAfterCheckin}
                    onChange={(e) => setConsiderHalfDayAfterCheckin(e.target.value)}
                    className="rounded-xl text-sm font-mono h-9"
                  />
                </div>
              </div>
            ) : (
              /* 2b. Flexible Shift Info Banner */
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>
                  Start Time, End Time, Buffer Time, and Half Day Checkin are hidden for Flexible Shifts. Employees can clock in at any time.
                </span>
              </div>
            )}

            {/* Total Time - Log Break Time = Actual Hours (Both Modes) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Total Time <span className="text-rose-500">*</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Duration HH:MM)</span>
                </Label>
                <Input
                  type="text"
                  placeholder="09:00"
                  value={totalTime}
                  onChange={(e) => setTotalTime(e.target.value)}
                  className="rounded-xl text-sm font-mono h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Log Break Time <span className="text-rose-500">*</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Duration HH:MM)</span>
                </Label>
                <Input
                  type="text"
                  placeholder="01:00"
                  value={logBreakTime}
                  onChange={(e) => setLogBreakTime(e.target.value)}
                  className="rounded-xl text-sm font-mono h-9"
                />
                <div className="flex items-center gap-1.5 pt-0.5">
                  {[
                    { label: '30m', val: '00:30' },
                    { label: '45m', val: '00:45' },
                    { label: '1h', val: '01:00' },
                    { label: '1.5h', val: '01:30' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setLogBreakTime(preset.val)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-lg border transition-all font-medium',
                        logBreakTime === preset.val
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Actual Working Hours</span>
                  <span className="text-[9px] font-normal text-muted-foreground font-mono">Total Time - Log Break Time</span>
                </Label>
                <div className="h-9 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-mono text-sm font-bold flex items-center justify-between">
                  <span>{actualHours} hrs</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                    Calculated (HH:MM)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Days Included ───────────────────────────────── */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-muted/20 border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                Days Included <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">Select regular working days</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map(({ key, short, label, defaultColor }) => {
                const isIncluded = daysIncluded.includes(key);
                const isSat = key === 'sat';
                const isSun = key === 'sun';

                let colorClasses = 'border-border bg-background text-muted-foreground hover:bg-muted';

                if (isIncluded) {
                  if (isSat) {
                    colorClasses = 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold ring-2 ring-amber-400/40';
                  } else if (isSun) {
                    colorClasses = 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 font-bold ring-2 ring-rose-400/40';
                  } else {
                    colorClasses = 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold ring-2 ring-emerald-400/40';
                  }
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDayIncluded(key)}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all select-none text-center',
                      colorClasses
                    )}
                    title={`${label} - ${isIncluded ? 'Included' : 'Excluded'}`}
                  >
                    <span className="text-xs font-extrabold">{short}</span>
                    <span className="text-[9px] mt-0.5 opacity-80">
                      {isIncluded ? 'Working' : 'Excluded'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section 4: Working Pattern For Excluded Days ────────────── */}
          {excludedDays.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl border border-amber-300/60 bg-amber-50/20 dark:bg-amber-950/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Working Pattern For Excluded Days
                  </h4>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Configure per-occurrence rules for excluded days
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-background">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-2.5">Day</th>
                      <th className="p-2.5 text-center">1st</th>
                      <th className="p-2.5 text-center">2nd</th>
                      <th className="p-2.5 text-center">3rd</th>
                      <th className="p-2.5 text-center">4th</th>
                      <th className="p-2.5 text-center">5th</th>
                      <th className="p-2.5 text-center">Last</th>
                      <th className="p-2.5 text-center">HD</th>
                      <th className="p-2.5 text-center">Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {excludedDays.map(({ key, label }) => {
                      const pattern = excludedPatterns[key];
                      return (
                        <tr key={key} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-bold text-foreground">{label}</td>
                          {(['first', 'second', 'third', 'fourth', 'fifth', 'last', 'halfDay'] as (keyof ExcludedDayPattern)[]).map((field) => (
                            <td key={field} className="p-2.5 text-center">
                              <Checkbox
                                checked={Boolean(pattern[field])}
                                onCheckedChange={(v) => updateExcludedPattern(key, field, Boolean(v))}
                              />
                            </td>
                          ))}
                          <td className="p-2.5 text-center">
                            <Input
                              type="time"
                              placeholder="HH:MM"
                              value={pattern.checkInTime}
                              onChange={(e) => updateExcludedPattern(key, 'checkInTime', e.target.value)}
                              className="h-7 w-24 text-xs font-mono text-center mx-auto rounded-lg"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Section 5: Global Attendance Rules ──────────────────────── */}
          <div className="space-y-3 p-4 rounded-2xl border border-border bg-card shadow-sm">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border pb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Global Attendance Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Consider full day if worked minimum (HH:MM) on excluded days
                </Label>
                <Input
                  type="time"
                  value={minHoursFullDayExcluded}
                  onChange={(e) => setMinHoursFullDayExcluded(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Consider full day if worked minimum (HH:MM) on included days
                </Label>
                <Input
                  type="time"
                  value={minHoursFullDayIncluded}
                  onChange={(e) => setMinHoursFullDayIncluded(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Consider half day if worked minimum (HH:MM)
                </Label>
                <Input
                  type="time"
                  value={minHoursHalfDay}
                  onChange={(e) => setMinHoursHalfDay(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Working Any [Count] Day on excluded days
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={minExcludedDaysWorked}
                  onChange={(e) => setMinExcludedDaysWorked(parseInt(e.target.value) || 1)}
                  className="rounded-xl h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Shift Cut-Off Time (HH:MM)
                  </Label>
                  <div className="relative group flex items-center">
                    <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-popover text-popover-foreground text-[10px] leading-tight rounded-lg border border-border shadow-md z-50 pointer-events-none">
                      Defines the boundary time for a shift day (useful for night shifts that cross past midnight).
                    </div>
                  </div>
                </div>
                <Input
                  type="time"
                  value={shiftCutOffTime}
                  onChange={(e) => setShiftCutOffTime(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono max-w-xs"
                />
              </div>
            </div>
          </div>

          {/* ── Section 6: Behavior Toggles ────────────────────────────── */}
          <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Behavior Toggles & Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: 'excludeBreakTime', label: 'Exclude Break Time' },
                { key: 'disableCheckInAfterBuffer', label: 'Disable Check In After Buffer Time' },
                { key: 'disableCheckOutBeforeTotalHours', label: 'Disable Check Out Before Completing Total Work Hours' },
                { key: 'noLateDeduction', label: 'Do not consider for late deduction' },
                { key: 'considerShiftHoursForExcluded', label: 'Consider Shift Hours for Excluded Days' },
                { key: 'enableHalfDayRuleForExcluded', label: 'Enable Half Day Rule for Excluded Day(s)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={Boolean((behaviorToggles as any)[key])}
                    onCheckedChange={(v) => setBehaviorToggles((prev) => ({ ...prev, [key]: Boolean(v) }))}
                  />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Section 7: Status & Action Footer ──────────────────────── */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="shift-status"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="shift-status" className="text-xs font-bold text-foreground">
                Active Status ({isActive ? 'Yes' : 'No'})
              </Label>
            </div>

            {/* Action Buttons */}
            <DialogFooter className="gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); onClose(); }}
                className="rounded-xl px-5 border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 dark:border-rose-900 dark:hover:bg-rose-950/40 font-semibold text-xs h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-7 shadow-lg shadow-emerald-600/30 text-xs h-10 gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Adding...' : 'Add Shift'}
              </Button>
            </DialogFooter>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
