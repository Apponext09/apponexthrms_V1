import React, { useState, useEffect } from 'react';
import {
  Plus, X, Info, Clock, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, Sun, Moon, Sparkles, Shield, Palette, Tag, Timer, CalendarDays, Zap, AlertTriangle, Check, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShifts } from '@/features/attendance/hooks/useShifts';
import { showToast } from '@/components/ui/toast';
import { attendanceRules, validateShiftRules } from '@/features/attendance/shiftRules';

interface RosterShiftMasterFormProps {
  onCancel?: () => void;
  onSave?: (data: any) => void;
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

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

const COLOR_PRESETS = [
  { label: 'Emerald', hex: '#10B981', bg: 'bg-emerald-500' },
  { label: 'Blue', hex: '#3B82F6', bg: 'bg-blue-500' },
  { label: 'Indigo', hex: '#6366F1', bg: 'bg-indigo-500' },
  { label: 'Purple', hex: '#8B5CF6', bg: 'bg-purple-500' },
  { label: 'Amber', hex: '#F59E0B', bg: 'bg-amber-500' },
  { label: 'Rose', hex: '#F43F5E', bg: 'bg-rose-500' },
  { label: 'Teal', hex: '#14B8A6', bg: 'bg-teal-500' },
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
    diff += 1440;
  }
  return formatMinutesToHHMM(diff);
}

function format12Hour(time24: string | null): string {
  if (!time24) return '—';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mStr || '00'} ${ampm}`;
}

export function RosterShiftMasterForm({ onCancel, onSave }: RosterShiftMasterFormProps) {
  const { shifts, loading, getAllShifts, createShift, toggleShiftStatus } = useShifts();

  useEffect(() => {
    getAllShifts();
  }, [getAllShifts]);

  // Right Side Search & Filter State
  const [displaySearch, setDisplaySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Form State
  const [shiftName, setShiftName] = useState('');
  const [shiftType, setShiftType] = useState('Roster');
  const [isFlexible, setIsFlexible] = useState(false);
  const [color, setColor] = useState('#6366F1');

  // Time Settings
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [bufferTime, setBufferTime] = useState('00:15');
  const [considerHalfDayAfterCheckin, setConsiderHalfDayAfterCheckin] = useState('11:00');
  const [flexibleStartRangeStart, setFlexibleStartRangeStart] = useState('08:00');
  const [flexibleStartRangeEnd, setFlexibleStartRangeEnd] = useState('11:00');
  const [totalTime, setTotalTime] = useState('09:00');
  const [logBreakTime, setLogBreakTime] = useState('01:00');

  const actualHours = calculateActualHours(totalTime, logBreakTime);

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

  // Days Included & Holiday Days
  const [daysIncluded, setDaysIncluded] = useState<WeekdayKey[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [holidayDays, setHolidayDays] = useState<WeekdayKey[]>([]);

  // Working Pattern For Excluded Days
  const [excludedPatterns, setExcludedPatterns] = useState<Record<WeekdayKey, ExcludedDayPattern>>({
    mon: { ...DEFAULT_EXCLUDED_PATTERN },
    tue: { ...DEFAULT_EXCLUDED_PATTERN },
    wed: { ...DEFAULT_EXCLUDED_PATTERN },
    thu: { ...DEFAULT_EXCLUDED_PATTERN },
    fri: { ...DEFAULT_EXCLUDED_PATTERN },
    sat: { ...DEFAULT_EXCLUDED_PATTERN, second: true, fourth: true },
    sun: { ...DEFAULT_EXCLUDED_PATTERN },
  });

  // Global Attendance Rules
  const [minHoursFullDayExcluded, setMinHoursFullDayExcluded] = useState('08:00');
  const [minHoursFullDayIncluded, setMinHoursFullDayIncluded] = useState('08:00');
  const [minHoursHalfDay, setMinHoursHalfDay] = useState('04:00');
  const [minExcludedDaysWorked, setMinExcludedDaysWorked] = useState(1);
  const [shiftCutOffTime, setShiftCutOffTime] = useState('04:00');

  // Behavior Toggles
  const [behaviorToggles, setBehaviorToggles] = useState({
    excludeBreakTime: true,
    disableCheckInAfterBuffer: false,
    disableCheckOutBeforeTotalHours: false,
    noLateDeduction: false,
    considerShiftHoursForExcluded: true,
    enableHalfDayRuleForExcluded: true,
  });

  // Status
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cycleDayState = (dayKey: WeekdayKey) => {
    const isIncluded = daysIncluded.includes(dayKey);
    const isHoliday = holidayDays.includes(dayKey);

    if (isIncluded) {
      if (daysIncluded.length === 1 && !isHoliday) {
        showToast.error('Validation Error', 'At least one working day must be included in the roster pattern.');
        return;
      }
      setDaysIncluded(daysIncluded.filter((d) => d !== dayKey));
      setHolidayDays(holidayDays.filter((d) => d !== dayKey));
    } else if (!isHoliday) {
      setHolidayDays([...holidayDays, dayKey]);
    } else {
      setHolidayDays(holidayDays.filter((d) => d !== dayKey));
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
    setShiftType('Roster');
    setIsFlexible(false);
    setColor('#6366F1');
    setStartTime('09:00');
    setEndTime('18:00');
    setCheckInTime('09:00');
    setBufferTime('00:15');
    setConsiderHalfDayAfterCheckin('11:00');
    setFlexibleStartRangeStart('08:00');
    setFlexibleStartRangeEnd('11:00');
    setTotalTime('09:00');
    setLogBreakTime('01:00');
    setDaysIncluded(['mon', 'tue', 'wed', 'thu', 'fri']);
    setHolidayDays([]);
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
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!shiftName.trim()) {
      setSubmitError('Roster Shift Name is required.');
      return;
    }

    if (daysIncluded.length === 0) {
      setSubmitError('At least one day must be selected under Days Included.');
      return;
    }

    const ruleInput = { isFlexible, startTime, endTime, flexibleStartRangeStart, flexibleStartRangeEnd,
      totalTime, logBreakTime, bufferTime, halfDayStartTime: considerHalfDayAfterCheckin,
      minHoursFullDayIncluded, minHoursFullDayExcluded, minHoursHalfDay, shiftCutOffTime, minExcludedDaysWorked };
    const ruleError = validateShiftRules(ruleInput);
    if (ruleError) { setSubmitError(ruleError); return; }

    const computedIsNightShift = !isFlexible && !!startTime && !!endTime && endTime < startTime;

    setSubmitting(true);
    try {
      let finalShiftName = shiftName.trim();
      if (!finalShiftName.toLowerCase().includes('roster')) {
        finalShiftName = `${finalShiftName} (Roster)`;
      }

      const rawCode = finalShiftName
        .toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 10) || 'ROST';

      // 6-char suffix (~2.2B combos) instead of 4 (~1.7M); rawCode is capped
      // at 10 chars so "R-" + rawCode + "-" + suffix stays under the 20-char
      // slice below.
      const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const shiftCode = `R-${rawCode}-${uniqueSuffix}`.slice(0, 20);

      const totalMins = parseHHMM(totalTime);
      const breakMins = parseHHMM(logBreakTime);
      const durationHours = parseFloat((totalMins / 60).toFixed(2));
      const gracePeriodMinutes = parseHHMM(bufferTime);

      const excludedDays = WEEKDAYS.filter(
        (d) => !daysIncluded.includes(d.key) && !holidayDays.includes(d.key)
      );
      const excludedWorkingPattern = excludedDays.reduce((acc, d) => {
        acc[d.key] = excludedPatterns[d.key];
        return acc;
      }, {} as Record<string, ExcludedDayPattern>);

      const globalAttendanceRules = attendanceRules(ruleInput);
      const rosterPatternObj = {
        totalTime,
        logBreakTime,
        actualHours,
        daysIncluded,
        holidayDays,
        excludedWorkingPattern,
        globalAttendanceRules,
        behaviorToggles,
      };

      const backendShiftType = isFlexible ? 'flexible' : 'roster';

      const payload = {
        shiftName: finalShiftName,
        shift_name: finalShiftName,
        shiftCode,
        shift_code: shiftCode,
        shiftType: backendShiftType,
        shift_type: backendShiftType,
        shiftCategory: 'Roster',
        isFlexible,
        is_flexible: isFlexible,
        flexibleStartRangeStart: isFlexible ? `${flexibleStartRangeStart}:00` : null,
        flexible_start_range_start: isFlexible ? `${flexibleStartRangeStart}:00` : null,
        flexibleStartRangeEnd: isFlexible ? `${flexibleStartRangeEnd}:00` : null,
        flexible_start_range_end: isFlexible ? `${flexibleStartRangeEnd}:00` : null,
        startTime: !isFlexible && startTime ? `${startTime}:00` : null,
        start_time: !isFlexible && startTime ? `${startTime}:00` : null,
        endTime: !isFlexible && endTime ? `${endTime}:00` : null,
        end_time: !isFlexible && endTime ? `${endTime}:00` : null,
        isNightShift: computedIsNightShift,
        is_night_shift: computedIsNightShift,
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
        globalAttendanceRules,
        behaviorToggles,
        description: `Roster Shift (${actualHours} actual working hours)`,
        rosterPattern: rosterPatternObj,
        roster_pattern: rosterPatternObj,
        color,
        status: isActive ? 'active' : 'inactive',
      };

      const result = await createShift(payload);
      if (onSave) onSave(result);
      showToast.success('Roster Shift Created', `${finalShiftName} created successfully.`);
      await getAllShifts();
      resetForm();
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to save roster shift. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shiftId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleShiftStatus(shiftId, nextStatus);
      await getAllShifts();
    } catch (err) {
      // Handled in hook
    }
  };

  const excludedDaysList = WEEKDAYS.filter((d) => !daysIncluded.includes(d.key));

  const filteredShifts = shifts.filter((s: any) => {
    const isRosterShift = s.shift_type === 'roster' || s.shiftType === 'roster' || (s.shift_name || '').toLowerCase().includes('roster') || !!s.roster_pattern || !!s.rosterPattern;
    if (!isRosterShift) return false;

    const itemActive = s.status === 'active' || s.isActive === 'Yes';
    if (statusFilter === 'Active' && !itemActive) return false;
    if (statusFilter === 'Inactive' && itemActive) return false;

    if (displaySearch.trim()) {
      const q = displaySearch.toLowerCase();
      const name = (s.shift_name || s.shiftName || '').toLowerCase();
      const code = (s.shift_code || s.shiftCode || '').toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }

    return true;
  });

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Add Roster Shift Form */}
        <div className="lg:col-span-7 space-y-5 text-foreground">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold">

            {/* CARD 1: Basic Info & Flexible Mode */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                    <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground tracking-tight">Add Roster ion</h3>
                    <p className="text-[11px] text-muted-foreground">Configure shift details, fixed or flexible timings, working days, and attendance rules.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Shift Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="e.g. Morning Shift"
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-muted-foreground/60"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-foreground font-bold">
                    Shift Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                  >
                    <option value="Roster">Roster</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="block text-foreground font-bold text-[11px]">
                    Flexible Mode
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer h-9 px-2 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={isFlexible}
                      onChange={(e) => setIsFlexible(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={cn('w-8 h-4 rounded-full transition-colors relative', isFlexible ? 'bg-emerald-500' : 'bg-muted-foreground/30')}>
                      <div className={cn('w-3.5 h-3.5 rounded-full bg-background transition-transform absolute top-0.25 left-0.25 shadow-xs', isFlexible ? 'translate-x-4' : 'translate-x-0')} />
                    </div>
                    <span className="text-[11px] font-semibold flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> Flexible
                    </span>
                  </label>
                </div>
              </div>

              {/* Shift Theme Color Presets */}
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="block text-foreground font-bold">Shift Theme Color</label>
                  <span className="text-muted-foreground text-[10px]">Color used for badges, calendar & roster views</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer',
                        color === p.hex
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className={cn('w-2.5 h-2.5 rounded-full', p.bg)} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 2: FIXED SHIFT TIMING & HOURS */}
            {isFlexible && (
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="font-bold text-xs uppercase flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" />Flexible shift timing & hours</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div><label className="block font-bold text-[11px] mb-1">Earliest check-in *</label><input type="time" value={flexibleStartRangeStart} onChange={(e) => setFlexibleStartRangeStart(e.target.value)} className="w-full h-9 px-3 border border-input rounded-xl bg-background" /></div>
                  <div><label className="block font-bold text-[11px] mb-1">Latest check-in *</label><input type="time" value={flexibleStartRangeEnd} onChange={(e) => setFlexibleStartRangeEnd(e.target.value)} className="w-full h-9 px-3 border border-input rounded-xl bg-background" /></div>
                  <div><label className="block font-bold text-[11px] mb-1">Total time *</label><input value={totalTime} onChange={(e) => setTotalTime(e.target.value)} className="w-full h-9 px-3 border border-input rounded-xl bg-background font-mono" /></div>
                  <div><label className="block font-bold text-[11px] mb-1">Break time *</label><input value={logBreakTime} onChange={(e) => setLogBreakTime(e.target.value)} className="w-full h-9 px-3 border border-input rounded-xl bg-background font-mono" /></div>
                </div>
              </div>
            )}
            {!isFlexible && (
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span className="tracking-tight uppercase">FIXED SHIFT TIMING & HOURS</span>
                  </div>
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    FIXED TIMING ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-foreground font-bold">
                      Shift Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-foreground font-bold">
                      Shift End Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-foreground font-bold text-[11px]">
                      Buffer Time <span className="text-muted-foreground font-normal">(Grace Period)</span>
                    </label>
                    <input
                      type="text"
                      value={bufferTime}
                      onChange={(e) => setBufferTime(e.target.value)}
                      placeholder="00:15"
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-foreground font-bold text-[11px]">
                      Consider Half Day after
                    </label>
                    <input
                      type="time"
                      value={considerHalfDayAfterCheckin}
                      onChange={(e) => setConsiderHalfDayAfterCheckin(e.target.value)}
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center pt-1 border-t border-border/50">
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="block text-foreground font-bold text-[11px]">
                      Total Time <span className="text-rose-500">*</span> <span className="text-muted-foreground font-normal">(Duration HH:MM)</span>
                    </label>
                    <input
                      type="text"
                      value={totalTime}
                      onChange={(e) => setTotalTime(e.target.value)}
                      placeholder="09:00"
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-mono font-medium"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="block text-foreground font-bold text-[11px]">
                      Log Break Time <span className="text-rose-500">*</span> <span className="text-muted-foreground font-normal">(Duration HH:MM)</span>
                    </label>
                    <input
                      type="text"
                      value={logBreakTime}
                      onChange={(e) => setLogBreakTime(e.target.value)}
                      placeholder="01:00"
                      className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-mono font-medium"
                    />
                    <div className="flex items-center gap-1 text-[10px]">
                      {['30m', '45m', '1h', '1.5h'].map((preset) => {
                        const valMap: Record<string, string> = { '30m': '00:30', '45m': '00:45', '1h': '01:00', '1.5h': '01:30' };
                        const isSel = logBreakTime === valMap[preset];
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setLogBreakTime(valMap[preset])}
                            className={cn(
                              'px-2 py-0.5 rounded-md border font-medium transition-all cursor-pointer',
                              isSel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="sm:col-span-4 border border-indigo-500/30 bg-indigo-500/10 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-400">Actual Working Hours</span>
                      <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80 text-[10px]">Total Time - Log Break Time</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">{actualHours} hrs</span>
                      <span className="block text-[9px] text-indigo-600/70 dark:text-indigo-400/70">Calculated (HH:MM)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 3: DAYS INCLUDED & SCHEDULE */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                  <span className="tracking-tight uppercase">DAYS INCLUDED & SCHEDULE <span className="text-rose-500">*</span></span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Working</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Excluded</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Holiday</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                {WEEKDAYS.map((day) => {
                  const isIncluded = daysIncluded.includes(day.key);
                  const isHoliday = holidayDays.includes(day.key);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => cycleDayState(day.key)}
                      className={cn(
                        'p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none space-y-0.5',
                        isIncluded
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold'
                          : isHoliday
                            ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold'
                            : 'border-border bg-muted/20 text-muted-foreground font-medium'
                      )}
                    >
                      <span className="block text-xs">{day.short}</span>
                      <span className="block text-[10px] capitalize">
                        {isIncluded ? 'Working' : isHoliday ? 'Holiday' : 'Excluded'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CARD 4: WORKING PATTERN FOR EXCLUDED DAYS */}
            {excludedDaysList.length > 0 && (
              <div className="bg-card border border-amber-500/30 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="tracking-tight uppercase">WORKING PATTERN FOR EXCLUDED DAYS</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-normal">Configure per-occurrence rules for excluded days</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                        <th className="py-2 px-2 font-bold">DAY</th>
                        <th className="py-2 px-1 text-center font-bold">1ST</th>
                        <th className="py-2 px-1 text-center font-bold">2ND</th>
                        <th className="py-2 px-1 text-center font-bold">3RD</th>
                        <th className="py-2 px-1 text-center font-bold">4TH</th>
                        <th className="py-2 px-1 text-center font-bold">5TH</th>
                        <th className="py-2 px-1 text-center font-bold">LAST</th>
                        <th className="py-2 px-1 text-center font-bold">HD</th>
                        <th className="py-2 px-2 font-bold">CHECK-IN TIME</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {excludedDaysList.map((day) => {
                        const pat = excludedPatterns[day.key] || DEFAULT_EXCLUDED_PATTERN;
                        return (
                          <tr key={day.key} className="hover:bg-muted/20">
                            <td className="py-2 px-2 font-bold text-foreground">{day.label}</td>
                            {(['first', 'second', 'third', 'fourth', 'fifth', 'last', 'halfDay'] as (keyof ExcludedDayPattern)[]).map((col) => (
                              <td key={col} className="py-2 px-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={!!pat[col]}
                                  onChange={(e) => updateExcludedPattern(day.key, col, e.target.checked)}
                                  className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-input cursor-pointer"
                                />
                              </td>
                            ))}
                            <td className="py-2 px-2">
                              <input
                                type="time"
                                value={pat.checkInTime || '09:00'}
                                onChange={(e) => updateExcludedPattern(day.key, 'checkInTime', e.target.value)}
                                className="h-7 px-2 border border-input rounded-lg bg-background text-foreground text-[11px] font-medium"
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

            {/* CARD 5: GLOBAL ATTENDANCE RULES */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-border pb-3 text-foreground font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="tracking-tight uppercase">GLOBAL ATTENDANCE RULES</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="block text-foreground text-[11px]">
                    Consider full day if worked minimum (HH:MM) on excluded days
                  </label>
                  <input
                    type="time"
                    value={minHoursFullDayExcluded}
                    onChange={(e) => setMinHoursFullDayExcluded(e.target.value)}
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-foreground text-[11px]">
                    Consider full day if worked minimum (HH:MM) on included days
                  </label>
                  <input
                    type="time"
                    value={minHoursFullDayIncluded}
                    onChange={(e) => setMinHoursFullDayIncluded(e.target.value)}
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-foreground text-[11px]">
                    Consider half day if worked minimum (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={minHoursHalfDay}
                    onChange={(e) => setMinHoursHalfDay(e.target.value)}
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-foreground text-[11px]">
                    Working Any [Count] Day on excluded days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={minExcludedDaysWorked}
                    onChange={(e) => setMinExcludedDaysWorked(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-9 px-3 border border-input rounded-xl bg-background text-foreground font-medium"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-foreground text-[11px] flex items-center gap-1">
                    Shift Cut-Off Time (HH:MM) <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </label>
                  <input
                    type="time"
                    value={shiftCutOffTime}
                    onChange={(e) => setShiftCutOffTime(e.target.value)}
                    className="w-full sm:w-1/2 h-9 px-3 border border-input rounded-xl bg-background text-foreground font-medium"
                  />
                </div>
              </div>
            </div>

            {/* CARD 6: BEHAVIOR TOGGLES & RULES */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="border-b border-border pb-3 text-foreground font-bold text-xs uppercase tracking-tight">
                BEHAVIOR TOGGLES & RULES
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'excludeBreakTime', label: 'Exclude Break Time' },
                  { key: 'disableCheckInAfterBuffer', label: 'Disable Check In After Buffer Time' },
                  { key: 'disableCheckOutBeforeTotalHours', label: 'Disable Check Out Before Completing Total Work Hours' },
                  { key: 'noLateDeduction', label: 'Do not consider for late deduction' },
                  { key: 'considerShiftHoursForExcluded', label: 'Consider Shift Hours for Excluded Days' },
                  { key: 'enableHalfDayRuleForExcluded', label: 'Enable Half Day Rule for Excluded Day(s)' },
                ].map((item) => {
                  const checked = (behaviorToggles as any)[item.key];
                  return (
                    <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-background/60 hover:bg-background cursor-pointer transition-colors text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setBehaviorToggles((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-input"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                      isActive ? 'bg-indigo-600' : 'bg-muted-foreground/40'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full bg-background transition-transform absolute top-0.5 left-0.5 shadow-xs',
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </div>
                  <span className="font-bold text-xs text-foreground">
                    Active Status ({isActive ? 'Yes' : 'No'})
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2 border border-rose-400 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Plus className="h-4 w-4 stroke-[2.5]" /> Add Roster Shift</>
                  )}
                </button>
              </div>
            </div>

            {submitError && (
              <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {submitError}
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: Roster Shifts Display List */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4 sticky top-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-8 relative">
              <input
                type="text"
                value={displaySearch}
                onChange={(e) => setDisplaySearch(e.target.value)}
                placeholder="Search roster shift..."
                className="w-full h-8 pl-2.5 pr-7 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground/60 text-xs"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="sm:col-span-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2 border border-input rounded-xl bg-background text-foreground font-semibold text-xs"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-3 bg-background/40">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600">
                  <RefreshCw className="h-3.5 w-3.5" />
                </div>
                <span>Roster Shift Templates</span>
              </div>
              <span className="bg-muted text-foreground font-semibold text-[11px] px-2 py-0.5 rounded-full border border-border">
                {filteredShifts.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-0.5">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                  <Loader2 className="h-5 w-5 mx-auto animate-spin text-primary" />
                  <p>Loading roster shifts...</p>
                </div>
              ) : filteredShifts.map((item: any) => {
                const name = item.shift_name || item.shiftName || 'Roster Shift';
                const code = item.shift_code || item.shiftCode || '';
                const startTimeVal = item.start_time || item.startTime || '08:00';
                const endTimeVal = item.end_time || item.endTime || '17:00';
                const breakMins = item.break_duration_minutes ?? item.breakDurationMinutes ?? 60;
                const graceMins = item.grace_period_minutes ?? item.gracePeriodMinutes ?? 15;
                const colorHex = item.color || '#6366F1';
                const active = item.status === 'active' || item.isActive === 'Yes';

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-2 hover:border-indigo-500/40 hover:shadow-2xs transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-foreground group-hover:text-indigo-600 transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
                        <span>{name}</span>
                      </div>
                      {code && (
                        <span className="bg-muted text-muted-foreground font-mono font-semibold text-[10px] px-2 py-0.5 rounded-md border border-border">
                          {code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <Clock className="h-3 w-3 text-indigo-600" />
                        <span>{format12Hour(startTimeVal)} – {format12Hour(endTimeVal)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>☕ Break: {breakMins} mins</span>
                      <span>•</span>
                      <span>⏳ Grace: {graceMins} mins</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/50">
                      <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-indigo-500/20 capitalize">
                        Roster
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, item.status)}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        {active ? (
                          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loading && filteredShifts.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-1.5 bg-muted/20">
                  <RefreshCw className="h-6 w-6 mx-auto text-muted-foreground/50" />
                  <p className="font-semibold text-foreground">No roster shifts found</p>
                  <p className="text-[11px] text-muted-foreground">Add a roster shift using the form on the left.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
